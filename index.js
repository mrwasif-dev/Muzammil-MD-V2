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

// ============ HTML (Built-in) ============
const HTML_PAGE = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Muzammil MD - WhatsApp Bot</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: rgba(255,255,255,0.05);
            backdrop-filter: blur(20px);
            border-radius: 30px;
            padding: 40px;
            max-width: 550px;
            width: 100%;
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 25px 50px rgba(0,0,0,0.5);
        }
        .header { text-align: center; margin-bottom: 30px; }
        .bot-icon { font-size: 60px; display: block; margin-bottom: 10px; }
        .bot-name { color: #fff; font-size: 28px; font-weight: 700; }
        .bot-name span { color: #4fc3f7; }
        .subtitle { color: #aaa; font-size: 14px; margin-top: 5px; }
        .status-card {
            background: rgba(255,255,255,0.08);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 20px;
            border: 1px solid rgba(255,255,255,0.05);
        }
        .status-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            color: #ccc;
            font-size: 14px;
        }
        .status-row .label { color: #888; }
        .status-row .value { font-weight: 600; }
        .status-dot {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .status-dot.online { background: #4caf50; box-shadow: 0 0 10px #4caf50; }
        .status-dot.offline { background: #f44336; box-shadow: 0 0 10px #f44336; }
        .status-dot.waiting { background: #ff9800; box-shadow: 0 0 10px #ff9800; }
        .mode-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .mode-badge.public { background: #4caf50; color: #fff; }
        .mode-badge.private { background: #f44336; color: #fff; }
        .qr-box {
            background: #fff;
            border-radius: 15px;
            padding: 20px;
            text-align: center;
            min-height: 250px;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 15px 0;
        }
        #qrImage { max-width: 100%; height: auto; border-radius: 10px; }
        .qr-placeholder { color: #999; font-size: 16px; }
        .pairing-box {
            background: rgba(255,255,255,0.08);
            border-radius: 15px;
            padding: 20px;
            margin: 15px 0;
            border: 1px solid rgba(255,255,255,0.05);
        }
        .pairing-box h3 { color: #fff; font-size: 16px; margin-bottom: 15px; }
        .input-group { display: flex; gap: 10px; }
        .input-group input {
            flex: 1;
            padding: 12px 16px;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 10px;
            background: rgba(255,255,255,0.05);
            color: #fff;
            font-size: 14px;
            outline: none;
        }
        .input-group input:focus { border-color: #4fc3f7; }
        .input-group input::placeholder { color: #666; }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            color: #fff;
        }
        .btn-primary { background: linear-gradient(135deg, #4fc3f7, #0288d1); }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(79,195,247,0.3); }
        .btn-success { background: linear-gradient(135deg, #66bb6a, #388e3c); }
        .btn-success:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(102,187,106,0.3); }
        .btn-danger { background: linear-gradient(135deg, #ef5350, #c62828); }
        .btn-danger:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(239,83,80,0.3); }
        .btn-secondary { background: rgba(255,255,255,0.1); }
        .btn-secondary:hover { background: rgba(255,255,255,0.2); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-group { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px; }
        .btn-group .btn { flex: 1; min-width: 100px; text-align: center; }
        .mode-control { display: flex; gap: 10px; margin-top: 10px; }
        .mode-control .btn { flex: 1; }
        .footer {
            text-align: center;
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.05);
            color: #666;
            font-size: 13px;
        }
        .footer .pro { color: #ffd54f; font-weight: 600; }
        .pair-code-display {
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 15px;
            margin-top: 10px;
            text-align: center;
            color: #4fc3f7;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 5px;
            display: none;
        }
        .pair-code-display.show { display: block; }
        .toast {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: #fff;
            padding: 12px 30px;
            border-radius: 50px;
            font-size: 14px;
            display: none;
            z-index: 1000;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
        }
        .toast.show { display: block; animation: slideUp 0.3s ease; }
        .toast.success { border-color: #4caf50; }
        .toast.error { border-color: #f44336; }
        @keyframes slideUp {
            from { opacity: 0; transform: translateX(-50%) translateY(20px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @media (max-width: 480px) {
            .container { padding: 20px; }
            .btn-group { flex-direction: column; }
            .btn-group .btn { width: 100%; }
            .mode-control { flex-direction: column; }
            .input-group { flex-direction: column; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span class="bot-icon">🤖</span>
            <h1 class="bot-name">Muzammil <span>MD</span></h1>
            <p class="subtitle">WhatsApp Bot Management Panel</p>
        </div>
        <div class="status-card">
            <div class="status-row">
                <span class="label">📊 Status</span>
                <span class="value" id="statusDisplay">
                    <span class="status-dot offline" id="statusDot"></span>
                    <span id="statusText">Disconnected</span>
                </span>
            </div>
            <div class="status-row">
                <span class="label">📌 Mode</span>
                <span class="value">
                    <span class="mode-badge public" id="modeBadge">PUBLIC</span>
                </span>
            </div>
            <div class="status-row">
                <span class="label">👑 Owner</span>
                <span class="value" style="color:#4fc3f7;">+923039107958</span>
            </div>
        </div>
        <div class="qr-box">
            <div id="qrContainer">
                <div class="qr-placeholder">📱 Waiting for QR Code...</div>
            </div>
        </div>
        <div class="pairing-box">
            <h3>📱 Pair with Phone Number</h3>
            <div class="input-group">
                <input type="text" id="phoneInput" placeholder="Enter number (e.g., 923001234567)">
                <button class="btn btn-primary" id="pairBtn">Pair</button>
            </div>
            <div class="pair-code-display" id="pairCodeDisplay">
                Code: <span id="pairCode">123456</span>
            </div>
        </div>
        <div class="btn-group">
            <button class="btn btn-secondary" id="refreshBtn">🔄 Refresh</button>
            <button class="btn btn-danger" id="logoutBtn">🚪 Logout</button>
        </div>
        <div class="mode-control">
            <button class="btn btn-success" id="setPublicBtn">🌍 Public Mode</button>
            <button class="btn btn-danger" id="setPrivateBtn">🔒 Private Mode</button>
        </div>
        <div class="btn-group" style="margin-top:10px;">
            <button class="btn btn-primary" onclick="window.open('https://wa.me/923039107958', '_blank')">💬 Contact Admin</button>
            <button class="btn btn-success" onclick="window.open('https://wa.me/923039107958', '_blank')">🆘 Support</button>
        </div>
        <div class="footer">
            <p>✍️ <span class="pro">Prowed By: Wasif Ali</span></p>
            <p style="margin-top:5px; font-size:12px; color:#555;">Made with ❤️ | Muzammil MD v2.0</p>
        </div>
    </div>
    <div class="toast" id="toast"></div>
    <script>
        const statusText = document.getElementById('statusText');
        const statusDot = document.getElementById('statusDot');
        const modeBadge = document.getElementById('modeBadge');
        const qrContainer = document.getElementById('qrContainer');
        const phoneInput = document.getElementById('phoneInput');
        const pairBtn = document.getElementById('pairBtn');
        const pairCodeDisplay = document.getElementById('pairCodeDisplay');
        const pairCode = document.getElementById('pairCode');
        const refreshBtn = document.getElementById('refreshBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const setPublicBtn = document.getElementById('setPublicBtn');
        const setPrivateBtn = document.getElementById('setPrivateBtn');
        const toast = document.getElementById('toast');
        let toastTimeout = null;

        function showToast(message, type = 'success') {
            toast.textContent = message;
            toast.className = 'toast show ' + type;
            clearTimeout(toastTimeout);
            toastTimeout = setTimeout(() => { toast.className = 'toast'; }, 4000);
        }

        function updateUI(data) {
            if (data.connected) {
                statusText.textContent = 'Connected';
                statusDot.className = 'status-dot online';
            } else if (data.status === 'QR_READY') {
                statusText.textContent = 'Scan QR';
                statusDot.className = 'status-dot waiting';
            } else {
                statusText.textContent = 'Disconnected';
                statusDot.className = 'status-dot offline';
            }
            if (data.mode === 'public') {
                modeBadge.textContent = 'PUBLIC';
                modeBadge.className = 'mode-badge public';
            } else {
                modeBadge.textContent = 'PRIVATE';
                modeBadge.className = 'mode-badge private';
            }
            if (data.connected) {
                qrContainer.innerHTML = '<div style="color:#4caf50;font-size:20px;font-weight:600;">✅ Connected Successfully!<div style="font-size:14px;color:#888;margin-top:10px;">Muzammil MD is online</div></div>';
            } else if (data.qr) {
                qrContainer.innerHTML = '<img id="qrImage" src="' + data.qr + '" alt="QR Code">';
            } else {
                qrContainer.innerHTML = '<div class="qr-placeholder">📱 Waiting for QR Code...</div>';
            }
            if (data.pairingCode) {
                pairCode.textContent = data.pairingCode;
                pairCodeDisplay.className = 'pair-code-display show';
            } else {
                pairCodeDisplay.className = 'pair-code-display';
            }
        }

        async function fetchStatus() {
            try {
                const response = await fetch('/status');
                const data = await response.json();
                updateUI(data);
            } catch (error) { console.error(error); }
        }

        async function fetchQR() {
            try {
                const response = await fetch('/qr');
                const data = await response.json();
                if (!data.connected && data.qr) {
                    qrContainer.innerHTML = '<img id="qrImage" src="' + data.qr + '" alt="QR Code">';
                }
                if (data.pairingCode) {
                    pairCode.textContent = data.pairingCode;
                    pairCodeDisplay.className = 'pair-code-display show';
                }
            } catch (error) { console.error(error); }
        }

        async function pairNumber() {
            const phone = phoneInput.value.trim();
            if (!phone) { showToast('Please enter a phone number!', 'error'); return; }
            pairBtn.disabled = true;
            pairBtn.textContent = '⏳ Pairing...';
            try {
                const response = await fetch('/pair', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone })
                });
                const data = await response.json();
                if (data.success) {
                    showToast('✅ Pairing code sent to ' + phone, 'success');
                    if (data.code) {
                        pairCode.textContent = data.code;
                        pairCodeDisplay.className = 'pair-code-display show';
                    }
                } else {
                    showToast('❌ ' + data.error, 'error');
                }
            } catch (error) {
                showToast('❌ Error pairing!', 'error');
            }
            pairBtn.disabled = false;
            pairBtn.textContent = 'Pair';
        }

        async function setMode(mode) {
            try {
                const response = await fetch('/setmode', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode })
                });
                const data = await response.json();
                if (data.success) {
                    showToast('✅ Mode changed to ' + mode.toUpperCase(), 'success');
                    fetchStatus();
                } else {
                    showToast('❌ ' + data.error, 'error');
                }
            } catch (error) {
                showToast('❌ Error changing mode!', 'error');
            }
        }

        async function logout() {
            if (!confirm('Are you sure you want to logout?')) return;
            try {
                const response = await fetch('/logout', { method: 'POST' });
                const data = await response.json();
                if (data.success) {
                    showToast('✅ Logged out successfully', 'success');
                    setTimeout(() => location.reload(), 1500);
                } else {
                    showToast('❌ ' + data.error, 'error');
                }
            } catch (error) {
                showToast('❌ Error logging out!', 'error');
            }
        }

        pairBtn.addEventListener('click', pairNumber);
        refreshBtn.addEventListener('click', () => { fetchStatus(); fetchQR(); showToast('🔄 Refreshed!', 'success'); });
        logoutBtn.addEventListener('click', logout);
        setPublicBtn.addEventListener('click', () => setMode('public'));
        setPrivateBtn.addEventListener('click', () => setMode('private'));
        phoneInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') pairNumber(); });

        fetchStatus();
        fetchQR();
        setInterval(fetchStatus, 3000);
        setInterval(fetchQR, 5000);
    </script>
</body>
</html>`;

// ============ SERVER ============
app.get('/', (req, res) => {
    res.send(HTML_PAGE);
});

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
        if (!sock) return res.json({ success: false, error: 'Bot not ready' });
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
        pairingCode = null;
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
