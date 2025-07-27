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

    // === Puppeteer element IDs
    this.pbnBeginnerServerId = process.env.PBN_BEGINNER_SERVER_ID; // PBN Beginner Server selector Div Id
    this.pbnPrimaryServerId = process.env.PBN_PRIMARY_SERVER_ID; // PBN Primary Server selector Div Id
    this.pbnTournamentServerId = process.env.PBN_TOURNAMENT_SERVER_ID; // PBN Tournament Server selector Div Id
    this.pbnUsernameTextboxId = process.env.PBN_USERNAME_TEXTBOX_ID; // PBN Username Input textbox Id
    this.pbnPasswordTextboxId = process.env.PBN_PASSWORD_TEXTBOX_ID; // PBN Password Input textbox Id
    this.pbnMainInputTextboxId = process.env.PBN_MAIN_INPUT_TEXTBOX_ID; // PBN Main command text input box Id

    // === Credentials loaded from environment variables 
    this.pbnHandle = process.env.PBN_HANDLE;  // PBN_HANDLE= in .env
    this.pbnPassword = process.env.PBN_PASSWORD; // PBN_PASSWORD= in .env
    this.discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL; // DISCORD_WEBHOOK_URL= in .env 
    this.discordAvatarUrl = process.env.DISCORD_AVATAR_URL;  // DISCORD_AVATAR_URL= in .env

    // === Enable / Disable Looped Background services (Values set in .env file)
    this.autoReLogin = (process.env.AUTO_RE_LOGIN || '').toLowerCase() === 'true'; // Enable or Disable Re-login after logout detected
    this.lookIntervalEnabled = (process.env.LOOK_INTERVAL_ENABLED || '').toLowerCase() === 'true'; // Enable auto-look for anti-idle reasons
    this.rwhoIntervalEnabled = (process.env.RWHO_INTERVAL_ENABLED || '').toLowerCase() === 'true'; // Sends RWHO Command at set interval
    this.gameListIntervalEnabled = (process.env.GAME_LIST_INTERVAL_ENABLED || '').toLowerCase() === 'true'; // Enable Retreive player list from backend web api
    this.activePlayerListEnabled = (process.env.ACTIVE_PLAYER_LIST_ENABLED || '').toLowerCase() === 'true'; // Reports active users over Discord, works with this.discordSendUpdates enabled
    this.commandEntryIntervalEnabled = (process.env.COMMAND_ENTRY_INTERVAL_ENABLED || '').toLowerCase() === 'true'; // Enable Command list entry loop.  DO NOT DISABLE
    this.commandEntryWatcherIntervalEnabled = (process.env.COMMAND_ENTRY_WATCHER_INTERVAL_ENABLED || '').toLowerCase() === 'true'; // Enable Command Entry list watcher to monitor command queue
    this.logoutIntervalEnabled = (process.env.LOGOUT_INTERVAL_ENABLED || '').toLowerCase() === 'true'; // Enable Watching for logout, and re-login
    this.discordSendUpdates = (process.env.DISCORD_SEND_UPDATES || '').toLowerCase() === 'true'; // Enable sending Discord Updates, works with this.activePlayerListEnabled
    this.reportLoginsToChat = (process.env.REPORT_LOGINS_TO_CHAT || '').toLowerCase() === 'true'; // Enable this.compareServerLists to send login/logout info to the chat
    this.reportLoginsToConsole = (process.env.REPORT_LOGINS_TO_CONSOLE || '').toLowerCase() === 'true'; // Enable this.compareServerLists to send login/logout info to the console
    this.displayGameMessages = (process.env.DISPLAY_GAME_MESSAGES || '').toLowerCase() === 'true';  // Enable displaying messages from server (GAME: )

    // === Background Interval Objects
    this.gameListIntervalFirstRun = true; // Do Not Edit
    this.rwhoIntervalFirstRun = true; // Do Not Edit
    this.lookInterval = null; // Do Not Edit
    this.gamelistInterval = null; // Do Not Edit
    this.rwhoInterval = null; // Do Not Edit
    this.activePlayerListInterval = null; // Do Not Edit
    this.commandEntryInterval = null;  // Do Not Edit
    this.commandEntryWatcherInterval = null; // Do Not Edit
    this.logoutInterval = null;  // Do Not Edit

    // === Communication Options
    this.displayChatMessages = (process.env.DISPLAY_CHAT_MESSAGES || '').toLowerCase() === 'true'; // Display 'chat' messages to console
    this.displayTellMessages = (process.env.DISPLAY_TELL_MESSAGES || '').toLowerCase() === 'true'; // Display 'tell' messages to console
    this.displayRtellMessages = (process.env.DISPLAY_RTELL_MESSAGES || '').toLowerCase() === 'true'; // Display 'rtell' messages to console
    this.displaySayMessages = (process.env.DISPLAY_SAY_MESSAGES || '').toLowerCase() === 'true'; // Display 'say' messages to console
    this.displayWhisperMessages = (process.env.DISPLAY_WHISPER_MESSAGES || '').toLowerCase() === 'true'; // Display 'whisper' messages to console
    this.displayTeamchatMessages = (process.env.DISPLAY_TEAMCHAT_MESSAGES || '').toLowerCase() === 'true'; // Display 'teamchat' messages to console
    this.displayPlanMessages = (process.env.DISPLAY_PLAN_MESSAGES || '').toLowerCase() === 'true'; // Display 'plan' messages to console 

    // === Bot Timing Options
    this.autoReLoginDelay = parseInt(process.env.AUTO_RE_LOGIN_DELAY, 10); // Time to wait (ms) for re-login (Wait 10 minutes) 10 * 60 * 1000
    this.autoLookDelay = parseInt(process.env.AUTO_LOOK_DELAY, 10); // Anti Idle, Send Look command every 3 minutes (ms) 3 * 60 * 1000
    this.gameListPollingDelay = parseInt(process.env.GAME_LIST_POLLING_DELAY, 10); // Time to Send HTTP Request for server list. (ms) (Every 5 seconds)
    this.sendCommandListDelay = parseInt(process.env.SEND_COMMAND_LIST_DELAY, 10); // Time in between sending command to game. (ms) (Every 3/4 of a second)
    this.commandEntryWatcherDelay = parseInt(process.env.COMMAND_ENTRY_WATCHER_DELAY, 10); // Time between reporting how many commands are in queue to send (ms) 10 * 60 * 1000
    this.activePlayerListDelay = parseInt(process.env.ACTIVE_PLAYER_LIST_DELAY, 10); // Time to check Active player list for players to report to Discord. (ms) (1 second)
    this.activePlayerReportTime = parseInt(process.env.ACTIVE_PLAYER_REPORT_TIME, 10); // Time to Report active player to Discord. (seconds) (5 minutes)
    this.autoRWHODelay = parseInt(process.env.AUTO_RWHO_DELAY, 10); // Time to send RWHO command to game, (ms) (1.5 Seconds)
    this.botTypingDelay = parseInt(process.env.BOT_TYPING_DELAY, 10); // (ms) delay between keystrokes, can simulate better typing
    
    // === State Options
    this.sendCommandList = []; // Stack of commands waiting to be sent to game
    this.logoutDetected = false;  // Do Not Edit
    this.isLoggedIn = false; // Do Not Edit
    this.isTyping = false; // Do Not Edit, Lock flag for commandEntryInterval
    this.activeHTTPRequest = false; // Do Not Edit, Lock flag for gameListInterval
    this.selectedServer = '';
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
    this.rwhoIntervalFirstRun = true;
    if (this.commandEntryInterval) clearInterval(this.commandEntryInterval);
    if (this.commandEntryWatcherInterval) clearInterval(this.commandEntryWatcherInterval);
    if (this.activePlayerListInterval) {
      this.activePlayerList = {};
      clearInterval(this.activePlayerListInterval);
    }
    if (shutDown) {
      if (this.logoutInterval) clearInterval(this.logoutInterval);
    }

    // Clear old player and game data
    this.serverList = {  // Master Server List, Do Not Edit
      beginner: [],
      primary: [],
      tournament: [],
    };
    
    this.sendCommandList = [];
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
    // Determine server ID based on config
    switch (this.server) {
      case 'beginner':
        this.selectedServer = this.pbnBeginnerServerId;
        break;
      case 'tournament':
        this.selectedServer = this.pbnTournamentServerId;
        break;
      case 'primary':
      default:
        if (this.server !== 'primary') {
          console.log('⚠️ Unknown server. Defaulting to Primary.');
        }
        this.selectedServer = this.pbnPrimaryServerId;
    }
    //this.selectedServer = serverToConnect;
    if (!this.logoutDetected) {
      console.log(`🔐 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} Selecting server and logging in...`);
      // Wait until the server div is available
      await this.page.waitForSelector(`#${this.selectedServer}`);
      // Click server selector
      await this.page.click(`#${this.selectedServer}`);
      // Fill in login credentials
      await this.page.type(`#${this.pbnUsernameTextboxId}`, this.pbnHandle);
      await this.page.type(`#${this.pbnPasswordTextboxId}`, this.pbnPassword);
      // Submit login form
      await this.page.keyboard.press('Enter');
      // Wait for the main input field to appear (indicates login success)
      await this.page.waitForSelector(`#${this.pbnMainInputTextboxId}`);
    } else {
      console.log(`🔄 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.RED}Trying to log in after disconnect.${this.ansiCodes.RESET}`);
      // Server selection ID's change after login
      // Select new server ID, and re-enter login information
      await this.page.type(`#${this.pbnUsernameTextboxId}`, this.pbnHandle);
      await this.page.type(`#${this.pbnPasswordTextboxId}`, this.pbnPassword);
      await this.page.keyboard.press('Enter');
    }
  }

  // === Handle Login, and Re-Login Sequences
  
  async handleLoginSequence(retryCount = 3, pollIntervalMs = 1000, maxWaitMs = 15000) {
    for (let attempt = 0; attempt < retryCount; attempt++) {
      await this.handleLoginInteraction();
      
      const loginSuccess = await this.waitForLogin(pollIntervalMs, maxWaitMs);
      if (loginSuccess) {
        
        this.startAllIntervals();
        // Flip logout flag if sign in from logout was detected.
        if (this.logoutDetected) {
          this.logoutDetected = false;
        }
        return;
      }

      console.warn(`Login attempt ${attempt + 1} failed. Retrying...`);
      // Reload page if entering login info fails
      await this.page.reload();
      // Re Select servers .. HandleLoginInteraction should fill in username and pw box and press enter again
      // Wait until the server div is available
      await this.page.waitForSelector(`#${this.selectedServer}`);
      // Click server selector
      await this.page.click(`#${this.selectedServer}`);

    }

    throw new Error("Failed to log in after multiple attempts.");
  }

  // === Wait for isLoggedIn flag to be set to true
  async waitForLogin(pollIntervalMs, timeoutMs) {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      if (this.isLoggedIn) return true;
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    return false;
  }

  // === Parse strings from websocket communication
  handleWebSocketCommunication(payloadDataString) {
    const payloadData = JSON.parse(payloadDataString);
    
    const ignorePayloadIds = [
      'quit', // Server quit acknowledgement
      '0107', // Server logged into
      '05', // New Game information?
      '10', // Server messages, and active players (GAME: updates)
      '12',  // Player info and location and buttons
      '14', // Player position update
      '13', // Player $ on hand, and equipped items
      '15', // Player Update
      '17', // PBN Terrain message
      '18', // PBN communication messages
    ]

    if (!ignorePayloadIds.includes(payloadData['id'])) {
      const now = new Date();
      const utcTime = now.toISOString().split('T')[1].split('.')[0]; // HH:MM:SS format
      console.log(`[UTC ${utcTime}] ${payloadDataString}`);
    }
    
    // Detect player Communication
    if (payloadData['id'] == "18") {
      //Player CHAT
      if (payloadData['data']['chatType'] == "18") {
        const chatHandle = payloadData['data']['from'];
        const chatMessage = payloadData['text'];
        if (this.displayChatMessages) {
          console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}${this.ansiCodes.BLUE}${chatHandle}${this.ansiCodes.RESET}: ${chatMessage}`);
        }
      }
      //Player TELL
      if (payloadData['data']['chatType'] == "37") {
        const fromHandle = payloadData['data']['from'];
        const toHandle = payloadData['data']['to'];
        const tellMessage = payloadData['text'];
        if (this.displayTellMessages) {
          console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}${fromHandle}${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.RED}tells${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${toHandle}${this.ansiCodes.RESET}: ${tellMessage}`);
        }
        // Handle Replying to Tells
        this.parseTellString(fromHandle, tellMessage);
      }
      //Player RTELL
      if (payloadData['data']['chatType'] == "rtell") {
        const fromHandle = payloadData['data']['from'];
        const toHandle = payloadData['data']['to'];
        const rtellMessage = payloadData['text'];
        if (this.displayRtellMessages) {
          console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}${fromHandle}${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.RED}rtells${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${toHandle}${this.ansiCodes.RESET}: ${rtellMessage}`);
        }
      }
      // Player Say
      if (payloadData['data']['chatType'] == "say") {
        const fromHandle = payloadData['data']['from'];
        const sayMessage = payloadData['text'];
        if (this.displaySayMessages) {
          console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}${fromHandle}${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.CYAN}says${this.ansiCodes.RESET}: ${sayMessage}`);
        }
      }
      // Player Whisper
      if (payloadData['data']['chatType'] == "whisper") {
        const fromHandle = payloadData['data']['from'];
        const whisperMessage = payloadData['text'];
        if (this.displayWhisperMessages) {
          console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}${fromHandle}${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.MAGENTA}whispers${this.ansiCodes.RESET}: ${whisperMessage}`);
        }
      }
      // Player Teamchat
      if (payloadData['data']['chatType'] == "teamchat") {
        const fromHandle = payloadData['data']['from'];
        const teamMessage = payloadData['text'];
        if (this.displayTeamchatMessages) {
          console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}${fromHandle}${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.GREEN}teamchats${this.ansiCodes.RESET}: ${teamMessage}`);
        }
      }
      // Player Plan
      if (payloadData['data']['chatType'] == "plan") {
        const fromHandle = payloadData['data']['from'];
        const planMessage = payloadData['text'];
        if (this.displayPlanMessages) {
          console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}${fromHandle}${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.GREEN}plans${this.ansiCodes.RESET}: ${planMessage}`);
        }
      }
    }

    // Handle RWHO, WHO, Look, Game Server Messages
    if (payloadData['id'] == "10") {
      //console.log(payloadDataString)
      // Process RWHO String
      if (payloadData['text'].includes('Paintball Net Beginner Server')) {
        const rawRWHOString = payloadData['text'];
        const rwhoObj = this.parseRWHOString(rawRWHOString);
        if (this.rwhoIntervalFirstRun) {
          // First run just get players, do not report anything
          this.rwhoIntervalFirstRun = false;
          this.serverList = rwhoObj;
        } else {
          // Compare server lists, report logins and logouts
          this.compareServerLists(rwhoObj);
        }
      } else if (payloadData['text'].includes('GAME: ')) {
        const payloadMessage = payloadData['text'].replace("GAME: ", '');
        const messageIgnoreList = [
          'The game has started without you.',
          'The game is over.',
          'The next game is about to start.',
        ];

        const now = new Date();
        const utcTime = now.toISOString().split('T')[1].split('.')[0]; // HH:MM:SS format
        if (payloadMessage.includes('\r\n')) {
          const messageArray = payloadMessage.split('\r\n');
          messageArray.forEach((msg, index) => {
            if (this.displayGameMessages) {
              console.log(`[UTC ${utcTime}] ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}GAME: ${this.ansiCodes.RESET}${msg}`);
            }
          });
        } else {
          if (this.displayGameMessages) {
            console.log(`[UTC ${utcTime}] ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}GAME: ${this.ansiCodes.RESET}${payloadMessage}`);
          }
        }

        if (payloadMessage.includes('Paintball Net will shutdown in 10 seconds!')) {
          console.log('Server shutdown detected!  Attempting to quit and re-login.');
          this.addCommandEntry('quit');
        }
      }
    }

    // Acknowledge Successful login
    if (payloadData['id'] == '0107') {
      this.isLoggedIn = true;
      console.log(`✅ ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} ${this.ansiCodes.GREEN}Login was successful.${this.ansiCodes.RESET}`);
    }

    if (payloadData['id'] == 'quit') {
      this.isLoggedIn = false;
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

      // Handle SIGTERM gracefully
      process.on('SIGTERM', async () => {
        console.log('\nCaught SIGTERM. Cleaning up...');
        this.rl?.close();
        await this.shutdown();
        process.exit();
      });

      // Handle Login sequence and looped services
      try {
        await this.handleLoginSequence();
      } catch (error) {
        console.log('❌ Error during login:', error);
        await this.shutdown();
      }

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
        // Add console command to the Command Entry List
        this.addCommandEntry(trimmed);
      } catch (error) {
        console.error(`⚠️ ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.RED}Error sending input${this.ansiCodes.RESET}:`, error.message);
      }

      this.rl.prompt(); // Show next prompt
    });
  }  

  // === After login, watch for login screen to re-appear and detect logout
  async watchForLogoutScreen(selector = `#${this.pbnUsernameTextboxId}`) {
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
          this.isLoggedIn = false;
          this.clearAllIntervals();

          // Attempt re-login
          // Optionally wait a bit before retrying
          if (this.autoReLogin) {
            setTimeout(async () => {
              try {
                await this.handleLoginSequence();
              } catch (error) {
                 console.log('❌ Error during auto re-login:', error);
                 await this.shutdown();
              }
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

        if (timeDiff >= this.activePlayerReportTime && !this.activePlayersList[key]['loginReported']) {
          this.activePlayersList[key]['loginReported'] = true;
          if (!userNameIgnoreList.includes(key)) {
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
      if (this.isTyping || !this.isLoggedIn) return;
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
      if (this.activeHTTPRequest) return;
      try {
        //console.log('Starting HTTP Request.');
        this.activeHTTPRequest = true;
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
      } finally {
        //console.log('Done with HTTP Request.');
        this.activeHTTPRequest = false;
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

    const serverControlList = ["beginner", "primary", "tournament"]; // Control list to compare
    const serverControlObj = { beginner: [], primary: [], tournament: [],};
    const serverKeys = Object.keys(newServerList);
    if (!this.haveSameItemsUnordered(serverControlList, serverKeys)) {  // A server went down
      const missingKeys = this.findMissingKeys(serverControlObj, newServerList);  // Determine which servers are not in the control list
      missingKeys.forEach(missingServer => {
        /*
          Logic can be included here to create a list of servers that are down, and announced to the chat
          when servers go down and come back up.
        */
        //console.log(`${missingServer} server is down.`);
        newServerList[missingServer] = [];  // Add that server with no players to newServerList to avoid crash
      });
    }
    Object.keys(newServerList).forEach(key => {

      // First, compare server_list to this.auto_rwho_servers to find new players
      newServerList[key].forEach(player => {
        if (this.serverList[key].includes(player) == false) {

          // Populate all players to active player list
          this.activePlayersList[player] = {
              loginTime: unixTimestamp,
              loginReported: false,
              server: key,
          }

          if (!userNameIgnoreList.includes(player)) {
            // Send login to chat every time
            if (this.reportLoginsToConsole) {
              console.log(`${player} has logged into ${key} server.`);
            }
            if (this.reportLoginsToChat) {
              this.addCommandEntry(`chat ${player} has logged into ${key} server.`);
            }
          }
        }
      });

      // Next, compare this.auto_rwho_servers to server_list to find players who logged out

      this.serverList[key].forEach(player => {
        if (newServerList[key].includes(player) == false) {
          delete this.activePlayersList[player];
          if (!userNameIgnoreList.includes(player) && player != 'parabot') {
            if (this.reportLoginsToConsole) {
              console.log(`${player} has logged out of ${key} server.`);
            }
            if (this.reportLoginsToChat) {
              this.addCommandEntry(`chat ${player} has logged out of ${key} server.`);;
            }
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
        }
    } catch (error) {
        console.error(`❌ ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} ${this.ansiCodes.RED}An error occurred while sending the message${this.ansiCodes.RESET}:`, error);
    }
  }

  // === Compare arrays to find missing items
  haveSameItemsUnordered(arr1, arr2) {
    // Check if lengths are the same
    if (arr1.length !== arr2.length) {
      return false;
    }

    //  Create shallow copies and sort them
    const sortedArr1 = [...arr1].sort();
    const sortedArr2 = [...arr2].sort();

    // Compare sorted arrays element by element
    for (let i = 0; i < sortedArr1.length; i++) {
      if (sortedArr1[i] !== sortedArr2[i]) {
        return false; // Found a difference
      }
    }

    return true; // All elements matched
  }

  // === Compare Objects to find missing keys
  findMissingKeys(sourceObj, targetObj) {
    const sourceKeys = Object.keys(sourceObj);
    const targetKeys = Object.keys(targetObj);
    const missingKeys = [];

    for (const key of sourceKeys) {
      if (!targetKeys.includes(key)) {
        missingKeys.push(key);
      }
    }
    return missingKeys;
  }

}

// ===
// === [Create Bot Instance, and initialize bot] === 
// ===

// === Boot the bot with config ===
const controller = new PBNBot({
  closeBrowser: false,
  //url: 'https://play.paintballnet.net',
  url: process.env.PBN_URL,
  //server: 'primary',
  server: process.env.PBN_SERVER,
  //headless: false,
  headless: (process.env.HEADLESS_MODE || '').toLowerCase() === 'true',
});

controller.init();
