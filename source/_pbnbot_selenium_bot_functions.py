import os
import getpass
import time
# ################################
# # Bot specific functions here: #
# ################################

clear = lambda: os.system('clear')

def loadConfigFile(filePath):
  configContents = readFileToArray(filePath)
  return configContents

def getConfigKeyValue(configArray, keyName):
  arrayLine = searchArrayForString(configArray, keyName)
  if (arrayLine == False):
    return False
  else:
    arrayStr = configArray[(arrayLine - 1)]
    keyValue = arrayStr.split('=')[1].strip()
    if (keyValue == 'True'):
      keyValue = True
    if (keyValue == 'False'):
      keyValue = False
    return keyValue

def loadBotConfigFileToDict(botClass, filePath):
  newDict = {}
  fileLines = loadConfigFile(filePath)
  for fileLine in fileLines:
    if ((fileLine[0] == '#') or (fileLine == '\n')):
      continue
    else:
      lineArray = fileLine.split('=')
      dictKey = lineArray[0]
      keyValue = lineArray[1].strip()
      #Process & Change Specific KeyName:
      if (dictKey == 'showBrowser'):
        dictKey = 'browserOption'
      elif (dictKey == 'PBNUserHandle'):
        dictKey = 'username'
      elif (dictKey == 'PBNUserPW'):
        dictKey = 'password'
      elif (dictKey == 'serverToConnect'):
        #This is an important step not to forget for this value.
        keyValue = botClass.setPBNServerToConnect(keyValue)
      elif (dictKey == 'botCyclePauseTime') or (dictKey == 'botSendCommandPause') or (dictKey == 'playerListAutoUpdatePauseTime'):
        if (str(keyValue).lower() != 'false'):
          keyValue = float(keyValue)
        else:
          keyValue = False
        newDict[dictKey] = keyValue
        continue
      #Process # Change Key->Value Types
      if (str(keyValue) == ''):
        keyValue = ''
      elif (keyValue.isnumeric()):
        keyValue = int(keyValue)
      #float?
      elif (str(keyValue).lower() == 'false'):
        keyValue = False
      elif (str(keyValue).lower() == 'true'):
        keyValue = True
      newDict[dictKey] = keyValue
  return newDict

def getCommandList(filePath):
  commandListFile = filePath
  commandList = readFileToArray(commandListFile)
  if (len(commandList) != 0):
    #Empty contents of file after reading
    whipeFileContents(commandListFile)
    return commandList
  else:
    return False

def processConsoleMessage(consoleMessage):
  #Expected input:
  #console-api 400:10 "[PBN]Test new features."
  msgArray = consoleMessage.split(' ', 2) #Split string to array using first two spaces as delimiter
  msgString = msgArray[2][1:-1] #Get third item from array, remove first and last character
  if (msgString[:4] == '[PBN'): #Check if string begins with [PBN
    msgArray = msgString.split(']',1) #Split message string into array ['[PBN','Test new features.']
    msgString = msgArray[1] #Extract message
    #print(msgString)
    return msgString
  else:
    return False

def getConsoleLog(browser, botClass, botClassSessionData):
  #Python should recieve console entries that look like this:
  #http://www.paintballnet.net/play/main.js 82:8 "PBTerm-NodeJS.css loaded."
  #console-api 399:10 "[PBN]PBN Hotkeys loaded."
  #console-api 400:10 "[PBN]Test new features."
  packetErrorCount = 0
  packetHeaderString = ''
  packetMessagesDropped = 0
  packetErrorLog = {}
  for entry in browser.get_log('browser'):
    if (entry['level'] == 'INFO'):
      refinedMsg = processConsoleMessage(entry['message'])
      if (refinedMsg != False):
        #Currently, processPBNMessage will Handle variable assignment, and console output
        #Function returns True/False based on if the string was processed without incident
        messageProcessResult = processPBNMessage(botClass, botClassSessionData, refinedMsg)
        if not messageProcessResult:
          #Something went wrong Processing an incoming message.
          newPacketHeaderString = refinedMsg.split(':',1)[0]
          if newPacketHeaderString != packetHeaderString:
            if (packetHeaderString == '') and (packetMessagesDropped == 0):
              packetHeaderString = newPacketHeaderString
              packetMessagesDropped += 1
            else:
              keyString = packetHeaderString + '(' + str(packetErrorCount) + ':)'
              packetErrorLog[keyString] = str(packetMessagesDropped)
              packetMessagesDropped = 0
          else:
            packetMessagesDropped += 1
          packetErrorCount += 1
          botClassSessionData.totalErrPackets += 1
        else:
          botClassSessionData.nonErrMsg += 1
          botClassSessionData.totalSuccessPackets += 1
  if (packetMessagesDropped != 0):
    keyString = packetHeaderString + '(:' + str(packetErrorCount) + ')'
    packetErrorLog[keyString] = str(packetMessagesDropped)
  if (len(packetErrorLog) != 0):
    for packetError in packetErrorLog:
      errString = (colors.reset + colors.bold + colors.fg.red + ('%s: %s packet(s) dropped.' % (packetError, packetErrorLog[packetError]))) + colors.reset
      outputMessage(errString, 3)
    currentErrTime = getEpochTime()
    timeDiff = str(currentErrTime - botClassSessionData.nonErrMsgTime)
    errString = (colors.reset + colors.bold + colors.fg.yellow + ('%s prior successful packets.' % (str(botClassSessionData.nonErrMsg)))) + colors.reset
    outputMessage(errString, 3)
    intLoss = int((botClassSessionData.totalErrPackets / (botClassSessionData.totalSuccessPackets + botClassSessionData.totalErrPackets))*100)
    errString = (colors.reset + colors.bold + ('%s of %s total packet(s) dropped. %s percent loss. ' % (botClassSessionData.totalErrPackets, str(botClassSessionData.totalSuccessPackets + botClassSessionData.totalErrPackets), str(intLoss)))) + colors.reset
    outputMessage(errString, 3)
    outputMessage(colors.reset + colors.bold + ('Successful packet uptime: %s' % timeDiff) + colors.reset, 3)
    botClassSessionData.nonErrMsgTime = getEpochTime()
    botClassSessionData.nonErrMsg = 0

def processPBNMessage(botClass, botClassSessionData, msgString):
  noError = True
  commandDetected = False
  outputMessageString = False
  try:
    #msgString = '[Header(s)]:[messageString]'
    #Seperate headers from message string:
    msgStringList = msgString.split(':',1)
    headerString = msgStringList[0]
    messageString = msgStringList[1]
    #Clean up messageString:
    messageString = messageString[1:-1]
    #Generate list of header items:
    headerList = pbnProcessIncomingMessageHeaders(headerString)
    #Look for SERVER Headers
    #[SERVER][TIME], [SERVER][LOOK][ITEM] etc..
    botClassSessionData.currentLocalTime = getCurrentTime()
    currentLocalMessageTimeArray = botClassSessionData.currentLocalTime
    currentLocalMessageTimeString = ('%s/%s/%s@%s:%s:%s' % (currentLocalMessageTimeArray[2], currentLocalMessageTimeArray[1],currentLocalMessageTimeArray[0],currentLocalMessageTimeArray[3],currentLocalMessageTimeArray[4],currentLocalMessageTimeArray[5]))
    if (headerList[0] == 'SERVER'):
      if (headerList[1] == 'TIME'):
        commandDetected = True
        processedTime = pbnProcessIncomingTimeString(messageString, botClassSessionData)
        if (botClass.botOptions['pbnOutputTIMEToConsole']):
          if (processedTime):
            messageString = pbnGenerateOutgoingTimeString(botClassSessionData)
            outputMessageString = True
      if (headerList[1] == 'LOOK'):
        #AREA, PLAYER, ITEM
        commandDetected = True
        if (headerList[2]=='AREA'):
          #LOOK-AREA
          areaDict = pbnProcessIncomingLookAreaString(messageString)
          playerList = areaDict['playerList']
          itemList = areaDict['itemList']
          if (botClass.botOptions['pbnOutputLOOKAreaToConsole']):
            messageString = pbnGenerateOutgoingLookAreaString(playerList, itemList)
            outputMessageString = True        
        if (headerList[2]=='PLAYER'):
          #LOOK-PLAYER
          playerLoadoutDict = pbnProcessIncomingLookPlayerString(messageString)
          if (botClass.botOptions['pbnOutputLOOKPlayerToConsole']):
            #Console Output:
            messageString = pbnGenerateOutgoingLookPlayerString(playerLoadoutDict)
            outputMessageString = True
        if (headerList[2]=='ITEM'):
          #LOOK-ITEM
          itemDict = pbnProcessIncomingLookItemString(messageString)
          if (botClass.botOptions['pbnOutputLOOKItemToConsole']):
            messageString = pbnGenerateOutgoingLookItemString(itemDict)
            outputMessageString = True
        if (headerList[2]=='ERROR'):
          #print('LOOK-ERROR')
          if (botClass.botOptions['pbnOutputLOOKErrorToConsole']):
            outputMessageString = True
      if (headerList[1] == 'WHO'):
        #(WillKilll,standby,6362,8,14,Macleod Clan)(parabot,standby,0,0,0,Skynet)
        commandDetected = True
        whoDict = pbnProcessIncomingWhoString(messageString, botClass)
        if (botClass.botOptions['pbnOutputWHOToConsole']):
          messageString = pbnGenerateOutgoingWhoString(whoDict)
          outputMessageString = True
      if (headerList[1] == 'RWHO'):
        commandDetected = True
        serverList = pbnProcessIncomingRWhoString(messageString)
        #update botClass.botClassSessionData ['Servers']:
        if (botClass.botOptions['playerListAutoUpdate']):
          botClassSessionData.updateServers(botClass, serverList)
        if (botClass.botOptions['pbnOutputRWHOToConsole']):
          messageString = pbnGenerateOutgoingRWhoString(serverList)
          outputMessageString = True
      if (headerList[1] == 'STAT'):
        #[SERVER][STAT][PLAYER]
        #{Handle=parabot,ID=1558,TotalWorth=$6100,EverGames=0,EverBonus=0,EverSplats=0,EverAccuracy=0,EverGamesSurvived=0,EverBotSplats=0,EverPlayerSplats=0,CurrentBonus=0,CurrentSplats=0,CurrentAccuracy=0}
        if (headerList[2] == 'YOU'):
          commandDetected = True
          statDict = pbnProcessIncomingStatString(messageString)
          if (botClass.botOptions['pbnOutputSTATToConsole']):
            messageString = pbnGenerateOutgoingStatString(statDict)
            outputMessageString = True
        if (headerList[2] == 'PLAYER'):
          commandDetected = True
          #{Handle=parabot,ID=1558,TotalWorth=$6100,EverGames=0,EverBonus=0,EverSplats=0,EverAccuracy=0,EverGamesSurvived=0,EverBotSplats=0,EverPlayerSplats=0,CurrentBonus=0,CurrentSplats=0,CurrentAccuracy=0}
          if messageString == '':
            return
          statDict = pbnProcessIncomingStatPlayerString(messageString)
          if (botClass.botOptions['pbnOutputSTATPlayerToConsole']):
            messageString = pbnGenerateOutgoingStatPlayerString(statDict)
            outputMessageString = True
      if (headerList[1] == 'WELCOME'):
        commandDetected = True
        messageString = colors.reset + colors.fg.green + messageString + colors.reset
        if (botClass.botOptions['pbnOutputMOTDToConsole']):
          outputMessageString = True
      if (headerList[1] == 'GAME'):

        #[PBNBot][+]GAME: The next game is about to start.
        #[PBNBot][+]GAME: The next game is about to start.
        #[PBNBot][+]GAME: The game has started without you.\nUse 'game ready' if you wish to play in the next game.
        #[PBNBot][+]GAME: gh0stly splatted a dumb bot!
        #[PBNBot][+]GAME: gh0stly splatted a kamikazi bot!
        #[PBNBot][+]GAME: a chicken bot splatted gh0stly!
        #[PBNBot][+]GAME: The current Paintball Net Online Game time is: 2023/05/25 21:08:45
        #[PBNBot][+]GAME: DOUBLE DAYS are every Saturday.
        #[PBNBot][+]GAME: The game is over.\nThere were no survivors.
        #[PBNBot][+]GAME: There were no survivors.

        #[SERVER][GAME][STARTING]: 
        #[SERVER][GAME][STARTING]: playername
        #[SERVER][GAME][ENDING]: playername
        commandDetected = True
        #print(headerList)
        #print(messageString)
        if (len(headerList) > 2):
          if (headerList[2] == 'STARTING'):
            if messageString == '':
              #GAME: The next game is about to start
              #No need to output
              outputMessageString = False
          if (headerList[2] == 'ENDING'):
            adminName = messageString
            outputMessageString = True
            messageString = colors.reset + colors.bg.green + colors.bold + 'GAME:' + colors.reset + colors.bold + colors.fg.white + ' ' + adminName + colors.reset + colors.fg.green + ' set the game to END.' + colors.reset
          if (headerList[2] == 'START'):
            outputMessageString = True
            messageString = 'A game has started.'
          if (headerList[2] == 'END'):
            outputMessageString = True
            messageString = 'The game has ended.'
        else:
          messageString = colors.reset + colors.bg.green + colors.bold + 'GAME:' + colors.reset + colors.fg.green + ' ' + messageString + colors.reset
          outputMessageString = True
    elif (len(headerList) > 1):
      if (headerList[1] == 'CHAT'):
        commandDetected = True
        messageString = colors.reset + colors.bold + colors.fg.blue + 'YOU chat: ' + colors.reset + colors.bold + messageString + colors.reset
        if (botClass.botOptions['pbnOutputCHATToConsole']):
          outputMessageString = True
      elif (headerList[1] == 'CHATS'):
        commandDetected = True
        messageString = colors.reset + colors.bold + colors.fg.cyan + headerList[0] + colors.reset + colors.fg.cyan + ' chats: ' + colors.reset + messageString + colors.reset
        if (botClass.botOptions['pbnOutputCHATSToConsole']):
          outputMessageString = True
      elif (headerList[1] == 'TELL'):
        commandDetected = True
        messageString = colors.reset + colors.bold + colors.fg.red + 'YOU tell ' + colors.reset + colors.bold + headerList[2] + ': ' + messageString + colors.reset
        if (botClass.botOptions['pbnOutputTELLToConsole']):
          outputMessageString = True
      elif (headerList[1] == 'TELLS'):
        commandDetected = True
        messageString = colors.reset + colors.bold + headerList[0] + colors.reset + colors.bold + colors.fg.red + ' tells YOU: ' + colors.reset + messageString + colors.reset
        if (botClass.botOptions['pbnOutputTELLSToConsole']):
          outputMessageString = True
      elif (headerList[1] == 'RTELL'):
        commandDetected = True
        messageString = 'YOU rtell ' + headerList[2] + ': ' + messageString
        if (botClass.botOptions['pbnOutputRTELLToConsole']):
          outputMessageString = True
      elif (headerList[1] == 'RTELLS'):
        commandDetected = True
        messageString = headerList[0] + ' rtells YOU: ' + messageString
        if (botClass.botOptions['pbnOutputRTELLSToConsole']):
          outputMessageString = True
      elif (headerList[1] == 'PLAN'):
        commandDetected = True
        messageString = 'You plan: ' + messageString
        if (botClass.botOptions['pbnOutputPLANToConsole']):
          outputMessageString = True
      elif (headerList[1] == 'PLANS'):
        commandDetected = True
        messageString = headerList[0] + ' plans: ' + messageString
        if (botClass.botOptions['pbnOutputPLANSToConsole']):
          outputMessageString = True
      elif (headerList[1] == 'SAY'):
        commandDetected = True
        messageString = 'YOU say: ' + messageString
        if (botClass.botOptions['pbnOutputSAYToConsole']):
          outputMessageString = True
      elif (headerList[1] == 'SAYS'):
        commandDetected = True
        messageString = headerList[0] + ' says: ' + messageString
        if (botClass.botOptions['pbnOutputSAYSToConsole']):
          outputMessageString = True
      elif (headerList[1] == 'SHOUT'):
        commandDetected = True
        messageString = 'YOU shout: ' + messageString
        if (botClass.botOptions['pbnOutputSHOUTToConsole']):
          outputMessageString = True
      elif (headerList[1] == 'SHOUTS'):
        commandDetected = True
        messageString = headerList[0] + ' shouts: ' + messageString
        if (botClass.botOptions['pbnOutputSHOUTSToConsole']):
          outputMessageString = True
      elif (headerList[1] == 'WHISPER'):
        commandDetected = True
        messageString = 'YOU whisper: ' + messageString
        if (botClass.botOptions['pbnOutputWHISPERToConsole']):
          outputMessageString = True
      elif (headerList[1] == 'WHISPERS'):
        commandDetected = True
        messageString = headerList[0] + ' whispers: ' + messageString
        if (botClass.botOptions['pbnOutputWHISPERSToConsole']):
          outputMessageString = True
      elif (headerList[1] == 'TEAMCHAT'):
        commandDetected = True
        messageString = 'YOU teamchat: ' + messageString
        if (botClass.botOptions['pbnOutputTEAMCHATToConsole']):
          outputMessageString = True
      elif (headerList[1] == 'TEAMCHATS'):
        commandDetected = True
        messageString = headerList[0] + ' teamchats: ' + messageString
        if (botClass.botOptions['pbnOutputTEAMCHATSToConsole']):
          outputMessageString = True
      elif (headerList[1] == 'ANNOUNCE'):
        commandDetected = True
        messageString = 'YOU announce: ' + messageString
        if (botClass.botOptions['pbnOutputANNOUNCEToConsole']):
          outputMessageString = True
      elif (headerList[1] == 'ANNOUNCES'):
        commandDetected = True
        messageString = headerList[0] + ' announces: ' + messageString
        if (botClass.botOptions['pbnOutputANNOUNCESToConsole']):
          outputMessageString = True
 
    if(commandDetected and outputMessageString):
      if botClass.botOptions['pbnOutputCommandMessageTimestamp']:
        newString = '[' + currentLocalMessageTimeString + ']\n' + messageString
        messageString = newString
      outputMessage(messageString, 2)
  except Exception as e:
    noError = False
    return False
  finally:
    return noError

def isCommandString(string):
  commandList = [";", "alias", "assemble", "asm", "accept", "buy", "bots", "chat", "commands",  "crouch",  "drop",  "dump",  "east",  "equipment",  "examine", "email",  "fire",  "fill",  "get",  "give",  "game",  "help",  "inventory", "ignore", "look", "load", "list", "last", "north", "news", "offer", "put", "password", "plan", "quit", "reply", "remove", "ready", "reload", "rename", "renamechar", "resetgames", "report", "redeem", "rreply", "rtell", "rwho", "south", "say", "screen", "sell", "sellbig", "shout", "stand", "stat", "swap", "showaction", "tell", "target", "throw", "top10", "top25", "top100", "tournament", "team", "teamchat", "teamplan", "time", "unreply", "votes", "west", "wear", "whisper", "who"]
  stringArray = string.split(' ')
  if (len(stringArray) > 0):
    command = stringArray[0].lower()
    for commands in commandList:
      if (command == commands):
        return True
  return False

def promptForUserName():
  return input("[PBNBot][init]:Please enter a username: ")

def promptForPassword():
  return getpass.getpass(prompt='[PBNBot][init]:Please enter a password: ')

def promptForServer(botClass):
  outputMessage('Please choose a server to connect to:', 1)
  outputMessage('1=Beginner, 2=Primary, 3=Tournament', 1)
  userInput = input('[PBNBot][init]:[1-3]: ')
  if (userInput == '1'):
    return botClass.botConfig['beginnerServerID']
  elif (userInput == '2'):
    return botClass.botConfig['primaryServerID']
  elif (userInput == '3'):
    return botClass.botConfig['tournamentServerID']
  else:
    #default if wrong input
    return botClass.botConfig['primaryServerID']

def getConnectedServerName(botClass):
  if (botClass.botOptions['serverToConnect'] == botClass.botConfig['beginnerServerID']):
    return 'beginner'
  elif (botClass.botOptions['serverToConnect'] == botClass.botConfig['primaryServerID']):
    return 'primary'
  elif (botClass.botOptionsp['serverToConnect'] == botClass.botConfig['tournamentServerID']):
    return 'tournament'
  else:
    return False

def outputMessage(msgString, msgType=0, msgOutput=1, filePath=''):
  #Built output string:
  outputString = '[PBNBot]'
  #msgType(s):
  #0-[PBNBot]: <Message>
  #1-[PBNBot][init]: <Message>
  #2-[PBNBot][+]<Message> 
  #3-[PBNBot][session]: <Message>
  
  #msgOutput(s):
  #1-console
  #2-log

  if (msgType == 0):
    outputString += ': '
  elif (msgType == 1):
    outputString += '[init]:'
  elif (msgType == 2):
    outputString += '[+]'
  elif (msgType == 3):
    outputString += '[session]:' 
  
  outputString += msgString
  
  if (msgOutput == 1):
    print(outputString)

def processCommandList(botClass, sessionData):
  commandList = getCommandList(botClass.botOptions['commandListFile'])
  if (commandList != False):
    for commandString in commandList:
      if (isCommandString(commandString.strip())):
        if ((commandString.strip().lower()) == "quit"):
          botClass.logoutPBN(sessionData)
          return "BOT_QUIT"
          #break
        else:
          #Dispatch PBN Command to browser
          botClass.pbnSendCommand(commandString.strip())
      #else:
        #Check if command to be dispacted to bot
    #Commands were processed, return true
    return True
  else:
    #command list was empty
    return False

#This function does not belong here... and is named horribly
def processUserListText(textString):

  #parabot                  |standby   |    0|0| |Skynet
  #Freeze  A  TM            |standby   |115915|8|*|All Legends Team

  #If string does not contain '|' .. bypass.  Its a sub-child string from an admin/tm

  tempList = textString.split('|')

  if len(tempList) == 1:
    return
  tempString = tempList[0]
  userName = tempString.split('  ')[0]
  #Seperate admin status here too
  print(userName)
  userStatus = (tempList[1].split(' '))[0]
  print(userStatus)
  userSplatsPos = len(tempList[2].split(' '))
  userSplats = (tempList[2].split(' '))[(userSplatsPos - 1)]
  print(userSplats)
  userBots = tempList[3]
  print(userBots)
  userIdle = tempList[4]
  print(userIdle)
  userTeam = tempList[5]
  print(userTeam)
  #print('%s, %s, %s, %s, %s, %s' % userName, userStatus, userSplats, userBots, userIdle, userTeam)

# ###########################
# # File Handling functions #
# ###########################

def whipeFileContents(filePath):
  fileToWhipe = open(filePath, 'w').close()

def readFileToArray(filePath):
  fileToRead = open(filePath, 'r')
  fileLines = fileToRead.readlines()
  fileToRead.close()
  return fileLines

# #################################
# # PBN-Specific String functions #
# #################################

def pbnProcessIncomingMessageHeaders(headerString):
  headerList = headerString.split(']')
  i = 0
  tempHeaderList = []
  for headerItem in headerList:
    if (headerItem != ''):
      newString = headerItem[1:]
      tempHeaderList.append(newString)
    i += 1
  return tempHeaderList

def pbnProcessIncomingLookAreaString(messageString):
  playerList = []
  itemList = []
  if (messageString != 'You don\'t see anything here.'):
    tempList = messageString.split('}')
    tempString = tempList[0][9:-1]
    if (tempString != ''):
      #check if multiple people
      if (',' in tempString):
        #Has multiple players
        tempList = tempString.split(',')
        for item in tempList:
          playerList.append(item)
      else:
        #Add single player
        playerList.append(tempString)
    tempString = tempList[1][7:-1]
    #Items list:
    if (tempString != ''):
      #check if multiple people
      if (',' in tempString):
        #Has multiple players
        tempList = tempString.split(',')
        for item in tempList:
          itemList.append(item)
      else:
        #Add single player
        itemList.append(tempString)
  return {'playerList': playerList, 'itemList': itemList}

def pbnProcessIncomingLookPlayerString(messageString):
  tempString = messageString[1:-1]
  tempString1 = tempString.replace('\\', '')
  tempString = tempString1
  tempList = tempString.split('",')
  newDict = {}
  newDict['playerHandle'] = tempList[0][8:]
  newDict['playerGender'] = tempList[1][8:]
  newDict['wearHead'] = tempList[2][6:]
  newDict['wearEyes'] = tempList[3][6:]
  newDict['wearNeck'] = tempList[4][6:]
  newDict['wearRShoulder'] = tempList[5][11:]
  newDict['wearLShoulder'] = tempList[6][11:]
  newDict['wearRHand'] = tempList[7][7:]
  newDict['wearLHand'] = tempList[8][7:]
  newDict['wearBody'] = tempList[9][6:]
  newDict['wearWaist'] = tempList[10][7:]
  newDict['wearLegs'] = tempList[11][6:]
  newDict['wearFeet'] = tempList[12][6:-1]
  return newDict
  

def pbnProcessIncomingLookItemString(messageString):
  itemDict = {}
  tempString = messageString[:-1]
  tempList = tempString.split('=')
  itemDict['itemName'] = (tempList[1].split(','))[0]
  itemDict['itemWear'] = (tempList[2].split(','))[0]
  itemDict['itemMadeOf'] = (tempList[3].split(','))[0]
  itemDict['itemCapacity'] = (tempList[4].split(','))[0]
  itemDict['itemCarrying'] = {}
  itemDict['itemGPS'] = tempList[6]
  if (((tempList[5].split(','))[0]) != ''):
    tempString = tempList[5][1:-5]
    tempList = tempString.split('*')
    tempKey = tempList[2]
    tempValue = tempList[1]
    if ((tempKey[len(tempKey)-1]) == ','):
      tempKey = tempKey[:-1]
    itemDict['itemCarrying'][tempKey] = tempValue
    if (len(tempList) > 3):
       extraItems = int(((len(tempList) - 3) / 2))
       for i in range(extraItems + 1):
          k = (3 + (2 * i)) - 1
          v = k - 1
          tempKey = tempList[k]
          tempValue = tempList[v]
          if (tempKey[(len(tempKey)-1)] == ','):
            tempKey = tempKey[:-1]
          itemDict['itemCarrying'][tempKey] = tempValue
  return itemDict

def pbnProcessIncomingStatString(messageString):
  tempString = messageString[1:-1]
  tempList = tempString.split(',')
  statDict = {}
  statDict['playerHandle'] = tempList[0][7:]
  statDict['playerID'] = tempList[1][3:]
  statDict['cashOnHand'] = tempList[2][11:]
  statDict['totalWorth'] = tempList[3][12:]
  statDict['currentCarryWeight'] = tempList[4][19:]
  statDict['totalCarryWeight'] = tempList[5][17:]
  statDict['everGames'] = tempList[6][10:]
  statDict['everBonus'] = tempList[7][10:]
  statDict['everACC'] = tempList[8][13:]
  statDict['everGamesSurvived'] = tempList[9][18:]
  statDict['everBotSplats'] = tempList[10][14:]
  statDict['everPlayerSplats'] = tempList[11][17:]
  statDict['currentBonus'] = tempList[12][13:]
  statDict['currentSplats'] = tempList[13][14:]
  statDict['currentACC'] = tempList[14][16:]
  statDict['currentTeamBonus'] = tempList[15][17:]
  statDict['currentTeamSplats'] = tempList[16][18:]
  statDict['currentTeamACC'] = tempList[17][20:]
  statDict['everTeamBonus'] = tempList[18][14:]
  statDict['everTeamSplats'] = tempList[19][15:]
  statDict['everTeamACC'] = tempList[20][17:]
  tempList = messageString.split('EQ={')
  tempString = tempList[1]
  tempList = tempString.split('},Standing')
  tempString = tempList[0]
  tempList = tempString.split(',')
  statDict['eqHead'] = tempList[0][5:]
  statDict['eqEyes'] = tempList[1][5:]
  statDict['eqNeck'] = tempList[2][5:]
  statDict['eqRShoulder'] = tempList[3][10:]
  statDict['eqLShoulder'] = tempList[4][10:]
  statDict['eqRHand'] = tempList[5][6:]
  statDict['eqLHand'] = tempList[6][6:]
  statDict['eqBody'] = tempList[7][5:]
  statDict['eqWaist'] = tempList[8][6:]
  statDict['eqLegs'] = tempList[9][5:]
  statDict['eqFeet'] = tempList[10][5:]
  tempList = messageString.split(',Standing')
  tempString = tempList[1]
  tempList = tempString.split(',')
  statDict['isStanding'] = tempList[0][1:]
  tempList = messageString.split(',InGame')
  tempString = tempList[1]
  tempList = tempString.split('{')
  statDict['inGame'] = tempList[0][1:]
  tempList = messageString.split('InGameBonus')
  tempString = tempList[1]
  tempList = tempString.split(',')
  statDict['inGameBonus'] = tempList[0][1:]
  statDict['inGameSplats'] = tempList[1][13:]
  statDict['inGameACC'] = tempList[2][15:-2]
  return statDict

def pbnProcessIncomingStatPlayerString(messageString):
  tempString = messageString[1:-1]
  tempList = tempString.split(',')
  statDict = {}
  statDict['playerHandle'] = tempList[0][7:]
  statDict['playerID'] = tempList[1][3:]
  statDict['playerTotalWorth'] = tempList[2][12:]
  statDict['everGames'] = tempList[3][10:]
  statDict['everBonus'] = tempList[4][10:]
  statDict['everSplats'] = tempList[5][11:]
  statDict['everACC'] = tempList[6][13:]
  statDict['everGamesSurvived'] = tempList[7][18:]
  statDict['everBotSplats'] = tempList[8][14:]
  statDict['everPlayerSplats'] = tempList[9][17:]
  statDict['currentBonus'] = tempList[10][13:] 
  statDict['currentSplats'] = tempList[11][14:]
  statDict['currentACC'] = tempList[12][16:]
  return statDict

def pbnProcessIncomingTimeDDayString(messageString, botClassSessionData):
  #Set botClassSessionData.DDayFlag (True/False)
  stringList = messageString.split(' ')
  if (stringList[0] == 'DOUBLE'):
    tempDDay = stringList[4]
    tempDDay = tempDDay[:-1]
    botClassSessionData.DDayFlag = False
    currentDOW = str(getCurrentTime('dw'))
    if (tempDDay == 'Sunday' and currentDOW == '6'):
      botClassSessionData.DDayFlag = True
    elif (tempDDay == 'Monday' and currentDOW == '0'):
      botClassSessionData.DDayFlag = True
    elif (tempDDay == 'Tuesday' and currentDOW == '1'):
      botClassSessionData.DDayFlag = True
    elif (tempDDay == 'Wednesday' and currentDOW == '2'):
      botClassSessionData.DDayFlag = True
    elif (tempDDay == 'Thursday' and currentDOW == '3'):
      botClassSessionData.DDayFlag = True
    elif (tempDDay == 'Friday' and currentDOW == '4'):
      botClassSessionData.DDayFlag = True
    elif (tempDDay == 'Saturday' and currentDOW == '5'):
      botClassSessionData.DDayFlag = True

def pbnProcessIncomingTimeString(msgString, botClassSessionData):
  #Set botClassSessionData.currentLocalTime, botClassSessionData.currentServerTime, botClassSessionData.currentLocalBrowserTime
  processedTime = False
  pbnProcessIncomingTimeDDayString(msgString, botClassSessionData)
  if (((msgString.split(' '))[0]) != 'DOUBLE'):
    tempList = getCurrentTime()
    counter = 0
    currentLocalTimeList = []
    currentServerTimeList = []
    currentBrowserTimeList = []
    for item in tempList:
      if (counter > 5):
        break
      else:
        item = int(item)
        if (item < 10):
          item = '0' + str(item)
        currentLocalTimeList.append(str(item))
        counter += 1
    botClassSessionData.currentLocalTime = currentLocalTimeList #[Y,M,D,h,m,s]
    tempList = msgString.split(')')
    tempStr = tempList[0]
    #(Y=2023,M=05,D=17
    tempList = tempStr.split(',')
    #['(Y=2023', 'M=05', 'D=17']
    tempStr = tempList[0]
    tempStr = tempStr[3:] #Trim off (Y=
    currentServerTimeList.append(tempStr) #Year Logged
    tempStr = tempList[1]
    tempStr = tempStr[2:]
    currentServerTimeList.append(tempStr) #Month Logged
    tempStr = tempList[2]
    tempStr = tempStr[2:]
    currentServerTimeList.append(tempStr) #Day Logged
    tempList = msgString.split(')')
    tempStr = tempList[1]
    #(h=03,m=54,s=42
    tempList = tempStr.split(',')
    #['(h=03','m=54','s=42']
    tempStr = tempList[0]
    tempStr = tempStr[3:]
    currentServerTimeList.append(tempStr) # Hour Logged
    tempStr = tempList[1]
    tempStr = tempStr[2:]
    currentServerTimeList.append(tempStr) # Minute Logged
    tempStr = tempList[2]
    tempStr = tempStr[2:]
    currentServerTimeList.append(tempStr) #Seconds Logged
    botClassSessionData.currentServerTime = currentServerTimeList
    #set botClassSessionData.currentLocalBrowserTime[]
    tempList = msgString.split(')')
    tempStr = tempList[2]
    #(lY=2023,lM=05,lD=16
    tempList = tempStr.split(',')
    tempStr = tempList[0]
    tempStr = tempStr[4:]
    currentBrowserTimeList.append(tempStr) # Year Logged
    tempStr = tempList[1]
    tempStr = tempStr[3:]
    currentBrowserTimeList.append(tempStr) # Month Logged
    tempStr = tempList[2]
    tempStr = tempStr[3:]
    currentBrowserTimeList.append(tempStr) # Day Logged
    tempList = msgString.split(')')
    tempStr = tempList[3]
    #(lh=20,lm=54,ls=43
    tempList = tempStr.split(',')
    tempStr = tempList[0]
    tempStr = tempStr[4:]
    currentBrowserTimeList.append(tempStr) # Hours Logged
    tempStr = tempList[1]
    tempStr = tempStr[3:]
    currentBrowserTimeList.append(tempStr) # Minutes Logged
    tempStr = tempList[2]
    tempStr = tempStr[3:]
    currentBrowserTimeList.append(tempStr) # Seconds Logged
    botClassSessionData.currentLocalBrowserTime = currentBrowserTimeList
    processedTime = True
  return processedTime

def pbnProcessIncomingWhoString(messageString, botClass):
  #(WillKilll,standby,6362,8,14,Macleod Clan)(parabot,standby,0,0,0,Skynet)
  whoDict = {}
  serverName = getConnectedServerName(botClass)
  playerList = {}
  tempList = messageString.split(')')
  for tempString in tempList:
    if (tempString == ''):
      continue
    #print('Adding a player')
    tempString = tempString[1:]
    stringItems = tempString.split(',')
    playerList[stringItems[0]] = {}
    playerList[stringItems[0]]['status'] = stringItems[1]
    playerList[stringItems[0]]['splats'] = stringItems[2]
    playerList[stringItems[0]]['bots'] = stringItems[3]
    playerList[stringItems[0]]['idle'] = stringItems[4]
    playerList[stringItems[0]]['team'] = stringItems[5]
  whoDict['playerList'] = playerList
  playerCount = len(playerList)
  whoDict['playerCount'] = str(playerCount)
  whoDict['serverName'] = serverName
  return whoDict

def pbnProcessIncomingRWhoString(messageString):
  serverList = {}
  tempList = messageString.split('}')
  for listItem in tempList:
    if (listItem == ''):
      continue
    listItem = listItem[1:]
    tempName = listItem.split('(')[0]
    serverList[tempName] = []
    players = ((listItem.split('(')[1])[:-1]).split(',')
    for player in players:
      serverList[tempName].append(player)
  return serverList

def pbnGenerateOutgoingTimeString(botClassSessionData):
  currentServerTimeList = botClassSessionData.currentServerTime
  currentBrowserTimeList = botClassSessionData.currentLocalBrowserTime
  currentLocalTimeList = botClassSessionData.currentLocalTime
  messageString = 'Server Time (%s/%s/%s %s:%s:%s) ' % (currentServerTimeList[0],currentServerTimeList[1],currentServerTimeList[2],currentServerTimeList[3],currentServerTimeList[4],currentServerTimeList[5]) #YYYY/MM/DD HH/MM/SS
  messageString += ' Browser Time (%s/%s/%s %s:%s:%s) ' % (currentBrowserTimeList[0],currentBrowserTimeList[1],currentBrowserTimeList[2],currentBrowserTimeList[3],currentBrowserTimeList[4],currentBrowserTimeList[5]) #YYYY/MM/DD HH/MM/SS
  messageString += ' Local Time (%s/%s/%s %s:%s:%s) ' % (currentLocalTimeList[0],currentLocalTimeList[1],currentLocalTimeList[2],currentLocalTimeList[3],currentLocalTimeList[4],currentLocalTimeList[5]) #YYYY/MM/DD HH/MM/SS
  if (botClassSessionData.DDayFlag):
    messageString += ' *Double Day*'
  return messageString

def pbnGenerateOutgoingLookAreaString(playerList, itemList):
  messageString = '\nYou See:\nPlayers: '
  for player in playerList:
    messageString += player
    if (playerList.index(player) != (len(playerList)-1)):
      messageString += ', '
  messageString += '\nItems: '
  for item in itemList:
    messageString += item
    if (itemList.index(item) != (len(itemList)-1)):
      messageString += ', '
  return messageString

def pbnGenerateOutgoingLookPlayerString(playerLoadoutDict):
  messageString = '\nYou see:\n' + playerLoadoutDict['playerHandle'] + '\n'
  if (playerLoadoutDict['playerGender'] != ''):
    messageString += 'Gender: ' + playerLoadoutDict['playerGender'] + '\n'
  messageString += 'Wearing:\n'
  if (playerLoadoutDict['wearHead'] != ''):
    messageString += 'Head: ' + playerLoadoutDict['wearHead'] + '\n'
  if (playerLoadoutDict['wearEyes'] != ''):
    messageString += 'Eyes: ' + playerLoadoutDict['wearEyes'] + '\n'
  if (playerLoadoutDict['wearNeck'] != ''):
    messageString += 'Neck: ' + playerLoadoutDict['wearNeck'] + '\n'
  if (playerLoadoutDict['wearRShoulder'] != ''):
    messageString += 'RShoulder: ' + playerLoadoutDict['wearRShoulder'] + '\n'
  if (playerLoadoutDict['wearLShoulder'] != ''):
    messageString += 'LShoulder: ' + playerLoadoutDict['wearLShoulder'] + '\n'
  if (playerLoadoutDict['wearRHand'] != ''):
    messageString += 'RHand: ' + playerLoadoutDict['wearRHand'] + '\n'
  if (playerLoadoutDict['wearLHand'] != ''):
    messageString += 'LHand: ' + playerLoadoutDict['wearLHand'] + '\n'
  if (playerLoadoutDict['wearBody'] != ''):
    messageString += 'Body: ' + playerLoadoutDict['wearBody'] + '\n'
  if (playerLoadoutDict['wearWaist'] != ''):
    messageString += 'Waist: ' + playerLoadoutDict['wearWaist'] + '\n'
  if (playerLoadoutDict['wearLegs'] != ''):
    messageString += 'Legs: ' + playerLoadoutDict['wearLegs'] + '\n'
  if (playerLoadoutDict['wearFeet'] != ''):
    messageString += 'Feet: ' + playerLoadoutDict['wearFeet'] + '\n'
  return messageString

def pbnGenerateOutgoingLookItemString(itemDict):
  messageString = '\nItem:\n'
  if (itemDict['itemName'] != ''):
    messageString += 'Name: ' + itemDict['itemName'] + '\n'
  if (itemDict['itemWear'] != ''):
    messageString += 'Wear Location: ' + itemDict['itemWear'] + '\n'
  if (itemDict['itemMadeOf'] != ''):
    messageString += 'Made of: ' + itemDict['itemMadeOf'] + '\n'
  if (itemDict['itemCapacity'] != ''):
    messageString += 'Capacity: ' + itemDict['itemCapacity'] + '\n'
  if (len(itemDict['itemCarrying']) != 0):
    messageString += 'Carrying:\n'
    for itemName in itemDict['itemCarrying']:
      messageString += '(' + itemDict['itemCarrying'][itemName] + ') - ' + itemName + '\n'
  if (itemDict['itemGPS'] != ''):
    messageString += 'GPS: ' + itemDict['itemGPS']
  return messageString

def pbnGenerateOutgoingStatString(statDict):
  messageString = '\nStat:\n%s(%s) $%s/$%s  %slb/%slb\n' % (statDict['playerHandle'], statDict['playerID'],statDict['cashOnHand'], statDict['totalWorth'], statDict['currentCarryWeight'], statDict['totalCarryWeight'])
  messageString += '(Ever):\n  Games: %s  Bonus: %s  Accuracy: %s\n' % (statDict['everGames'], statDict['everBonus'], statDict['everACC'])
  messageString += '  Games Survived: %s  Bot Splats: %s  Player Splats: %s\n' % (statDict['everGamesSurvived'], statDict['everBotSplats'], statDict['everPlayerSplats'])
  messageString += '(Current):\n  Bonus: %s  Splats: %s  Accuracy: %s\n' % (statDict['currentBonus'], statDict['currentSplats'], statDict['currentACC'])
  messageString += '(Team Current):\n  Bonus: %s  Splats: %s  Accuracy: %s\n' % (statDict['currentTeamBonus'], statDict['currentTeamSplats'], statDict['currentTeamACC'])
  messageString += '(Team Ever):\n  Bonus: %s  Splats: %s  Accuracy: %s\n' % (statDict['everTeamBonus'], statDict['everTeamSplats'], statDict['everTeamACC'])
  messageString += 'Head: %s\n  Eyes: %s\n  Neck: %s\n  RShoulder: %s\n  LShoulder: %s\n  RHand: %s\n  LHand: %s\n  Body: %s\n  Waist: %s\n  Legs: %s\n  Feet: %s\n' % (statDict['eqHead'], statDict['eqEyes'], statDict['eqNeck'], statDict['eqRShoulder'], statDict['eqLShoulder'], statDict['eqRHand'], statDict['eqLHand'], statDict['eqBody'], statDict['eqWaist'], statDict['eqLegs'], statDict['eqFeet'])
  messageString += 'Standing: %s  In Game: %s\nIn Game Stats:\n  Bonus: %s  Splats: %s  Accuracy: %s' % (statDict['isStanding'], statDict['inGame'], statDict['inGameBonus'], statDict['inGameSplats'], statDict['inGameACC'])
  return messageString

def pbnGenerateOutgoingStatPlayerString(statDict):
  messageString = '\nStat:\n%s(%s) Worth: $%s\n' % (statDict['playerHandle'], statDict['playerID'], statDict['playerTotalWorth'])
  messageString += '(Ever):\n  Games: %s  Bonus: %s  Splats: %s  Accuracy: %s\n' % (statDict['everGames'], statDict['everBonus'], statDict['everSplats'], statDict['everACC'])
  messageString += '  Games Survived: %s  Bot Splats: %s  Player Splats: %s\n' % (statDict['everGamesSurvived'], statDict['everBotSplats'], statDict['everPlayerSplats'])
  messageString += '(Current):\n  Bonus: %s  Splats: %s  Accuracy: %s' % (statDict['currentBonus'], statDict['currentSplats'], statDict['currentACC'])
  return messageString

def pbnGenerateOutgoingWhoString(whoDict):
  messageString = '\nServer: ' + whoDict['serverName'] + ' (' + whoDict['playerCount'] + ') players.\n'
  for player in whoDict['playerList']:
    messageString += player + ':\n'
    messageString += '  STATUS: ' + whoDict['playerList'][player]['status'] + '\n'
    messageString += '  SPLATS: ' + whoDict['playerList'][player]['splats'] + '\n'
    messageString += '    BOTS: ' + whoDict['playerList'][player]['bots'] + '\n'
    messageString += '    IDLE: ' + whoDict['playerList'][player]['idle'] + '\n'
    messageString += '    TEAM: ' + whoDict['playerList'][player]['team'] + '\n'
  return messageString

def pbnGenerateOutgoingRWhoString(serverDict):
  messageString = '\nServers:\n'
  for server in serverDict:
    messageString += server + ':\n'
    players = 0
    for player in serverDict[server]:
      if (player == ''):
        continue
      messageString += '    ' + player + '\n'
      players += 1
    messageString += '  [ ' + str(players) + ' players. ]\n'
  return messageString

# ###########################################
# # Generic string and array functions here #
# ###########################################

def searchArrayForString(arrayToSearch, stringToMatch):
  #Returns Line (#) in array where string was matched.
  #Else returns false
  i = 1
  for line in arrayToSearch:
    if (line.find(stringToMatch) != -1):
      return i
    else:
      i = i + 1
  return False #String was not matched

# ####################
# # Timing Functions #
# ####################

def getCurrentTime(timeRequest=''):
  #Use for storing data logs and output
  if (timeRequest == ''):
    #Return Array Type [y,ym,md,h,m,s,dw,dy,dst,ms]
    currentTime = time.localtime()
    mstime = str(round(getEpochTime() * 1000))
    newArray = []
    for i in range(9):
      newArray.append(str(currentTime[i]))
    newArray.append(mstime)
    return newArray
  else:
    timeRequest = str(timeRequest).lower()

  #Return String Type
  if (timeRequest == 'y') or (timeRequest == '0') or (timeRequest == 'year'):
    return time.localtime()[0]
  elif (timeRequest == 'ym') or (timeRequest == '1') or (timeRequest == 'month'):
    return time.localtime()[1]
  elif (timeRequest == 'md') or (timeRequest == '2') or (timeRequest == 'month-day'):
    return time.localtime()[2]
  elif (timeRequest == 'h') or (timeRequest == '3') or (timeRequest == 'hour'):
    return time.localtime()[3]
  elif (timeRequest == 'm') or (timeRequest == '4') or (timeRequest == 'min'):
    return time.localtime()[4]
  elif (timeRequest == 's') or (timeRequest == '5') or (timeRequest == 'sec'):
    return time.localtime()[5]
  elif (timeRequest == 'dw') or (timeRequest == '6') or (timeRequest == 'day-week'):
    return time.localtime()[6]
  elif (timeRequest == 'dy') or (timeRequest == '7') or (timeRequest == 'day-year'):
    return time.localtime()[7]
  elif (timeRequest == 'dst') or (timeRequest == '8'):
    return time.localtime()[8]
  elif (timeRequest == 'ms') or (timeRequest == '9') or (timeRequest == 'millisec'):
    return str(round(getEpochTime() * 1000))
  else:
    return False

def getEpochTime():
  #use for timing in the bot for trigger functions
  return time.time()

class colors:

  reset = '\033[0m'
  bold = '\033[01m'
  disable = '\033[02m'
  underline = '\033[04m'
  reverse = '\033[07m'
  strikethrough = '\033[09m'
  invisible = '\033[08m'
  class fg:
    black = '\033[30m'
    red = '\033[31m'
    green = '\033[32m'
    orange = '\033[33m'
    blue = '\033[34m'
    purple = '\033[35m'
    cyan = '\033[36m'
    lightgrey = '\033[37m'
    darkgrey = '\033[90m'
    lightred = '\033[91m'
    lightgreen = '\033[92m'
    yellow = '\033[93m'
    lightblue = '\033[94m'
    pink = '\033[95m'
    lightcyan = '\033[96m'

  class bg:
    black = '\033[40m'
    red = '\033[41m'
    green = '\033[42m'
    orange = '\033[43m'
    blue = '\033[44m'
    purple = '\033[45m'
    cyan = '\033[46m'
    lightgrey = '\033[47m'