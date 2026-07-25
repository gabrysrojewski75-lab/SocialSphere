const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const os = require('os');

const PORT = 3000;
const DB_FILE = path.join(app.getPath('userData'), 'db.json');

// ============================================================
// CENTRAL SERVER (embedded inside Electron)
// ============================================================
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const INITIAL_DB = {
    users: [
        {
            email: 'owner@socialsphere.local',
            password: 'SS_Admin#Gabrys2026!',
            name: 'Gabrys Rojewski',
            handle: '@Itzz_Sigma03',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            bio: 'Właściciel i twórca platformy SocialSphere.',
            verified: true,
            isOwner: true,
            f2aEnabled: false,
            riddles: [],
            followers: [],
            following: []
        }
    ],
    posts: [
        {
            id: 'post-official-1',
            author: {
                name: 'Wsparcie SocialSphere',
                avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
                handle: '@social_support'
            },
            time: 'Wczoraj',
            content: 'Witaj w oficjalnej społeczności SocialSphere! 🚀',
            image: null,
            likes: 18,
            likedByUser: false,
            comments: []
        }
    ],
    chats: [],
    notifications: []
};

function getLocalNetworkIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) return iface.address;
        }
    }
    return '127.0.0.1';
}

function ensureDbExists() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
    }
}

function startEmbeddedServer(portToUse) {
    const appDir = path.join(__dirname);

    const server = http.createServer((req, res) => {
        ensureDbExists();

        let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        if (clientIp.startsWith('::ffff:')) clientIp = clientIp.replace('::ffff:', '');
        if (clientIp === '::1') clientIp = '127.0.0.1';

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

        const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
        const pathname = parsedUrl.pathname;

        if (pathname === '/api/info' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'online', localIp: getLocalNetworkIp(), port: portToUse, clientIp }));
            return;
        }

        if (pathname === '/api/db' && req.method === 'GET') {
            fs.readFile(DB_FILE, 'utf-8', (err, data) => {
                if (err) { res.writeHead(500); res.end('{}'); return; }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(data);
            });
            return;
        }

        if (pathname === '/api/db' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    fs.writeFile(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8', err => {
                        if (err) { res.writeHead(500); res.end('{}'); return; }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ status: 'ok', clientIp }));
                    });
                } catch (e) { res.writeHead(400); res.end('{}'); }
            });
            return;
        }

        // Serve static files
        let filePath = path.join(appDir, pathname === '/' ? 'index.html' : pathname);
        if (!filePath.startsWith(appDir)) { res.writeHead(403); res.end('Forbidden'); return; }

        fs.stat(filePath, (err, stats) => {
            if (err || !stats.isFile()) {
                res.writeHead(404);
                res.end('Not Found');
                return;
            }
            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            fs.createReadStream(filePath).pipe(res);
        });
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            startEmbeddedServer(portToUse + 1);
        }
    });

    server.listen(portToUse, '0.0.0.0', () => {
        const localIp = getLocalNetworkIp();
        console.log(`SocialSphere serwer uruchomiony: http://localhost:${portToUse}`);
        console.log(`Sieć LAN: http://${localIp}:${portToUse}`);
        // Open main window
        createWindow(`http://localhost:${portToUse}`);
    });
}

// ============================================================
// ELECTRON WINDOW
// ============================================================
let mainWindow;

function createWindow(url) {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 900,
        minHeight: 600,
        title: 'SocialSphere',
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        backgroundColor: '#0d0d0d',
        show: false
    });

    mainWindow.loadURL(url);

    // Show once ready so it doesn't flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Open external links in browser, not Electron
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
    startEmbeddedServer(PORT);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            startEmbeddedServer(PORT);
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
