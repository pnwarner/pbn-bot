#!/bin/python3
#import time
from _pbnbot_selenium import *
from _pbnbot_selenium_bot_functions import *

class PBNBot:

  def __init__(self, botName='default'):
    self.botName = botName
    self.configFilePath = '../data/config/bot.conf'
    self.botConfigFilePath = '../data/config/bots/default.conf'
    self.browser=()
    self.pbnUserQuit = False
    self.sendingCommand = False
    self.botConfig = loadBotConfigFileToDict(self, self.configFilePath)
    self.botOptions = loadBotConfigFileToDict(self, self.botConfigFilePath)
    if (botName != 'default'):
      customConfigPath = '../data/config/bots/' + botName + '.conf'
      customConfig = loadBotConfigFileToDict(self, customConfigPath)
      for keyName in customConfig.keys():
        self.botOptions[keyName] = customConfig[keyName]
    if (self.botOptions['pbnAutoLogin']):
      self.startBot()


  class PBNSessionInfo:

    def __init__(self, botClass):
      self.loginStartTime = ''
      self.currentLocalTime = []
      self.currentLocalBrowserTime = []
      self.currentEpochTime = ''
      self.nonErrMsg = 0
      self.nonErrMsgTime = getEpochTime()
      self.totalSuccessPackets = 0
      self.totalErrPackets = 0
      self.currentServerTime = []
      self.beginnerPlayers = []
      self.primaryPlayers = []
      self.DDayFlag = False
      self.tournamentPlayers = []
      self.generatedCommandList = []
      self.currentLocation = ''
      self.cashOnHand = ''
      self.currentServer = ''
      self.Servers = {
        'Beginner': [],
        'Primary': [],
        'Tournament': []
      }
      self.Game = {}
      self.botClass = botClass
      #self.generatedCommandList.append('TIME')
      self.getTime()
      self.loginStartTime = self.currentServerTime
      self.currentServer = getConnectedServerName(botClass)
      #Player List updating
      if (botClass.botOptions['playerListAutoUpdate']):
        self.playerListAutoUpdateFirstRun = True
        self.playerListAutoUpdateStoredTime = getEpochTime()
        self.playerListAutoUpdatePause = botClass.botOptions['playerListAutoUpdatePauseTime']

    def updatePlayerLists(self):
      self.generatedCommandList.append("RWHO")

    def updateServers(self, botClass, serverDict = {}):
      messages = []
      for server in serverDict:
        messagesList = self.updateServer(botClass, server, serverDict[server])
        if messagesList != None:
          for message in messagesList:
            messages.append(message)
      if self.playerListAutoUpdateFirstRun:
        self.playerListAutoUpdateFirstRun = False
      else:
        if botClass.botOptions['playerListAutoUpdateToChat']:
          if (len(messages) != 0):
            for message in messages:
              self.generatedCommandList.append('CHAT %s' % message)

    def updateServer(self, botClass, serverKeyName = '', serverPlayerList = []):
      lastServerPlayerList = self.Servers[serverKeyName]
      if (serverPlayerList == ['']):
        serverPlayerList = []
      if (lastServerPlayerList != serverPlayerList):
        messages = []
        for player in lastServerPlayerList:
          if not player in serverPlayerList:
            if (serverKeyName.lower() == self.currentServer):
              messages.append(str('%s has logged out.' % player))
            else:
              messages.append(str('%s has logged out of %s server.' % (player, serverKeyName)))
        for player in serverPlayerList:
          if not player in lastServerPlayerList:
            if (serverKeyName.lower() == self.currentServer):
              messages.append(str('%s has logged in.' % player))
            else:
              messages.append(str('%s has logged in to %s server.' % (player, serverKeyName)))
        self.Servers[serverKeyName] = serverPlayerList
        return messages

    def getTime(self):
      self.generatedCommandList.append('TIME')


  def setPBNServerToConnect(self, nameString):
    if (nameString == 'beginner'):
      return self.botConfig['beginnerServerID']
    if (nameString == 'primary'):
      return self.botConfig['primaryServerID']
    if (nameString == 'tournament'):
      return self.botConfig['tournamentServerID']
    return ''

  def loadPBN(self):
    #outputMessage('Loading website..', 1)
    outputMessage('Initializing web browser. Please wait..', 1)
    if (self.botOptions['browserOption'] == False):
      outputMessage('Browser loaded with --headless mode.', 1)
    self.browser.get(self.botConfig['pbnHTTPAddress'])
    outputMessage('%s is loading..' % self.browser.title, 1)

  def logoutPBN(self, sessionData):
    #!######################!#
    # Disable Looped Threads #
    #!######################!#
    #Disable constant playerlist update:
    if self.botOptions['playerListAutoUpdate']:
      sessionData.playerListAutoUpdateRunFlag = False
    self.pbnSendCommand("quit")
    self.pbnUserQuit = True
    time.sleep(2)

  def loginPBN(self, serverID):
    #Load needed config variables if not defined:
    if (self.botOptions['username'] == ''):
      self.botOptions['username'] = promptForUserName()
    if (self.botOptions['password'] == ''):
      self.botOptions['password'] = promptForPassword()
    if (serverID == ''):
      self.botOptions['serverToConnect'] = promptForServer(self)
      serverID = self.botOptions['serverToConnect']
    loginResult = self.attemptLogin(serverID)
    if loginResult:
      #Login successful
      return True
    else:
      #Login failed
      return False

  def attemptLogin(self, serverID):
    try:
      outputMessage('Sign in as: %s.' % self.botOptions['username'], 1)
      textResult = insertTextToElement(self.browser, self.botConfig['usernameTextBoxID'], self.botOptions['username'])
      if not textResult:
        return False
      outputMessage('Inserting credentials.', 1)
      textResult = insertTextToElement(self.browser, self.botConfig['passwordTextBoxID'], self.botOptions['password'])
      if not textResult:
        return False
      #print('Selecting server to login to...')
      if (serverID == self.botConfig['beginnerServerID']):
        outputMessage('Beginner Server chosen.', 1)
      if (serverID == self.botConfig['primaryServerID']):
        outputMessage('Primary Server chosen.', 1)
      if (serverID == self.botConfig['tournamentServerID']):
        outputMessage('Tournament Server chosen.', 1)
      #05-22-2023 Attempt to Fix server getting crashed at night
      #This should help set the value
      clickResult = clickElement(self.browser, serverID)
      if not clickResult:
        return False
      outputMessage('Logging in..',1)
      clickResult = clickElement(self.browser, self.botConfig['loginButtonID'])
      if not clickResult:
        return False
      time.sleep(1)
      loginResult = self.checkIfLoginSuccessful
    except:
      return False
    #time.sleep(1)
    #Check if login was successful.
    #loginResult = self.checkIfLoginSuccessful()
    if loginResult:
      return True
    else:
      return False

  def attemptReLogin(self, serverID):
    self.browser.refresh()
    loginResult = self.attemptLogin(serverID)
    if loginResult:
      self.loadListener()
    return loginResult

  def autoReLogin(self):
    outputMessage('Attempting re-connect in ' + str(self.botOptions['waitForInitialReLogin']) + ' seconds.', 3)
    time.sleep(self.botOptions['waitForInitialReLogin'])
    if self.botOptions['pbnStayLoggedIn']:
      try:
        loginResult = self.attemptReLogin(self.botOptions['serverToConnect'])
      except:
        loginResult = False
      if loginResult:
        outputMessage('Re-Login sucessful.',3)
        gameRunningFlag = True
        while not loginResult:
          try:
            loginResult = self.attemptReLogin(self.botOptions['serverToConnect'])
          except:
            loginResult = False

          if loginResult:
            outputMessage('Re-Login sucessful.',3)
            self.gameRunningFlag = True
          else:
            outputMessage('Re-login not successful.  Try again in ' + str(self.botOptions['waitForReLogin']) + ' seconds.', 3)
            time.sleep(self.botOptions['waitForReLogin'])
        #First Re-Login Attempt Successful, keep game loop running
        gameRunningFlag = True
        #Let Script Catch up
        time.sleep(self.botOptions['catchUpDelay'])
      else:
        #Game servers or host may have gone down.
        #Refresh page, and start login sequence again
        self.browser.refresh()
        self.browser.get(self.botConfig['pbnHTTPAddress'])
        errorRetry = self.autoReLogin()
        gameRunningFlag = errorRetry
    return gameRunningFlag

  def checkIfLoginSuccessful(self):
    tempString = "Password for " + self.botOptions['username'] + " is incorrect."
    loginResult = findIfElementExistsByText(self.browser, tempString)
    if loginResult:
      #This is returning true even on incorrect pw, try a dbl check
      outputMessage('Login was incorrect.', 1)
      return False
    else:
      doubleCheck = self.pbnCheckLoggedIn()
      if doubleCheck:
        outputMessage('Login successful.', 1)
        return True
      else:
        outputMessage('Login was incorrect.', 1)
        return False

  def pbnCheckLoggedIn(self):
    try:
      inputBox = isElementPresentByID(self.browser, self.botConfig['commandInputID'])
      signInButton = isElementPresentByID(self.browser, self.botConfig['loginButtonID']) 
      if inputBox:
        inputElement = self.browser.find_element_by_id(self.botConfig['commandInputID'])
        if inputElement.is_displayed():
          return True
      if signInButton:
        logInButtonElement = self.browser.find_element_by_id(self.botConfig['loginButtonID'])
        if logInButtonElement.is_displayed():
          return False
    except:
      return False

  def checkUsersOnline(botClass):
    result = botClass.pbnCheckLoggedIn()
    if result:
      userCount = countElementsInParent(botClass.browser, botClass.botConfig['playerListID'], 'span')
    #print(str(userCount))
      whoList = getListOfElementTextInParent(botClass.browser, botClass.botConfig['playerListID'], 'span')
      for player in whoList:
        tempList = player.split('|')
        if len(tempList) == 1:
          #Expecting a string of either A or TM
          #Ignore
          continue
        print('[Player]:')
        #print(player)
        #Pass player text to be processed.
        processUserListText(player)
      return userCount

  def pbnSendCommand(self, commandString):
    if self.pbnCheckLoggedIn():
      runLoop = True
      while runLoop:
        result = insertTextToElement(self.browser, self.botConfig['commandInputID'], commandString, True)
        if result:
          runLoop = False
        else:
          if self.pbnCheckLoggedIn():
            print('Retry sending command.')
          else:
            break

  def loadListener(self):
    outputMessage('Load listener engine..', 1)
    loadSuccess = True
    try:
      injectJavaScriptFileToDOM(self.browser, "./listener.js")
    except:
      loadSuccess = False
    return loadSuccess
  
  def startSession(self):
    sessionData = self.PBNSessionInfo(self)
    return sessionData
  
  def closeBrowser(self, browser):
    self.browser.close()
    self.browser.quit()

  def startBot(self):
    clear()
    outputMessage('[ Starting ]')
    self.browser = startChromiumBrowser(self.botOptions['browserOption'], self.botOptions['browserInitType'])
    if (self.browser != False):
      self.loadPBN() #Load Website
      listenerRunningFlag = self.loadListener() #Load console listener before sign-in
      if not listenerRunningFlag:
        outputMessage('Error Loading Listener. Shutting down.',1)
        self.closeBrowser(self.browser)
        return
      #Website Loaded. Attempt Login, return result of True or False
      loginResult = self.loginPBN(self.botOptions['serverToConnect'])
      #Begin listening to Browser Console
      if loginResult:
        gameRunningFlag = True
        sessionData = self.startSession() #Initialize new session
      else:
        #Include any loop to re-try login here
        gameRunningFlag = False
        self.closeBrowser(self.browser)
        outputMessage('Error logging in. Shutting down.',1)
        return
      #Grab current EPOCH time here on first run, and set time for looping functions.
      #currentEpochTime = getEpochTime()
      tempTime1 = getEpochTime()
      tempTime2 = getEpochTime()
      listupdatecounter = 0
      timecounter = 0
      #storeEpochTime = getEpochTime()
      while (gameRunningFlag & listenerRunningFlag):
        try:
          getConsoleLog(self.browser, self, sessionData)
          #Send any needed responses to Command file
          if self.pbnCheckLoggedIn():
            #Do stuff here while logged In:
            #Read, attempt to execute, and clear <self.botOptions['commandListFile']> file every Cycle:
            #Manual User Commands FIRST:
            processCommandResult = processCommandList(self, sessionData)
            if not processCommandResult == "BOT_QUIT":
              if processCommandResult:
                #Skip Processing Bot Commands after recieving user command this cycle
                continue

            #Now grab a current List of Bot generated commands:
            tempCommandList = sessionData.generatedCommandList
            sessionData.generatedCommandList = []

            for commandString in tempCommandList:
              self.pbnSendCommand(commandString)
              time.sleep(self.botOptions['botSendCommandPause'])
            if (len(tempCommandList) != 0):
              #Executed bot generated commands.  Wait another cycle before generating more.
              continue

            #Execute any looping time functions based off program Epoch Time:
            # ####################################
            # # Custom Looped bot functions here #
            # ####################################


            # ######################################
            # # End of custom looped bot functions #
            # ######################################

            #self.logoutPBN() was called, and pbnUserQuit is set to True.
            #-auto-login will be overridden.
            if self.pbnUserQuit:
              outputMessage('User logout. Goodbye.',3)
              #self.closeSessionThreads(sessionData) #Disable Looped Threads
              gameRunningFlag = False
              self.botOptions['pbnStayLoggedIn'] = False
          else:
            ########################################
            #Do actions here if logout is detected.#
            ########################################
            if not self.pbnUserQuit:
              outputMessage('Bot was unexpectedly disconnected.',3)
              if self.botOptions['pbnStayLoggedIn']:
                gameRunningFlag = self.autoReLogin()                
              else:
                gameRunningFlag = False
          #####################################
          #Pause Time (if any) between cycles.#
          #####################################
          if (self.botOptions['botCyclePauseTime'] != False):
            time.sleep(self.botOptions['botCyclePauseTime'])
        except KeyboardInterrupt:
          outputMessage("Ctrl + C was hit, ungraceful shutdown.",0)
          self.logoutPBN(sessionData)
          self.closeBrowser(self.browser)
          break
      outputMessage('Listener Loop broken.')
      outputMessage('Graceful browser shutdown.')
      self.closeBrowser(self.browser)
      outputMessage('Done.')
    else:
      outputMessage('Error loading browser driver! Closing', 1)
      self.closeBrowser(self.browser)
