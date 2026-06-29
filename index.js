require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const Pino = require('pino');
const express = require('express');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ CONFIG ============
const BOT_NAME = 'Muzammil MD';
const OWNER_NUMBER = '923039107958';
const ADMIN_NUMBER = '923039107958';
const PREFIX = '.';

let botStatus = 'Disconnected';
let qrCode = null;
let sock = null;
let botMode = 'public';
let isConnected = false;
let pairingCode = null;

// ============ SERVER ============
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/status', (req, res) => {
    res.json({ status: botStatus, connected: isConnected, mode: botMode });
});

app.get('/qr', (req, res) => {
    res.json({ qr: qrCode, connected: isConnected, pairingCode: pairingCode });
});

app.post('/setmode', (req, res) => {
    const { mode } = req.body;
    if (mode === 'public' || mode === 'private') {
        botMode = mode;
        res.json({ success: true, mode: botMode });
    } else {
        res.json({ success: false, error: 'Invalid mode' });
    }
});

app.post('/pair', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.json({ success: false, error: 'Phone required' });
    try {
        const code = await sock.requestPairingCode(phone);
        pairingCode = code;
        res.json({ success: true, code: code });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.post('/logout', (req, res) => {
    try {
        if (sock) sock.end();
        if (fs.existsSync('session')) fs.rmSync('session', { recursive: true, force: true });
        isConnected = false;
        botStatus = 'Disconnected';
        qrCode = null;
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Server: http://0.0.0.0:${PORT}`);
});

// ============ WHATSAPP BOT ============
async function startBot() {
    try {
        if (fs.existsSync('session')) {
            fs.rmSync('session', { recursive: true, force: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState('session');
        
        sock = makeWASocket({
            logger: Pino({ level: 'silent' }),
            auth: state,
            printQRInTerminal: false,
            browser: ['Muzammil MD', 'Chrome', '1.0.0'],
            connectTimeoutMs: 30000,
            defaultQueryTimeoutMs: 30000,
            keepAliveIntervalMs: 30000
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                qrCode = await QRCode.toDataURL(qr);
                botStatus = 'QR_READY';
                console.log('📱 QR Code generated');
            }
            
            if (connection === 'open') {
                isConnected = true;
                botStatus = 'Connected';
                qrCode = null;
                pairingCode = null;
                console.log(`✅ ${BOT_NAME} Connected!`);
                console.log(`👤 ${sock.user?.name}`);
            }
            
            if (connection === 'close') {
                isConnected = false;
                botStatus = 'Disconnected';
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                if (statusCode === 401) {
                    console.log('❌ Session expired');
                    if (fs.existsSync('session')) fs.rmSync('session', { recursive: true, force: true });
                    setTimeout(() => process.exit(0), 2000);
                } else {
                    console.log('🔄 Reconnecting...');
                    setTimeout(startBot, 5000);
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);

        // ============ MESSAGE HANDLER ============
        sock.ev.on('messages.upsert', async (m) => {
            const msg = m.messages[0];
            if (!msg.message) return;

            const from = msg.key.remoteJid;
            const sender = msg.key.participant || from;
            
            let text = msg.message?.conversation || 
                      msg.message?.extendedTextMessage?.text || '';

            const isOwner = sender === OWNER_NUMBER + '@s.whatsapp.net';
            
            // Private Mode
            if (botMode === 'private' && !isOwner) {
                await sock.sendMessage(from, {
                    text: `🔒 Private Mode\nOnly Owner can use.\nContact: wa.me/${OWNER_NUMBER}`
                });
                return;
            }

            if (text.startsWith(PREFIX)) {
                const args = text.slice(PREFIX.length).trim().split(/ +/);
                const command = args.shift().toLowerCase();

                if (command === 'ping') {
                    await sock.sendMessage(from, { text: '🏓 Pong!' });
                }
                else if (command === 'info') {
                    await sock.sendMessage(from, {
                        text: `🤖 *${BOT_NAME}*\n👑 Owner: ${OWNER_NUMBER}\n📊 Mode: ${botMode.toUpperCase()}\n✍️ Prowed By: Wasif Ali`
                    });
                }
                else if (command === 'mode') {
                    await sock.sendMessage(from, { text: `📌 Mode: ${botMode.toUpperCase()}` });
                }
                else if (command === 'setmode') {
                    if (!isOwner) {
                        await sock.sendMessage(from, { text: '❌ Only owner!' });
                        return;
                    }
                    const mode = args[0]?.toLowerCase();
                    if (mode === 'public' || mode === 'private') {
                        botMode = mode;
                        await sock.sendMessage(from, { text: `✅ Mode: ${mode.toUpperCase()}` });
                    } else {
                        await sock.sendMessage(from, { text: '❌ Use: public/private' });
                    }
                }
                else if (command === 'owner') {
                    await sock.sendMessage(from, {
                        text: `👑 Owner\n📱 ${OWNER_NUMBER}\n💬 wa.me/${OWNER_NUMBER}\n✍️ Prowed By: Wasif Ali`
                    });
                }
                else if (command === 'help') {
                    let help = `🤖 *${BOT_NAME}*\n\n`;
                    help += `${PREFIX}ping - Check bot\n`;
                    help += `${PREFIX}info - Bot info\n`;
                    help += `${PREFIX}mode - Check mode\n`;
                    help += `${PREFIX}owner - Contact owner\n`;
                    help += `${PREFIX}help - This menu\n`;
                    if (isOwner) {
                        help += `\n👑 Owner:\n${PREFIX}setmode public/private\n${PREFIX}restart`;
                    }
                    help += `\n\n✍️ Prowed By: Wasif Ali`;
                    await sock.sendMessage(from, { text: help });
                }
                else if (command === 'restart') {
                    if (!isOwner) {
                        await sock.sendMessage(from, { text: '❌ Only owner!' });
                        return;
                    }
                    await sock.sendMessage(from, { text: '🔄 Restarting...' });
                    setTimeout(() => process.exit(0), 2000);
                }
                else {
                    await sock.sendMessage(from, {
                        text: `❌ Unknown! Use ${PREFIX}help`
                    });
                }
            }
        });

    } catch (error) {
        console.error('❌ Error:', error);
        setTimeout(startBot, 5000);
    }
}

console.log(`🤖 ${BOT_NAME}`);
console.log(`👑 Owner: ${OWNER_NUMBER}`);
console.log(`📌 Mode: ${botMode}`);

startBot();

process.on('unhandledRejection', (error) => console.error(error));
process.on('SIGTERM', () => process.exit(0));
