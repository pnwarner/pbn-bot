# PBN Bot

PBNBot is a Node.js bot designed to interact with the Paintball-Net game ([https://play.paintballnet.net](https://play.paintballnet.net)) using Puppeteer. It automates login, monitors game activity, sends commands, and can report player logins/logouts to Discord.

## Features

- **Automated Login:** Connects to the specified Paintball Net server (Beginner, Primary, Tournament) using front-end automation.
- **Real-time Chat Monitoring:** Displays in-game chat, tells, whispers, and team chat directly in your terminal by monitoring WebSocket activity.
- **Automated Commands:**
  - `look`: Sends "look" command periodically to prevent idle disconnection via front-end automation.
  - `rwho`: Sends "rwho" command periodically to monitor active players via front-end automation.
- **Player Activity Tracking:** Detects player logins and logouts by monitoring WebSocket activity, and can report them to a Discord webhook. **It also reports real-time login and logout events directly to the in-game chat.**
- **Command Queue:** Allows you to queue commands from the terminal, which the bot sends to the game sequentially using front-end automation.
- **Automatic Re-login:** Detects disconnections and attempts to re-login automatically.
- **Discord Integration:** Sends updates (e.g., player logins) to a specified Discord channel.
- **Configurable**: Easily adjust settings like server, headless mode, and various timing options.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Nodejs
- npm
- A `.env` file for credentials (see "Configuration" section)

### Installation

1. **Clone the repository (or create the** `main.js` **file):**
If you have a Git repository, clone it:

    ```bash
    ```

    Otherwise, ensure your `main.js` file is in a project directory.

2. **Install dependencies:**

    Open your terminal in the project directory and run:

    ```bash
    npm install
    ```

## Configuration

PBNBot uses environment variables for sensitive information and configuration. Create a file named .env in the root directory of your project (the same directory as `main.js`).

Here's an example `.env` file:

```bash
PBN_HANDLE="YourGameHandle"
PBN_PASSWORD="YourGamePassword"
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN"
DISCORD_AVATAR_URL="https://example.com/your-bot-avatar.png"
```

- `PBN_HANDLE`: Your username for Paintball Net.
- `PBN_PASSWORD`: Your password for Paintball Net.
- `DISCORD_WEBHOOK_URL`: The URL for your Discord webhook. You can create one in your Discord server's channel settings (Integrations -> Webhooks -> New Webhook).
- `DISCORD_AVATAR_URL`: (Optional) A URL to an image that will be used as the avatar for messages sent by the bot to Discord.

## Running the Bot

To start the bot, open your terminal in the project directory and run:

```bash
node main.js
```

The bot will launch a Puppeteer browser instance (either visible or headless, depending on configuration), log into Paintball Net, and start its background tasks.

### Command Line Interface (CLI)

Once the bot is running, you'll see a `>` prompt in your terminal. You can type commands here and press Enter to send them directly to the game.

- Type any in-game command (e.g., `chat hello`, `tell PlayerName message`, `rwho`).

- To exit the bot gracefully, type `exit` and press `Enter`.

## Customization

You can customize the bot's behavior by modifying the `PBNBot` constructor parameters in `main.js`:

```javascript
const controller = new PBNBot({
  closeBrowser: false, // Set to true to automatically close the browser when the bot exits
  url: 'https://play.paintballnet.net', // The game URL (usually no need to change)
  server: 'primary', // 'beginner', 'primary', or 'tournament' - selects which server to join
  headless: true, // Set to false to see the browser UI (useful for debugging)
});
```

Additionally, you can enable/disable various background services and adjust timing options within the `PBNBot` class's constructor:

```javascript
// Enable / Disable Looped Background services
this.autoReLogin = true; // Enable or Disable Re-login after logout detected
this.lookIntervalEnabled = true;  // Enable auto-look for anti-idle reasons
this.rwhoIntervalEnabled = true;  // Sends RWHO Command at set interval
this.gameListIntervalEnabled = false;  // Enable Retrieve player list from backend web api
this.activePlayerListEnabled = true; // Reports active users over Discord, works with this.discordSendUpdates enabled
this.commandEntryIntervalEnabled = true; // Enable Command list entry loop.  DO NOT DISABLE
this.commandEntryWatcherIntervalEnabled = true; // Enable Command Entry list watcher to monitor command queue
this.logoutIntervalEnabled = true; // Enable Watching for logout, and re-login
this.discordSendUpdates = true; // Enable sending Discord Updates, works with this.activePlayerListEnabled

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
```

## Troubleshooting

- **Bot doesn't log in**:
  - Double-check your `.env` file for correct `PBN_HANDLE` and `PBN_PASSWORD`.
  - Ensure the `server` option in the `PBNBot` constructor is set correctly (`'primary'`, `'beginner'`, or `'tournament'`).
  - Try setting `headless: false` in the PBNBot constructor to watch the browser and see what's happening.

- **Discord messages not sending:**
  - Verify `DISCORD_WEBHOOK_URL` in your `.env` file is correct and active.
  - Check if `discordSendUpdates` is set to `true` in the bot's configuration.
  - Look for error messages in your terminal output.
- "Error during initialization: Error: Protocol error (Target.createCDPSession): Target closed."
  - This often happens if the browser crashes or is closed unexpectedly. Ensure you have enough system resources.

- **"Failed to fetch game list:"**
- This indicates an issue with the bot's ability to reach `drm-pbn-be.com:2998`. Check your internet connection and any firewalls. The `rejectUnauthorized: false` setting is used to bypass SSL certificate issues, but network connectivity is still required.

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