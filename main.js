require('dotenv').config(); // Load environment variables from .env file
const https = require('https');
const puppeteer = require('puppeteer');
const readline = require('readline');

class PBNBot {
  constructor({
    closeBrowser = false,
    url = 'https://play.paintballnet.net',
    server = 'primary',
    headless = false,
  } = {}) {
    // Runtime config and session state
    this.closeBrowser = closeBrowser;  // Keep browser open after page load
    this.url = url;  // Page to load
    this.server = server;  // Server to access: beginner, primary, tournament
    this.browserHeadless = headless; // Headless browser option
    this.browser = null; // Do Not Edit
    this.page = null;  // Do Not Edit

    // Node.js terminal interface
    this.rl = null;  // CLI Terminal Input Object, Do Not Edit

    // Puppeteer element IDs
    this.pbnBeginnerServerId = 'Component1121';  // PBN Beginner Server selector Div Id
    this.pbnPrimaryServerId = 'Component1123';  // PBN Primary Server selector Div Id
    this.pbnTournamentServerId = 'Component1125'; // PBN Tournament Server selector Div Id
    this.pbnUsernameTextboxId = 'Component826'; // PBN Username Input textbox Id
    this.pbnPasswordTextboxId = 'Component830';  // PBN Password Input textbox Id
    this.pbnMainInputTextboxId = 'Component598';  // PBN Main command text input box Id

    // Credentials loaded from environment variables
    this.pbnHandle = process.env.PBN_HANDLE;  // PBN_HANDLE= in .env
    this.pbnPassword = process.env.PBN_PASSWORD; // PBN_PASSWORD= in .env
    this.discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL; // DISCORD_WEBHOOK_URL= in .env 
    this.discordAvatarUrl = process.env.DISCORD_AVATAR_URL;  // DISCORD_AVATAR_URL= in .env

    // Enable / Disable Looped Background services
    this.autoReLogin = true; // Enable or Disable Re-login after logout detected
    this.lookIntervalEnabled = true;  // Enable auto-look for anti-idle reasons
    this.rwhoIntervalEnabled = true;  // Sends RWHO Command at set interval
    this.gameListIntervalEnabled = false;  // Enable Retreive player list from backend web api
    this.activePlayerListEnabled = true; // Reports active users over Discord, works with this.discordSendUpdates enabled
    this.commandEntryIntervalEnabled = true; // Enable Command list entry loop.  DO NOT DISABLE
    this.commandEntryWatcherIntervalEnabled = true; // Enable Command Entry list watcher to monitor command queue
    this.logoutIntervalEnabled = true; // Enable Watching for logout, and re-login
    this.discordSendUpdates = true; // Enable sending Discord Updates, works with this.activePlayerListEnabled

    // Background Interval Objects
    this.gameListIntervalFirstRun = true; // Do Not Edit
    this.rwhoIntervalFirstRun = true; // Do Not Edit
    this.lookInterval = null; // Do Not Edit
    this.gamelistInterval = null; // Do Not Edit
    this.rwhoInterval = null; // Do Not Edit
    this.activePlayerListInterval = null; // Do Not Edit
    this.commandEntryInterval = null;  // Do Not Edit
    this.commandEntryWatcherInterval = null; // Do Not Edit
    this.logoutInterval = null;  // Do Not Edit

    // Bot Timing Options
    this.autoReLoginDelay = 10 * 60 * 1000; // Time to wait (ms) for re-login (Wait 10 minutes)
    this.autoLookDelay = 3 * 60 * 1000; // Anti Idle, Send Look command every 3 minutes (ms)
    this.gameListPollingDelay = 5000;  // Time to Send HTTP Request for server list. (ms) (Every 5 seconds)
    this.sendCommandListDelay = 750; // Time in between sending command to game. (ms) (Every 3/4 of a second)
    this.commandEntryWatcherDelay = 10 * 60 * 1000; // Time between reporting how many commands are in queue to send (ms) 
    this.activePlayerListDelay = 1000;  // Time to check Active player list for players to report to Discord. (ms) (1 second)
    this.activePlayerReportTime = 300 // Time to Report active player to Discord. (seconds) (5 minutes)
    this.autoRWHODelay = 1500;  // Time to send RWHO command to game, (ms) (1.5 Seconds)
    this.botTypingDelay = 15; // (ms) delay between keystrokes, can simulate better typing
    
    // State Options
    this.sendCommandList = []; // Stack of commands waiting to be sent to game
    this.logoutDetected = false;  // Do Not Edit
    this.isTyping = false; // Do Not Edit, Lock flag for commandEntryInterval
    this.serverList = {  // Master Server List, Do Not Edit
      beginner: [],
      primary: [],
      tournament: [],
    };
    this.activePlayersList = {  // Active Player List, Do Not Edit
      /*
      playerHandle: {
        loginTime: UnixTimestamp,
        loginReported: false,
        server: server_name,
      },
      */
    };
    this.ansiCodes = {  // ANSI Codes for Terminal Decoration
      // Define ANSI escape codes as constants
      RESET: '\x1b[0m',
      BOLD: '\x1b[1m',
      DIM: '\x1b[2m',
      UNDERSCORE: '\x1b[4m',
      INVERSE: '\x1b[7m',

      // Foreground colors
      BLACK: '\x1b[30m',
      RED: '\x1b[31m',
      GREEN: '\x1b[32m',
      YELLOW: '\x1b[33m',
      BLUE: '\x1b[34m',
      MAGENTA: '\x1b[35m',
      CYAN: '\x1b[36m',
      WHITE: '\x1b[37m',
      GRAY: '\x1b[90m', // Bright Black
      BRIGHT_RED: '\x1b[91m',
      BRIGHT_GREEN: '\x1b[92m',
      BRIGHT_YELLOW: '\x1b[93m',
      BRIGHT_BLUE: '\x1b[94m',
      BRIGHT_MAGENTA: '\x1b[95m',
      BRIGHT_CYAN: '\x1b[96m',
      BRIGHT_WHITE: '\x1b[97m',

      // Background colors
      BG_BLACK: '\x1b[40m',
      BG_RED: '\x1b[41m',
      BG_GREEN: '\x1b[42m',
      BG_YELLOW: '\x1b[43m',
      BG_BLUE: '\x1b[44m',
      BG_MAGENTA: '\x1b[45m',
      BG_CYAN: '\x1b[46m',
      BG_WHITE: '\x1b[47m',
      BG_BRIGHT_BLACK: '\x1b[100m', // Alias for BG_GRAY
      BG_BRIGHT_RED: '\x1b[101m',
      BG_BRIGHT_GREEN: '\x1b[102m',
      BG_BRIGHT_YELLOW: '\x1b[103m',
      BG_BRIGHT_BLUE: '\x1b[104m',
      BG_BRIGHT_MAGENTA: '\x1b[105m',
      BG_BRIGHT_CYAN: '\x1b[106m',
      BG_BRIGHT_WHITE: '\x1b[107m',
    }
  }

  // ===
  // === [Init, Page Loading, Web Socket Hooks, Login, and Logout Sequences] ===
  // ===

  // === Stops all looped functions
  clearAllIntervals(shutDown = false) {
    if (this.lookInterval) clearInterval(this.lookInterval);
    if (this.gamelistInterval) clearInterval(this.gamelistInterval);
    if (this.rwhoInterval) clearInterval(this.rwhoInterval);
    if (this.commandEntryInterval) clearInterval(this.commandEntryInterval);
    if (this.commandEntryWatcherInterval) clearInterval(this.commandEntryWatcherInterval);
    if (this.activePlayerListInterval) {
      this.activePlayerList = {};
      clearInterval(this.activePlayerListInterval);
    }
    if (shutDown) {
      if (this.logoutInterval) clearInterval(this.logoutInterval);
    }
  }

  // === Log all WebSocket communication, and determine if it needs to be parsed
  async enableWebSocketLogging() {
    const client = await this.page.target().createCDPSession();

    // Enable necessary protocol domains
    await client.send('Network.enable');

    // Log WebSocket frames received from the server
    client.on('Network.webSocketFrameReceived', ({ requestId, timestamp, response }) => {
        //console.log(`[←] WS RECV @ ${timestamp}:`, response.payloadData);
        this.handleWebSocketCommunication(response.payloadData);
    });

    // Log WebSocket frames sent by the browser
    //client.on('Network.webSocketFrameSent', ({ requestId, timestamp, response }) => {
    //    console.log(`[→] WS SENT @ ${timestamp}:`, response.payloadData);
    //});

    // Optionally, log WebSocket creation
    //client.on('Network.webSocketCreated', ({ requestId, url }) => {
    //    console.log(`🔌 WebSocket created: ${url}`);
    //});
  }

  // === Logs any console.log() output from browser context
  handleConsole(msg) {
    msg.args().forEach((arg) => {
      arg.jsonValue().then((val) => console.log(val));
    });  
  }

  // === Sends login input to selected server using Puppeteer typing
  async handleLoginInteraction() {
    let serverToConnect = '';

    // Determine server ID based on config
    switch (this.server) {
      case 'beginner':
        serverToConnect = this.pbnBeginnerServerId;
        break;
      case 'tournament':
        serverToConnect = this.pbnTournamentServerId;
        break;
      case 'primary':
      default:
        if (this.server !== 'primary') {
          console.log('⚠️ Unknown server. Defaulting to Primary.');
        }
        serverToConnect = this.pbnPrimaryServerId;
    }
    if (!this.logoutDetected) {
      console.log(`🔐 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} Selecting server and logging in...`);

      // Wait until the server div is available
      await this.page.waitForSelector(`#${serverToConnect}`);

      // Click server selector
      await this.page.click(`#${serverToConnect}`);
      
      // Fill in login credentials
      await this.page.type(`#${this.pbnUsernameTextboxId}`, this.pbnHandle);
      
      await this.page.type(`#${this.pbnPasswordTextboxId}`, this.pbnPassword);
      
      // Submit login form
      await this.page.keyboard.press('Enter');
      
      // Wait for the main input field to appear (indicates login success)
      await this.page.waitForSelector(`#${this.pbnMainInputTextboxId}`);

    } else {
      console.log(`🔄 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.RED}Trying to log in after disconnect.${this.ansiCodes.RESET}`);
      
      await this.page.type(`#${this.pbnUsernameTextboxId}`, this.pbnHandle);
      
      await this.page.type(`#${this.pbnPasswordTextboxId}`, this.pbnPassword);
      
      await this.page.keyboard.press('Enter');
      
      this.logoutDetected = false;
    }
  }

  // === Handle Login, and Re-Login Sequences
  async handleLoginSequence() {
    // Handle login
    await this.handleLoginInteraction();
    // Start timed background tasks
    this.startAllIntervals();
  }

  // === Parse strings from websocket communication
  handleWebSocketCommunication(payloadDataString) {
    const payloadData = JSON.parse(payloadDataString);
    
    const ignorePayloadIds = [
      'quit', // Server quit acknowledgement
      '0107', // Server logged into
      '05', // New Game information?
      '10',
      '12',
      '14', // Player position update?
      '13',
      '15', // Player Update
      '17', // PBN Terrain message
      '18', // PBN communication messages
    ]

    if (!ignorePayloadIds.includes(payloadData['id'])) {
      console.log(payloadDataString);
    }
    
    // Detect player Communication
    if (payloadData['id'] == "18") {
      //Player CHAT
      //console.log(payloadDataString);
      if (payloadData['data']['chatType'] == "18") {
        //console.log('Chat confirmed');
        const chatHandle = payloadData['data']['from'];
        const chatMessage = payloadData['text'];
        console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}${this.ansiCodes.BLUE}${chatHandle}${this.ansiCodes.RESET}: ${chatMessage}`);
      }
      //Player TELL
      //{"id":"18","data":{"from":"gh0stly","to":"gh0stly","chatType":"37"},"text":"test this string"}
      if (payloadData['data']['chatType'] == "37") {
        const fromHandle = payloadData['data']['from'];
        const toHandle = payloadData['data']['to'];
        const tellMessage = payloadData['text'];
        console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}${fromHandle}${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.RED}tells${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${toHandle}${this.ansiCodes.RESET}: ${tellMessage}`);
        // Handle Replying to Tells
        this.parseTellString(fromHandle, tellMessage);
      }
      //Player RTELL
      if (payloadData['data']['chatType'] == "rtell") {
        const fromHandle = payloadData['data']['from'];
        const toHandle = payloadData['data']['to'];
        const rtellMessage = payloadData['text'];
        console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}${fromHandle}${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.RED}rtells${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${toHandle}${this.ansiCodes.RESET}: ${rtellMessage}`);
      }
      // Player Say
      if (payloadData['data']['chatType'] == "say") {
        const fromHandle = payloadData['data']['from'];
        const sayMessage = payloadData['text'];
        console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}${fromHandle}${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.CYAN}says${this.ansiCodes.RESET}: ${sayMessage}`);
      }
      // Player Whisper
      if (payloadData['data']['chatType'] == "whisper") {
        const fromHandle = payloadData['data']['from'];
        const whisperMessage = payloadData['text'];
        console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}${fromHandle}${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.MAGENTA}whispers${this.ansiCodes.RESET}: ${whisperMessage}`);
      }
      // Player Teamchat
      if (payloadData['data']['chatType'] == "teamchat") {
        const fromHandle = payloadData['data']['from'];
        const teamMessage = payloadData['text'];
        console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}${fromHandle}${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.GREEN}teamchats${this.ansiCodes.RESET}: ${teamMessage}`);
      }
      // Player Plan
      if (payloadData['data']['chatType'] == "plan") {
        const fromHandle = payloadData['data']['from'];
        const planMessage = payloadData['text'];
        console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}${fromHandle}${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.GREEN}plans${this.ansiCodes.RESET}: ${planMessage}`);
      }
    }

    // Handle RWHO, WHO, Look
    if (payloadData['id'] == "10") {
      //console.log(payloadDataString)
      // Process RWHO String
      if (payloadData['text'].includes('Paintball Net Beginner Server')) {
        const rawRWHOString = payloadData['text'];
        const rwhoObj = this.parseRWHOString(rawRWHOString);
        //console.log(rwhoObj);
        if (this.rwhoIntervalFirstRun) {
          // First run just get players, do not report anything
          this.rwhoIntervalFirstRun = false;
          this.serverList = rwhoObj;
        } else {
          // Compare server lists, report logins and logouts
          this.compareServerLists(rwhoObj);
        }
      }
    }

    // Acknowledge Successful login
    if (payloadData['id'] == '0107') {
      console.log(`✅ ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} ${this.ansiCodes.GREEN}Login was successful.${this.ansiCodes.RESET}`);
    }

    if (payloadData['id'] == 'quit') {
      console.log(`❌ ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} ${this.ansiCodes.GREEN}Graceful logout detected.${this.ansiCodes.RESET}`);
    }
  }  

  // === Entry point: boot browser, login, start CLI and background tasks
  async init() {
    try {
      this.browser = await puppeteer.launch({
        headless: this.browserHeadless,
        //executablePath: '/usr/bin/chromium-browser', // Uncomment for use on raspberry pi
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      this.page = await this.browser.newPage();

      // Hook into browser console output
      this.page.on('console', this.handleConsole.bind(this));

      // Navigate to the game site and wait for initial DOM to load
      await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
      
      // Enable Web Socket Logging
      await this.enableWebSocketLogging(); 

      // Handle Ctrl+C (SIGINT) gracefully
      process.on('SIGINT', async () => {
        console.log('\nCaught SIGINT. Cleaning up...');
        this.rl?.close();
        await this.shutdown();
        process.exit();
      });

      // Handle Login sequence and looped services
      await this.handleLoginSequence();

      // Start terminal interface
      this.startTerminalInput();
    } catch (error) {
      console.error('❌ Error during initialization:', error);
      await this.shutdown();
    }
  }

  // === Graceful shutdown for intervals, readline, and browser
  async shutdown() {

    this.clearAllIntervals(true);

    if (this.closeBrowser && this.browser) {
      console.log(`🛑 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} Closing the browser...`);
      await this.browser.close();
    } else {
      console.log(`ℹ️ ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} Browser remains open. Press Ctrl+C to exit.`);
      await new Promise(() => {}); // Prevents auto-exit
    }
  }    

  // === Starts all enabled looped functions
  startAllIntervals () {
    if (this.lookIntervalEnabled) { this.startAutoLookLoop(); }
    if (this.gameListIntervalEnabled) { this.startGamelistPolling(); }
    if (this.rwhoIntervalEnabled) {this.startAutoRWHOLoop();}
    if (this.commandEntryIntervalEnabled) { this.startCommandEntryLoop(); }
    if (this.commandEntryWatcherIntervalEnabled) { this.startCommandEntryWatcherLoop(); }
    if (this.logoutIntervalEnabled) { this.watchForLogoutScreen(); }
    if (this.activePlayerListEnabled) { this.startActivePlayerListLoop(); }
  }

  // === Handles user input from terminal and sends to game input field
  startTerminalInput() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> ',
    });

    this.rl.prompt(); // Show initial prompt

    // On each line of terminal input:
    this.rl.on('line', async (input) => {
      const trimmed = input.trim();

      // Exit condition
      if (trimmed.toLowerCase() === 'exit') {
        console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} Exiting program. Goodbye!`);
        this.closeBrowser = true;
        this.rl.close();
        await this.shutdown();
        return;
      }

      try {
        // Add text command to sendCommandList
        this.addCommandEntry(trimmed);
      } catch (error) {
        console.error(`⚠️ ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.RED}Error sending input${this.ansiCodes.RESET}:`, error.message);
      }

      this.rl.prompt(); // Show next prompt
    });
  }  

  // === After login, watch for login screen to re-appear and detect logout
  async watchForLogoutScreen(selector = `#${this.pbnUsernameTextboxId}`) {
    //console.log('👀 Watching for logout screen using activeElement check...');

    this.logoutInterval = setInterval(async () => {
      try {
        const isUsernameInputActive = await this.page.evaluate((sel) => {
          const input = document.querySelector(sel);
          return document.activeElement === input;
        }, selector);

        if (isUsernameInputActive) {
          // Handle logout:
          clearInterval(this.logoutInterval);
          console.log(`⚠️ ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.RED}Logout detected${this.ansiCodes.RESET} — username input regained focus.`);
          // Cleanup background tasks
          this.logoutDetected = true;
          this.clearAllIntervals();

          // Attempt re-login
          // Optionally wait a bit before retrying
          if (this.autoReLogin) {
            setTimeout(async () => {
              //console.log(`🔁 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} Getting ready for automatic re-login. Pausing.`);
              await this.handleLoginSequence();
            }, this.autoReLoginDelay); // 3-second delay before retry
          }
        }
      } catch (error) {
        console.error(`🚨 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.RED}Error polling for logout state${this.ansiCodes.RESET}:`, error.message);
      }
    }, 1000); // Poll every 1 second
  }

  // ===
  // === [Looped Sequences] ===
  // ===

  // === Checks this.activePlayersList every second to report active users to discord
  startActivePlayerListLoop() {
    const userNameIgnoreList = [
      'parabot',
    ];
    this.activePlayerListInterval = setInterval(async () => {
      Object.keys(this.activePlayersList).forEach(key => {
        const timestampDate = new Date()
        const unixTimestamp = Math.floor(timestampDate.getTime() / 1000);

        const timeDiff = unixTimestamp - this.activePlayersList[key]['loginTime'];
        //console.log(key);
        //console.log (`Time difference: ${timeDiff}`);
        //console.log(`Login Reported: ${this.active_players_list[key]['loginReported']}`)

        if (timeDiff >= this.activePlayerReportTime && !this.activePlayersList[key]['loginReported']) {
          this.activePlayersList[key]['loginReported'] = true;
          if (!userNameIgnoreList.includes(key)) {
            //console.log(`Report that ${key} is active!`);
            if (this.discordSendUpdates) {
              const shortDateTime = `<t:${this.activePlayersList[key]['loginTime']}:f>`; // e.g., "March 15, 2023 10:30 PM"
              const relativeTime = `<t:${this.activePlayersList[key]['loginTime']}:R>`;   // e.g., "in 2 hours", "5 minutes ago"
              const discordString = `${key} is logged into ${this.activePlayersList[key]['server']} server. ${relativeTime} (${shortDateTime})`
              console.log(`ℹ️ ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} Reporting that ${key} is active to discord.`)
              this.sendMessageToDiscord(this.discordWebhookUrl, discordString, 'parabot', this.discordAvatarUrl);
            }      
          }
        }
      });
    }, this.activePlayerListDelay); 
  }

  // === Automatically sends "look" command every 3 minutes
  startAutoLookLoop() {
    this.lookInterval = setInterval(async () => {
      try {
        this.addCommandEntry('look');
      } catch (error) {
        console.error('⚠️ Error sending auto "look":', error.message);
      }
    }, this.autoLookDelay); 
  }

  // === Automatically sends "rwho" command every 1 second
  startAutoRWHOLoop() {
    this.rwhoInterval = setInterval(async () => {
      try {
        this.addCommandEntry('rwho');
      } catch (error) {
        console.error('⚠️ Error sending auto "look":', error.message);
      }
    }, this.autoRWHODelay); 
  }  

  // === Watches this.sendCommandList and sends any commands in the array to the game
  startCommandEntryLoop () {
    this.commandEntryInterval = setInterval(async () => {
      // Check if previous instance is still typing, Do nothing if so
      if (this.isTyping) return;
      if (this.sendCommandList.length > 0) {
        // Lock out other instances from typing in the input box
        this.isTyping = true;
        try {
          // POP item 0 from the stack.
          const commandString = this.sendCommandList.shift();
          //console.log(`Sending command: ${commandString}`);
          await this.page.focus(`#${this.pbnMainInputTextboxId}`);
          
          await this.page.evaluate(selector => {  // Clear input box if need be
            const el = document.querySelector(selector);
            if (el) el.value = '';
          }, `#${this.pbnMainInputTextboxId}`);

          await this.page.type(`#${this.pbnMainInputTextboxId}`, commandString, {delay: this.botTypingDelay});
          await this.page.keyboard.press('Enter');
        } catch (error) {
          console.error('⚠️ Error sending command from list:', error.message);
        } finally {
          // Free the input box up for typing again for other instances
          this.isTyping = false;
        }
      }
    }, this.sendCommandListDelay);
  }

  // === Automatically sends "rwho" command every 1 second
  startCommandEntryWatcherLoop() {
    this.commandEntryWatcherInterval = setInterval(async () => {
      try {
        const commandListLen = this.sendCommandList.length;
        console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} There are currently (${commandListLen}) items in the command queue stack.`);
      } catch (error) {
        console.error('⚠️ Error sending auto "look":', error.message);
      }
    }, this.commandEntryWatcherDelay); 
  }   

  // === Polls external API for game list every 60 seconds
  startGamelistPolling() {
    this.gamelistInterval = setInterval(async () => {
      try {
        //console.log("Fetching games list..");
        const gameList = await this.getGameList();
        //this.latestGameList = gameList;
        let latestServerList = {};
        gameList.forEach((serverItem) => {
          let serverName = ''
          switch (serverItem['name']){
            case 'Paintball Net Beginner Server':
              serverName = 'beginner';
              break;
            case 'PBN Tournament Server':
              serverName = 'tournament';
              break;
            case 'Paintball Net Primary Server':
              serverName = 'primary';
              break;
          }
          latestServerList[serverName] = serverItem['players'];
        });
        
        if (this.gameListIntervalFirstRun) {
          // First run just get players, do not report anything
          this.gameListIntervalFirstRun = false;
          this.serverList = latestServerList;
        } else {
          // Compare server lists, report logins and logouts
          this.compareServerLists(latestServerList);
        }
        //console.log('[auto] Game list updated :', latestServerList);

      } catch (error) {
        console.error('⚠️ Failed to fetch game list:', error);
      }
    }, this.gameListPollingDelay);
  }

  // ===
  // === [Bot Command Functions] ===
  // ===

  // === Add command strings to this.sendCommandList
  addCommandEntry (commandString) {
    this.sendCommandList.push(commandString);
  }

  // === Compare new server list to stored server list.  Add new players to Active players list, remove old players
  async compareServerLists (newServerList) {
    const timestampDate = new Date()
    const unixTimestamp = Math.floor(timestampDate.getTime() / 1000);
    const userNameIgnoreList = [
      'parabot',
    ];

    Object.keys(newServerList).forEach(key => {
      //console.log(key);

      // First, compare server_list to this.auto_rwho_servers to find new players
      newServerList[key].forEach(player => {
        //console.log(player);
        if (this.serverList[key].includes(player) == false) {

          // Populate all players to active player list
          this.activePlayersList[player] = {
              loginTime: unixTimestamp,
              loginReported: false,
              server: key,
          }
          //console.log(this.active_players_list);

          if (!userNameIgnoreList.includes(player)) {
            // Send login to chat every time
            //console.log(`${player} has logged into ${key} server.`);
            this.addCommandEntry(`chat ${player} has logged into ${key} server.`)  
          }
        }
      });

      // Next, compare this.auto_rwho_servers to server_list to find players who logged out

      this.serverList[key].forEach(player => {
        if (newServerList[key].includes(player) == false) {
          delete this.activePlayersList[player];
          //console.log(this.active_players_list);
          if (!userNameIgnoreList.includes(player) && player != 'parabot') {
            //console.log(`${player} has logged out of ${key} server.`);
            this.addCommandEntry(`chat ${player} has logged out of ${key} server.`)
          }
        }
      });
    });
    this.serverList = newServerList;
  }  

  // === HTTPS GET request to fetch game list JSON from external API
  getGameList() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'drm-pbn-be.com',
        port: 2998,
        path: '/gamelist?Detail=1',
        method: 'GET',
        rejectUnauthorized: false, // Allow self-signed certs (be cautious)
      };

      const req = https.request(options, (res) => {
        let data = '';

        // Stream response chunks
        res.on('data', (chunk) => (data += chunk));

        res.on('end', () => {
          try {
            // Attempt to parse and return JSON
            const json = JSON.parse(data);
            resolve(json);
          } catch (err) {
            reject(`Failed to parse response: ${err.message}`);
          }
        });
      });

      req.on('error', (err) => reject(`Request failed: ${err.message}`));
      req.end();
    });
  }  

  // === Process RWHO String and return object containing arrays for each server
  parseRWHOString(input) {
    const servers = {};
    const serverRegex = /(Paintball Net (Beginner|Primary) Server \(\d+ players?\))|(PBN Tournament Server \(\d+ players?\))/g;
    const lines = input.split(/\r?\n/);

    let currentServer = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const serverMatch = trimmed.match(serverRegex);
      if (serverMatch) {
        if (trimmed.includes('Beginner')) currentServer = 'beginner';
        else if (trimmed.includes('Primary')) currentServer = 'primary';
        else if (trimmed.includes('Tournament')) currentServer = 'tournament';

        if (currentServer) servers[currentServer] = [];
      } else if (currentServer) {
        // Skip summary lines like "(4 players online)"
        if (/^\(\d+ players online\)$/.test(trimmed)) continue;

        // Otherwise, treat it as a player name
        servers[currentServer].push(trimmed);
      }
    }

    return servers;
  }

  // === Process TELL string
  parseTellString(username, message) {
    const defaultReplyString = `Hi ${username}, I am just a simple bot. If you do not want your login activity to be reported by me, please reach out to paradox on Discord or in game when they are available.`;
    let msg = '';
    
    if (username == this.pbnHandle) {return};

    if (message == '/help') {
      const defaultHelpString = `This feature is under construction.`;
      msg = defaultHelpString;
    } else {
      msg = defaultReplyString;
    }
    const commandString = `tell ${username} ${msg}`;
    this.addCommandEntry(commandString);
  }

  // === Sends a message to discord
  sendMessageToDiscord = async (webhookUrl, messageContent, username = "Webhook Bot", avatarUrl = null) => {
    const payload = {
        content: messageContent,
        username: username,
    };

    if (avatarUrl) {
        payload.avatar_url = avatarUrl;
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            console.log(`📨 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} Message sent successfully to Discord!`);
        } else {
            const errorData = await response.json();
            console.error(`❌ ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} ${this.ansiCodes.RED}Failed to send message to Discord${this.ansiCodes.RESET}:`, response.status, response.statusText, errorData);
            //alert(`Failed to send message: ${response.status} - ${response.statusText}\n${JSON.stringify(errorData, null, 2)}`);
        }
    } catch (error) {
        console.error(`❌ ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} ${this.ansiCodes.RED}An error occurred while sending the message${this.ansiCodes.RESET}:`, error);
        //alert(`An error occurred: ${error.message}`);
    }
  }

}

// ===
// === [Create Bot Instance, and initialize bot] === 
// ===

// === Boot the bot with config ===
const controller = new PBNBot({
  closeBrowser: false,
  url: 'https://play.paintballnet.net',
  server: 'primary',
  headless: true,
});

controller.init();
