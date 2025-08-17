# PBN Bot

**PBNBot** is a Node.js bot that uses Puppeteer to interact with the web-based game Paintball-Net. It automates login, monitors game and chat activity through WebSockets, provides in-game assistance, reports rich status updates to Discord, and tracks persistent player stats. Its modular design and preset-driven configuration make it powerful, stable, and easy to manage.

## Features

- **Automated Login & Server Selection:** Connects to a specified Paintball Net server (**Beginner**, **Primary**, or **Tournament**) using credentials from your environment file.

- **Automatic Re-login:** Intelligently detects disconnections or server restarts and automatically attempts to log back in after a configurable delay.

- **Real-time Chat Monitoring:** Monitors WebSocket traffic to display all in-game communication directly in your terminal, complete with color-coding for readability. It captures `chat`, `tell`, `say`, `whisper`, `teamchat`, and `plan` messages.

- **Interactive Help Bot:**

  - Automatically replies to `tell` messages with a helpful default message.

  - Features a built-in, multi-level help system. Players can send `tell <YourBot> help` to get tips on game modes, information for new players, server stats, and details about the elusive secret store, including item lists by category.

- **Persistent Stat Tracking**:

  - Monitors game outcomes to track total games **played**, **wins**, and **losses**.

  - Keeps a running list of all unique **player handles** that have logged in.

  - All stats are saved to files in the `./data/` directory and persist between bot restarts.

  - Stats can be requested in-game via the `tell` command or reset from the terminal with the `resetstats` command.

- **Advanced Discord Integration:**

  - Reports when players have been active for a configurable amount of time.

  - Announces when a new game starts on the server.

  - **Stateful Messages:** When a game ends or a player logs out, the bot automatically deletes the corresponding notification message from Discord, keeping the channel clean and relevant.

  - **Persistent Tracking:** Remembers Discord message IDs in `./data/message_ids.txt`, allowing it to clean up old messages even if the bot is restarted.

  - Customizable bot name and unique avatars for each game server.

- **Player & Game Activity Tracking:**

  - Periodically sends the `rwho` command to get a list of all online players.

  - Compares player lists to detect and announce logins and logouts directly in the **in-game chat room**.

- **Robust Automation & Stability:**

  - **Command Queue:** Manages a FIFO (First-In, First-Out) queue for commands sent from the terminal, preventing conflicts and ensuring they are executed sequentially.

  - **Anti-Idle:** Periodically sends the `look` command to prevent being disconnected for inactivity.

  - **Graceful Shutdown:** Catches system signals (`Ctrl+C`) to properly clear all running processes and Discord messages before exiting.

## Getting Started

### Prerequisites

- Node.js and npm

- A `.env` file for credentials and configuration.

### Installation

1. **Clone the repository or download the files:**
   - Ensure main.js and the modules directory (containing config.js and discord.js) are in your project folder.

2. **Create the data directory:**
   - The bot needs a ./data/ directory to store persistent stats and message IDs.

      ```Bash
      mkdir data
      ```

3. **Install dependencies:**
   - Open your terminal in the project directory and run:

      ```Bash
      npm install dotenv puppeteer
      ```

## Configuration

PBNBot is configured using a `.env` file in the root of your project. This file stores credentials, webhook URLs, and operational settings that are loaded by the `config.js` module.

Create a file named `.env` and add the following variables:

### Complete Configuration File

```Bash
# === 🔐 PBN Login and Server Configuration
PBN_HANDLE=username
PBN_PASSWORD=password
PBN_URL=https://play.paintballnet.net
PBN_SERVER=primary

# === 📣 Discord Integration
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/webhookid
DISCORD_AVATAR_URL=https://pnwarner.github.io/media/pbnbot_64x64.png

# === 🧭 Puppeteer Browser Options
HEADLESS_MODE=true
PUPPETEER_USE_CUSTOM_PATH=false
PUPPETEER_CUSTOM_PATH=/data/data/com.termux/files/usr/bin/chromium-browser

# === 🧩 DOM Element IDs
PBN_BEGINNER_SERVER_ID=Component1121
PBN_PRIMARY_SERVER_ID=Component1123
PBN_TOURNAMENT_SERVER_ID=Component1125
PBN_USERNAME_TEXTBOX_ID=Component826
PBN_PASSWORD_TEXTBOX_ID=Component830
PBN_MAIN_INPUT_TEXTBOX_ID=Component598

# === ⚙️ Bot Preset and Debug Options
BOT_PRESET_MODE=main
USE_DEFAULT_INTERVAL_SETTINGS=true
DISPLAY_DEBUG_DATA=false

# === 🔄 Session and Anti-Idle
AUTO_RE_LOGIN=true
LOGOUT_INTERVAL_ENABLED=true
LOOK_INTERVAL_ENABLED=true
AUTO_RE_LOGIN_DELAY=120000
AUTO_LOOK_DELAY=180000

# === 🧍 Player Tracking and Reporting
RWHO_INTERVAL_ENABLED=true
GAME_LIST_INTERVAL_ENABLED=false
ACTIVE_PLAYER_LIST_ENABLED=true
DISCORD_SEND_UPDATES=true
DISCORD_STATUS_TO_CONSOLE=false
REPORT_LOGINS_TO_CHAT=true
REPORT_LOGINS_TO_CONSOLE=false
REPORT_GAME_STATUS=true
REPORT_GAME_STATUS_TO_CONSOLE=false
REPORT_GAME_STATUS_TO_DISCORD=true
GAME_LIST_POLLING_DELAY=1000
ACTIVE_PLAYER_LIST_DELAY=1000
ACTIVE_PLAYER_REPORT_TIME=5
AUTO_RWHO_DELAY=1000
DISPLAY_GAME_MESSAGES=false

# === 💬 Player Communication
DISPLAY_CHAT_MESSAGES=true
DISPLAY_TELL_MESSAGES=true
DISPLAY_RTELL_MESSAGES=true
DISPLAY_SAY_MESSAGES=true
DISPLAY_WHISPER_MESSAGES=true
DISPLAY_TEAMCHAT_MESSAGES=true
DISPLAY_PLAN_MESSAGES=true
AUTO_REPLY_TELL_MESSAGES=true

# === 🛠️ Bot Functionality
COMMAND_ENTRY_INTERVAL_ENABLED=true
COMMAND_ENTRY_WATCHER_INTERVAL_ENABLED=false
SEND_COMMAND_LIST_DELAY=500
COMMAND_ENTRY_WATCHER_DELAY=600000
BOT_TYPING_DELAY=0
```

### Customization & Presets

The bot's behavior is primarily controlled by the BOT_PRESET_MODE in your .env file. This allows for quick configuration without editing the code.

#### Bot Preset Modes

- `main`: The standard, full-featured mode. Reports player activity and game status to Discord and announces logins/logouts in-game. Enables the `tell`-based help bot and stat tracking.

- `secondary`: Similar to main, but disables reporting active players to Discord to avoid redundant messages if another bot is already active. Game start/end times are still reported.

- `chat`: A quieter mode focused on in-game interaction. Disables all Discord updates and the help bot. Reports logins and game status only to the console for logging purposes.

- `testing`: Enables all features and turns on verbose console logging for every action, including the command queue watcher. Ideal for development.

- `debug`: A silent operator mode. Disables all Discord updates and in-game chat announcements. Logs all activity, including game messages and debug data, to the console.

- `none`: Disables all presets. This allows you to control every feature individually by setting the corresponding boolean flags (e.g., `REPORT_GAME_STATUS=true`, `AUTO_REPLY_TELL_MESSAGES=false`) directly in your `.env` file.

### Breakdown of .env presets

#### 🔐 PBN Login and Server Configuration

| Variable        | Description                                           | Example Value                          |
|----------------|-------------------------------------------------------|----------------------------------------|
| `PBN_HANDLE`   | Username for PaintballNet login                       | `username`                             |
| `PBN_PASSWORD` | Password for PaintballNet login                       | `password`                             |
| `PBN_URL`      | Base URL for PaintballNet                             | `https://play.paintballnet.net`        |
| `PBN_SERVER`   | Server to connect to (`beginner`, `primary`, `tournament`) | `primary`                          |

---

#### 📣 Discord Integration

| Variable               | Description                                           | Example Value                          |
|-----------------------|-------------------------------------------------------|----------------------------------------|
| `DISCORD_WEBHOOK_URL` | Webhook URL for sending messages to Discord          | `https://discord.com/api/webhooks/...` |
| `DISCORD_AVATAR_URL`  | Avatar image URL for Discord bot                     | `https://pnwarner.github.io/media/...` |

---

#### 🧭 Puppeteer Browser Options

| Variable                     | Description                                       | Example Value                          |
|-----------------------------|---------------------------------------------------|----------------------------------------|
| `HEADLESS_MODE`             | Run browser in headless mode (`true` or `false`)  | `true`                                 |
| `PUPPETEER_USE_CUSTOM_PATH` | Use custom Chromium path                          | `false`                                |
| `PUPPETEER_CUSTOM_PATH`     | Path to Chromium binary                           | `/data/data/.../chromium-browser`      |

---

#### 🧩 DOM Element IDs

| Variable                     | Description                                     | Example Value     |
|-----------------------------|-------------------------------------------------|-------------------|
| `PBN_BEGINNER_SERVER_ID`    | DOM ID for beginner server selector             | `Component1121`   |
| `PBN_PRIMARY_SERVER_ID`     | DOM ID for primary server selector              | `Component1123`   |
| `PBN_TOURNAMENT_SERVER_ID`  | DOM ID for tournament server selector           | `Component1125`   |
| `PBN_USERNAME_TEXTBOX_ID`   | DOM ID for username input                       | `Component826`    |
| `PBN_PASSWORD_TEXTBOX_ID`   | DOM ID for password input                       | `Component830`    |
| `PBN_MAIN_INPUT_TEXTBOX_ID` | DOM ID for main input textbox                   | `Component598`    |

---

#### ⚙️ Bot Preset and Debug Options

| Variable                        | Description                                                        | Example Value     |
|---------------------------------|--------------------------------------------------------------------|-------------------|
| `BOT_PRESET_MODE`               | Bot mode (`none`, `main`, `secondary`, `chat`, `testing`, `debug`) | `main`            |
| `USE_DEFAULT_INTERVAL_SETTINGS` | Use default timing settings                                        | `true`            |
| `DISPLAY_DEBUG_DATA`            | Show debug info in console                                         | `false`           |

---

#### 🔄 Session and Anti-Idle

| Variable               | Description                                       | Example Value     |
|------------------------|---------------------------------------------------|-------------------|
| `AUTO_RE_LOGIN`        | Automatically re-login if disconnected           | `true`            |
| `LOGOUT_INTERVAL_ENABLED` | Watch for sudden logouts                     | `true`            |
| `LOOK_INTERVAL_ENABLED`   | Send periodic "look" commands to stay active | `true`            |
| `AUTO_RE_LOGIN_DELAY` | Delay before re-login (ms)                        | `120000`          |
| `AUTO_LOOK_DELAY`     | Delay between "look" commands (ms)               | `180000`          |

---

#### 🧍 Player Tracking and Reporting

| Variable                          | Description                                       | Example Value     |
|----------------------------------|---------------------------------------------------|-------------------|
| `RWHO_INTERVAL_ENABLED`          | Enable RWHO tracking                             | `true`            |
| `GAME_LIST_INTERVAL_ENABLED`     | Use browser API for player tracking              | `false`           |
| `ACTIVE_PLAYER_LIST_ENABLED`     | Track active players                             | `true`            |
| `DISCORD_SEND_UPDATES`          | Send updates to Discord                          | `true`            |
| `DISCORD_STATUS_TO_CONSOLE`     | Log Discord message status to console            | `false`           |
| `REPORT_LOGINS_TO_CHAT`         | Report logins/logouts in game chat               | `true`            |
| `REPORT_LOGINS_TO_CONSOLE`      | Log logins/logouts to console                    | `false`           |
| `REPORT_GAME_STATUS`            | Report game start/end                            | `true`            |
| `REPORT_GAME_STATUS_TO_CONSOLE` | Console reporting for game status                | `false`           |
| `REPORT_GAME_STATUS_TO_DISCORD` | Discord reporting for game status                | `true`            |
| `GAME_LIST_POLLING_DELAY`       | Delay for server list polling (ms)               | `1000`            |
| `ACTIVE_PLAYER_LIST_DELAY`      | Delay for checking active players (ms)           | `1000`            |
| `ACTIVE_PLAYER_REPORT_TIME`     | Interval for reporting active players (sec)      | `5`               |
| `AUTO_RWHO_DELAY`               | Delay for sending RWHO command (ms)              | `1000`            |
| `DISPLAY_GAME_MESSAGES`         | Show game server messages                        | `false`           |

---

#### 💬 Player Communication

| Variable                     | Description                                       | Example Value     |
|-----------------------------|---------------------------------------------------|-------------------|
| `DISPLAY_CHAT_MESSAGES`     | Show normal chat messages                        | `true`            |
| `DISPLAY_TELL_MESSAGES`     | Show tell messages                               | `true`            |
| `DISPLAY_RTELL_MESSAGES`    | Show rtell messages                              | `true`            |
| `DISPLAY_SAY_MESSAGES`      | Show say messages                                | `true`            |
| `DISPLAY_WHISPER_MESSAGES`  | Show whisper messages                            | `true`            |
| `DISPLAY_TEAMCHAT_MESSAGES` | Show teamchat messages                           | `true`            |
| `DISPLAY_PLAN_MESSAGES`     | Show plan messages                               | `true`            |
| `AUTO_REPLY_TELL_MESSAGES`  | Auto-reply to tell messages                      | `true`            |

---

#### 🛠️ Bot Functionality

| Variable                              | Description                                   | Example Value     |
|--------------------------------------|-----------------------------------------------|-------------------|
| `COMMAND_ENTRY_INTERVAL_ENABLED`     | Enable command queue loop                     | `true`            |
| `COMMAND_ENTRY_WATCHER_INTERVAL_ENABLED` | Watch command queue size                  | `false`           |
| `SEND_COMMAND_LIST_DELAY`            | Delay between sending commands (ms)           | `500`             |
| `COMMAND_ENTRY_WATCHER_DELAY`        | Delay for queue size reporting (ms)           | `600000`          |
| `BOT_TYPING_DELAY`                   | Delay between keystrokes (ms)                 | `0`               |

## Running the Bot

To start the bot, open your terminal in the project directory and run:

```Bash
node main.js
```

The bot will launch Puppeteer, log into Paintball Net, and begin its automated tasks based on your selected preset.

Command Line Interface (CLI)

Once running, a `>` prompt will appear in your terminal. You can type any in-game command (e.g., `chat hello everyone`, `tell PlayerName hi!`) and press Enter to send it.

- `exit`: Gracefully shuts down the bot.

- `resetstats`: Resets all persistent stats (total games, games lost, player handles) to zero.

## Troubleshooting

- **Error: Failed to log in:**

  - Double-check your `PBN_HANDLE` and `PBN_PASSWORD` in the .env file.

  - Verify `PBN_SERVER` is set correctly.

  - Set `HEADLESS_MODE=false` to watch the browser and diagnose the issue visually.

- **Discord Messages Not Sending/Deleting**:

  - Verify your `DISCORD_WEBHOOK_URL` is correct.

  - Ensure the `BOT_PRESET_MODE` is set to `main`, `secondary`, or `testing`.

- **EACCES: permission denied, open './data/...'**:

  - The bot needs permission to write to its directory. Ensure the `data` folder exists and that the user running the bot has write permissions.

- **Failed to fetch game list**:

  - This error appears when using the `GAME_LIST_INTERVAL_ENABLED=true` setting and indicates a network issue preventing the bot from reaching the game's API. Check your firewall and internet connection.

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
