# PBN Bot

PBNBot is a Node.js bot designed to interact with the Paintball-Net game ([https://play.paintballnet.net](https://play.paintballnet.net)) using Puppeteer. It automates login, monitors game activity, sends commands, and can report player logins/logouts to Discord.

## Features

- **Automated Login:** Connects to the specified Paintball Net server (Beginner, Primary, or Tournament) using credentials from the `.env` file.
- **Real-time Chat Monitoring:** Displays a wide variety of in-game communications directly in your terminal, with toggles for each type:
  - General Chat
  - Tells & Rtells
  - Says & Whispers
  - Teamchat & Plans
  - Server `GAME:` messages
- **Automated Commands:**
  - `look`: Periodically sends the "look" command to prevent being disconnected for being idle.
  - `rwho`: Periodically sends the "rwho" command to monitor active players.
- **Player Activity Tracking:** Detects player logins and logouts by monitoring WebSocket activity. It can be configured to report these events to:
  - The local console.
  - The in-game chat.
  - A Discord webhook.
- **Automated Tell Replies:** The bot can automatically reply to players who send it a `/tell` with a configurable, helpful message.
- **Command Queue:** Allows you to queue commands from the terminal, which the bot sends to the game sequentially to prevent spamming.
- **Automatic Re-login:** Detects disconnections and automatically attempts to re-login after a configurable delay.
- **Extensive Configuration:** Nearly every feature, from timing intervals to message display, can be enabled, disabled, or modified via the .env file without changing the code.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine.

### Prerequisites

- Nodejs
- npm
- A `.env` file for credentials (see "Configuration" section)

### Installation

1. **Clone the repository (or create the** `main.js` **file):**
If you have a Git repository, clone it:

    ```bash
    git clone https://github.com/pnwarner/pbn-bot
    ```

    Otherwise, ensure your `main.js` file is in a project directory.

2. **Install dependencies:**

    Open your terminal in the project directory and run:

    ```bash
    npm install
    ```

## Configuration

PBNBot uses a `.env` file to manage all its settings. Create a file named .env in the root directory of your project. Below is a comprehensive list of the available variables and their functions.

### Example `.env` file

```bash
# --- Core Credentials & Connection ---
PBN_HANDLE="YourGameHandle"
PBN_PASSWORD="YourGamePassword"
PBN_URL="https://play.paintballnet.net"
# Choose server: beginner, primary, tournament
PBN_SERVER="primary"
HEADLESS_MODE=true

# --- Discord Integration ---
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN"
DISCORD_AVATAR_URL="https://example.com/your-bot-avatar.png"

# --- Bot Behavior Toggles ---
AUTO_RE_LOGIN=true
LOGOUT_INTERVAL_ENABLED=true
LOOK_INTERVAL_ENABLED=true
RWHO_INTERVAL_ENABLED=true
# Alternative player tracking via API, defaults to false
GAME_LIST_INTERVAL_ENABLED=false
ACTIVE_PLAYER_LIST_ENABLED=true
DISCORD_SEND_UPDATES=true
REPORT_LOGINS_TO_CHAT=true
REPORT_LOGINS_TO_CONSOLE=false

# --- Message Display Toggles ---
DISPLAY_GAME_MESSAGES=true
DISPLAY_CHAT_MESSAGES=true
DISPLAY_TELL_MESSAGES=true
DISPLAY_RTELL_MESSAGES=true
DISPLAY_SAY_MESSAGES=true
DISPLAY_WHISPER_MESSAGES=true
DISPLAY_TEAMCHAT_MESSAGES=true
DISPLAY_PLAN_MESSAGES=true

# --- Timing and Delay Settings (in milliseconds) ---
# 2 minutes
AUTO_RE_LOGIN_DELAY=120000 
# 3 minutes
AUTO_LOOK_DELAY=180000  
# 1 second            
AUTO_RWHO_DELAY=1000
# 0.5 seconds              
SEND_COMMAND_LIST_DELAY=500
# Delay between keystrokes (ms)    
BOT_TYPING_DELAY=0                  

# --- Player Reporting Timings ---
# (ms) How often to check the active player list
ACTIVE_PLAYER_LIST_DELAY=1000
# (seconds) How long a player must be online before being reported to Discord
ACTIVE_PLAYER_REPORT_TIME=300

# --- Browser DOM Element IDs (Rarely need changing) ---
PBN_BEGINNER_SERVER_ID=Component1133
PBN_PRIMARY_SERVER_ID=Component1135
PBN_TOURNAMENT_SERVER_ID=Component1137
PBN_USERNAME_TEXTBOX_ID=Component826
PBN_PASSWORD_TEXTBOX_ID=Component830
PBN_MAIN_INPUT_TEXTBOX_ID=Component598
```

## Running the Bot

To start the bot, open your terminal in the project directory and run:

```bash
node main.js
```

The bot will launch a Puppeteer browser instance (either visible or headless, depending on your `.env` configuration), log into Paintball Net, and begin its tasks.

### Command Line Interface (CLI)

Once the bot is running, you will see a `>` prompt in your terminal. You can type any in-game command here and press Enter to add it to the bot's command queue.

- To exit the bot gracefully, type `exit` and press `Enter`.

## Troubleshooting

- **Bot doesn't log in**:
  - Double-check your `.env` file for correct `PBN_HANDLE`, `PBN_PASSWORD`, and `PBN_SERVER`.
  - Try setting `HEADLESS_MODE=false` in your `.env` file to watch the browser and see what's happening.

- **Discord messages not sending:**
  - Verify your `DISCORD_WEBHOOK_URL` in `.env` is correct.
  - Ensure `DISCORD_SEND_UPDATES` is set to `true` in your `.env` file.

- **"Error during initialization: Error: Protocol error (Target.createCDPSession): Target closed."**
  - This often happens if the browser crashes or is closed unexpectedly. Ensure you have enough system resources.

- **"Failed to fetch game list:"**
  - This error occurs if the bot can't reach the external game API. It only affects the `GAME_LIST_INTERVAL_ENABLED` feature. Check your internet connection and firewall settings.

## Contributing

> Note: This project is a reboot from a previous, larger codebase that utilized both Python (Selenium) and JavaScript. This current version aims for near-equal functionality with a significantly smaller and more streamlined JavaScript-only codebase.

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## License

## Contact

### Author

- [pnwarner](https://github.com/pnwarner) | [patrick.warner@paradoxresearch.net](mailto:patrick.warner@paradoxresearch.net)
