require('dotenv').config();

// Helper to parse boolean from env
const toBoolean = (str) => (str || '').toLowerCase() === 'true';

// Base configuration
const config = {
  // === Start creating custome config object from module
  url: process.env.PBN_URL,  // Page to load
  server: process.env.PBN_SERVER,  // Server to access: beginner, primary, tournament
  browserHeadless: toBoolean(process.env.HEADLESS_MODE), // Headless browser option
  // === Puppeteer element IDs
  pbnBeginnerServerId: process.env.PBN_BEGINNER_SERVER_ID, // PBN Beginner Server selector Div Id
  pbnPrimaryServerId: process.env.PBN_PRIMARY_SERVER_ID, // PBN Primary Server selector Div Id
  pbnTournamentServerId: process.env.PBN_TOURNAMENT_SERVER_ID, // PBN Tournament Server selector Div Id
  pbnUsernameTextboxId: process.env.PBN_USERNAME_TEXTBOX_ID, // PBN Username Input textbox Id
  pbnPasswordTextboxId: process.env.PBN_PASSWORD_TEXTBOX_ID, // PBN Password Input textbox Id
  pbnMainInputTextboxId: process.env.PBN_MAIN_INPUT_TEXTBOX_ID, // PBN Main command text input box Id

  // === Puppeteer Browser Options
  puppeteerUseCustomPath: toBoolean(process.env.PUPPETEER_USE_CUSTOM_PATH),
  puppeteerCustomPath: process.env.PUPPETEER_CUSTOM_PATH,

  // === Bot Preset Mode
  botPresetMode: process.env.BOT_PRESET_MODE,

  // === Credentials loaded from environment variables 
  pbnHandle: process.env.PBN_HANDLE,  // PBN_HANDLE= in .env
  pbnPassword: process.env.PBN_PASSWORD, // PBN_PASSWORD= in .env
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL, // DISCORD_WEBHOOK_URL= in .env 
  discordAvatarUrl: process.env.DISCORD_AVATAR_URL,  // DISCORD_AVATAR_URL= in .env
  discordBeginnerAvatarUrl: 'https://pnwarner.github.io/media/pbnbot_beginner_64x64.png',
  discordPrimaryAvatarUrl: 'https://pnwarner.github.io/media/pbnbot_primary_64x64.png',
  discordTournamentAvatarUrl: 'https://pnwarner.github.io/media/pbnbot_tournament_64x64.png',

  // === Enable / Disable Looped Background services (Values set in .env file)
  autoReLogin: toBoolean(process.env.AUTO_RE_LOGIN), // Enable or Disable Re-login after logout detected
  lookIntervalEnabled: toBoolean(process.env.LOOK_INTERVAL_ENABLED), // Enable auto-look for anti-idle reasons
  rwhoIntervalEnabled: toBoolean(process.env.RWHO_INTERVAL_ENABLED), // Sends RWHO Command at set interval
  gameListIntervalEnabled: toBoolean(process.env.GAME_LIST_INTERVAL_ENABLED), // Enable Retreive player list from backend web api
  activePlayerListEnabled: toBoolean(process.env.ACTIVE_PLAYER_LIST_ENABLED), // Reports active users over Discord, works with this.discordSendUpdates enabled
  commandEntryIntervalEnabled: toBoolean(process.env.COMMAND_ENTRY_INTERVAL_ENABLED), // Enable Command list entry loop.  DO NOT DISABLE
  commandEntryWatcherIntervalEnabled: toBoolean(process.env.COMMAND_ENTRY_WATCHER_INTERVAL_ENABLED), // Enable Command Entry list watcher to monitor command queue
  logoutIntervalEnabled: toBoolean(process.env.LOGOUT_INTERVAL_ENABLED), // Enable Watching for logout, and re-login
  discordSendUpdates: toBoolean(process.env.DISCORD_SEND_UPDATES), // Enable sending Discord Updates, works with this.activePlayerListEnabled
  discordStatusToConsole: toBoolean(process.env.DISCORD_STATUS_TO_CONSOLE), // Enable sending Discord message updates to console
  reportLoginsToChat: toBoolean(process.env.REPORT_LOGINS_TO_CHAT), // Enable this.compareServerLists to send login/logout info to the chat
  reportLoginsToConsole: toBoolean(process.env.REPORT_LOGINS_TO_CONSOLE), // Enable this.compareServerLists to send login/logout info to the console
  reportGameStatus: toBoolean(process.env.REPORT_GAME_STATUS), // Enable reporting game starting/ending
  reportGameStatusToConsole: toBoolean(process.env.REPORT_GAME_STATUS_TO_CONSOLE), // Report game starting/ending to console
  reportGameStatusToDiscord: toBoolean(process.env.REPORT_GAME_STATUS_TO_DISCORD), // Report game starting/ending to discord
  displayGameMessages: toBoolean(process.env.DISPLAY_GAME_MESSAGES),  // Enable displaying messages from server (GAME: )
  displayDebugData: toBoolean(process.env.DISPLAY_DEBUG_DATA), // Enable displaying debug data in console

  // === Communication Options
  displayChatMessages: toBoolean(process.env.DISPLAY_CHAT_MESSAGES), // Display 'chat' messages to console
  displayTellMessages: toBoolean(process.env.DISPLAY_TELL_MESSAGES), // Display 'tell' messages to console
  displayRtellMessages: toBoolean(process.env.DISPLAY_RTELL_MESSAGES), // Display 'rtell' messages to console
  displaySayMessages: toBoolean(process.env.DISPLAY_SAY_MESSAGES), // Display 'say' messages to console
  displayWhisperMessages: toBoolean(process.env.DISPLAY_WHISPER_MESSAGES), // Display 'whisper' messages to console
  displayTeamchatMessages: toBoolean(process.env.DISPLAY_TEAMCHAT_MESSAGES), // Display 'teamchat' messages to console
  displayPlanMessages: toBoolean(process.env.DISPLAY_PLAN_MESSAGES), // Display 'plan' messages to console
  autoReplyTellMessages: toBoolean(process.env.AUTO_REPLY_TELL_MESSAGES), // Enable Auto-reply to Tell Messages
  autoReplyChatMessages: toBoolean(process.env.AUTO_REPLY_CHAT_MESSAGES), // Enable Auto-reply to Chat Messages

  // === Bot Timing Options
  autoReLoginDelay: parseInt(process.env.AUTO_RE_LOGIN_DELAY, 10), // Time to wait (ms) for re-login (Wait 10 minutes) 10 * 60 * 1000
  autoLookDelay: parseInt(process.env.AUTO_LOOK_DELAY, 10), // Anti Idle, Send Look command every 3 minutes (ms) 3 * 60 * 1000
  gameListPollingDelay: parseInt(process.env.GAME_LIST_POLLING_DELAY, 10), // Time to Send HTTP Request for server list. (ms) (Every 5 seconds)
  sendCommandListDelay: parseInt(process.env.SEND_COMMAND_LIST_DELAY, 10), // Time in between sending command to game. (ms) (Every 3/4 of a second)
  commandEntryWatcherDelay: parseInt(process.env.COMMAND_ENTRY_WATCHER_DELAY, 10), // Time between reporting how many commands are in queue to send (ms) 10 * 60 * 1000
  activePlayerListDelay: parseInt(process.env.ACTIVE_PLAYER_LIST_DELAY, 10), // Time to check Active player list for players to report to Discord. (ms) (1 second)
  activePlayerReportTime: parseInt(process.env.ACTIVE_PLAYER_REPORT_TIME, 10), // Time to Report active player to Discord. (seconds) (5 minutes)
  autoRWHODelay: parseInt(process.env.AUTO_RWHO_DELAY, 10), // Time to send RWHO command to game, (ms) (1.5 Seconds)
  botTypingDelay: parseInt(process.env.BOT_TYPING_DELAY, 10), // (ms) delay between keystrokes, can simulate better typing

  useDefaultIntervalSettings: toBoolean(process.env.USE_DEFAULT_INTERVAL_SETTINGS), // Use default interval settings
};

const setDefaultIntervalSettings = () => {
    if (config.displayDebugData) {
      console.log(`[PBN Bot] Setting default interval settings...`);
    }
    if (config.useDefaultIntervalSettings) {
      config.displayChatMessages = true;
      config.displayTellMessages = true;
      config.displayRtellMessages = true;
      config.displaySayMessages = true;
      config.displayWhisperMessages = true;
      config.displayTeamchatMessages = true;
      config.displayPlanMessages = true;

      config.autoReLoginDelay = 120000; // 2 minutes
      config.autoLookDelay = 180000; // 3 minutes
      config.gameListPollingDelay = 1000; // 1 second
      config.sendCommandListDelay = 500; // 0.5 seconds
      config.commandEntryWatcherDelay = 600000; // 10 minutes
      config.activePlayerListDelay = 1000; // 1 second
      config.activePlayerReportTime = 5; // 5 seconds
      config.autoRWHODelay = 1000; // 1 second
      config.botTypingDelay = 0; // 0 seconds (no delay
    }
}

// Apply preset modifications
const preset = config.botPresetMode?.toLowerCase();
if (preset) {
  switch (preset) {
      case 'main':
        config.autoReLogin = true;
        config.lookIntervalEnabled = true;
        config.rwhoIntervalEnabled = true;
        config.gameListIntervalEnabled = false;
        config.activePlayerListEnabled = true;
        config.commandEntryIntervalEnabled = true;
        config.commandEntryWatcherIntervalEnabled = false;
        config.logoutIntervalEnabled = true;
        config.discordSendUpdates = true;
        config.discordStatusToConsole = false;
        config.reportLoginsToChat = true;
        config.reportLoginsToConsole = false;
        config.reportGameStatus = true;
        config.reportGameStatusToConsole = false;
        config.reportGameStatusToDiscord = true;
        config.displayGameMessages = false;
        config.displayDebugData = false;
        config.autoReplyTellMessages = true;
        config.autoReplyChatMessages = true;
        setDefaultIntervalSettings();
        break;
      case 'secondary':
        config.autoReLogin = true;
        config.lookIntervalEnabled = true;
        config.rwhoIntervalEnabled = true;
        config.gameListIntervalEnabled = false;
        config.activePlayerListEnabled = false;  // Secondary does not report active players to discord
        config.commandEntryIntervalEnabled = true;
        config.commandEntryWatcherIntervalEnabled = false;
        config.logoutIntervalEnabled = true;
        config.discordSendUpdates = true;
        config.discordStatusToConsole = false;
        config.reportLoginsToChat = true;
        config.reportLoginsToConsole = false;
        config.reportGameStatus = true;
        config.reportGameStatusToConsole = false;
        config.reportGameStatusToDiscord = true;
        config.displayGameMessages = false;
        config.displayDebugData = false;
        config.autoReplyTellMessages = true;
        config.autoReplyChatMessages = true;
        setDefaultIntervalSettings();
        break;
      case 'chat':
        config.autoReLogin = true;
        config.lookIntervalEnabled = true;
        config.rwhoIntervalEnabled = true;
        config.gameListIntervalEnabled = false;
        config.activePlayerListEnabled = false;  // Secondary does not report active players to discord
        config.commandEntryIntervalEnabled = true;
        config.commandEntryWatcherIntervalEnabled = false;
        config.logoutIntervalEnabled = true;
        config.discordSendUpdates = false;  // Chat mode does not send updates to discord
        config.discordStatusToConsole = false;
        config.reportLoginsToChat = false; // Chat mode does not report logins to chat
        config.reportLoginsToConsole = true; // Chat mode reports logins to console
        config.reportGameStatus = true;
        config.reportGameStatusToConsole = true; // Chat mode reports game status to console
        config.reportGameStatusToDiscord = false; // Chat mode does not report game status to discord
        config.displayGameMessages = false;
        config.displayDebugData = false;
        config.autoReplyTellMessages = false; // Chat mode does not auto-reply to tell messages
        config.autoReplyChatMessages = false; // Chat mode does not auto-reply to chat messages
        setDefaultIntervalSettings();
        break;
      case 'testing':
        config.autoReLogin = true;
        config.lookIntervalEnabled = true;
        config.rwhoIntervalEnabled = true;
        config.gameListIntervalEnabled = false;
        config.activePlayerListEnabled = true;
        config.commandEntryIntervalEnabled = true;
        config.commandEntryWatcherIntervalEnabled = true; // Testing mode watches command entry
        config.logoutIntervalEnabled = true;
        config.discordSendUpdates = true;
        config.discordStatusToConsole = true; // Testing mode reports to console
        config.reportLoginsToChat = true;
        config.reportLoginsToConsole = true; // Testing mode reports logins to console
        config.reportGameStatus = true;
        config.reportGameStatusToConsole = true; // Testing mode reports game status to console
        config.reportGameStatusToDiscord = true;
        config.displayGameMessages = true; // Testing mode displays game messages in console
        config.displayDebugData = true; // Testing mode displays debug data in console
        config.autoReplyTellMessages = true;
        config.autoReplyChatMessages = true;
        setDefaultIntervalSettings();
        break;
      case 'debug':
        config.autoReLogin = true;
        config.lookIntervalEnabled = true;
        config.rwhoIntervalEnabled = true;
        config.gameListIntervalEnabled = false;
        config.activePlayerListEnabled = true;
        config.commandEntryIntervalEnabled = true;
        config.commandEntryWatcherIntervalEnabled = true; // Debug mode watches command entry
        config.logoutIntervalEnabled = true;
        config.discordSendUpdates = false; // Debug mode does not send updates to discord
        config.discordStatusToConsole = false;
        config.reportLoginsToChat = false; // Debug mode does not report logins to chat
        config.reportLoginsToConsole = true; // Debug mode reports logins to console
        config.reportGameStatus = true;
        config.reportGameStatusToConsole = true; // Debug mode reports game status to console
        config.reportGameStatusToDiscord = false; // Debug mode does not report game status to discord
        config.displayGameMessages = true; // Debug mode displays game messages in console
        config.displayDebugData = true; // Debug mode displays debug data in console
        config.autoReplyTellMessages = true;
        config.autoReplyChatMessages = true;
        setDefaultIntervalSettings();
        break;
      case 'none':
        // Do nothing
        break;
      default:
        console.error(`❌ Invalid preset mode: ${preset}. Please choose from: main, secondary, chat, testing, debug.`);
        break;
    }
}

module.exports = config;

