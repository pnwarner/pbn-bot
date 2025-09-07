const fs = require('fs');
const https = require('https');
const puppeteer = require('puppeteer');
const readline = require('readline');
const config = require('./modules/config');
const DiscordService = require('./modules/discord');
const PBNVisualizer = require('./modules/pbn-visualizer');

class PBNBot {
  constructor() {
    
    // Set bot configurations from module
    this.config = { ...config };

    // Runtime config and session state
    this.closeBrowser = false;  // Keep browser open after page load, Do Not Edit
    this.browser = null; // Do Not Edit
    this.page = null;  // Do Not Edit

    // Node.js terminal interface
    this.rl = null;  // CLI Terminal Input Object, Do Not Edit

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

    // === State Options
    this.sendCommandList = []; // Stack of commands waiting to be sent to game
    this.logoutDetected = false;  // Do Not Edit
    this.isLoggedIn = false; // Do Not Edit
    this.isTyping = false; // Do Not Edit, Lock flag for commandEntryInterval
    this.activeHTTPRequest = false; // Do Not Edit, Lock flag for gameListInterval
    this.selectedServer = '';
    this.activeGame = false; // Flag for active game session
    this.activeGameMode = null; // String that stores name of active game mode
    this.activeGamePlayers = null; // Number of players in active game
    this.activeGameMessageId = '';  // Discord Message Id for active game session, Do Not Edit
    this.gameMap = {
      width: null,
      height: null,
      season: null,
      seasonSpecial: null,
      snowDay: null,
      lines: null,
      text: null
    };
    this.serverList = {  // Master Server List, Do Not Edit
      beginner: [],
      primary: [],
      tournament: [],
    };
    this.userNameIgnoreList = [
      this.config.pbnHandle,
      'parabot',
      'parabot1',
      'parabot2',
      'gh0stly',
    ];
    this.activePlayersList = {  // Active Player List, Do Not Edit
      /*
      playerHandle: {
        loginTime: UnixTimestamp,
        loginReported: false,
        server: server_name,
        discordMessageId: '',
      },
      */
    };
    // === ANSI Codes (move to separate module)
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
    };
    // === Server Statistics
    this.serverStats = {
      totalGames: this.readTotalGamesFromFile(),
      playerHandles: this.readPlayerHandlesFromFile(),
      gamesLost: this.readGamesLostFromFile(),
    };
    // === Import Discord Services
    this.discord = new DiscordService(this.config.discordWebhookUrl, {
      logToConsole: this.config.discordStatusToConsole,
      },
      this.ansiCodes,
      this.config.displayDebugData,
    );
    this.pbnv = new PBNVisualizer(this.ansiCodes);
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
    switch (this.config.server) {
      case 'beginner':
        this.selectedServer = this.config.pbnBeginnerServerId;
        break;
      case 'tournament':
        this.selectedServer = this.config.pbnTournamentServerId;
        break;
      case 'primary':
      default:
        if (this.config.server !== 'primary') {
          console.log('⚠️ Unknown server. Defaulting to Primary.');
        }
        this.selectedServer = this.config.pbnPrimaryServerId;
    }
    //this.selectedServer = serverToConnect;
    if (!this.logoutDetected) {
      console.log(`🔐 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} Selecting server and logging in...`);
      // Wait until the server div is available
      await this.page.waitForSelector(`#${this.selectedServer}`);
      // Click server selector
      await this.page.click(`#${this.selectedServer}`);
      // Fill in login credentials
      await this.page.type(`#${this.config.pbnUsernameTextboxId}`, this.config.pbnHandle);
      await this.page.type(`#${this.config.pbnPasswordTextboxId}`, this.config.pbnPassword);
      // Submit login form
      await this.page.keyboard.press('Enter');
      // Wait for the main input field to appear (indicates login success)
      await this.page.waitForSelector(`#${this.config.pbnMainInputTextboxId}`);
    } else {
      console.log(`🔄 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.RED}Trying to log in after disconnect.${this.ansiCodes.RESET}`);
      // Server selection ID's change after login
      // Select new server ID, and re-enter login information
      await this.page.type(`#${this.config.pbnUsernameTextboxId}`, this.config.pbnHandle);
      await this.page.type(`#${this.config.pbnPasswordTextboxId}`, this.config.pbnPassword);
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
  handleWebSocketCommunication = async (payloadDataString) => {
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
      //console.log(payloadDataString);
    }
    
    // Detect player Communication
    if (payloadData['id'] == "18") {
      //Player CHAT
      //console.log(payloadDataString);
      if (payloadData['data']['chatType'] == "18") {
        //console.log('Chat confirmed');
        const chatHandle = payloadData['data']['from'];
        const chatMessage = payloadData['text'];
        if (this.config.displayChatMessages) {
          console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}${this.ansiCodes.BLUE}${chatHandle}${this.ansiCodes.RESET}: ${chatMessage}`);
        }
        if (this.config.autoReplyChatMessages) {
          this.parseChatString(chatHandle, chatMessage);
        }
      }
      //Player TELL
      if (payloadData['data']['chatType'] == "37") {
        const fromHandle = payloadData['data']['from'];
        const toHandle = payloadData['data']['to'];
        const tellMessage = payloadData['text'];
        if (this.config.displayTellMessages) {
          console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}${fromHandle}${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.RED}tells${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${toHandle}${this.ansiCodes.RESET}: ${tellMessage}`);
        }
        // Handle Replying to Tells
        if (this.config.autoReplyTellMessages) {
          this.parseTellString(fromHandle, tellMessage);
        }
        
      }
      //Player RTELL
      if (payloadData['data']['chatType'] == "rtell") {
        const fromHandle = payloadData['data']['from'];
        const toHandle = payloadData['data']['to'];
        const rtellMessage = payloadData['text'];
        if (this.config.displayRtellMessages) {
          console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}${fromHandle}${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.RED}rtells${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${toHandle}${this.ansiCodes.RESET}: ${rtellMessage}`);
        }
      }
      // Player Say
      if (payloadData['data']['chatType'] == "say") {
        const fromHandle = payloadData['data']['from'];
        const sayMessage = payloadData['text'];
        if (this.config.displaySayMessages) {
          console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}${fromHandle}${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.CYAN}says${this.ansiCodes.RESET}: ${sayMessage}`);
        }
      }
      // Player Whisper
      if (payloadData['data']['chatType'] == "whisper") {
        const fromHandle = payloadData['data']['from'];
        const whisperMessage = payloadData['text'];
        if (this.config.displayWhisperMessages) {
          console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}${fromHandle}${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.MAGENTA}whispers${this.ansiCodes.RESET}: ${whisperMessage}`);
        }
      }
      // Player Teamchat
      if (payloadData['data']['chatType'] == "teamchat") {
        const fromHandle = payloadData['data']['from'];
        const teamMessage = payloadData['text'];
        if (this.config.displayTeamchatMessages) {
          console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}${fromHandle}${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.GREEN}teamchats${this.ansiCodes.RESET}: ${teamMessage}`);
        }
      }
      // Player Plan
      if (payloadData['data']['chatType'] == "plan") {
        const fromHandle = payloadData['data']['from'];
        const planMessage = payloadData['text'];
        if (this.config.displayPlanMessages) {
          console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}${fromHandle}${this.ansiCodes.RESET} ${this.ansiCodes.BOLD}${this.ansiCodes.GREEN}plans${this.ansiCodes.RESET}: ${planMessage}`);
        }
      }
    }

    // [UTC 15:14:14] {"id":"10","text":"Statistics for THIS game: (Survival)"}
    // [UTC 19:05:38] {"id":"10","text":"  10 people started, 10 surviving (0 bots), 10 minutes left in this game."}

    // Handle RWHO, WHO, Look, Game Server Messages
    if (payloadData['id'] == "10") {
      // console.log(payloadDataString)
      // Process RWHO String
      if (payloadData['text'].includes('Paintball Net Beginner Server')) {
        const rawRWHOString = payloadData['text'];
        const rwhoObj = this.parseRWHOString(rawRWHOString);
        if (this.rwhoIntervalFirstRun) {
          // First run: just get players, do not report anything because this.rwhoIntervalFirstRun is true
          this.compareServerLists(rwhoObj);
          // Now set this.rwhoIntervalFirstRun to false, will allow reporting logins and logouts to chat
          this.rwhoIntervalFirstRun = false;
        } else {
          // Compare server lists, report logins and logouts
          this.compareServerLists(rwhoObj);
        }
      } else if (payloadData['text'].includes('GAME: ')) {
        const payloadMessage = payloadData['text'].replace("GAME: ", '');
        //console.log(payloadMessage);
        // GAME: a raptor bot splatted paradox!
        // GAME: There were no survivors.
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
            if (this.config.displayGameMessages) {
              console.log(`[UTC ${utcTime}] ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}GAME: ${this.ansiCodes.RESET}${msg}`);
            }
          });
        } else {
          if (this.config.displayGameMessages) {
            console.log(`[UTC ${utcTime}] ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}GAME: ${this.ansiCodes.RESET}${payloadMessage}`);
          }
        }

        if (payloadMessage.includes('Paintball Net will shutdown in 10 seconds!')) {
          console.log('Server shutdown detected!  Attempting to quit and re-login.');
          this.resetStats();
          this.addCommandEntry('quit');
        }

        if (payloadMessage.includes('The game has started without you.')) {
          this.activeGame = true;
          // Detect game mode and opponents from message
          // console.log('Sending game command');
          this.addCommandEntry('game');
          const gameMode = await this.returnActiveGameMode(); // Wait for activeGameMode to be set 
          const gamePlayers = await this.returnActiveGamePlayers(); // Wait for activeGamePlayers to be set
          if (this.config.reportGameStatus) {
            if (this.config.reportGameStatusToConsole) {
              console.log(`A ${gameMode.toLowerCase()} game has started!`);
            }
            
            if (this.config.reportGameStatusToDiscord) {
              const timestampDate = new Date();
              const unixTimestamp = Math.floor(timestampDate.getTime() / 1000);
              const shortDateTime = `<t:${unixTimestamp}:f>`;
              const relativeTime = `<t:${unixTimestamp}:R>`;
              const discordString = `A ${gameMode.toLowerCase()} game with ${gamePlayers} opponents has started on ${this.config.server} server! ${relativeTime} (${shortDateTime})`;
              if (this.config.discordSendUpdates) {
                let avatarUrl = '';
                switch (this.config.server) {
                  case 'beginner':
                    avatarUrl = this.config.discordBeginnerAvatarUrl;
                    break;
                  case 'primary':
                    avatarUrl = this.config.discordPrimaryAvatarUrl;
                    break;
                  case 'tournament':
                    avatarUrl = this.config.discordTournamentAvatarUrl;
                    break;
                  default:
                    avatarUrl = this.config.discordAvatarUrl; // Fallback to default avatar URL
                }
                const returnMessageId = await this.discord.sendMessageToDiscord(this.config.discordWebhookUrl, discordString, 'parabot', avatarUrl);
                this.activeGameMessageId = returnMessageId;
                this.discord.recordMessageIdToFile(returnMessageId);
              }
            }
          }
        }

        if (payloadMessage.includes('The game is over.')) {
          this.activeGame = false;
          this.activeGameMode = null;
          this.activeGamePlayers = null;
          //this.serverStats.totalGames += 1;
          this.incrementTotalGames(); // Increment total games
          if (this.config.reportGameStatus) {
            if (this.config.reportGameStatusToConsole) {
              console.log('The game has ended.')
            }

            if (this.config.reportGameStatusToDiscord) {
              if (this.activeGameMessageId != '') {
                if (this.config.discordSendUpdates) {
                  this.discord.deleteDiscordMessage(this.config.discordWebhookUrl, this.activeGameMessageId);
                  this.discord.removeMessageIdFromFile(this.activeGameMessageId);
                  this.activeGameMessageId = ''; // Reset to empty string
                }
              }
            }
          }
        }

        if (payloadMessage.includes('There were no survivors.')) {
          //this.serverStats.gamesLost += 1;
          this.incrementGamesLost();
        }

      } else if (payloadData['text'].includes('Statistics for THIS game:')) {
        const match = payloadData['text'].match(/\(([^)]+)\)/);
        //console.log('Detected game command response for game mode.');
        if (match) {
          //console.log(match[1]); // Output: Survival
          this.activeGameMode = match[1];
        }
      } else if (payloadData['text'].includes('people started')) {
        const match = payloadData['text'].match(/(\d+)\s+people\s+started/);
        if (match) {
          const startedCount = parseInt(match[1], 10);
          //console.log("People started:", startedCount);
          this.activeGamePlayers = startedCount;
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

    if (payloadData['id'] == '17') {
      this.gameMap.width = payloadData['data']['width'];
      this.gameMap.height = payloadData['data']['height'];
      this.gameMap.season = payloadData['data']['season'];
      this.gameMap.seasonSpecial = payloadData['data']['seasonSpecial'];
      this.gameMap.snowDay = payloadData['data']['snowDay'];
      this.gameMap.lines = payloadData['data']['lines'];
      // Uncomment to log map data to console
      //console.log(this.gameMap);
      //this.printGameMap();
      this.pbnv.setGameMap(this.gameMap);
      //this.pbnv.printGameMap();
      this.pbnv.exportMapToFile();
      this.pbnv.exportRawMapToFile();
      this.pbnv.setTerrainInfo();
      this.pbnv.exportMapToPNG();
    }
  }  

  // === Entry point: boot browser, login, start CLI and background tasks
  async init() {
    try {

      // Clear any stored Discord messages from previous runs
      await this.discord.clearStoredDiscordMessages(this.config.discordWebhookUrl);

      if (this.config.puppeteerUseCustomPath) {
        this.browser = await puppeteer.launch({
          headless: this.config.browserHeadless,
          executablePath: this.config.puppeteerCustomPath,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
      } else {
        this.browser = await puppeteer.launch({
          headless: this.config.browserHeadless,
          //executablePath: '/usr/bin/chromium-browser', // Uncomment for use on raspberry pi
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
      }
      this.page = await this.browser.newPage();

      // Hook into browser console output
      this.page.on('console', this.handleConsole.bind(this));

      // Navigate to the game site and wait for initial DOM to load
      await this.page.goto(this.config.url, { waitUntil: 'domcontentloaded' });
      
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
    // Clear any stored Discord messages from previous runs
    await this.discord.clearStoredDiscordMessages(this.config.discordWebhookUrl);

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
    if (this.config.displayDebugData) {
      console.log(`🔄 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} Starting all enabled looped processes...`);
    }
    if (this.config.lookIntervalEnabled) { this.startAutoLookLoop(); }
    if (this.config.gameListIntervalEnabled) { this.startGamelistPolling(); }
    if (this.config.rwhoIntervalEnabled) {this.startAutoRWHOLoop();}
    if (this.config.commandEntryIntervalEnabled) { this.startCommandEntryLoop(); }
    if (this.config.commandEntryWatcherIntervalEnabled) { this.startCommandEntryWatcherLoop(); }
    if (this.config.logoutIntervalEnabled) { this.watchForLogoutScreen(); }
    if (this.config.activePlayerListEnabled) { this.startActivePlayerListLoop(); }
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
      } else if (trimmed.toLowerCase() === 'resetstats') {
        this.resetStats();
        return;
      } else if (trimmed.toLowerCase() === 'printmap') {  
        this.pbnv.printGameMap();
        return;
      } else if (trimmed.toLowerCase() === 'printterrain') {
        this.pbnv.printTerrainInfo();
        return;
      } else if (trimmed.toLowerCase() === 'exportmapimage') {
        this.pbnv.exportMapToPNG('data/game_map.png', false);
        return;
      } else if (trimmed.toLowerCase() === 'exportrawmapimage') {
        this.pbnv.exportMapToPNG('data/game_map_raw.png', true);
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
  async watchForLogoutScreen(selector = `#${this.config.pbnUsernameTextboxId}`) {
    if (this.config.displayDebugData) {
      console.log(`🔄 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} Starting logout screen watcher...`);
    }
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
          // Clear any stored Discord messages from previous runs
          await this.discord.clearStoredDiscordMessages(this.config.discordWebhookUrl);
          // reset this.rwhoIntervalFirstRun
          this.rwhoIntervalFirstRun = true;
          // Attempt re-login
          // Optionally wait a bit before retrying
          if (this.config.autoReLogin) {
            setTimeout(async () => {
              try {
                await this.handleLoginSequence();
              } catch (error) {
                 console.log('❌ Error during auto re-login:', error);
                 await this.shutdown();
              }
            }, this.config.autoReLoginDelay); // 3-second delay before retry
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
    if (this.config.displayDebugData) {
      console.log(`🔄 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} Starting active player list loop...`);
    }

    this.activePlayerListInterval = setInterval(async () => {
      for (const key of Object.keys(this.activePlayersList)) {
        const timestampDate = new Date();
        const unixTimestamp = Math.floor(timestampDate.getTime() / 1000);

        const timeDiff = unixTimestamp - this.activePlayersList[key]['loginTime'];

        if (timeDiff >= this.config.activePlayerReportTime && !this.activePlayersList[key]['loginReported']) {
          this.activePlayersList[key]['loginReported'] = true;
          if (this.config.displayDebugData) {
            console.log(`🔄 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} Reporting that ${key} is active...`);
          }
          if (!this.userNameIgnoreList.includes(key)) {
            if (this.config.discordSendUpdates) {
              const shortDateTime = `<t:${this.activePlayersList[key]['loginTime']}:f>`;
              const relativeTime = `<t:${this.activePlayersList[key]['loginTime']}:R>`;
              const discordString = `${key} is logged into ${this.activePlayersList[key]['server']} server. ${relativeTime} (${shortDateTime})`;
              if (this.config.discordStatusToConsole) {
                console.log(`ℹ️ ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} Reporting that ${key} is active to discord.`);
              }
              let avatarUrl = '';
              switch (this.activePlayersList[key]['server']) {
                case 'beginner':
                  avatarUrl = this.config.discordBeginnerAvatarUrl;
                  break;
                case 'primary':
                  avatarUrl = this.config.discordPrimaryAvatarUrl;
                  break;
                case 'tournament':
                  avatarUrl = this.config.discordTournamentAvatarUrl;
                  break;
                default:
                  avatarUrl = this.config.discordAvatarUrl; // Fallback to default avatar URL
              }
              const returnMessageId = await this.discord.sendMessageToDiscord(this.config.discordWebhookUrl, discordString, 'parabot', avatarUrl);
              // You can now store or use `returnMessageId` here
              // Make sure player is still logged in when trying to set return message id
              if (this.activePlayersList.hasOwnProperty(key)) {
                this.activePlayersList[key]['discordMessageId'] = returnMessageId;
              }
              this.discord.recordMessageIdToFile(returnMessageId);
              //console.log(`Discord Message Id ${this.activePlayersList[key]['discordMessageId']} recorded.`);
            }
          }
        }
      }
    }, this.config.activePlayerListDelay);
  }

  // === Automatically sends "look" command every 3 minutes
  startAutoLookLoop() {
    if (this.config.displayDebugData) {
      console.log(`🔄 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} Starting auto "look" loop for idling...`);
    }
    this.lookInterval = setInterval(async () => {
      try {
        this.addCommandEntry('look');
      } catch (error) {
        console.error('⚠️ Error sending auto "look":', error.message);
      }
    }, this.config.autoLookDelay); 
  }

  // === Automatically sends "rwho" command every 1 second
  startAutoRWHOLoop() {
    if (this.config.displayDebugData) {
      console.log(`🔄 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} Starting auto "rwho" loop for active player polling...`);
    }
    this.rwhoInterval = setInterval(async () => {
      try {
        this.addCommandEntry('rwho');
      } catch (error) {
        console.error('⚠️ Error sending auto "rwho":', error.message);
      }
    }, this.config.autoRWHODelay);
  }

  // === Watches this.sendCommandList and sends any commands in the array to the game
  startCommandEntryLoop () {
    if (this.config.displayDebugData) {
      console.log(`🔄 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} Starting command entry loop...`);
    }
    this.commandEntryInterval = setInterval(async () => {
      // Check if previous instance is still typing, Do nothing if so
      if (this.isTyping || !this.isLoggedIn) return;
      if (this.sendCommandList.length > 0) {
        // Lock out other instances from typing in the input box
        this.isTyping = true;
        try {
          // POP item 0 from the stack. (FIFO)
          const commandString = this.sendCommandList.shift();
          //console.log(`Sending command: ${commandString}`);
          await this.page.focus(`#${this.config.pbnMainInputTextboxId}`);
          
          await this.page.evaluate(selector => {  // Clear input box if need be
            const el = document.querySelector(selector);
            if (el) el.value = '';
          }, `#${this.config.pbnMainInputTextboxId}`);

          await this.page.type(`#${this.config.pbnMainInputTextboxId}`, commandString, {delay: this.config.botTypingDelay});
          await this.page.keyboard.press('Enter');
        } catch (error) {
          console.error('⚠️ Error sending command from list:', error.message);
        } finally {
          // Free the input box up for typing again for other instances
          this.isTyping = false;
        }
      }
    }, this.config.sendCommandListDelay);
  }

    // === Periodically checks the command entry list and logs the current length
  startCommandEntryWatcherLoop() {
    if (this.config.displayDebugData) {
      console.log(`🔄 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} Starting command entry watcher loop...`);
    }
    this.commandEntryWatcherInterval = setInterval(async () => {
      try {
        const commandListLen = this.sendCommandList.length;
        console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} There are currently (${commandListLen}) items in the command queue stack.`);
      } catch (error) {
        console.error('⚠️ Error listing command queue:', error.message);
      }
    }, this.config.commandEntryWatcherDelay); 
  }   

  // === Polls external API for game list every 60 seconds
  startGamelistPolling() {
    if (this.config.displayDebugData) {
      console.log(`🔄 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} Starting game list polling...`);
    }
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
    }, this.config.gameListPollingDelay);
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

    // New Logic to try and mitigate single server shutdowm
    const serverControlList = ["beginner", "primary", "tournament"]; // Control list to compare
    const serverControlObj = { beginner: [], primary: [], tournament: [],};
    const serverKeys = Object.keys(newServerList);
    if (!this.haveSameItemsUnordered(serverControlList, serverKeys)) {  // A server went down
      if (this.config.displayDebugData) {
        console.log("Discrepancy found in new server list:", serverKeys)
      }
      const missingKeys = this.findMissingKeys(serverControlObj, newServerList);  // Determine which servers are not in the control list
      missingKeys.forEach(missingServer => {
        /*
          Logic can be included here to create a list of servers that are down, and announced to the chat
          when servers go down and come back up.
        */
        if (this.config.displayDebugData) {
          console.log(`${missingServer} server is down.`);
        }
        newServerList[missingServer] = [];  // Add that server with no players to newServerList to avoid crash
      });
    }
    Object.keys(newServerList).forEach(key => {

      // First, compare server_list to this.auto_rwho_servers to find new players
      newServerList[key].forEach(player => {
        if (this.serverList[key].includes(player) == false) {

          // Check if activePlayers already has a key by that player name already

          // Populate all players to active player list
          this.activePlayersList[player] = {
              loginTime: unixTimestamp,
              loginReported: false,
              server: key,
              discordMessageId: '',
          }

          // Add player to serverStats.playerHandles if not already present
          if (this.serverStats.playerHandles.includes(player) == false) {
            if (!this.userNameIgnoreList.includes(player)) {
              this.addPlayerHandle(player);
            }
          }

          if (!this.userNameIgnoreList.includes(player)) {
            // Send login to chat every time
            if (this.config.reportLoginsToConsole) {
              console.log(`${player} has logged into ${key} server.`);
            }
            if (this.config.reportLoginsToChat) {
              if (!this.rwhoIntervalFirstRun) { // Do not report logins on first run
                this.addCommandEntry(`chat ${player} has logged into ${key} server.`);
              }
            }
          }
        }
      });

      // Next, compare this.auto_rwho_servers to server_list to find players who logged out

      this.serverList[key].forEach(player => {
        if (newServerList[key].includes(player) == false) {
          if (!this.userNameIgnoreList.includes(player)) {
            if (this.config.reportLoginsToConsole) {
              console.log(`${player} has logged out of ${key} server.`);
            }
            if (this.config.reportLoginsToChat) {
              this.addCommandEntry(`chat ${player} has logged out of ${key} server.`);
            }
            if (this.config.discordSendUpdates) {
              // Remove player update from discord
              if (this.activePlayersList[player]['discordMessageId'] != '') {
                // This has a discord message id
                this.discord.deleteDiscordMessage(this.config.discordWebhookUrl, this.activePlayersList[player]['discordMessageId']);
                this.discord.removeMessageIdFromFile(this.activePlayersList[player]['discordMessageId']);
                this.activePlayersList[player]['discordMessageId'] = ''; // Reset to empty string
              }
            }
          }
          delete this.activePlayersList[player];
        }
      });
    });
    this.serverList = newServerList;
  }  

  // === HTTPS GET request to fetch game list JSON from external API
  getGameList() {
    return new Promise((resolve, reject) => {
      // https://drm-pbn-be.com:2998/gamelist?Detail=1
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
  parseTellString(username, tellMessage) {
    const defaultReplyString = `Hello ${username}, I'm just a bot here to report login, and game activity to the Discord server and game chatroom. I can also offer help and tips whenever you need. Options: [help] [player list] [reset] [stats] [terrain] — Example: /tell ${this.config.pbnHandle} help`;
    const message = tellMessage.toLowerCase();
    let msg = '';
    
    if (username == this.config.pbnHandle) {return};
    /*Survival, Invaders, Flags, Hunt, Teams, and Cooperative Flags*/
    if (message.includes('help')) {
      if (message.includes('random')) {
        const randMessages = [
          'Random Message 1.',
          'Random Message 2.',
          'Random Message 3.',
          'Random Message 4.',
          'Random Message 5.'
        ];
        const totalTips = randMessages.length;
        const tipNum = Math.floor(Math.random() * totalTips);
        msg = `Random Message: ${randMessages[tipNum]} [ Tip ${tipNum} of ${totalTips} ]`;
      }
      else if (message.includes('games')) {
        const defaultGamesString = `I can offer tips for the following game types: Cooperative Flags, Horde, Hunt, Flags, Invaders, Survival, and Teams. Just send me a tell with the word "help games <game type>" — like this: tell ${this.config.pbnHandle} help games survival`;
        if (message.includes('survival')) { /* Survival */
          const messages = [
            'There are no \'Survival\' tips yet.  Please check back later.'
          ];
          const totalTips = messages.length;
          const tipNum = Math.floor(Math.random() * totalTips);
          msg = `Survival: ${messages[tipNum]} [ Tip ${tipNum + 1} of ${totalTips} ]`;
        }
        else if (message.includes('invaders')) { /* Invaders */
          const messages = [
            'There are no \'Invaders\' tips yet.  Please check back later.'
          ];
          const totalTips = messages.length;
          const tipNum = Math.floor(Math.random() * totalTips);
          msg = `Invaders: ${messages[tipNum]} [ Tip ${tipNum + 1} of ${totalTips} ]`;
        }
        else if (message.includes('cooperative flags')) { /* Cooperative Flags */
          const messages = [
            'There are no \'Cooperative Flags\' tips yet.  Please check back later.'
          ];
          const totalTips = messages.length;
          const tipNum = Math.floor(Math.random() * totalTips);
          msg = `Cooperative Flags: ${messages[tipNum]} [ Tip ${tipNum + 1} of ${totalTips} ]`;
        }
        else if (message.includes('flags')) { /* Flags */
          const messages = [
            'There are no \'Flags\' tips yet.  Please check back later.'
          ];
          const totalTips = messages.length;
          const tipNum = Math.floor(Math.random() * totalTips);
          msg = `Flags: ${messages[tipNum]} [ Tip ${tipNum + 1} of ${totalTips} ]`;
        }
        else if (message.includes('hunt')) { /* Hunt */
          const messages = [
            'There are no \'Hunt\' tips yet.  Please check back later.'
          ];
          const totalTips = messages.length;
          const tipNum = Math.floor(Math.random() * totalTips);
          msg = `Hunt: ${messages[tipNum]} [ Tip ${tipNum + 1} of ${totalTips} ]`;
        }
        else if (message.includes('teams')) { /* Teams */
          const messages = [
            'There are no \'Teams\' tips yet.  Please check back later.'
          ];
          const totalTips = messages.length;
          const tipNum = Math.floor(Math.random() * totalTips);
          msg = `Teams: ${messages[tipNum]} [ Tip ${tipNum + 1} of ${totalTips} ]`;
        }
        else if (message.includes('horde')) { /* Horde */
          const messages = [
            'There are no \'Horde\' tips yet.  Please check back later.'
          ];
          const totalTips = messages.length;
          const tipNum = Math.floor(Math.random() * totalTips);
          msg = `Horde: ${messages[tipNum]} [ Tip ${tipNum + 1} of ${totalTips} ]`;
        }
        else {
          msg = defaultGamesString;
        }
      }
      else if (message.includes('secretstore') || message.includes('secret store')) {
        const defaultMessage = `Yes, RM’s secret store is real, and it’s packed with gear you won’t find in the usual shops. It randomly shows up during active games, but only under certain conditions: there have to be at least three players, it only appears in Invaders and team modes, and it always shows up on mountain terrain. You can’t access it from the main menu or outside a match, so if it pops up, don’t miss your chance. For a menu of items in the secret store, type: /tell ${this.config.pbnHandle} help secret store items`;
        if (message.includes('items')) {
          const ssItemsMenu = `Get a list of secret store items by category: [Ammo], [Clothing], [Kits], [Weapons]. — like this: /tell ${this.config.pbnHandle} help secret store items weapons`;
          if (message.includes('ammo')) {
            const ssAmmo = 'List of ammunition in the secret store: | ($255) a pouch of 25 fast no-bounce paintballs | ($35) a small proximity mine | ($15) a rainbow big paint grenade | ($15) a high-speed paint grenade | ($35) a high-speed big paint grenade | ($35) a rainbow high-speed big paint grenade | ($50) an ultra-light big paint grenade | ($100) an ultra-light high-speed big paint grenade | ($15) a rainbow paint rocket | ($50) an ultra-light paint rocket | ($402) a pail of no-bounce minigun paintballs | .';
            msg = ssAmmo;
          }
          else if (message.includes('clothing')) {
            const ssClothing = 'List of clothing in the secret store: | ($500) a pair of padded cargo boots | ($150) a scope helmet | ($300) a padded scope helmet | ($25) a fanny pack | ($150) a padded belt | ($7500) a multi-terrain down-filled jacket | ($7500) a multi-terrain insulated suit | .';
            msg = ssClothing;
          }
          else if (message.includes('kits')) {
            const ssKits = 'List of kits in the secret store: | ($175) a +1 burst-fire kit | ($300) a +1 spread-fire kit | ($2500) a huge extra pocket kit | ($2500) a huge hopper expansion kit | ($1000) an ultra-light extra pocket kit | ($5000) an ultra-light large extra pocket kit | ($25000) an ultra-light huge extra pocket kit | ($1000) an ultra-light hopper expansion kit | ($5000) an ultra-light large hopper expansion kit | ($25000) an ultra-light huge hopper expansion kit | ($35000) a refracto kit | ($45000) a jetpack kit | .';
            msg = ssKits;
          }
          else if (message.includes('weapons')) {
            const ssWeapons = 'List of weapons in the secret store: | ($900) a high-capacity semi-automatic paintball gun | ($115) a can of pink spray paint | ($175) a taggers can of spray paint | ($1250) a waist-mounted grenade launcher | ($5000) a mini grenade launcher | ($5000) a mini paintrocket launcher | .';
            msg = ssWeapons;
          }
          else {
            msg = ssItemsMenu;
          }
        }
        else {
          msg = defaultMessage;
        }
      }
      else if (message.includes('new')) {
        const messages = [
            'You can set the number of bots released in game with the "/bots" command. It can be set from 0 - 9.  To get the maximum amount of bots, and tokens released in game, use the command: "/bots 9". - {==paradox==}',
            'You can reset your own games for $100 pbn cash with the command: "/resetgames". - {==paradox==}',
            'The X-ray kit or x-ray glasses will help you see bots and tokens from further away. X-ray is essential to help gain more pbn cash. - {==paradox==}',
            'Turbo and swim kits are essential for faster movement on all terrain. Make sure your shoes or boots are modified with them. - {==paradox==}',

          ];
          const totalTips = messages.length;
          const tipNum = Math.floor(Math.random() * totalTips);
          msg = `New player tip: ${messages[tipNum]} [ Tip ${tipNum + 1} of ${totalTips} ]`;
      }
      else { /* Default to help menu */
        const defaultHelpString = `I can offer help in the following categories: [Games], [New], [Secret store]. Example: For random tips for new players, type: /tell ${this.config.pbnHandle} help new`;
        msg = defaultHelpString;
      }
    }
    else if (message.includes('stats')) {
        msg = `Today's Server Stats: Total Games Played: ${this.serverStats.totalGames} (Wins: ${this.serverStats.totalGames - this.serverStats.gamesLost} / Losses: ${this.serverStats.gamesLost}), Active Players Today: ${this.serverStats.playerHandles.length}`;
    }
    else if (message.includes('player list') || message.includes('playerlist')) {
      msg = `Today's Active Players: ${this.serverStats.playerHandles.join(', ')}`;
    }
    else if (message.includes('reset')) {
      msg = 'I am not an admin, and cannot reset games.  If an admin is not on to reset games, you can reset your own games for $100 pbn cash with the command: "/resetgames". Otherwise, you can purchase more daily games in a store for $2500 with the command "/buy moregames".';
    }
    else if (message.includes('terrain')) {
      const terrainPercents = this.pbnv.getTerrainPercent();
      msg = `Current map terrain breakdown: Grass: ${terrainPercents.Grass}, Mountain: ${terrainPercents.Mountain}, Water: ${terrainPercents.Water}, Woodlands: ${terrainPercents.Woodlands}, Jungle: ${terrainPercents.Jungle}, Valley: ${terrainPercents.Valley}, Desert ${terrainPercents.Desert}, Hill: ${terrainPercents.Hill}}.`;
    } else {
      msg = defaultReplyString;
    }
    const commandString = `tell ${username} ${msg}`;
    this.addCommandEntry(commandString);
  }

  // === Process CHAT string
  parseChatString (chatHandle, chatMessage) {
    if (!this.userNameIgnoreList.includes(chatHandle)) {
      let chatString = chatMessage.toLowerCase();
      let chatStringArray = chatString.split(' ');
      if (chatStringArray[0] == 'parabot') {
        if (chatStringArray[1] == 'roll') {
          const diceTable = {
            0: '⚀',
            1: '⚁',
            2: '⚂',
            3: '⚃',
            4: '⚄',
            5: '⚅'
          };
          const roll1 = Math.floor(Math.random() * 6);
          const roll2 = Math.floor(Math.random() * 6);
          const rollResult = `${chatHandle} rolled: ${diceTable[roll1]} ${roll1 + 1}, ${diceTable[roll2]} ${roll2 + 1}. (Total: ${roll1 + roll2 + 2})`;
          this.addCommandEntry(`chat ${rollResult}`);
        }
      }
    }
  }

  // ===
  // === [Persistent Stat Tracking Functions] ===
  // ===

  // === Read total games from file - "totalGames.txt"
  readTotalGamesFromFile() {
    const filePath = './data/totalGames.txt';
    try {
      if (this.config.displayDebugData) {
        console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} 💾 Reading total games from file...`);
      } 
      if (!fs.existsSync(filePath)) return 0;
      const raw = fs.readFileSync(filePath, 'utf8').trim();
      const parsed = parseInt(raw, 10);
      return isNaN(parsed) ? 0 : parsed;
    } catch (err) {
      console.error('❌ Failed to read totalGames file:', err);
      return 0;
    }
  }

  // === Increment total games - "totalGames.txt"
  incrementTotalGames() {
    const filePath = './data/totalGames.txt';
    const current = this.readTotalGamesFromFile();
    const updated = current + 1;

    try {
      if (this.config.displayDebugData) {
        console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} 💾 Incrementing total games...`);
      } 
      fs.writeFileSync(filePath, `${updated}\n`, 'utf8');
      this.serverStats.totalGames = updated;
    } catch (err) {
      console.error('❌ Failed to update totalGames file:', err);
    }
  }

  // === Reset total games - "totalGames.txt"
  resetTotalGames() {
    const filePath = './data/totalGames.txt';
    try {
      if (this.config.displayDebugData) {
        console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} 💾 Resetting total games...`);
      }
      fs.writeFileSync(filePath, '0\n', 'utf8');
      this.serverStats.totalGames = 0;
    } catch (err) {
      console.error('❌ Failed to reset totalGames file:', err);
    }
  }

  // === Read games lost from file - "gamesLost.txt"
  readGamesLostFromFile() {
    const filePath = './data/gamesLost.txt';
    try {
      if (this.config.displayDebugData) {
        console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} 💾 Reading games lost from file...`);
      }
      if (!fs.existsSync(filePath)) return 0;
      const raw = fs.readFileSync(filePath, 'utf8').trim();
      const parsed = parseInt(raw, 10);
      return isNaN(parsed) ? 0 : parsed;
    } catch (err) {
      console.error('❌ Failed to read gamesLost file:', err);
      return 0;
    }
  }

  // === Increment games lost - "gamesLost.txt"
  incrementGamesLost() {
    const filePath = './data/gamesLost.txt';
    const current = this.readGamesLostFromFile();
    const updated = current + 1;

    try {
      if (this.config.displayDebugData) {
        console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} 💾 Incrementing games lost...`);
      }
      fs.writeFileSync(filePath, `${updated}\n`, 'utf8');
      this.serverStats.gamesLost = updated;
    } catch (err) {
      console.error('❌ Failed to update gamesLost file:', err);
    }
  }

  // === Reset games lost - "gamesLost.txt"
  resetGamesLost() {
    const filePath = './data/gamesLost.txt';
    try {
      if (this.config.displayDebugData) {
        console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} 💾 Resetting games lost...`);
      }
      fs.writeFileSync(filePath, '0\n', 'utf8');
      this.serverStats.gamesLost = 0;
    } catch (err) {
      console.error('❌ Failed to reset gamesLost file:', err);
    }
  }

  // === Read player handles from file - "playerHandles.txt"
  readPlayerHandlesFromFile() {
    const filePath = './data/playerHandles.txt';
    try {
      if (this.config.displayDebugData) {
        console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} 💾 Reading player handles from file...`);
      }
      if (!fs.existsSync(filePath)) return [];
      const raw = fs.readFileSync(filePath, 'utf8');
      const lines = raw.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      return lines;
    } catch (err) {
      console.error('❌ Failed to read playerHandles file:', err);
      return [];
    }
  }

  // === Add player handle - "playerHandles.txt"
  addPlayerHandle(username) {

    const filePath = './data/playerHandles.txt';
    const currentHandles = this.readPlayerHandlesFromFile();

    if (currentHandles.includes(username)) {
      return;
    }

    try {
      if (this.config.displayDebugData) {
        console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} 💾 Adding player handle...`);
      }
      fs.appendFileSync(filePath, `${username}\n`, 'utf8');
      this.serverStats.playerHandles.push(username);
    } catch (err) {
      console.error('❌ Failed to append player handle:', err);
    }
  }

  // === Reset player handles - "playerHandles.txt"
  resetPlayerHandles() {
    const filePath = './data/playerHandles.txt';
    try {
      if (this.config.displayDebugData) {
        console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} 💾 Resetting player handles...`);
      }
      fs.writeFileSync(filePath, '', 'utf8');
      this.serverStats.playerHandles = [];
    } catch (err) {
      console.error('❌ Failed to reset playerHandles file:', err);
    }
  }

  // === Reset all stats - "totalGames.txt", "gamesLost.txt", "playerHandles.txt"
  resetStats() {
    if (this.config.displayDebugData) {
      console.log(`${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} 💾 Resetting all stats...`);
    }
    this.resetTotalGames();
    this.resetGamesLost();
    this.resetPlayerHandles();
  }

  // ===
  // === [Misc. Functions] ===
  // ===

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

  // === Wait for this.activeGameMode to be set, then return it
  async returnActiveGameMode() {
    while (this.activeGameMode === null) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.activeGameMode;
  }

  // === Wait for this.activeGamePlayers to be set, then return it
  async returnActiveGamePlayers() {
    while (this.activeGamePlayers === null) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.activeGamePlayers;
  }

}

// ===
// === [Create Bot Instance, and initialize bot] === 
// ===

// === Boot the bot with config ===
const controller = new PBNBot();

controller.init();
