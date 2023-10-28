var overlayScrollId = 'Component150';
var overlayScrollClass = 'TPBTOverlayScrollItem';
var welcomeMsgSample = '\u003Cb>Welcome to the reboot of Paintball Net!\u003C/b>'

var senderHandle = '';
var recieverHandle = '';
var currentAction = '';
var currentMessage = '';
var skipProcessingFlag = false;
var playerMessageFlag = false;
var abortLogFlag = false;

var currentNodeId = '';
var nodeElements = 0;

//Experimental: Keep PBN Session log cleared
//Should be used as its js file
//var pbnSessionLog = document.getElementById("Component189");
//pbnSessionLog.addEventListener("DOMNodeInserted", function (event) {
//    pbnSessionLog.removeChild(pbnSessionLog.lastChild);
//});
//End experiment

var parentElement = document.getElementById(overlayScrollId);
parentElement.addEventListener("DOMNodeInserted", function (event) {
  var targetNode = event.target;
  if (event.relatedNode == parentElement) {
    //Node detected being added to defined parent element
    //Check if its a parent element that needs to be logged:
    if (targetNode.classList.contains(overlayScrollClass)) {
      var newNodeId = targetNode.id;
      //Remove element from DOM after getting info
      //This can be removed if not for a bot
      //*Experiment
      //Keeps the screen clear from Bot noise if need be
      //if (currentNodeId != '') {
      //  remElement = document.getElementById(currentNodeId);
        //parentElement.removeChild(parentElement.lastChild);
      //  parentElement.removeChild(remElement);
      //}
      currentNodeId = newNodeId;
      //console.log('[PBN]Adding [NEW] element! - Event 1');
      //Reset stored player data and actions:
      senderHandle = '';
      recieverHandle = '';
      currentAction = '';
      currentMessage = '';
      skipProcessingFlag = false;
      abortLogFlag = false;
      nodeElements = 0;
    }
  }
  if (event.relatedNode == document.getElementById(currentNodeId)) {
    //Span element should have been added to this node
    //console.log('[PBN]Adding to [EXISTING] element! - Event 2');
    var formatString = formatPBNScrollSpanText(getElementSpanText(currentNodeId, 0), nodeElements);
    if (!abortLogFlag) {
      console.log('[PBN]' + formatString);
    }
    nodeElements++;
  }
});

function getElementSpanText(elementId, spanPOS) {
  var spans = document.getElementById(elementId).getElementsByTagName("span");
  span = spans[spanPOS];
  return span.innerHTML;
}

function formatPBNScrollSpanText(rawString, nodeElements) {
  //console.log("[" + nodeElements + "]" + rawString);
  if (nodeElements >= 1) {
    var stringArray = rawString.split("\n");
    var currentMessage = stringArray[nodeElements];
    //If a new line is added to span: Skip processing user, and command type
    skipProcessingFlag = true;
    //Look for any additional /n items that were placed in this time around, and send them to console
    var lineLength = stringArray.length;
    if ((nodeElements + 1) < lineLength) {
      var exitvalue = 0;
      for (let i = (nodeElements + 1); i != lineLength; i++) {
        //If <span> inside of Element has more than 1 '/n' newline:
        //-stringArray[0] should have been processed.
        //Handle processing new lines between stringArray[0] and stringArray[lineLength]:  
        currentMessage = stringArray[i - 1];
        refinedMessage = refinePBNScrollText(skipProcessingFlag, rawString, currentMessage, abortLogFlag);
        if (refinedMessage != 'ABORT_LOG') {
          console.log('[PBN]' + refinePBNScrollText(skipProcessingFlag, rawString, currentMessage, abortLogFlag));
        }
        exitvalue = i;
      }
      //Finally process last line of stringArray:
      currentMessage = stringArray[exitvalue];
    }
  } else {
    //First determine most common string pattern for COMMUNICATION:
    //Server messages, and player communication will have a bold tag.
    // '\u003Cb> \u003C/b>' '\u003C' = '<' '<b> </b>'
    
    // ##############################
    // # Log Server/Player Messages #
    // ##############################

    var stringSearchResult = rawString.search('\u003Cb>');

    // #####################################
    // # Log Welcome/MOTD & Communications #
    // #####################################
    if (stringSearchResult != -1) {
      //Bold Tag found in string
      
      // #######################
      // # Log Welcome Message #
      // #######################
      
      if ((rawString.search(welcomeMsgSample)) != -1) {
        //We are logging the welcome message
        skipProcessingFlag = true;
        tempInfo = false;
        senderHandle = 'SERVER';
        currentAction = 'WELCOME'
        currentMessage = rawString;
        welcomeStringArray = [];
        welcomeStringArray = rawString.split("\n");
        welcomeTags = ['\u003Cb>', '\u003C/b>', '\u003Cbr>', '\u003Ca href=\"', '\" target=\"_blank\">https://discord.gg/J3HUUDC\u003C/a>', '\" target=\"_blank\">https://www.facebook.com/groups/59938320562/\u003C/a>'];
        welcomeStringArray.forEach(function (welcomeStringItem) {
          welcomeTags.forEach(function (welcomeTag) {
            welcomeStringItem = welcomeStringItem.replace(welcomeTag, '');
          });
          currentMessage = welcomeStringItem;
          console.log('[PBN]' + refinePBNScrollText(skipProcessingFlag, rawString, currentMessage, abortLogFlag));
        });
        skipProcessingFlag = false;
        abortLogFlag = true;

      // #####################
      // # Log Communication #
      // #####################
      } else {
        //Welcome Message not found, handle communication.
        //We will assume we have a correctly formatted string [Communication Action]:<Message>
        //Seperate actions from messaage with ':' delimiter
        
        // ############################
        // # Log Player Communication #
        // ############################
        
        var stringArray = rawString.split(':');
        var tempString = stringArray[0];
        //REMOVE BOLD TAGS:
        tempString = tempString.replace('\u003Cb>', '');
        tempString = tempString.replace('\u003C/b>', '');
        //processCommunication([searchString],[Action],[skipProcessingFlag],[senderFlag],[recieverFlag],[playerMessageFlag],[tempString]);
        tempInfo = processCommunication(' tells you', 'TELLS', skipProcessingFlag, false, true, playerMessageFlag, tempString);
        if (!tempInfo) { tempInfo = processCommunication('You tell ', 'TELL', skipProcessingFlag, true, false, playerMessageFlag, tempString); }
        if (!tempInfo) { tempInfo = processCommunication(' rtells you', 'RTELLS', skipProcessingFlag, false, true, playerMessageFlag, tempString); }
        if (!tempInfo) { tempInfo = processCommunication('You rtell ', 'RTELL', skipProcessingFlag, true, false, playerMessageFlag, tempString); }
        if (!tempInfo) { tempInfo = processCommunication('You say', 'SAY', skipProcessingFlag, true, false, playerMessageFlag, tempString); }
        if (!tempInfo) { tempInfo = processCommunication(' says', 'SAYS', skipProcessingFlag, false, true, playerMessageFlag, tempString); }
        if (!tempInfo) { tempInfo = processCommunication('You shout', 'SHOUT', skipProcessingFlag, true, false, playerMessageFlag, tempString); }
        if (!tempInfo) { tempInfo = processCommunication(' shouts', 'SHOUTS', skipProcessingFlag, false, true, playerMessageFlag, tempString); }
        if (!tempInfo) { tempInfo = processCommunication('You whisper', 'WHISPER', skipProcessingFlag, true, false, playerMessageFlag, tempString); }
        if (!tempInfo) { tempInfo = processCommunication(' whispers', 'WHISPERS', skipProcessingFlag, false, true, playerMessageFlag, tempString); }
        if (!tempInfo) { tempInfo = processCommunication('You announce', 'ANNOUNCE', skipProcessingFlag, true, false, playerMessageFlag, tempString); }
        if (!tempInfo) { tempInfo = processCommunication(' announces', 'ANNOUNCES', skipProcessingFlag, false, true, playerMessageFlag, tempString); }
        if (!tempInfo) { tempInfo = processCommunication('You plan', 'PLAN', skipProcessingFlag, true, false, playerMessageFlag, tempString); }
        if (!tempInfo) { tempInfo = processCommunication(' plans', 'PLANS', skipProcessingFlag, false, true, playerMessageFlag, tempString); }
        if (!tempInfo) { tempInfo = processCommunication('You teamchat', 'TEAMCHAT', skipProcessingFlag, true, false, playerMessageFlag, tempString); }
        if (!tempInfo) { tempInfo = processCommunication(' teamchats', 'TEAMCHATS', skipProcessingFlag, false, true, playerMessageFlag, tempString); }
        if (!tempInfo) {
          //Assume this will be a chat:
          if (tempString == 'You') {
            tempInfo = processCommunication(tempString, 'CHAT', skipProcessingFlag, true, false, playerMessageFlag, tempString);
          } else if (!skipProcessingFlag) {
            tempInfo = processCommunication(tempString, 'CHATS', skipProcessingFlag, false, true, playerMessageFlag, tempString);
          }
        }
      }
      //Set communication parameters after processing correct type, 
      if (tempInfo != false) {
        currentMessage = stringArray[1];
        senderHandle = tempInfo[0];
        recieverHandle = tempInfo[1];
        currentAction = tempInfo[2];
        skipProcessingFlag = true;
        //Remove First ' ' from message string if applicable.
        if (currentMessage.charAt(0) == ' ') {
          tempMessage = currentMessage.slice(1);
          currentMessage = tempMessage;
        }
      }
    }
    //No <b></b> bold tags were found.
    //Move on to commands like: who, look, stat, game... HERE: 
    
    // ################
    // # Log Snow Day #
    // ################
    if ((!skipProcessingFlag) && (rawString.search("\nIt's a Paintball Net SNOW DAY!") != -1)) {
      senderHandle = 'SERVER';
      currentAction = 'WELCOME';
      currentMessage = rawString.replace('\n', '');
      skipProcessingFlag = true;
    }
    // ##################
    // # Log Double Day #
    // ##################
    if ((!skipProcessingFlag) && (rawString.search("\nToday is a BONUS DAY! Payouts are 2X normal!\n") != -1)) {
      senderHandle = 'SERVER';
      currentAction = 'WELCOME';
      currentMessage = rawString.replaceAll('\n', '');
      skipProcessingFlag = true;
    }

    // ###################
    // # Log WHO Command #
    // ###################
    let whoFlag = false;
    if (!skipProcessingFlag) {
      if ((rawString.search("Bots") != -1) && (rawString.search("Splats") != -1) && (rawString.search("Idle") != -1) && (rawString.search("Player Name") != -1) && (rawString.search("Status") != -1) && (rawString.search("Team") != -1) && (rawString.search("players") != -1)) {
        whoFlag = true;
      } else {
        whoFlag = false;
      }
    }
      //if whoFlag is true it SHOULD Be a 'WHO' command. Now Set 
      //skipProcessingFlag to true and Seperate String by delimeter '\n'
    if ((whoFlag) && (!skipProcessingFlag)) {
      skipProcessingFlag = true;
      senderHandle = 'SERVER';
      currentAction = 'WHO';
      rawWhoArray = rawString.split('\n');
      let numOfPlayers = rawWhoArray.length - 4;
      let newMessageString = '';
      for (i = 0; i < numOfPlayers; i++) {
        let rawPlayerString = rawWhoArray[i + 3];
        let strArray = rawPlayerString.split('[');
        let rawWhoStr = strArray[0];
        rawWhoStr = rawWhoStr.replace(/  +/g, '');
        newMessageString = newMessageString + '(' + rawWhoStr + ',';
        rawWhoStr = strArray[1];
        strArray = rawWhoStr.split(']');
        rawWhoStr = strArray[0];
        rawWhoStr = rawWhoStr.replace(/  +/g, '');
        newMessageString = newMessageString + rawWhoStr;
        rawWhoStr = strArray[1];
        let rawStrLen = rawWhoStr.length;
        let tempRanges = 0;
        let newRawStr = '';
        let startNewRangeFlag = false;
        for (x = 0; x < rawStrLen; x++) {
          let tempChar = rawWhoStr[x];
          if (tempChar == ' '){
            if (tempRanges == 4) {
              newRawStr = newRawStr + tempChar;
            } else {
              startNewRangeFlag = false;
            }
          } else {
            if (startNewRangeFlag == false){
              tempRanges++;
              startNewRangeFlag = true;
              newRawStr = newRawStr + ',' + tempChar;
            } else {
              newRawStr = newRawStr + tempChar;
            }
          }
        }
        newMessageString = newMessageString + newRawStr + ')';
      }
      currentMessage = newMessageString;
    }

    // ####################
    // # Log RWHO Command #
    // ####################

    let rWhoFlag = false;
    if (!skipProcessingFlag) {
      if (rawString.search(" players online.") != -1){
        rWhoFlag = true;
      }
    }

    if (rWhoFlag){
      skipProcessingFlag = true;
      senderHandle = 'SERVER';
      currentAction = 'RWHO';
      let rawStringArray = rawString.split('\n');
      let arrayLen = rawStringArray.length;
      let msgString = '';
      let playerAdded = false;
      for (i = 0; i < arrayLen; i++){
        let tempString = rawStringArray[i];
        if (tempString.search("Paintball Net Beginner Server") != -1) {
          msgString = msgString + '{Beginner(';
          playerAdded = false;
        } 
        else if (tempString.search("Paintball Net Primary Server") != -1) {
          msgString = msgString + ')}{Primary(';
          playerAdded = false;
        }
        else if (tempString.search("PBN Tournament Server") != -1){
          msgString = msgString + ')}{Tournament(';
          playerAdded = false;
        }
        else if (tempString.search("players online") != -1){
          msgString = msgString + ')}';
        }
        else {
          if (!playerAdded){
            msgString = msgString + tempString.trim(2);
            playerAdded = true;
          }
          else {
            msgString = msgString + ',' +tempString.trim(2);
          }
        }
      }
      currentMessage = msgString;
    }

    // ####################
    // # Log LOOK Command #
    // ####################
    let lookFlag = false;
    if (!skipProcessingFlag) {
      if ((rawString.search("You see:") != -1) || (rawString.search("You don't see anything here.") != -1)){
        lookFlag = true;
        recieverHandle = "AREA";
        if (rawString.search("You don't see anything here.") != -1) {
          currentMessage = rawString;
        }
        //Return 2 Arrays: [SERVER][LOOK][AREA]:[{Players(paradox,gh0stly)}{Items(*1* a game token, *7* a green paintball)}]
      }
      if (rawString.search(" is made of ") != -1){
        lookFlag = true;
        recieverHandle = "ITEM";
        //Return: [SERVER][LOOK][ITEM]:[{Item=scarf,Wear=Neck,Madeof=DOWN,Capacity=10,Contains=(*100*a green paintball),GPS=149.0}]
      }
      if (rawString.search(" is standing here with:") != -1){
        lookFlag = true;
        recieverHandle = "PLAYER";
      }
      if (rawString.search("You can't see ") != -1){
        lookFlag = true;
        recieverHandle = "ERROR";
      }
    }

    if (lookFlag){
      skipProcessingFlag = true;
      senderHandle = 'SERVER';
      currentAction = 'LOOK';

      // ################
      // # [LOOK][AREA] #
      // ################

      if ((recieverHandle == 'AREA') && (rawString.search("You don't see anything here.") == -1)){
        let lookPlayerList = [];
        let lookItemList = [];
        let lookString = rawString.replace("You see:\n", '');
        let seeArray = lookString.split('\n');
        let arrayLen = seeArray.length;
        for (i = 0; i < arrayLen; i++) {
          let itemString = seeArray[i];
          itemString = itemString.trim(1);
          if (itemString.charAt(0) == '(') {
            lookItemList.push(itemString);
          } else {
            lookPlayerList.push(itemString);
          }
        }
        lookString = '{Players(';
        for (i = 0; i < lookPlayerList.length; i++) {
          lookString = lookString + lookPlayerList[i];
          if ((i + 1) < ((lookPlayerList.length)-1)) {
            lookString = lookString + ',';
          }
        }
        lookString = lookString + ')}{Items(';
        for (i = 0; i < lookItemList.length; i++) {
          let itemString = lookItemList[i];
          itemString = itemString.replace("(", "*");
          itemString = itemString.replace(")", "*");
          lookString = lookString + itemString;
          if ((i + 1) < ((lookItemList.length)-1)) {
            lookString = lookString + ',';
          }
        }
        lookString = lookString + ')}';
        currentMessage = lookString;
      } 

      // ################
      // # [LOOK][ITEM] #
      // ################

      if (recieverHandle == 'ITEM') {
        
        let sItem = '';
        let sWear = '';
        let sMadeof = '';
        let sCapacity = '';
        let sContains = '';
        let sGPS = '';
        let itemStringArray = [];
        let tempString = '';

        if (rawString.search('\n') != -1) {
          itemStringArray = rawString.split('\n');
          tempString = itemStringArray[0];
        } else {
          tempString = rawString;
        }
        //READING FIRST LINE OF ARRAY
        tempString = tempString.replace('The ', '');
        if (tempString.search(' on your ') != -1) {
          let tempArray = tempString.split(' on');
          sItem = tempArray[0];
          tempArray = tempString.split('on your ');
          tempString = tempArray[1];
          tempArray = tempString.split(' ');
          xItems = 0;
          for (x = 0; x < tempArray.length; x++){
            if (tempArray[x] != 'is'){
              xItems = xItems + 1;
              sWear = sWear + tempArray[x];
              if (tempArray[(x + 1)] != 'is'){
                sWear = sWear + ' ';
              }
            } else {
              break;
            }
          }
          tempArray = tempString.split('made of ');
          tempString = tempArray[1];
          if (tempString.search(' and is ') != -1){
            tempArray = tempString.split(' ');
            sMadeof = tempArray[0];
            tempArray = tempString.split('%');
            sCapacity = tempArray[1].replace(' full.', '');
          } else {
            tempString = tempString.replace('.', '');
            sMadeof = tempString;
          }
        } else {
          tempArray = tempString.split(' is made of ');
          sItem = tempArray[0];
          tempString = tempArray[1];
          if (tempString.search(' and is ') != -1){
            tempArray = tempString.split(' ');
            sMadeof = tempArray[0];
            tempArray = tempString.split('%');
            sCapacity = tempArray[1].replace(' full.', '');
          } else {
            tempString = tempString.replace('.', '');
            sMadeof = tempString;
          }
        }
        //[Look][Item] Array[] is more than 1 Line - Contains items, or has GPS
        if (itemStringArray.length != 0) {
          let itemAddedFlag = false;
          for (i = 0; i < itemStringArray.length; i++) {
            let tempItemString = itemStringArray[i];
            if (tempItemString.search('contains:') != -1){
              sContains='(';
              itemAddedFlag = false;
            }
            if (tempItemString.search('\\(') != -1){
              if (itemAddedFlag){
                sContains = sContains + ',';
              }
              tempItemString = tempItemString.trim(2);
              tempItemString = tempItemString.replace('(', '*');
              tempItemString = tempItemString.replace(')', '*');
              tempItemString = tempItemString.replace('\n', '');
              sContains = sContains + tempItemString;
              itemAddedFlag = true;
            } else {
              if ((itemAddedFlag) && (sContains != '')){
                sContains = sContains + ')';
                itemAddedFlag = false;
              }
            }
            if (((i + 1) == itemStringArray.length) && (itemAddedFlag)){
              sContains = sContains + ')';
              itemAddedFlag = false;
            }
            if (tempItemString.search('The readout indicates ') != -1){
              let gpsString = tempItemString.replace('The readout indicates that you are at ', '');
              gpsString = gpsString.replace('.', '');
              gpsString = gpsString.replace(' ', '');
              gpsString = gpsString.replace(',', '.');
              sGPS = gpsString;
            }
          }
        }
        let fullLookString = '{Item=' + sItem + ',Wear=' + sWear + ',Madeof=' + sMadeof + ',Capacity=' + sCapacity + ',Contains=' + sContains + ',GPS=' + sGPS + '}';
        currentMessage = fullLookString;
      }

      // ##################
      // # [LOOK][PLAYER] #
      // ##################
      
      //head, eyes, neck, right shoulder, left shoulder, right hand, left hand, body, waist, legs, feet
      //Process output based on recieverHandle:
      if (recieverHandle == 'PLAYER'){
        let sHandle = '';
        let sGender = '';
        let sHead = '';
        let sEyes = '';
        let sNeck = '';
        let sRShoulder = '';
        let sLShoulder = '';
        let sRHand = '';
        let sLHand = '';
        let sBody = '';
        let sWaist = '';
        let sLegs = '';
        let sFeet = '';

        //If rawString does not contain \n, player is naked. Just return handle.
        if (rawString.search('\n') != -1){
          let playerArray = rawString.split('\n');
          for (i = 0; i < playerArray.length; i++){
            let tempItemName = '';
            let tempWearLoc = '';
            let tempPlayerString = playerArray[i];
            if (tempPlayerString == ''){
              continue;
            }
            if (tempPlayerString.search(' is standing here with:') != -1){
              sHandle = tempPlayerString.replace(' is standing here with:', '');
              continue;
            }
            let itemArray = [];
            if (tempPlayerString.search(' on his ') != -1){
              itemArray = tempPlayerString.split(' on his ');
              sGender = 'M';
            }
            if (tempPlayerString.search(' on her ') != -1){
              itemArray = tempPlayerString.split(' on her ');
              sGender = 'F';
            }
            if (tempPlayerString.search(' on their ') != -1){
              itemArray = tempPlayerString.split(' on their ');
              sGender = 'N';
            }
            tempItemName = itemArray[0].trim(2);
            tempWearLoc = itemArray[1];
            if (tempWearLoc.search('HEAD') != -1){sHead = tempItemName;}
            if (tempWearLoc.search('EYES') != -1){sEyes = tempItemName;}
            if (tempWearLoc.search('NECK') != -1){sNeck = tempItemName;}
            if (tempWearLoc.search('RIGHT SHOULDER') != -1){sRShoulder = tempItemName;}
            if (tempWearLoc.search('LEFT SHOULDER') != -1){sLShoulder = tempItemName;}
            if (tempWearLoc.search('RIGHT HAND') != -1){sRHand = tempItemName;}
            if (tempWearLoc.search('LEFT HAND') != -1){sLHand = tempItemName;}
            if (tempWearLoc.search('BODY') != -1){sBody = tempItemName;}
            if (tempWearLoc.search('WAIST') != -1){sWaist = tempItemName;}
            if (tempWearLoc.search('LEGS') != -1){sLegs = tempItemName;}
            if (tempWearLoc.search('FEET') != -1){sFeet = tempItemName;}
          }
        } else {
          sHandle = rawString.replace(' is standing here with:');
        }
        let lookPlayerString = '{Handle="' + sHandle + '",Gender="' + sGender + '",Head="' + sHead + '",Eyes="' + sEyes + '",Neck="' + sNeck + '",RShoulder="' + sRShoulder + '",LShoulder="' + sLShoulder + '",RHand="' + sRHand + '",LHand="' + sLHand + '",Body="' + sBody + '",Waist="' + sWaist + '",Legs="' + sLegs + '",Feet="' + sFeet + '"}';
        currentMessage = lookPlayerString;
      }

      // #################
      // # [LOOK][ERROR] #
      // #################
      if (recieverHandle == 'ERROR') {
        currentMessage = rawString;
      }
    }

    // ####################
    // # Log STAT Command #
    // ####################

    let statFlag = false;
    if (!skipProcessingFlag){
      if (((rawString.search('You have ') != -1) && (rawString.search(' carrying ') != -1)) || (rawString.search('Stats for ') != -1)) {
        statFlag = true;
        senderHandle = 'SERVER';
        currentAction = 'STAT';
      }
    }

    if (statFlag){
      skipProcessingFlag = true;
      let cashOnHand = '';
      let currentCarryWeight = '';
      let totalCarryWeight = '';
      let playerHandle = '';
      let playerID = '';
      let totalWorth = '';
      let everGames = '';
      let everBonus = '';
      let everACC = '';
      let everGamesSurvived = '';
      let everBotSplats = '';
      let everPlayerSplats = '';
      let currentBonus = '';
      let currentSplats = '';
      let currentACC = '';
      let currentTeamBonus = '';
      let currentTeamSplats = '';
      let currentTeamACC = '';
      let everTeamBonus = '';
      let everTeamSplats = '';
      let everTeamACC = '';
      let sHead = '';
      let sEyes = '';
      let sNeck = '';
      let sRShoulder = '';
      let sLShoulder = '';
      let sRHand = '';
      let sLHand = '';
      let sBody = '';
      let sWaist = '';
      let sLegs = '';
      let sFeet = '';
      let eqString = '';
      let standing = '';
      let inGame = '';
      let inGameBonus = '';
      let inGameSplats = '';
      let inGameACC = '';
      
      if ((rawString.search('You have ') != -1) && (rawString.search(' carrying ') != -1)){
        // ###############
        // # [STAT][YOU] #
        // ###############
        
        recieverHandle = 'YOU';
        let statArray = rawString.split('\n');
        let statLineArray = [];
        let statString = statArray[0];
        //You have $5000, carrying 30/50. 
        statLineArray = statString.split(',');
        statString = statLineArray[0];
        //You have $5000
        cashOnHand = statString.replace('You have $', '');
        statString = statLineArray[1];
        // carrying 30/50.
        statString = statString.replace(' carrying ', '');
        statString = statString.replace('.', '');
        //30/50
        statLineArray = statString.split('/');
        currentCarryWeight = statLineArray[0];
        totalCarryWeight = statLineArray[1];
        statString = statArray[1];
        //Stats for 'parabot'(1558) TotalWorth:$5600:
        statString = statString.replace('Stats for \'', '');
        statLineArray = statString.split('\'');
        playerHandle = statLineArray[0];
        statString = statLineArray[1];
        //(1558) TotalWorth:$5600:
        statString = statString.replace('\(', '');
        //1558) TotalWorth:$5600:
        statLineArray = statString.split(')');
        playerID = statLineArray[0];
        statString = statLineArray[1];
        // TotalWorth:$5600:
        statLineArray = statString.split(':');
        totalWorth = statLineArray[1];
        statString = statArray[2];
        //(EVER)    GAMES:0 BONUS:0 SPLATS:0 ACCURACY:0%
        statLineArray = statString.split(':');
        everGames = statLineArray[1].replace(' BONUS', '');
        everBonus = statLineArray[2].replace(' SPLATS', '');
        everSplats = statLineArray[3].replace(' ACCURACY', '');
        everACC = statLineArray[4].replace('%', '');
        statString = statArray[3];
        //          GAMES SURVIVED:0 BOT SPLATS:0 PLAYER SPLATS:0
        statLineArray = statString.split(':');
        everGamesSurvived = statLineArray[1].replace(' BOT SPLATS', '');
        everBotSplats = statLineArray[2].replace(' PLAYER SPLATS', '');
        everPlayerSplats = statLineArray[3];
        statString = statArray[4];
        //(CURRENT) BONUS:0 SPLATS:0 ACCURACY:0%
        statLineArray = statString.split(':');
        currentBonus = statLineArray[1].replace(' SPLATS', '');
        currentSplats = statLineArray[2].replace(' ACCURACY', '');
        currentACC = statLineArray[3].replace('%', '');
        statString = statArray[5];
        //(TEAM)    BONUS:0 SPLATS:0 ACCURACY:0%
        statLineArray = statString.split(':');
        currentTeamBonus = statLineArray[1].replace(' SPLATS', '');
        currentTeamSplats = statLineArray[2].replace(' ACCURACY', '');
        currentTeamACC = statLineArray[3].replace('%', '');
        statString = statArray[6];
        //(TEAMEVER)BONUS:0 SPLATS:0 ACCURACY:0%
        statLineArray = statString.split(':');
        everTeamBonus = statLineArray[1].replace(' SPLATS', '');
        everTeamSplats = statLineArray[2].replace(' ACCURACY', '');
        everTeamACC = statLineArray[3].replace('%', '');
        //First 7 lines are CONSTANT stat outputs
        //Last 2 Lines are CONSTANT stat outputs
        //statArray.length - 9 = (n) Lines of equipment to look through.
        let eqCount = 0;
        if (!(statArray.length <= 9)){
          let eqLines = statArray.length - 9;
          eqCount = eqLines;
          for (i = 7; i < (statArray.length - 2); i++){
            let eqLine = statArray[i].trim(2);
            let eqArray = eqLine.split(' on your ');
            if (eqArray[1].search('HEAD') != -1){ sHead = eqArray[0]; }
            if (eqArray[1].search('EYES') != -1){ sEyes = eqArray[0]; }
            if (eqArray[1].search('NECK') != -1){ sNeck = eqArray[0]; }
            if (eqArray[1].search('RIGHT SHOULDER') != -1){ sRShoulder = eqArray[0]; }
            if (eqArray[1].search('LEFT SHOULDER') != -1){ sLShoulder = eqArray[0]; }
            if (eqArray[1].search('RIGHT HAND') != -1){ sRHand = eqArray[0]; }
            if (eqArray[1].search('LEFT HAND') != -1){ sLHand = eqArray[0]; }
            if (eqArray[1].search('BODY') != -1){ sBody = eqArray[0]; }
            if (eqArray[1].search('WAIST') != -1){ sWaist = eqArray[0]; }
            if (eqArray[1].search('LEGS') != -1){ sLegs = eqArray[0]; }
            if (eqArray[1].search('FEET') != -1){ sFeet = eqArray[0]; }
          }
          eqString = '{Head=' + sHead + ',Eyes=' + sEyes + ',Neck=' + sNeck + ',RShoulder=' + sRShoulder + ',LShoulder=' + sLShoulder + ',RHand=' + sRHand + ',LHand=' + sLHand + ',Body=' + sBody + ',Waist=' + sWaist + ',Legs=' + sLegs + ',Feet=' + sFeet + '}';
        }
        let n = 7;
        if (eqCount != 0){n = n + eqCount;}
        statString = statArray[n];
        //You are standing.
        //You are crouching.
        statString = statString.replace('You are ', '');
        if (statString == 'standing.'){
          standing = 'Y';
        } else {
          standing = 'N';
        }
        statString = statArray[(n + 1)];
        //You are NOT in a game right now.
        //You are IN a game, BONUS:0 SPLATS:0 ACC:0.
        if (statString.search('NOT') != -1){
          //Not in a game
          inGame = 'N';
        } else {
          //In a game
          inGame = 'Y';
          statLineArray = statString.split(',');
          statString = statLineArray[1];
          // BONUS:0 SPLATS:0 ACC:0.
          statLineArray = statString.split(':');
          inGameBonus = statLineArray[1].replace(' SPLATS', '');
          inGameSplats = statLineArray[2].replace(' ACC', '');
          inGameACC = statLineArray[3].replace('.', '');
        }
        //Assemble Output:
        let statOutput = '{Handle=' + playerHandle + ',ID=' + playerID + ',CashOnHand=' + cashOnHand + ',TotalWorth=' + totalWorth + ',CurrentCarryWeight=' + currentCarryWeight + ',TotalCarryWeight=' + totalCarryWeight + ',EverGames=' + everGames + ',EverBonus=' + everBonus + ',EverAccuracy=' + everACC + ',EverGamesSurvived=' + everGamesSurvived + ',EverBotSplats=' + everBotSplats + ',EverPlayerSplats=' + everPlayerSplats + ',CurrentBonus=' + currentBonus + ',CurrentSplats=' + currentSplats + ',CurrentAccuracy=' + currentACC + ',CurrentTeamBonus=' + currentTeamBonus + ',CurrentTeamSplats=' + currentTeamSplats + ',CurrentTeamAccuracy=' + currentTeamACC + ',EverTeamBonus=' + everTeamBonus + ',EverTeamSplats=' + everTeamSplats + ',EverTeamAccuracy=' + everTeamACC + ',EQ=' + eqString + ',Standing=' + standing + ',InGame=' + inGame + '{InGameBonus=' + inGameBonus + ',InGameSplats=' + inGameSplats + ',InGameAccuracy=' + inGameACC + '}}';
        //Expected Output:
        /*
        {Handle=paradox,ID=211,CashOnHand=9142,TotalWorth=$322396,CurrentCarryWeight=516,TotalCarryWeight=1000,EverGames=18361,EverBonus=40988000,EverAccuracy=29,EverGamesSurvived=7250,EverBotSplats=66717,EverPlayerSplats=4026,CurrentBonus=40988000,CurrentSplats=70743,CurrentAccuracy=29,CurrentTeamBonus=22665000,CurrentTeamSplats=17633,CurrentTeamAccuracy=11,EverTeamBonus=22665000,EverTeamSplats=17633,EverTeamAccuracy=10,EQ={Head=a tin foil hat[x-ray][infrared],Eyes=a tin foil hat[x-ray][infrared],Neck=a shock collar[satellite][ulhugepocket],RShoulder=a cape[hugepocket][hugepocket],LShoulder=a cape[hugepocket][hugepocket],RHand=a pistol[rapidfire][rapidfire],LHand=a Nintendo Power Glove[player][bot],Body=a jet jacket[jetpack][interference]{~Paintball Net Launch Day 2019~}{~2020 COVID-19 Social Distancing Day~}{~2020 Fall Event~}{~2021 Winter Event~}{~2021 Spring Event~},Waist=a jet jacket[jetpack][interference]{~Paintball Net Launch Day 2019~}{~2020 COVID-19 Social Distancing Day~}{~2020 Fall Event~}{~2021 Winter Event~}{~2021 Spring Event~},Legs=a tasteful speedo[ulhugepocket][ulhugepocket],Feet=a pair of padded cargo boots[hugepocket][hugepocket]},Standing=Y,InGame=N{InGameBonus=,InGameSplats=,InGameAccuracy=}}
        */
        currentMessage = statOutput;
      } else {
        // ##################
        // # [STAT][PLAYER] #
        // ##################

        recieverHandle = 'PLAYER';
        let statArray = rawString.split('\n');
        let statLineArray = [];
        let statString = statArray[0];
        //Stats for 'paradox':
        statString = statString.replace('Stats for \'', '');
        statString = statString.replace('\':', '');
        playerHandle = statString;
        statString = statArray[1];
        //Stats for 'paradox'(211) TotalWorth:$335178:
        let replacePattern = 'Stats for \'' + playerHandle + '\'(';
        statString = statString.replace(replacePattern, '');
        //211) TotalWorth:$335178:
        statLineArray = statString.split(')');
        playerID = statLineArray[0];
        statString = statLineArray[1];
        // TotalWorth:$335178:
        statLineArray = statString.split(':');
        totalWorth = statLineArray[1].trim(1);
        statString = statArray[2];
        //(EVER)    GAMES:17828 BONUS:39813000 SPLATS:68769 ACCURACY:30%
        statLineArray = statString.split(':');
        everGames = statLineArray[1].replace(' BONUS', '');
        everBonus = statLineArray[2].replace(' SPLATS', '');
        everSplats = statLineArray[3].replace(' ACCURACY', '');
        everACC = statLineArray[4].replace('%', '');
        statString = statArray[3];
        //          GAMES SURVIVED:7060 BOT SPLATS:64929 PLAYER SPLATS:3840
        statLineArray = statString.split(':');
        everGamesSurvived = statLineArray[1].replace(' BOT SPLATS', '');
        everBotSplats = statLineArray[2].replace(' PLAYER SPLATS', '');
        everPlayerSplats = statLineArray[3];
        statString = statArray[4];
        //(CURRENT) BONUS:39813000 SPLATS:68769 ACCURACY:30%
        statLineArray = statString.split(':');
        currentBonus = statLineArray[1].replace(' SPLATS', '');
        currentSplats = statLineArray[2].replace(' ACCURACY', '');
        currentACC = statLineArray[3].replace('%', '');

        let statOutput = '{Handle=' + playerHandle + ',ID=' + playerID + ',TotalWorth=' + totalWorth + ',EverGames=' + everGames + ',EverBonus=' + everBonus + ',EverSplats=' + everSplats + ',EverAccuracy=' + everACC + ',EverGamesSurvived=' + everGamesSurvived + ',EverBotSplats=' + everBotSplats + ',EverPlayerSplats=' + everPlayerSplats + ',CurrentBonus=' + currentBonus + ',CurrentSplats=' + currentSplats + ',CurrentAccuracy=' + currentACC + '}';
        /*
        //Expected Output:
        //{Handle=paradox,ID=211,TotalWorth=$322396,EverGames=18361,EverBonus=40988000,EverSplats=70743,EverAccuracy=29,EverGamesSurvived=7250,EverBotSplats=66717,EverPlayerSplats=4026,CurrentBonus=40988000,CurrentSplats=70743,CurrentAccuracy=29}
        */
        currentMessage = statOutput;
      }
    }

    // ####################
    // # Log TIME Command #
    // ####################

    let serverTimeFlag = false;
    if (!skipProcessingFlag){
      if ((rawString.search('The current Paintball Net Online Game time is: ') != -1) || (rawString.search('DAYS are every') != -1)){
        serverTimeFlag = true;
        senderHandle = 'SERVER';
        currentAction = 'TIME';
      }
    }

    if (serverTimeFlag){
      skipProcessingFlag = true;
      if (rawString.search('The current Paintball Net Online Game time is: ') != -1){
        let localtime = new Date();
        let lYear = String(localtime.getFullYear());
        let lMonth = parseInt(localtime.getMonth()); //[0-11]
        lMonth += 1;
        if (lMonth < 10) {
          lMonth = String('0' + String(lMonth));
        } else {
          lMonth = String(lMonth);
        }
        let lDay = String(localtime.getDate());
        if (parseInt(lDay) < 10) { lDay = '0' + lDay; }
        let lHours = String(localtime.getHours());
        if (parseInt(lHours) < 10) { lHours = '0' + lHours; }
        let lMinutes = String(localtime.getMinutes());
        if (parseInt(lMinutes) < 10) { lMinutes = '0' + lMinutes; }
        let lSeconds = String(localtime.getSeconds());
        if (parseInt(lSeconds) < 10) { lSeconds = '0' + lSeconds; }
        rawStringArray = rawString.split(' is: ');
        let dateTimeString = rawStringArray[1];
        rawStringArray = dateTimeString.split(' ');
        let dateString = rawStringArray[0];
        let timeString = rawStringArray[1];
        dateTimeString = '(';
        rawStringArray = dateString.split('/');
        dateTimeString += 'Y=' + rawStringArray[0] + ',M=' + rawStringArray[1] + ',D=' + rawStringArray[2] + ')(';
        rawStringArray = timeString.split(':');
        dateTimeString += 'h=' + rawStringArray[0] + ',m=' + rawStringArray[1] + ',s=' + rawStringArray[2] + ')';
        dateTimeString += '(lY=' + lYear + ',lM=' + lMonth + ',lD=' + lDay + ')';
        dateTimeString += '(lh=' + lHours + ',lm=' + lMinutes + ',ls=' + lSeconds + ')';
        currentMessage = dateTimeString;
      }
      /*
      if (rawString.search('every ') != -1){
        let ddayString = rawString;
        console.log('In Double-Day!');
        if (ddayString.search('Sunday') != -1){ ddayString = 'Sunday'; }
        if (ddayString.search('Monday') != -1){ ddayString = 'Monday'; }
        if (ddayString.search('Tuesday') != -1){ ddayString = 'Tuesday'; }
        if (ddayString.search('Wednesday') != -1){ ddayString = 'Wednesday'; }
        if (ddayString.search('Thursday') != -1){ ddayString = 'Thursday'; }
        if (ddayString.search('Friday') != -1){ ddayString = 'Friday'; }
        if (ddayString.search('Saturday') != -1){ ddayString = 'Saturday'; }
        if (ddayString.search('Today') != -1){ ddayString = 'Today'; }
        currentMessage = '[dday=' + ddayString + ']'; 
      }
      */
    }

    // #######################
    // # Log EXAMINE Command #
    // #######################


    // ############
    // # Log GAME #
    // ############
    gameFlag = false;
    //[PBN][?]:[Richboy has set the game to START soon.]
    if(!skipProcessingFlag){
      
      if (rawString.search(' has set the game to START soon.') != -1){
        skipProcessingFlag = true;
        senderHandle = 'SERVER';
        currentAction = 'GAME';
        recieverHandle = 'STARTING';
        tempArray = rawString.split(' has set the game to START soon.');
        currentMessage = tempArray[0];
      }
      else if (rawString.search(' has set the game to END soon.') != -1){
        skipProcessingFlag = true;
        senderHandle = 'SERVER';
        currentAction = 'GAME';
        recieverHandle = 'ENDING';
        tempArray = rawString.split(' has set the game to END soon.');
        currentMessage = tempArray[0];
      }
      else if (rawString.search('GAME: The next game is about to start.') != -1){
        skipProcessingFlag = true;
        senderHandle = 'SERVER';
        currentAction = 'GAME';
        recieverHandle = 'STARTING';
        currentMessage = ''
      }
      else if (rawString.search('The game has started without you.\n') != -1){
        skipProcessingFlag = true;
        senderHandle = 'SERVER';
        currentAction = 'GAME';
        recieverHandle = 'START';
        currentMessage = '';
      }
      else if (rawString.search('The game is over.\n') != -1){
        skipProcessingFlag = true;
        senderHandle = 'SERVER';
        currentAction = 'GAME';
        recieverHandle = 'END';
        gameFlag = true;
      }
      else if (rawString.search('GAME:') != -1){
        skipProcessingFlag = true;
        gameFlag = true;
        senderHandle = 'SERVER';
        currentAction = 'GAME';
      }
      
      
    }

    if (gameFlag){
      rawStringArray = rawString.split('GAME: ');
      currentMessage = rawStringArray[1];
    }
  }
  // All set communication types should have been combed through:
  // Return a easy to process string.
  // [Sender][Action][Reciever]: 'SERVER MESSAGE'
  if (!abortLogFlag) {
    var refinedString = refinePBNScrollText(skipProcessingFlag, rawString, currentMessage, abortLogFlag);
    return refinedString;
  }
}

function refinePBNScrollText(skipProcessingFlag, rawString, currentMessage = '', abortLogFlag) {
  // Return a easy to process string.
  // [Sender][Action][Reciever]: 'SERVER MESSAGE'
  var refinedString = '';
  if (skipProcessingFlag) {
    if (senderHandle != '') {
      refinedString = refinedString + '[' + senderHandle + ']';
    }
    if (currentAction != '') {
      refinedString = refinedString + '[' + currentAction + ']';
    }
    if (recieverHandle != '') {
      refinedString = refinedString + '[' + recieverHandle + ']';
    }
    //Need to register continuous unknown commands:
    if ((senderHandle === '') && (currentAction === '') && (recieverHandle === '')) {
      //console.log("Unknown Processed correctly.");
      refinedString = refinedString + '[?]';
    }
    refinedString = refinedString + ':' + '[' + currentMessage + ']';
  } else {
    if (abortLogFlag) {
      //console.log('Abort console output.');
      refinedString = 'ABORT_LOG';
    } else {
      //console.log('Unknown string processed incorrectly.');
      refinedString = refinedString + '[?]:[' + rawString + ']';
    }
  }
  return refinedString;
}

function processCommunication(searchString, setActionString, skipProcessingFlag, senderFlag, recieverFlag, playerMessageFlag, tempString) {
  //senderFlag = TRUE - Client browser is sending  message to player
  //recieverFlag = TRUE - Client browser is recieving message from player or game
  var searchResult = '';
  searchResult = tempString.search(searchString);
  if ((searchResult != -1) && (skipProcessingFlag == false) && (playerMessageFlag == false)) {
    //Sending message
    if ((senderFlag === true) && (recieverFlag === false)) {
      senderHandle = "YOU";
      recieverHandle = tempString.replace(searchString, '');
    }
    //Recieved message
    if ((senderFlag === false) && (recieverFlag === true)) {
      senderHandle = tempString.replace(searchString, '');
      recieverHandle = "YOU";
    }
    if ((senderFlag === true) && (recieverFlag === '')) {
      senderHandle = 'YOU';
      recieverHandle = '';
    }
    if ((senderFlag === '') && (recieverFlag === true)) {
      senderHandle = tempString.replace(searchString, '');
      recieverHandle = '';
    }
    //Chat
    if (setActionString == 'CHAT') {
      senderHandle = 'You';
      recieverHandle = '';
    } else if (setActionString == 'CHATS') {
      senderHandle = tempString;
      recieverHandle = '';
    } else if (setActionString == 'SAYS') {
      recieverHandle = '';
    } else if (setActionString == 'WHISPERS') {
      recieverHandle = '';
    } else if (setActionString == "PLANS") {
      recieverHandle = '';
    } else if (setActionString == "TEAMCHATS") {
      recieverHandle = '';
    } else if (setActionString == "SHOUTS") {
      recieverHandle = '';
    } else if (setActionString == "ANNOUNCES") {
      recieverHandle = '';
    }
    currentAction = setActionString;
    skipProcessingFlag = true;
    playerMessageFlag = true;
    const infoArray = [senderHandle, recieverHandle, setActionString];
    return infoArray;
  } else {
    playerMessageFlag = false;
    return false;
  }
}
