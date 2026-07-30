const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// MIME Types mapping
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

// Initial Seed Database if db.json does not exist
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
            content: 'Witaj w oficjalnej społeczności SocialSphere! 🚀 Opublikuj swój pierwszy post, zakręć własną Orbitą i korzystaj z czarno-pomarańczowej platformy z obsługą wielu urządzeń w sieci.',
            image: null,
            likes: 18,
            likedByUser: false,
            comments: []
        }
    ],
    chats: [],
    notifications: []
};

// Helper: Get local network IP addresses
function getLocalNetworkIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

// Ensure db.json exists
function ensureDbExists() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
    }
}

// Create HTTP Server
const server = http.createServer((req, res) => {
    ensureDbExists();

    // Clean client IP
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    if (clientIp.startsWith('::ffff:')) {
        clientIp = clientIp.replace('::ffff:', '');
    }
    if (clientIp === '::1') clientIp = '127.0.0.1';

    // CORS Headers for network sharing
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    // --- API ENDPOINTS ---
    if (pathname === '/api/info' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'online',
            localIp: getLocalNetworkIp(),
            port: PORT,
            clientIp: clientIp
        }));
        return;
    }

    if (pathname === '/api/db' && req.method === 'GET') {
        fs.readFile(DB_FILE, 'utf-8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Błąd odczytu bazy' }));
                return;
            }
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
                const incoming = JSON.parse(body);
                ensureDbExists();

                fs.readFile(DB_FILE, 'utf-8', (err, currentData) => {
                    let db = INITIAL_DB;
                    try {
                        if (!err && currentData) db = JSON.parse(currentData);
                    } catch (e) {}

                    if (!Array.isArray(db.users)) db.users = [];
                    if (!Array.isArray(db.deletedEmails)) db.deletedEmails = ["walekonia123@gmail.com"];
                    if (!Array.isArray(db.posts)) db.posts = [];
                    if (!Array.isArray(db.chats)) db.chats = [];
                    if (!Array.isArray(db.notifications)) db.notifications = [];

                    // Filter out any blacklisted deleted users first
                    const deletedSet = new Set(db.deletedEmails.map(e => e.toLowerCase()));
                    db.users = db.users.filter(u => u.email && !deletedSet.has(u.email.toLowerCase()));

                    // Merge users by email (ignoring deleted emails)
                    if (Array.isArray(incoming.users)) {
                        incoming.users.forEach(incUser => {
                            if (!incUser.email) return;
                            const emailLower = incUser.email.toLowerCase();
                            if (deletedSet.has(emailLower)) return;

                            const existingIdx = db.users.findIndex(u => u.email.toLowerCase() === emailLower);
                            if (existingIdx >= 0) {
                                db.users[existingIdx] = { ...db.users[existingIdx], ...incUser };
                            } else {
                                db.users.push(incUser);
                            }
                        });
                    }

                    // Merge posts by ID
                    if (Array.isArray(incoming.posts)) {
                        incoming.posts.forEach(incPost => {
                            if (!incPost.id) return;
                            const existingIdx = db.posts.findIndex(p => p.id === incPost.id);
                            if (existingIdx >= 0) {
                                db.posts[existingIdx] = { ...db.posts[existingIdx], ...incPost };
                            } else {
                                db.posts.unshift(incPost);
                            }
                        });
                    }

                    // Merge chats by ID
                    if (Array.isArray(incoming.chats)) {
                        incoming.chats.forEach(incChat => {
                            if (!incChat.id) return;
                            const existingIdx = db.chats.findIndex(c => c.id === incChat.id);
                            if (existingIdx >= 0) {
                                db.chats[existingIdx] = { ...db.chats[existingIdx], ...incChat };
                            } else {
                                db.chats.push(incChat);
                            }
                        });
                    }

                    // Merge notifications by ID
                    if (Array.isArray(incoming.notifications)) {
                        incoming.notifications.forEach(incNotif => {
                            if (!incNotif.id) return;
                            const existingIdx = db.notifications.findIndex(n => n.id === incNotif.id);
                            if (existingIdx >= 0) {
                                db.notifications[existingIdx] = { ...db.notifications[existingIdx], ...incNotif };
                            } else {
                                db.notifications.unshift(incNotif);
                            }
                        });
                    }

                    fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf-8', err => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Błąd zapisu' }));
                            return;
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ status: 'ok', clientIp, db }));
                    });
                });
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Nieprawidłowy JSON' }));
            }
        });
        return;
    }

    // --- DELETE USER (Owner only, called from admin panel) ---
    if (pathname.startsWith('/api/user/delete/') && req.method === 'POST') {
        const emailToDelete = decodeURIComponent(pathname.replace('/api/user/delete/', '')).toLowerCase();
        ensureDbExists();
        fs.readFile(DB_FILE, 'utf-8', (err, currentData) => {
            let db = INITIAL_DB;
            try { if (!err && currentData) db = JSON.parse(currentData); } catch(e) {}
            if (!Array.isArray(db.deletedEmails)) db.deletedEmails = [];
            if (!db.deletedEmails.includes(emailToDelete)) {
                db.deletedEmails.push(emailToDelete);
            }
            db.users = (db.users || []).filter(u => u.email.toLowerCase() !== emailToDelete);
            fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf-8', err2 => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'deleted', email: emailToDelete, db }));
            });
        });
        return;
    }

    // --- STATIC FILES SERVING ---
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    
    // Safety check to prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Access Denied');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>404 — Nie znaleziono pliku</h1>');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    });
});

function startServer(portToUse) {
    server.removeAllListeners('error');
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`\n⚠️ Port ${portToUse} jest już w użyciu przez inny działający serwer SocialSphere!`);
            console.log(`Przełączam automatycznie na kolejny wolny port ${portToUse + 1}...\n`);
            startServer(portToUse + 1);
        } else {
            console.error('Błąd serwera:', err);
        }
    });

    server.listen(portToUse, '0.0.0.0', () => {
        const localIp = getLocalNetworkIp();
        console.clear();
        console.log('================================================================');
        console.log('🚀 SOCIALSPHERE - CENTRALNY SERWER SIECIOWY');
        console.log('================================================================');
        console.log(`💻 Na tym komputerze:  http://localhost:${portToUse}`);
        console.log(`🌐 Z innych laptopów:  http://${localIp}:${portToUse}`);
        console.log('================================================================');
        console.log('Osoby na innych laptopach / telefonach połączone z tą samą siecią Wi-Fi');
        console.log(`wpisują w przeglądarce:  http://${localIp}:${portToUse}`);
        console.log('================================================================\n');
    });
}

startServer(PORT);

