const fs = require('fs-extra');
const path = require('path');

module.exports = {
    // ===== CHECKS =====
    isGroup: (chat) => chat.endsWith('@g.us'),
    
    isOwner: (number) => {
        const owner = process.env.OWNER_NUMBER || '923039107958';
        return number === owner + '@s.whatsapp.net' || number === owner;
    },
    
    isAdmin: (number) => {
        const admin = process.env.ADMIN_NUMBER || '923039107958';
        return number === admin + '@s.whatsapp.net' || number === admin;
    },
    
    isOwnerOrAdmin: (number) => {
        return module.exports.isOwner(number) || module.exports.isAdmin(number);
    },

    hasLink: (text) => {
        const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|net|org|edu|gov|mil|io|xyz|online|tech|app|dev|site))/gi;
        return urlRegex.test(text);
    },

    isMentioned: (message, botId) => {
        const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        return mentioned && mentioned.includes(botId);
    },

    // ===== FORMATTING =====
    formatUptime: (seconds) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        let result = '';
        if (days > 0) result += `${days}d `;
        if (hours > 0 || days > 0) result += `${hours}h `;
        if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m `;
        result += `${secs}s`;
        return result;
    },

    formatNumber: (num) => {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },

    getTime: () => {
        return new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Karachi',
            hour12: true
        });
    },

    // ===== RANDOM =====
    getRandomEmoji: () => {
        const emojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🔥', '🎉', '💯', '🤣', '🥰', '😍', '🤩'];
        return emojis[Math.floor(Math.random() * emojis.length)];
    },

    getRandomInt: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    shuffleArray: (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    // ===== PLUGIN SYSTEM =====
    async loadPlugins() {
        const pluginDir = path.join(__dirname, '../plugins');
        await fs.ensureDir(pluginDir);
        
        const plugins = [];
        const files = await fs.readdir(pluginDir);
        
        for (const file of files) {
            if (file.endsWith('.js') && !file.startsWith('_')) {
                try {
                    const plugin = require(path.join(pluginDir, file));
                    if (plugin.name && plugin.commands) {
                        plugins.push(plugin);
                        console.log(`✅ Plugin Loaded: ${plugin.name}`);
                    }
                } catch (error) {
                    console.error(`❌ Error loading plugin ${file}:`, error);
                }
            }
        }
        return plugins;
    },

    async reloadPlugins() {
        const pluginDir = path.join(__dirname, '../plugins');
        const files = await fs.readdir(pluginDir);
        
        for (const file of files) {
            if (file.endsWith('.js')) {
                const modulePath = path.join(pluginDir, file);
                delete require.cache[require.resolve(modulePath)];
            }
        }
        return await this.loadPlugins();
    },

    // ===== VALIDATION =====
    isValidNumber: (number) => {
        return /^[0-9]{10,15}$/.test(number);
    },

    isValidUrl: (url) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    // ===== MISC =====
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    getFileSize: (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    truncateText: (text, length = 100) => {
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    }
};
