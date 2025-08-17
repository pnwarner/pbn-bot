const fs = require('fs');
const path = './data/message_ids.txt';

class DiscordService {
    constructor(webhookUrl, options = {}, ansiCodes = {}, displayDebugData = false) {
    this.webhookUrl = webhookUrl;
    this.shouldLog = options.logToConsole || false;
    this.ansiCodes = ansiCodes;
    //this.displayDebugData = displayDebugData;
    if (displayDebugData) {
        this.displayDebugData = true;
    } else {
        this.displayDebugData = false;
    }
    if (!fs.existsSync(path)) {
        fs.writeFileSync(path, JSON.stringify([]));
    }
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
        const response = await fetch(`${webhookUrl}?wait=true`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        // Get response from request
        const messageData = await response.json();

        if (response.ok) {
            if (this.shouldLog) {
                console.log(`📨 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} Message sent successfully to Discord!`);
            }
            //console.log(`📨 Message ID: ${messageData.id}`);
            return messageData.id; // Save this ID if you want to delete it later
        } else {
            const errorData = await response.json();
            console.error(`❌ ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} ${this.ansiCodes.RED}Failed to send message to Discord${this.ansiCodes.RESET}:`, response.status, response.statusText, errorData);
        }
    } catch (error) {
        console.error(`❌ ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} ${this.ansiCodes.RED}An error occurred while sending the message${this.ansiCodes.RESET}:`, error);
    }
    }

    // === Delete a discord message
    deleteDiscordMessage = async (webhookUrl, messageId) => {
    try {
        const deleteUrl = `${webhookUrl}/messages/${messageId}`;
        const response = await fetch(deleteUrl, {
            method: 'DELETE',
        });

        if (response.ok) {
            if (this.shouldLog) {
                console.log(`🗑️ Message deleted successfully!`);
            }
        } else {
            console.error(`❌ Failed to delete:`, response.status, response.statusText);
        }
    } catch (error) {
        console.error(`❌ Error deleting message:`, error);
    }
    }

    // === Record an Discord Message ID to the file
    recordMessageIdToFile(id) {
        fs.appendFileSync(path, `${id}\n`, 'utf8');
    }

    // Read all stored Discord Message IDs
    readStoredIdsFromFile() {
        if (!fs.existsSync(path)) return [];
        return fs.readFileSync(path, 'utf8')
        .split('\n')
        .map(id => id.trim())
        .filter(id => id);
    }

    // Remove a specific Discord Message ID
    removeMessageIdFromFile(idToRemove) {
        const allIds = this.readStoredIdsFromFile();
        const updated = allIds.filter(id => id !== idToRemove);
        fs.writeFileSync(path, updated.join('\n') + '\n', 'utf8');
    }

    // === Remove all stored Discord messages before init starts
    async clearStoredDiscordMessages(webhookUrl) {
        
        // Make sure this function is working:
        if (this.displayDebugData) {
        console.log(`🔄 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} ✅ Clearing stored Discord messages...`);
        }

        const storedIds = this.readStoredIdsFromFile();
        
        // Log length of stored IDs
        //console.log(`🧹 There are ${storedIds.length} stored messages. Cleaning up...`);

        if (storedIds.length === 0) {
        if (this.displayDebugData) {
            console.log(`🔄 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} ✅ No messages to delete. File is clean.`);
        }
        return;
        }
        else {
        if (this.displayDebugData) {
            console.log(`🔄 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} 🧹 Found ${storedIds.length} stored messages. Cleaning up...`);
        }
        }

        for (const id of storedIds) {
        await this.deleteDiscordMessage(webhookUrl, id); // Attempt to delete
        this.removeMessageIdFromFile(id);                 // Remove ID from file
        }

        if (this.displayDebugData) {
        console.log(`🔄 ${this.ansiCodes.RESET}${this.ansiCodes.BOLD}[PBN Bot]${this.ansiCodes.RESET} ✅ Cleanup complete. All stored messages deleted and file cleared.`);
        }

    }

}

module.exports = DiscordService;