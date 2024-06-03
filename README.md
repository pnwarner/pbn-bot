# PBN-Bot

## What is PBN-Bot?

> **This project has been placed on hold** due to complications with Python-Selenium and the actual game itself utilizing only http instead of https. I have some ideas for completely rebuilding this bot from the ground up, but do not currently have the time to implement them.

PBN-Bot is a bot made for the multiplayer online game [Paintball-Net](https://www.paintballnet.net/). This bot has the capability of persistantly remaining online, and monitoring player and game activity. The bot was made as a hobby project to track user logins, and splats. The bot in this provided code only has the ability to monitor all servers, and automatically send a chat message to the main server when players log in or out.  The bot can be controlled from the automated browser, or be run only from the terminal with as a headless browser.

![PBN-Bot working in the terminal with Screen](https://pnwarner.github.io/media/project-media/pbn-bot/pbnbot.gif)
*PBN-Bot working in the GNU/Linux terminal paired with Screen*

## Requirements
This project was built, and only tested in a Debian based GNU/Linux environment.

This project requires:
- Python 3
- Python3-Selenium
- chromium
- chromiumwebdriver
- screen (optional, but handy for the terminal)

Here are some [instructions](https://github.com/password123456/setup-selenium-with-chrome-driver-on-ubuntu_debian) for setting up Python-Selenium.

## Getting Started

First, user credentials need to be established in the `/data/config/bots/player-bot.conf` file.  If you wish for login to be automated, edit the following lines in the `player-bot.conf` file:

```
PBNUserHandle=playerName
PBNUserPW=playerPassWord
```

> The PBNUserHandle and PBNUserPW fields **can be left blank**, and the terminal will prompt you for name and password at startup.

You can also pre-establish which server to automatically connect to:

```
serverToConnect=primary
```

> **serverToConnect options:** beginner, primary, tournament

Last, determine set if you want to view the browser, or terminal only:

```
showBrowser=False
```
> Set showBrowser **True** to view the browser, or **False** to run from the terminal only.

After setting up the `player-bot.conf` file, navigate to the /source folder and run:

```
python3 player-bot.py
```

The bot can still perform basic PBN Player interactions with control from the browser.  If you decide to run this script in headless mode, you can echo PBN commands to the `/data/input/pbnc.run` file:
```
echo CHAT Hello World >> /data/input/pbnc.run
```
> This is where **Screen** would be recommended for running the bot in the terminal as a split screen; one half of the terminal to view the bot output, and the other half to send commands to the bot if need-be.

![PBN-Bot working in the terminal with Screen](https://pnwarner.github.io/media/project-media/pbn-bot/UI-001.webp)
*PBN-Bot running as **parabot** from another players point of view*