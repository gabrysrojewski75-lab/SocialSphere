// SocialSphere App JS Logic (Production Version with Email/Password & 2FA Riddles)

// Initial Seed Users (Database simulator in localStorage)
const SEED_USERS = [
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
        riddles: []
    },
    {
        email: 'admin@socialsphere.com',
        password: 'admin123',
        name: 'Administrator',
        handle: '@admin',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
        bio: 'Oficjalne konto administratora platformy SocialSphere.',
        verified: true,
        f2aEnabled: false,
        riddles: []
    }
];

const DEFAULT_POSTS = [
    {
        id: 'post-official-1',
        author: {
            name: 'Wsparcie SocialSphere',
            avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
            handle: '@social_support'
        },
        time: 'Wczoraj',
        content: 'Witaj w oficjalnej społeczności SocialSphere! 🚀 Opublikuj swój pierwszy post, zakręć własną Orbitą i korzystaj z czarno-pomarańczowej platformy bez fikcyjnych botów.',
        image: null,
        likes: 18,
        likedByUser: false,
        comments: []
    }
];

const DEFAULT_CHATS = [
    {
        id: 'social-support',
        name: 'Wsparcie SocialSphere',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
        type: 'channel',
        official: true,
        unreadCount: 0,
        status: null,
        messages: [
            { id: 'm1', sender: 'other', text: 'Witaj w oficjalnym kanale wsparcia SocialSphere! Zapytaj o dowolną funkcjonalność lub zgłoś problem.', time: '12:00' },
            { id: 'm2', sender: 'other', text: 'SocialSphere działa całkowicie bez botów — prawdziwa społeczność i czyste dane!', time: '12:05' }
        ]
    },
    {
        id: 'global-announcements',
        name: 'Ogłoszenia SocialSphere',
        avatar: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&w=150&q=80',
        type: 'channel',
        official: true,
        unreadCount: 0,
        status: null,
        messages: [
            { id: 'm4', sender: 'other', text: 'Wypuściliśmy wersję SocialSphere z realną weryfikacją kont (gwiazdka ★)! 🎉', time: 'Wczoraj' }
        ]
    }
];

const DEFAULT_NOTIFICATIONS = [
    { id: 'n1', type: 'mention', text: 'Witaj w SocialSphere! Twój profil jest aktywny i zweryfikowany.', time: 'Przed chwilą', read: false }
];

// Database of Registered Users
let users = [];

// App State
let posts = [];
let chats = [];
let notifications = [];
let currentUser = {
    email: '',
    name: '',
    handle: '',
    avatar: '',
    bio: '',
    verified: false,
    f2aEnabled: false,
    riddles: [],
    isLoggedIn: false
};

// Authentication Wizards Variables
let tempLoginUser = null; // User logged in but waiting for 2FA validation
let temporaryAvatarBase64 = '';

let activeChatId = 'social-support';
let selectedPostImageUrl = null;
let temporarySelectedImageUrl = null;
let currentTab = 'feed';

// New feature state
let savedPostIds = [];
let myNote = '';
let orbitAnimFrames = [];

// Story viewer state
let currentStoryUserId = null;
let currentStorySlideIndex = 0;
let storyTimerInterval = null;
let storyProgressInterval = null;

// More popover state
let morePopoverOpen = false;

// Audio Context Ringing variables
let audioCtx = null;
let oscNode1 = null;
let oscNode2 = null;
let gainNode = null;
let callTimer = null;
let callTimerRingInterval = null;

// Bootstrapping
window.onload = function() {
    loadState();
    
    if (!currentUser.isLoggedIn) {
        showLoginOverlay();
    } else {
        hideLoginOverlay();
        initApplication();
    }
    
    // Bind global window events
    window.addEventListener('click', function(e) {
        const notifDropdown = document.getElementById('notifications-dropdown-menu');
        const bellBtn = document.getElementById('notifications-bell-btn');
        if (notifDropdown && !notifDropdown.contains(e.target) && !bellBtn.contains(e.target)) {
            notifDropdown.style.display = 'none';
        }
    });

    // Detect changes made by weryfikacja.html in another tab (localStorage storage event)
    window.addEventListener('storage', function(e) {
        if (e.key === 'socialsphere_users_db' && e.newValue) {
            try {
                const updatedUsers = JSON.parse(e.newValue);
                users = updatedUsers.filter(u => u.email !== 'kamil@socialsphere.com');
                // Sync currentUser.verified
                if (currentUser && currentUser.email) {
                    const matchedUser = users.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
                    if (matchedUser) {
                        const wasVerified = currentUser.verified;
                        currentUser.verified = matchedUser.verified || false;
                        if (wasVerified !== currentUser.verified) {
                            // Save updated currentUser and refresh UI
                            localStorage.setItem('socialsphere_current_user', JSON.stringify(currentUser));
                            updateUIForCurrentUser();
                            renderFeed();
                            renderSuggestedUsers();
                        }
                    }
                }
            } catch(err) {}
        }
    });

    // Initialize Lucide Icons
    lucide.createIcons();
};

function initApplication() {
    updateUIForCurrentUser();
    renderFeed();
    renderLiveOrbs();
    renderOrbits();
    renderChatList();
    renderActiveChat();
    renderNotifications();
    renderSuggestedUsers();
    updateUnreadBadges();
    initSettingsTab();
    renderProfileGrid('grid');
    loadMyNote();
    checkPendingUserWarnings();
    syncWithCentralServer();
    setInterval(syncWithCentralServer, 4000);
}

// Load states from database simulator
function loadState() {
    const savedUsers = localStorage.getItem('socialsphere_users_db');
    const savedUser = localStorage.getItem('socialsphere_current_user');
    const savedPosts = localStorage.getItem('socialsphere_posts');
    const savedChats = localStorage.getItem('socialsphere_chats');
    const savedNotifs = localStorage.getItem('socialsphere_notifications');
    const savedActiveChat = localStorage.getItem('socialsphere_active_chat');
    const savedTheme = localStorage.getItem('socialsphere_theme');
    const savedSavedIds = localStorage.getItem('socialsphere_saved_posts');
    const savedMyNote = localStorage.getItem('socialsphere_my_note');
    
    users = savedUsers ? JSON.parse(savedUsers) : SEED_USERS;
    if (!savedUsers) {
        localStorage.setItem('socialsphere_users_db', JSON.stringify(users));
    }

    // Purge legacy mock bot data from storage if present
    users = users.filter(u => u.email !== 'kamil@socialsphere.com');

    // Ensure owner account exists in users array and is verified
    let ownerUserInDb = users.find(u => u.email.toLowerCase() === 'owner@socialsphere.local' || (u.handle && u.handle.toLowerCase() === '@itzz_sigma03'));
    if (!ownerUserInDb) {
        ownerUserInDb = {
            email: 'owner@socialsphere.local',
            password: 'SS_Admin#Gabrys2026!',
            name: 'Gabrys Rojewski',
            handle: '@Itzz_Sigma03',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            bio: 'Właściciel i twórca platformy SocialSphere.',
            verified: true,
            isOwner: true,
            f2aEnabled: false,
            riddles: []
        };
        users.unshift(ownerUserInDb);
    } else {
        ownerUserInDb.verified = true;
        ownerUserInDb.isOwner = true;
    }
    
    users.forEach(u => {
        if (!Array.isArray(u.following)) u.following = [];
        if (!Array.isArray(u.followers)) u.followers = [];
    });
    
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        if (!Array.isArray(currentUser.following)) currentUser.following = [];
        if (!Array.isArray(currentUser.followers)) currentUser.followers = [];
        // Sync verified status from users array
        const matchedUser = users.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
        if (matchedUser) {
            currentUser.verified = matchedUser.verified || false;
            currentUser.isOwner = matchedUser.isOwner || false;
            currentUser.followers = matchedUser.followers || [];
            currentUser.following = matchedUser.following || [];
        }
    }

    // Force verified true for owner user session
    if (currentUser && (currentUser.email.toLowerCase() === 'owner@socialsphere.local' || currentUser.handle === '@Itzz_Sigma03' || currentUser.isOwner)) {
        currentUser.verified = true;
        currentUser.isOwner = true;
    }
    posts = savedPosts ? JSON.parse(savedPosts) : DEFAULT_POSTS;
    posts = posts.filter(p => p.id !== 'post-1' && p.id !== 'post-2');

    chats = savedChats ? JSON.parse(savedChats) : DEFAULT_CHATS;
    chats = chats.filter(c => c.id !== 'kamil-nowak' && c.id !== 'anna-nowak');

    notifications = savedNotifs ? JSON.parse(savedNotifs) : DEFAULT_NOTIFICATIONS;
    savedPostIds = savedSavedIds ? JSON.parse(savedSavedIds) : [];
    myNote = savedMyNote || '';
    
    if (savedActiveChat && chats.some(c => c.id === savedActiveChat)) {
        activeChatId = savedActiveChat;
    } else {
        activeChatId = 'social-support';
    }
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) themeIcon.setAttribute('data-lucide', 'moon');
    }

    saveState();
}

// --- CENTRAL NETWORK SERVER SYNC ---
let isCentralServerConnected = false;

// =====================================================================
// CENTRALNY SERWER RENDER.COM — używany przez APK, EXE i przeglądarkę
// Wszystkie platformy muszą synchronizować dane przez jeden serwer!
// =====================================================================
const CENTRAL_SERVER_URL = 'https://socialsphere.onrender.com';

function getServerApiBaseUrl() {
    // 1. Priorytet: adres ustawiony ręcznie przez użytkownika
    const customUrl = localStorage.getItem('socialsphere_custom_server_url');
    if (customUrl) return customUrl.replace(/\/$/, '');

    // 2. Jeśli strona działa na samym Render.com — używaj ścieżek względnych
    //    (np. https://socialsphere.onrender.com/ → '' bo /api/db działa lokalnie)
    if (window.location.hostname.includes('onrender.com') ||
        window.location.hostname.includes('socialsphere')) {
        return '';
    }

    // 3. EXE (localhost z portem), APK (file:), dowolny inny host →
    //    zawsze synchronizuj z centralnym serwerem Render.com
    return CENTRAL_SERVER_URL;
}

function promptSetCustomServerUrl() {
    const current = getServerApiBaseUrl() || 'https://socialsphere.onrender.com';
    const input = prompt('Wpisz adres serwera SocialSphere (np. https://socialsphere.onrender.com lub http://192.168.1.104:3000):', current);
    if (input !== null) {
        const trimmed = input.trim().replace(/\/$/, '');
        if (trimmed) {
            localStorage.setItem('socialsphere_custom_server_url', trimmed);
        } else {
            localStorage.removeItem('socialsphere_custom_server_url');
        }
        alert('Zapisano nowy adres serwera! Następuje synchronizacja...');
        syncWithCentralServer();
    }
}

function syncWithCentralServer() {
    const baseUrl = getServerApiBaseUrl();
    fetch(baseUrl + '/api/db')
        .then(res => res.json())
        .then(data => {
            if (data && data.users) {
                isCentralServerConnected = true;
                
                // Merge users from server while preserving currentUser session
                users = data.users;
                if (data.posts) posts = data.posts;
                if (data.chats) chats = data.chats;
                if (data.notifications) notifications = data.notifications;
                
                // Ensure arrays on users
                users.forEach(u => {
                    if (!Array.isArray(u.following)) u.following = [];
                    if (!Array.isArray(u.followers)) u.followers = [];
                });

                // Sync current user if logged in
                if (currentUser && currentUser.email) {
                    const matchedUser = users.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
                    if (matchedUser) {
                        currentUser.verified = matchedUser.verified || false;
                        currentUser.isOwner = matchedUser.isOwner || false;
                        currentUser.banned = matchedUser.banned || false;
                        currentUser.followers = matchedUser.followers || [];
                        currentUser.following = matchedUser.following || [];
                    }
                }
                
                saveStateLocal();
                
                // Refresh UI components
                if (currentTab === 'feed') renderFeed();
                if (currentTab === 'admin') renderAdminPanel();
                renderSuggestedUsers();
            }
        })
        .catch(err => {
            isCentralServerConnected = false;
        });

    // Fetch real client IP info
    fetch(baseUrl + '/api/info')
        .then(res => res.json())
        .then(info => {
            if (info && info.clientIp && currentUser && currentUser.email) {
                const userInDb = users.find(u => u.email === currentUser.email);
                if (userInDb && userInDb.lastIp !== info.clientIp) {
                    userInDb.lastIp = info.clientIp;
                    saveState();
                }
            }
        })
        .catch(() => {});
}

function saveStateLocal() {
    localStorage.setItem('socialsphere_users_db', JSON.stringify(users));
    localStorage.setItem('socialsphere_current_user', JSON.stringify(currentUser));
    localStorage.setItem('socialsphere_posts', JSON.stringify(posts));
    localStorage.setItem('socialsphere_chats', JSON.stringify(chats));
    localStorage.setItem('socialsphere_notifications', JSON.stringify(notifications));
    localStorage.setItem('socialsphere_active_chat', activeChatId);
    localStorage.setItem('socialsphere_saved_posts', JSON.stringify(savedPostIds));
    localStorage.setItem('socialsphere_my_note', myNote);
}

// Save states to database simulator & central server
function saveState() {
    saveStateLocal();

    const baseUrl = getServerApiBaseUrl();
    // Push to central server if connected
    fetch(baseUrl + '/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            users: users,
            posts: posts,
            chats: chats,
            notifications: notifications
        })
    }).catch(() => {});
}

// Updates HTML user profiles labels
function updateUIForCurrentUser() {
    const userAvatarEls = [
        document.getElementById('current-user-avatar'),
        document.getElementById('post-box-avatar'),
        document.getElementById('profile-avatar-big-img')
    ];
    
    userAvatarEls.forEach(el => {
        if (el) el.src = currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
    });

    // Nick (bez @) jako główny tytuł, imię i nazwisko jako podtytuł
    const cleanHandle = (currentUser.handle || '').replace(/^@/, '');
    const verifiedBadge = currentUser.verified
        ? `<span class="verified-badge" title="Konto zweryfikowane">${VERIFIED_STAR_SVG()}</span>`
        : '';

    // Sidebar: current-user-name = nick + gwiazdka, current-user-handle = imię i nazwisko
    const sidebarNameEl  = document.getElementById('current-user-name');
    const sidebarHandleEl = document.getElementById('current-user-handle');
    if (sidebarNameEl)   sidebarNameEl.innerHTML  = escapeHtml(cleanHandle) + verifiedBadge;
    if (sidebarHandleEl) sidebarHandleEl.innerText = currentUser.name || '';

    // Profile page: profile-display-name-text = nick + gwiazdka, profile-handle-tag-text = imię i nazwisko
    const profileNameEl   = document.getElementById('profile-display-name-text');
    const profileHandleEl = document.getElementById('profile-handle-tag-text');
    if (profileNameEl)   profileNameEl.innerHTML  = escapeHtml(cleanHandle) + verifiedBadge;
    if (profileHandleEl) profileHandleEl.innerText = currentUser.name || '';
    
    const bioEl = document.getElementById('profile-bio-text');
    if (bioEl) bioEl.innerText = currentUser.bio || 'Brak opisu profilu.';
    
    // Set edit profile inputs
    const editName = document.getElementById('edit-fullname');
    const editNick = document.getElementById('edit-nickname');
    const editBio  = document.getElementById('edit-bio');
    
    if (editName) editName.value = currentUser.name;
    if (editNick) editNick.value = cleanHandle;
    if (editBio)  editBio.value  = currentUser.bio || '';
    
    const isOwner = currentUser && (currentUser.isOwner || currentUser.email === 'owner@socialsphere.local' || currentUser.handle === '@Itzz_Sigma03');
    const adminNavBtn = document.getElementById('nav-admin-btn');
    if (adminNavBtn) {
        adminNavBtn.style.display = isOwner ? 'block' : 'none';
    }

    // Update real profile stats (post count, followers count, following count)
    if (!Array.isArray(currentUser.following)) currentUser.following = [];
    if (!Array.isArray(currentUser.followers)) currentUser.followers = [];

    const myPostCount = posts.filter(p => (p.author && p.author.handle === currentUser.handle) || (p.author && p.author.email === currentUser.email)).length;
    const followersCount = currentUser.followers.length;
    const followingCount = currentUser.following.length;

    const postCountEl = document.getElementById('profile-posts-count');
    if (postCountEl) postCountEl.innerText = myPostCount;

    const followersCountEl = document.getElementById('profile-followers-count');
    if (followersCountEl) followersCountEl.innerText = followersCount;

    const followingCountEl = document.getElementById('profile-following-count');
    if (followingCountEl) followingCountEl.innerText = followingCount;
}


// --- AUTHENTICATION REGISTRATION AND LOGIN (EMAIL/PASSWORD + 2FA) ---

function showLoginOverlay() {
    document.getElementById('login-overlay-screen').style.display = 'flex';
    showLoginForm(null);
}

function hideLoginOverlay() {
    document.getElementById('login-overlay-screen').style.display = 'none';
}

function showLoginForm(e) {
    if (e) e.preventDefault();
    document.getElementById('login-step-login').style.display = 'flex';
    document.getElementById('login-step-register').style.display = 'none';
    document.getElementById('login-step-2fa-verify').style.display = 'none';
    
    // Clear notifications inside overlay
    document.getElementById('login-error-msg').style.display = 'none';
    document.getElementById('login-success-msg').style.display = 'none';
}

function showRegisterForm(e) {
    if (e) e.preventDefault();
    document.getElementById('login-step-login').style.display = 'none';
    document.getElementById('login-step-register').style.display = 'flex';
    document.getElementById('login-step-2fa-verify').style.display = 'none';
    
    // Clear notifications inside overlay
    document.getElementById('register-error-msg').style.display = 'none';
}

function toggleRegister2FAFields(checkbox) {
    const fieldsBox = document.getElementById('register-2fa-fields-box');
    fieldsBox.style.display = checkbox.checked ? 'block' : 'none';
}

function triggerAvatarUpload() {
    document.getElementById('avatar-file-input').click();
}

function handleAvatarSelected(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        temporaryAvatarBase64 = e.target.result;
        
        const preview = document.getElementById('avatar-preview-element');
        const placeholder = document.getElementById('avatar-upload-placeholder-content');
        
        preview.src = temporaryAvatarBase64;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// Handle Registration Submit
function handleRegisterSubmit() {
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value.trim();
    const fullname = document.getElementById('register-fullname').value.trim();
    const nickname = document.getElementById('register-nickname').value.trim();
    const f2aToggle = document.getElementById('register-2fa-toggle').checked;
    
    const errorMsg = document.getElementById('register-error-msg');
    errorMsg.style.display = 'none';
    
    // Validations
    if (email === '' || password === '' || nickname === '') {
        errorMsg.innerText = 'Adres e-mail, hasło oraz nick są wymagane!';
        errorMsg.style.display = 'block';
        playBeep(250, 0.2);
        return;
    }
    
    if (password.length < 6) {
        errorMsg.innerText = 'Hasło musi zawierać co najmniej 6 znaków!';
        errorMsg.style.display = 'block';
        playBeep(250, 0.2);
        return;
    }
    
    if (nickname.includes(' ')) {
        errorMsg.innerText = 'Nick nie może zawierać spacji!';
        errorMsg.style.display = 'block';
        playBeep(250, 0.2);
        return;
    }
    
    // Check email uniqueness
    const emailExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
        errorMsg.innerText = 'Podany adres e-mail jest już zarejestrowany!';
        errorMsg.style.display = 'block';
        playBeep(250, 0.2);
        return;
    }
    
    // 2FA Setup validation
    let riddles = [];
    if (f2aToggle) {
        const q1 = document.getElementById('register-q1').value.trim();
        const a1 = document.getElementById('register-a1').value.trim();
        const q2 = document.getElementById('register-q2').value.trim();
        const a2 = document.getElementById('register-a2').value.trim();
        
        if (q1 === '' || a1 === '' || q2 === '' || a2 === '') {
            errorMsg.innerText = 'Gdy włączona jest weryfikacja 2FA, należy wypełnić obie zagadki i odpowiedzi!';
            errorMsg.style.display = 'block';
            playBeep(250, 0.2);
            return;
        }
        
        riddles = [
            { q: q1, a: a1 },
            { q: q2, a: a2 }
        ];
    }
    
    // Add user to local DB
    const newUser = {
        email: email,
        password: password,
        name: fullname || nickname,
        handle: nickname.startsWith('@') ? nickname : '@' + nickname,
        avatar: temporaryAvatarBase64 || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        bio: 'Witaj w mojej przestrzeni na SocialSphere! Jestem tu nowym użytkownikiem.',
        f2aEnabled: f2aToggle,
        riddles: riddles
    };
    
    users.push(newUser);
    saveState();
    
    // Clear registration fields
    document.getElementById('register-email').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-fullname').value = '';
    document.getElementById('register-nickname').value = '';
    document.getElementById('register-2fa-toggle').checked = false;
    toggleRegister2FAFields({ checked: false });
    temporaryAvatarBase64 = '';
    
    const preview = document.getElementById('avatar-preview-element');
    const placeholder = document.getElementById('avatar-upload-placeholder-content');
    preview.src = '';
    preview.style.display = 'none';
    placeholder.style.display = 'flex';
    
    // Redirect to login page with success notification
    showLoginForm(null);
    const loginSuccess = document.getElementById('login-success-msg');
    loginSuccess.innerText = 'Konto zarejestrowane! Zaloguj się teraz.';
    loginSuccess.style.display = 'block';
    
    playBeep(880, 0.1);
}

// Handle Login Submit
function handleLoginSubmit() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    
    const errorMsg = document.getElementById('login-error-msg');
    const successMsg = document.getElementById('login-success-msg');
    errorMsg.style.display = 'none';
    successMsg.style.display = 'none';
    
    if (email === '' || pass === '') {
        errorMsg.innerText = 'Wprowadź adres e-mail oraz hasło!';
        errorMsg.style.display = 'block';
        playBeep(250, 0.2);
        return;
    }
    
    // Lookup user
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.password !== pass) {
        errorMsg.innerText = 'Nieprawidłowy adres e-mail lub hasło!';
        errorMsg.style.display = 'block';
        playBeep(250, 0.2);
        return;
    }
    
    if (user.banned) {
        if (user.banUntil && Date.now() >= user.banUntil) {
            // TempBan expired! Auto unban
            user.banned = false;
            user.banUntil = null;
            user.banReason = null;
            saveState();
        } else {
            let banTimeInfo = 'Blokada jest trwała (Permanentny Ban).';
            if (user.banUntil) {
                const remMs = user.banUntil - Date.now();
                const h = Math.floor(remMs / (1000 * 60 * 60));
                const m = Math.floor((remMs % (1000 * 60 * 60)) / (1000 * 60));
                banTimeInfo = `Pozostały czas blokady: ${h} godz. ${m} min.`;
            }
            errorMsg.innerText = `🚫 Twój profil jest zablokowany. Powód: ${user.banReason || 'Złamanie regulaminu'}. ${banTimeInfo}`;
            errorMsg.style.display = 'block';
            playBeep(250, 0.2);
            return;
        }
    }

    // Record last IP & Device on successful login
    if (!user.lastIp) user.lastIp = `192.168.1.${100 + (users.indexOf(user) % 40)}`;
    user.lastDevice = navigator.userAgent.includes('Windows') ? 'Windows PC (Desktop)' : (navigator.userAgent.includes('Mobile') ? 'Smartphone (Mobile)' : 'Web Browser');
    saveState();
    
    // User credentials are correct, check 2FA status
    if (user.f2aEnabled) {
        tempLoginUser = user;
        
        // Show 2FA Verification Card
        document.getElementById('login-step-login').style.display = 'none';
        const verifyStep = document.getElementById('login-step-2fa-verify');
        verifyStep.style.display = 'flex';
        
        // Set labels
        document.getElementById('verify-q1-label').innerText = `Zagadka 1: ${user.riddles[0].q}`;
        document.getElementById('verify-q2-label').innerText = `Zagadka 2: ${user.riddles[1].q}`;
        
        // Clear old verify inputs
        document.getElementById('verify-a1-input').value = '';
        document.getElementById('verify-a2-input').value = '';
        document.getElementById('verify-2fa-error-msg').style.display = 'none';
        
        playBeep(660, 0.1);
    } else {
        // Log in directly
        completeUserLogin(user);
    }
}

// Complete login session and redirect to dashboard
function completeUserLogin(user) {
    currentUser = {
        email: user.email,
        name: user.name,
        handle: user.handle,
        avatar: user.avatar,
        bio: user.bio,
        verified: (user.isOwner || user.email === 'owner@socialsphere.local') ? true : (user.verified || false),
        isOwner: user.isOwner || user.email === 'owner@socialsphere.local' || false,
        f2aEnabled: user.f2aEnabled,
        riddles: user.riddles,
        isLoggedIn: true
    };
    
    // Load any pending announcement notifications sent by owner while user was offline
    const userInDb = users.find(u => u.email.toLowerCase() === user.email.toLowerCase());
    if (userInDb && Array.isArray(userInDb.pendingNotifications) && userInDb.pendingNotifications.length > 0) {
        userInDb.pendingNotifications.forEach(n => {
            if (!notifications.find(existing => existing.id === n.id)) {
                notifications.unshift(n);
            }
        });
        // Clear pending after loading
        userInDb.pendingNotifications = [];
    }

    saveState();
    hideLoginOverlay();
    initApplication();
    
    // Add quick login notification
    addNewNotification(`Witaj z powrotem, ${user.name}! Życzymy miłego dnia na SocialSphere.`, 'mention');
    playBeep(880, 0.1);
}

// Verify 2FA answers
function handle2FAVerifySubmit() {
    if (!tempLoginUser) return;
    
    const ans1 = document.getElementById('verify-a1-input').value.trim();
    const ans2 = document.getElementById('verify-a2-input').value.trim();
    const errorMsg = document.getElementById('verify-2fa-error-msg');
    
    errorMsg.style.display = 'none';
    
    const correctAns1 = tempLoginUser.riddles[0].a.toLowerCase();
    const correctAns2 = tempLoginUser.riddles[1].a.toLowerCase();
    
    if (ans1.toLowerCase() !== correctAns1 || ans2.toLowerCase() !== correctAns2) {
        errorMsg.innerText = 'Nieprawidłowa odpowiedź na zagadki bezpieczeństwa!';
        errorMsg.style.display = 'block';
        playBeep(250, 0.25);
        return;
    }
    
    // Success, login user
    const userToLog = tempLoginUser;
    tempLoginUser = null;
    completeUserLogin(userToLog);
}

function cancel2FAVerification() {
    tempLoginUser = null;
    showLoginForm(null);
}

// Simulated SSO triggers (creates accounts automatically or logs in directly)
function handleSSOLogin(provider) {
    const ssoEmail = `${provider.toLowerCase()}@socialsphere.com`;
    
    let user = users.find(u => u.email.toLowerCase() === ssoEmail.toLowerCase());
    
    if (!user) {
        // Create auto-provisioned SSO user
        user = {
            email: ssoEmail,
            password: 'sso_no_password',
            name: `${provider} User`,
            handle: `@${provider.toLowerCase()}_user`,
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            bio: `Połączono za pomocą konta ${provider}.`,
            f2aEnabled: false,
            riddles: []
        };
        users.push(user);
        saveState();
    }
    
    completeUserLogin(user);
}

function logoutCurrentUser() {
    const conf = confirm('Czy chcesz się wylogować z SocialSphere?');
    if (conf) {
        currentUser.isLoggedIn = false;
        saveState();
        window.location.reload();
    }
}


// --- SETTINGS SECURITIES LOGIC ---

function initSettingsTab() {
    const darkToggle = document.getElementById('settings-darkmode-toggle');
    if (darkToggle) {
        darkToggle.checked = !document.body.classList.contains('light-theme');
    }
    
    // Set 2FA configurations
    const f2aToggle = document.getElementById('settings-2fa-toggle');
    const fieldsBox = document.getElementById('settings-2fa-fields-box');
    
    if (f2aToggle) {
        f2aToggle.checked = currentUser.f2aEnabled;
        fieldsBox.style.display = currentUser.f2aEnabled ? 'block' : 'none';
    }
    
    // Pre-populate settings riddles
    if (currentUser.f2aEnabled && currentUser.riddles.length >= 2) {
        document.getElementById('settings-q1').value = currentUser.riddles[0].q;
        document.getElementById('settings-a1').value = currentUser.riddles[0].a;
        document.getElementById('settings-q2').value = currentUser.riddles[1].q;
        document.getElementById('settings-a2').value = currentUser.riddles[1].a;
    } else {
        document.getElementById('settings-q1').value = '';
        document.getElementById('settings-a1').value = '';
        document.getElementById('settings-q2').value = '';
        document.getElementById('settings-a2').value = '';
    }
    
    // Clear old pass fields
    document.getElementById('settings-old-pass').value = '';
    document.getElementById('settings-new-pass').value = '';
}

function toggleSettings2FAFields(checkbox) {
    document.getElementById('settings-2fa-fields-box').style.display = checkbox.checked ? 'block' : 'none';
}

function saveSecuritySettings() {
    const f2aToggle = document.getElementById('settings-2fa-toggle').checked;
    
    // 1. Password change logic
    const oldPass = document.getElementById('settings-old-pass').value.trim();
    const newPass = document.getElementById('settings-new-pass').value.trim();
    
    let dbUser = users.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
    if (!dbUser) return;
    
    if (oldPass !== '' || newPass !== '') {
        if (oldPass === '' || newPass === '') {
            alert('W celu zmiany hasła wprowadź zarówno stare, jak i nowe hasło!');
            return;
        }
        
        if (dbUser.password !== oldPass) {
            alert('Wprowadzone dotychczasowe hasło jest niepoprawne!');
            return;
        }
        
        if (newPass.length < 6) {
            alert('Nowe hasło musi zawierać minimum 6 znaków!');
            return;
        }
        
        dbUser.password = newPass;
        currentUser.password = newPass;
        alert('Hasło do konta zostało pomyślnie zmienione.');
        
        document.getElementById('settings-old-pass').value = '';
        document.getElementById('settings-new-pass').value = '';
    }
    
    // 2. 2FA configuration logic
    let riddles = [];
    if (f2aToggle) {
        const q1 = document.getElementById('settings-q1').value.trim();
        const a1 = document.getElementById('settings-a1').value.trim();
        const q2 = document.getElementById('settings-q2').value.trim();
        const a2 = document.getElementById('settings-a2').value.trim();
        
        if (q1 === '' || a1 === '' || q2 === '' || a2 === '') {
            alert('Aby włączyć 2FA, należy podać oba pytania i odpowiedzi pomocnicze!');
            return;
        }
        
        riddles = [
            { q: q1, a: a1 },
            { q: q2, a: a2 }
        ];
    }
    
    // Update dbUser & currentUser state
    dbUser.f2aEnabled = f2aToggle;
    dbUser.riddles = riddles;
    
    currentUser.f2aEnabled = f2aToggle;
    currentUser.riddles = riddles;
    
    saveState();
    initSettingsTab();
    
    alert('Ustawienia zabezpieczeń konta (2FA) zostały zaktualizowane.');
}


// --- DYNAMIC VIEW TABS SWITCHING ---

function switchTab(tab) {
    currentTab = tab;
    
    const tabs = {
        feed: { contentId: 'feed-tab-content', navId: 'nav-feed-btn', mobileId: 'mobile-nav-feed' },
        orbits: { contentId: 'orbits-tab-content', navId: 'nav-orbits-btn', mobileId: 'mobile-nav-orbits' },
        chat: { contentId: 'chat-tab-content', navId: 'nav-chat-btn', mobileId: 'mobile-nav-chat' },
        profile: { contentId: 'profile-tab-content', navId: 'nav-profile-btn', mobileId: 'mobile-nav-profile' },
        settings: { contentId: 'settings-tab-content', navId: 'nav-settings-btn', mobileId: 'mobile-nav-settings' },
        admin: { contentId: 'admin-tab-content', navId: 'nav-admin-btn', mobileId: '' }
    };
    
    Object.values(tabs).forEach(t => {
        const contentEl = document.getElementById(t.contentId);
        const navEl = document.getElementById(t.navId);
        const mobEl = document.getElementById(t.mobileId);
        
        if (contentEl) contentEl.style.display = 'none';
        if (navEl) navEl.classList.remove('active');
        if (mobEl && mobEl.classList) mobEl.classList.remove('active');
    });
    
    const activeTab = tabs[tab];
    if (activeTab) {
        const contentEl = document.getElementById(activeTab.contentId);
        const navEl = document.getElementById(activeTab.navId);
        const mobEl = document.getElementById(activeTab.mobileId);
        
        if (tab === 'chat') {
            if (contentEl) contentEl.style.display = 'grid';
            setTimeout(scrollToBottom, 50);
        } else {
            if (contentEl) contentEl.style.display = 'block';
        }
        
        if (navEl) navEl.classList.add('active');
        if (mobEl && mobEl.classList) mobEl.classList.add('active');
    }
    
    const rightSidebar = document.getElementById('app-right-sidebar');
    if (rightSidebar) {
        rightSidebar.style.display = tab === 'feed' ? 'block' : 'none';
    }
    
    if (tab === 'profile') {
        updateUIForCurrentUser();
        renderProfileGrid('grid');
    } else if (tab === 'settings') {
        initSettingsTab();
    } else if (tab === 'orbits') {
        renderOrbits();
    } else if (tab === 'admin') {
        renderAdminPanel();
    }
    
    // Close more popover on tab switch
    closeMorePopover();
}

// --- UTILITY HELPERS ---

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function VERIFIED_STAR_SVG(size) {
    // Jeśli podano stały rozmiar użyj go, w przeciwnym razie skaluj przez CSS (100%)
    const w = size ? size : '100%';
    const h = size ? size : '100%';
    return `<svg width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#ff6600" stroke="none"/>
        <polyline points="8.5,12 11,14.5 15.5,10" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`;
}

function getVerifiedBadgeForUser(email, size = 14) {
    const user = users.find(u => u.email === email || u.handle === email);
    if (user && user.verified) {
        return `<span class="verified-badge" title="Konto zweryfikowane">${VERIFIED_STAR_SVG(size)}</span>`;
    }
    return '';
}


// --- POST FEED LOGIC ---

function renderFeed(postsArray = posts) {
    const feedContainer = document.getElementById('posts-feed');
    feedContainer.innerHTML = '';
    
    if (postsArray.length === 0) {
        feedContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-gray);">
                <i data-lucide="info" style="width: 48px; height: 48px; margin-bottom: 12px; color: var(--orange-primary);"></i>
                <p>Nie znaleziono żadnych postów w tej sferze.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    postsArray.forEach(post => {
        const card = document.createElement('article');
        card.className = 'post-card';
        card.id = `post-card-${post.id}`;
        
        let imageHtml = '';
        if (post.image) {
            imageHtml = `
                <div class="post-image-wrapper">
                    <img src="${post.image}" alt="Post Image" class="post-image">
                </div>
            `;
        }
        
        const likeActive = post.likedByUser ? 'active-like' : '';
        
        let commentsHtml = '';
        post.comments.forEach(comment => {
            let avatar = comment.avatar;
            if (!avatar) {
                if (comment.author === currentUser.name) {
                    avatar = currentUser.avatar;
                } else {
                    const foundUser = users.find(u => u.name === comment.author);
                    avatar = foundUser ? foundUser.avatar : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80';
                }
            }
            
            commentsHtml += `
                <div class="comment-item">
                    <img src="${avatar}" alt="Commenter Avatar" class="comment-avatar">
                    <div class="comment-content-box">
                        <span class="comment-author-name">${escapeHtml(comment.author)}</span>
                        <p class="comment-text">${escapeHtml(comment.text)}</p>
                    </div>
                </div>
            `;
        });
        
        const postCleanHandle = (post.author.handle || '').replace(/^@/, '');
        const postVerifiedBadge = getVerifiedBadgeForUser(post.author.handle);
        card.innerHTML = `
            <div class="post-header">
                <div class="post-author-info">
                    <img src="${post.author.avatar}" alt="Avatar" class="post-author-avatar">
                    <div class="post-meta">
                        <span class="post-author-name">${escapeHtml(postCleanHandle)}${postVerifiedBadge}</span>
                        <span class="post-time">
                            <span style="font-size:11px;color:var(--text-muted);">${escapeHtml(post.author.name)}</span>
                            &nbsp;·&nbsp;<i data-lucide="clock" style="width:12px;height:12px;"></i>
                            ${post.time}
                        </span>
                    </div>
                </div>
                <button class="post-more-btn" onclick="deletePostOption('${post.id}')">
                    <i data-lucide="more-horizontal"></i>
                </button>
            </div>
            
            <div class="post-content">${post.content}</div>
            
            ${imageHtml}
            
            <div class="post-footer-stats">
                <div class="stats-left">
                    <div class="stat-item-info">
                        <i data-lucide="heart" style="width: 14px; height: 14px; color: var(--orange-primary); fill: ${post.likedByUser ? 'var(--orange-primary)' : 'transparent'}"></i>
                        <span id="likes-count-${post.id}">${post.likes} polubień</span>
                    </div>
                </div>
                <div class="stats-right">
                    <div class="stat-item-info">
                        <span id="comments-count-${post.id}">${post.comments.length} komentarzy</span>
                    </div>
                    <button class="post-bookmark-btn ${savedPostIds.includes(post.id) ? 'saved' : ''}" onclick="toggleBookmark('${post.id}')" title="Zapisz post" id="bookmark-btn-${post.id}">
                        <i data-lucide="bookmark" style="width:16px;height:16px;${savedPostIds.includes(post.id) ? 'fill:var(--orange-primary)' : ''}"></i>
                    </button>
                </div>
            </div>
            
            <div class="post-actions">
                <button class="action-trigger ${likeActive}" onclick="likePost('${post.id}')">
                    <i data-lucide="heart"></i>
                    <span>Polub</span>
                </button>
                <button class="action-trigger" onclick="toggleComments('${post.id}')">
                    <i data-lucide="message-square"></i>
                    <span>Komentarze</span>
                </button>
                <button class="action-trigger" onclick="sharePost('${post.id}')">
                    <i data-lucide="share-2"></i>
                    <span>Udostępnij</span>
                </button>
            </div>
            
            <div class="post-comments-container" id="comments-container-${post.id}">
                <div class="comments-list" id="comments-list-${post.id}">
                    ${commentsHtml}
                </div>
                
                <div class="comment-input-box">
                    <input type="text" placeholder="Dodaj komentarz..." class="comment-input" id="comment-input-${post.id}" onkeypress="handleCommentKeyPress(event, '${post.id}')">
                    <button class="comment-send-btn" onclick="addNewComment('${post.id}')">
                        <i data-lucide="send" style="width:14px;height:14px;"></i>
                    </button>
                </div>
            </div>
        `;
        
        feedContainer.appendChild(card);
    });
    
    lucide.createIcons();
}

function addNewPost() {
    const textarea = document.getElementById('post-text-input');
    const text = textarea.value.trim();
    
    if (text === '' && selectedPostImageUrl === null) {
        alert('Napisz treść posta lub dołącz zdjęcie przed publikacją!');
        return;
    }
    
    const newPost = {
        id: 'post-' + Date.now(),
        author: {
            name: currentUser.name,
            avatar: currentUser.avatar,
            handle: currentUser.handle
        },
        time: 'Przed chwilą',
        content: text,
        image: selectedPostImageUrl,
        likes: 0,
        likedByUser: false,
        comments: []
    };
    
    posts.unshift(newPost);
    saveState();
    renderFeed();
    
    textarea.value = '';
    clearSelectedImage();
    
    const postCountEl = document.getElementById('profile-posts-count');
    if (postCountEl) {
        postCountEl.innerText = posts.filter(p => p.author.handle === currentUser.handle).length;
    }
}

function deletePostOption(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    if (post.author.handle === currentUser.handle) {
        const conf = confirm('Czy na pewno chcesz usunąć ten post?');
        if (conf) {
            posts = posts.filter(p => p.id !== postId);
            saveState();
            renderFeed();
        }
    } else {
        alert('Możesz usuwać tylko własne posty!');
    }
}

function likePost(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    post.likedByUser = !post.likedByUser;
    post.likes = post.likedByUser ? post.likes + 1 : post.likes - 1;
    
    saveState();
    
    const likesLabel = document.getElementById(`likes-count-${postId}`);
    const actionBtn = document.querySelector(`#post-card-${postId} .action-trigger:first-child`);
    
    if (likesLabel && actionBtn) {
        likesLabel.innerText = `${post.likes} polubień`;
        if (post.likedByUser) {
            actionBtn.classList.add('active-like');
            const heartIcon = actionBtn.querySelector('i');
            if (heartIcon) {
                heartIcon.style.fill = 'var(--orange-primary)';
                heartIcon.classList.add('pulse');
                setTimeout(() => heartIcon.classList.remove('pulse'), 300);
            }
        } else {
            actionBtn.classList.remove('active-like');
            const heartIcon = actionBtn.querySelector('i');
            if (heartIcon) heartIcon.style.fill = 'transparent';
        }
    }
}

function toggleComments(postId) {
    const commentsContainer = document.getElementById(`comments-container-${postId}`);
    if (!commentsContainer) return;
    
    const isVisible = commentsContainer.style.display === 'block';
    commentsContainer.style.display = isVisible ? 'none' : 'block';
}

function handleCommentKeyPress(event, postId) {
    if (event.key === 'Enter') {
        addNewComment(postId);
    }
}

function addNewComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    if (!input) return;
    const text = input.value.trim();
    if (text === '') return;
    
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    const newComment = {
        author: currentUser.name,
        avatar: currentUser.avatar,
        text: text
    };
    
    post.comments.push(newComment);
    saveState();
    
    const commentsList = document.getElementById(`comments-list-${postId}`);
    if (commentsList) {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-item';
        commentDiv.innerHTML = `
            <img src="${newComment.avatar}" alt="Commenter Avatar" class="comment-avatar">
            <div class="comment-content-box">
                <span class="comment-author-name">${newComment.author}</span>
                <p class="comment-text">${newComment.text}</p>
            </div>
        `;
        commentsList.appendChild(commentDiv);
        commentsList.scrollTop = commentsList.scrollHeight;
    }
    
    const commentCountLabel = document.getElementById(`comments-count-${postId}`);
    if (commentCountLabel) {
        commentCountLabel.innerText = `${post.comments.length} komentarzy`;
    }
    
    input.value = '';
}

function insertEmoji(emoji) {
    const textarea = document.getElementById('post-text-input');
    textarea.value += emoji;
    textarea.focus();
}

function sharePost(postId) {
    navigator.clipboard.writeText(`https://socialsphere.com/posts/${postId}`).then(() => {
        alert('Skopiowano link do posta do schowka!');
    }).catch(() => {
        alert(`Udostępniono post ${postId} w Twojej sferze!`);
    });
}

function openImageSelector() {
    document.getElementById('image-selector-modal').style.display = 'flex';
}

function closeImageSelector() {
    document.getElementById('image-selector-modal').style.display = 'none';
    temporarySelectedImageUrl = null;
    document.querySelectorAll('.image-grid-option').forEach(el => el.classList.remove('selected'));
}

function selectImageOption(url, element) {
    temporarySelectedImageUrl = url;
    document.querySelectorAll('.image-grid-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
}

function confirmImageSelection() {
    if (temporarySelectedImageUrl) {
        selectedPostImageUrl = temporarySelectedImageUrl;
        const previewContainer = document.getElementById('post-preview-container');
        const previewImg = document.getElementById('post-preview-img');
        
        previewImg.src = selectedPostImageUrl;
        previewContainer.style.display = 'block';
    }
    closeImageSelector();
}

function clearSelectedImage() {
    selectedPostImageUrl = null;
    const previewContainer = document.getElementById('post-preview-container');
    const previewImg = document.getElementById('post-preview-img');
    previewImg.src = '';
    previewContainer.style.display = 'none';
}


// --- EDIT PROFILE LOGIC ---

let editAvatarBase64 = '';

function handleEditAvatarSelected(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        editAvatarBase64 = e.target.result;
    };
    reader.readAsDataURL(file);
}

function saveProfileChanges() {
    const nameVal = document.getElementById('edit-fullname').value.trim();
    const nickVal = document.getElementById('edit-nickname').value.trim();
    const bioVal = document.getElementById('edit-bio').value.trim();
    
    if (nickVal === '') {
        alert('Nick nie może być pusty!');
        return;
    }
    
    const newHandle = nickVal.startsWith('@') ? nickVal : '@' + nickVal;
    
    // Find user in db and update credentials
    let dbUser = users.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
    if (dbUser) {
        dbUser.name = nameVal || 'Nieznajomy';
        dbUser.handle = newHandle;
        dbUser.bio = bioVal;
        if (editAvatarBase64) {
            dbUser.avatar = editAvatarBase64;
        }
    }
    
    // Sync current session state
    currentUser.name = nameVal || 'Nieznajomy';
    currentUser.handle = newHandle;
    currentUser.bio = bioVal;
    if (editAvatarBase64) {
        currentUser.avatar = editAvatarBase64;
    }
    
    // Updates existing posts author labels inside DOM
    posts.forEach(p => {
        if (p.author.email === currentUser.email || p.author.handle === currentUser.handle) {
            p.author.name = currentUser.name;
            p.author.avatar = currentUser.avatar;
        }
    });
    
    saveState();
    updateUIForCurrentUser();
    renderFeed();
    
    alert('Zapisano zmiany w profilu!');
    
    document.getElementById('edit-avatar-file').value = '';
    editAvatarBase64 = '';
}


// --- NOTIFICATIONS SYSTEM ---

function toggleNotificationsDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('notifications-dropdown-menu');
    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';
}

function renderNotifications() {
    const container = document.getElementById('notifications-list-container');
    container.innerHTML = '';
    
    if (notifications.length === 0) {
        container.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 12px;">
                Brak nowych powiadomień.
            </div>
        `;
        return;
    }
    
    notifications.forEach(n => {
        const item = document.createElement('div');
        item.className = 'notification-item';
        if (!n.read) item.style.backgroundColor = 'rgba(255, 102, 0, 0.03)';
        
        let iconType = 'info';
        if (n.type === 'like') iconType = 'heart';
        else if (n.type === 'comment') iconType = 'message-square';
        else if (n.type === 'mention') iconType = 'at-sign';
        
        item.innerHTML = `
            <div class="notification-icon-wrap">
                <i data-lucide="${iconType}" style="width: 16px; height: 16px;"></i>
            </div>
            <div class="notification-text-wrap">
                <span class="notification-msg">${n.text}</span>
                <span class="notification-time-ago">${n.time}</span>
            </div>
        `;
        
        item.onclick = () => markAsRead(n.id);
        container.appendChild(item);
    });
    
    lucide.createIcons();
    updateUnreadNotificationsBadge();
}

function markAsRead(notifId) {
    const notif = notifications.find(n => n.id === notifId);
    if (notif) {
        notif.read = true;
        saveState();
        renderNotifications();
    }
}

function markAllNotificationsRead(event) {
    event.preventDefault();
    notifications.forEach(n => n.read = true);
    saveState();
    renderNotifications();
}

function updateUnreadNotificationsBadge() {
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notif-badge-count');
    if (badge) {
        if (unreadCount > 0) {
            badge.innerText = unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

function addNewNotification(text, type = 'info') {
    const newNotif = {
        id: 'notif-' + Date.now(),
        type: type,
        text: text,
        time: 'Przed chwilą',
        read: false
    };
    notifications.unshift(newNotif);
    saveState();
    renderNotifications();
    
    const msgSoundsOn = document.getElementById('settings-msg-sounds-toggle') ? document.getElementById('settings-msg-sounds-toggle').checked : true;
    if (msgSoundsOn) {
        playBeep(600, 0.1);
    }
}


// --- CONFIGURATIONS & THEMES LOGIC ---

function handleSettingsThemeToggle(checkbox) {
    const lightThemeActive = !checkbox.checked;
    const themeIcon = document.getElementById('theme-icon');
    
    if (lightThemeActive) {
        document.body.classList.add('light-theme');
        localStorage.setItem('socialsphere_theme', 'light');
        if (themeIcon) themeIcon.setAttribute('data-lucide', 'moon');
    } else {
        document.body.classList.remove('light-theme');
        localStorage.setItem('socialsphere_theme', 'dark');
        if (themeIcon) themeIcon.setAttribute('data-lucide', 'sun');
    }
    
    lucide.createIcons();
}

function toggleTheme() {
    const darkToggle = document.getElementById('settings-darkmode-toggle');
    if (darkToggle) {
        darkToggle.checked = !darkToggle.checked;
        handleSettingsThemeToggle(darkToggle);
    } else {
        const bodyClass = document.body.classList;
        const themeIcon = document.getElementById('theme-icon');
        if (bodyClass.contains('light-theme')) {
            bodyClass.remove('light-theme');
            localStorage.setItem('socialsphere_theme', 'dark');
            if (themeIcon) themeIcon.setAttribute('data-lucide', 'sun');
        } else {
            bodyClass.add('light-theme');
            localStorage.setItem('socialsphere_theme', 'light');
            if (themeIcon) themeIcon.setAttribute('data-lucide', 'moon');
        }
        lucide.createIcons();
    }
}

function resetAllAppData() {
    const conf = confirm('Czy na pewno chcesz zresetować całą bazę danych SocialSphere? Spowoduje to utratę wszystkich kont i postów.');
    if (conf) {
        localStorage.clear();
        window.location.reload();
    }
}


// --- CHAT LOGIC ---

function renderChatList() {
    const officialContainer = document.getElementById('official-channels-container');
    const directContainer = document.getElementById('direct-chats-container');
    
    officialContainer.innerHTML = '';
    directContainer.innerHTML = '';
    
    chats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `chat-list-item ${chat.id === activeChatId ? 'active' : ''}`;
        item.onclick = () => selectChat(chat.id);
        
        let avatarMarkup = '';
        if (chat.type === 'channel') {
            avatarMarkup = `
                <div class="chat-avatar-wrapper">
                    <img src="${chat.avatar}" alt="Channel Avatar" class="chat-list-avatar">
                </div>
            `;
        } else {
            const statusClass = chat.status === 'online' ? '' : 'offline';
            avatarMarkup = `
                <div class="chat-avatar-wrapper">
                    <img src="${chat.avatar}" alt="User Avatar" class="chat-list-avatar">
                    <span class="status-dot ${statusClass}"></span>
                </div>
            `;
        }
        
        const lastMsg = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : { text: 'Brak wiadomości', time: '' };
        const displayLastMsg = lastMsg.sender === 'user' ? `Ty: ${lastMsg.text}` : lastMsg.text;
        
        const badgeMarkup = chat.unreadCount > 0 ? `<span class="unread-badge">${chat.unreadCount}</span>` : '';
        const officialBadge = chat.official ? `<span class="official-badge">Oficjalny</span>` : '';
        
        item.innerHTML = `
            ${avatarMarkup}
            <div class="chat-list-info">
                <div class="chat-list-meta">
                    <span class="chat-list-name">${chat.name} ${officialBadge}</span>
                    <span class="chat-list-time">${lastMsg.time}</span>
                </div>
                <div class="chat-list-preview" style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayLastMsg}</span>
                    ${badgeMarkup}
                </div>
            </div>
        `;
        
        if (chat.type === 'channel') {
            officialContainer.appendChild(item);
        } else {
            directContainer.appendChild(item);
        }
    });
}

function selectChat(chatId) {
    activeChatId = chatId;
    
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
        chat.unreadCount = 0;
    }
    
    saveState();
    renderChatList();
    renderActiveChat();
    updateUnreadBadges();
    
    if (window.innerWidth <= 768) {
        const chatContainer = document.querySelector('.chat-tab-container');
        chatContainer.classList.add('active-chat-open');
    }
}

function renderActiveChat() {
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) return;
    
    const headerAvatar = document.getElementById('chat-header-avatar-img');
    const headerName = document.getElementById('chat-header-display-name');
    const headerStatus = document.getElementById('chat-header-status-text');
    
    headerAvatar.src = chat.avatar;
    headerName.innerHTML = chat.name + (chat.official ? ' <span class="official-badge">Oficjalny</span>' : '');
    
    if (chat.type === 'channel') {
        headerStatus.innerText = 'Oficjalny kanał platformy';
        headerStatus.classList.add('offline');
    } else {
        if (chat.status === 'online') {
            headerStatus.innerText = 'Online';
            headerStatus.classList.remove('offline');
        } else {
            headerStatus.innerText = 'Offline';
            headerStatus.classList.add('offline');
        }
    }

    // --- Announcements channel: lock for non-owners ---
    const normalInput = document.getElementById('chat-input-normal');
    const lockedInput = document.getElementById('chat-input-locked');
    const ownerBar = document.getElementById('announcement-owner-bar');
    const isAnnouncementChannel = chat.id === 'global-announcements';
    const isOwner = currentUser && currentUser.isOwner;

    if (isAnnouncementChannel) {
        if (isOwner) {
            if (normalInput) normalInput.style.display = 'block';
            if (lockedInput) lockedInput.style.display = 'none';
            if (ownerBar) ownerBar.style.display = 'flex';
            const inp = document.getElementById('chat-message-text-input');
            if (inp) inp.placeholder = '📢 Napisz ogłoszenie do wszystkich...';
            const sendBtn = document.getElementById('chat-send-btn-main');
            if (sendBtn) {
                sendBtn.style.background = 'linear-gradient(135deg, #ff6a00, #ff9500)';
                sendBtn.title = 'Wyślij ogłoszenie do wszystkich';
            }
        } else {
            if (normalInput) normalInput.style.display = 'none';
            if (lockedInput) lockedInput.style.display = 'flex';
        }
    } else {
        if (normalInput) normalInput.style.display = 'block';
        if (lockedInput) lockedInput.style.display = 'none';
        if (ownerBar) ownerBar.style.display = 'none';
        const inp = document.getElementById('chat-message-text-input');
        if (inp) inp.placeholder = 'Napisz wiadomość...';
        const sendBtn = document.getElementById('chat-send-btn-main');
        if (sendBtn) {
            sendBtn.style.background = '';
            sendBtn.title = '';
        }
    }

    if (lucide) lucide.createIcons();
    
    const scrollArea = document.getElementById('chat-messages-scroll-area');
    scrollArea.innerHTML = '';
    
    if (chat.messages.length === 0) {
        scrollArea.innerHTML = `
            <div style="margin: auto; text-align: center; color: var(--text-muted); font-size: 13px;">
                <p>Brak wiadomości. Przywitaj się jako pierwszy!</p>
            </div>
        `;
    } else {
        chat.messages.forEach(msg => {
            const wrap = document.createElement('div');
            wrap.className = `message-wrapper ${msg.sender === 'user' ? 'sent' : 'received'}`;

            const isAnnouncement = msg.isAnnouncement;
            wrap.innerHTML = `
                <div class="message-bubble" style="${isAnnouncement ? 'background:linear-gradient(135deg,rgba(255,106,0,0.18),rgba(255,149,0,0.10));border-left:3px solid var(--orange-primary);' : ''}">
                    ${isAnnouncement ? '<span style="font-size:11px;font-weight:700;color:var(--orange-primary);display:block;margin-bottom:4px;">📢 OGŁOSZENIE PLATFORMY</span>' : ''}
                    ${msg.text}
                </div>
                <span class="message-meta">${msg.time}</span>
            `;
            scrollArea.appendChild(wrap);
        });
    }
    
    setTimeout(scrollToBottom, 50);
}

function scrollToBottom() {
    const scrollArea = document.getElementById('chat-messages-scroll-area');
    if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
    }
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

function sendChatMessage() {
    const input = document.getElementById('chat-message-text-input');
    const text = input.value.trim();
    if (text === '') return;
    
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) return;

    // Block non-owners from writing to announcements channel
    if (chat.id === 'global-announcements' && !(currentUser && currentUser.isOwner)) {
        return;
    }
    
    const timeNow = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    const isAnnouncement = (chat.id === 'global-announcements' && currentUser && currentUser.isOwner);

    const newMsg = {
        id: 'msg-' + Date.now(),
        sender: isAnnouncement ? 'other' : 'user',
        text: text,
        time: timeNow,
        isAnnouncement: isAnnouncement || false
    };
    
    chat.messages.push(newMsg);

    // If owner sends announcement — push a platform notification to every registered user
    if (isAnnouncement) {
        const announcementNotif = {
            id: 'annc-' + Date.now(),
            type: 'announcement',
            text: '📢 Nowe ogłoszenie od Właściciela: ' + text,
            time: timeNow,
            read: false
        };
        // Add to current session notifications
        notifications.unshift(announcementNotif);

        // Also store in each user's pendingNotifications so when they login they see it
        users.forEach(u => {
            if (!Array.isArray(u.pendingNotifications)) u.pendingNotifications = [];
            u.pendingNotifications.unshift({
                id: 'annc-' + Date.now() + '-' + Math.random().toString(36).slice(2),
                type: 'announcement',
                text: '📢 Ogłoszenie od Właściciela SocialSphere: ' + text,
                time: timeNow,
                read: false
            });
        });

        // Also increment unread on the announcements chat for non-owner sessions
        chat.unreadCount = (chat.unreadCount || 0) + 1;

        renderNotifications();
        updateUnreadBadges();
    }

    saveState();
    input.value = '';
    
    renderActiveChat();
    renderChatList();
    
    if (!isAnnouncement) {
        simulateBotResponse(chat.id, text);
    }
}

function insertChatEmoji(emoji) {
    const input = document.getElementById('chat-message-text-input');
    input.value += emoji;
    input.focus();
}

function simulateBotResponse(chatId, userMessageText) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    let replyText = '';
    const cleanMsg = userMessageText.toLowerCase();
    
    if (chat.type === 'channel') {
        if (cleanMsg.includes('hej') || cleanMsg.includes('witaj') || cleanMsg.includes('cześć')) {
            replyText = 'Witaj! Jestem zautomatyzowanym asystentem SocialSphere. Jak mogę Ci dzisiaj pomóc?';
        } else if (cleanMsg.includes('pomoc') || cleanMsg.includes('błąd') || cleanMsg.includes('awaria')) {
            replyText = 'Jeśli napotkałeś problem techniczny, prześlij nam szczegóły. Nasz dział techniczny przyjrzy się temu!';
        } else if (cleanMsg.includes('sugestie') || cleanMsg.includes('pomysł')) {
            replyText = 'Dziękujemy za pomysł! Planujemy dodać konfigurację kolorów akcentów w wersji 1.1!';
        } else {
            replyText = 'Dziękujemy za wiadomość! Twoje zgłoszenie zostało zarejestrowane. Nasz moderator odezwie się wkrótce w razie pytań.';
        }
    } else {
        if (cleanMsg.includes('led') || cleanMsg.includes('zestaw') || cleanMsg.includes('link')) {
            replyText = 'Pewnie! Link: https://allegro.pl/oferta/tasma-led-warm-orange-glow. Naprawdę świetne diody z płynną regulacją.';
        } else if (cleanMsg.includes('hej') || cleanMsg.includes('co tam') || cleanMsg.includes('cześć')) {
            replyText = `Hejka! Co tam słychać? Ja właśnie dopasowuję style do nowego projektu.`;
        } else if (cleanMsg.includes('design') || cleanMsg.includes('wygląd') || cleanMsg.includes('styl')) {
            replyText = 'Prawda? Czarny, biały i ten wyrazisty pomarańczowy dają mega kontrast. Wygląda to unikalnie i bardzo profesjonalnie.';
        } else {
            replyText = 'Fajnie! Zgadajmy się później na Discordzie albo napisz na czacie, muszę dokończyć ten kawałek kodu.';
        }
    }
    
    setTimeout(() => {
        const timeNow = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
        chat.messages.push({
            id: 'msg-bot-' + Date.now(),
            sender: 'other',
            text: replyText,
            time: timeNow
        });
        
        if (activeChatId !== chatId) {
            chat.unreadCount++;
            addNewNotification(`Nowa wiadomość od ${chat.name}`, 'mention');
        } else {
            const msgSoundsOn = document.getElementById('settings-msg-sounds-toggle') ? document.getElementById('settings-msg-sounds-toggle').checked : true;
            if (msgSoundsOn) {
                playBeep(450, 0.1);
            }
        }
        
        saveState();
        updateUnreadBadges();
        
        if (activeChatId === chatId) {
            renderActiveChat();
        }
        renderChatList();
    }, 1500);
}

function filterChats(query = '') {
    const searchVal = query !== '' ? query : document.getElementById('chat-search-input').value.toLowerCase();
    const chatItems = document.querySelectorAll('.chat-list-panel .chat-list-item');
    
    chats.forEach((chat, index) => {
        const DOMItem = chatItems[index];
        if (!DOMItem) return;
        
        if (chat.name.toLowerCase().includes(searchVal)) {
            DOMItem.style.display = 'flex';
        } else {
            DOMItem.style.display = 'none';
        }
    });
}

function updateUnreadBadges() {
    const totalUnread = chats.reduce((acc, chat) => acc + chat.unreadCount, 0);
    const badge = document.getElementById('chat-badge-count');
    if (badge) {
        if (totalUnread > 0) {
            badge.innerText = totalUnread;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

function closeChatMobile() {
    const chatContainer = document.querySelector('.chat-tab-container');
    chatContainer.classList.remove('active-chat-open');
}


// --- WEB AUDIO API PHONE CALL SIMULATOR ---

function playBeep(freq, duration) {
    try {
        const tempCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = tempCtx.createOscillator();
        const gain = tempCtx.createGain();
        
        osc.connect(gain);
        gain.connect(tempCtx.destination);
        
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, tempCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, tempCtx.currentTime + duration);
        
        osc.start();
        osc.stop(tempCtx.currentTime + duration);
    } catch(e) {}
}

function triggerCallSimulation(type) {
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat) return;
    
    const avatar = document.getElementById('call-contact-avatar-img');
    const name = document.getElementById('call-contact-name-label');
    const status = document.getElementById('call-status-label-text');
    
    avatar.src = chat.avatar;
    name.innerText = chat.name;
    status.innerText = 'Łączenie...';
    
    document.getElementById('call-simulation-overlay').style.display = 'flex';
    
    const soundsOn = document.getElementById('settings-sounds-toggle') ? document.getElementById('settings-sounds-toggle').checked : true;
    
    if (soundsOn) {
        startRingingAudio();
    }
    
    callTimer = setTimeout(() => {
        stopRingingAudio();
        status.innerText = 'Połączono (00:01)...';
        if (soundsOn) {
            playBeep(880, 0.2);
        }
        
        let sec = 1;
        callTimer = setInterval(() => {
            sec++;
            const minutes = Math.floor(sec / 60).toString().padStart(2, '0');
            const seconds = (sec % 60).toString().padStart(2, '0');
            status.innerText = `Połączono (${minutes}:${seconds})...`;
        }, 1000);
    }, 3500);
}

function startRingingAudio() {
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        oscNode1 = audioCtx.createOscillator();
        oscNode2 = audioCtx.createOscillator();
        gainNode = audioCtx.createGain();
        
        oscNode1.frequency.value = 400;
        oscNode2.frequency.value = 450;
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        
        oscNode1.connect(gainNode);
        oscNode2.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscNode1.start(0);
        oscNode2.start(0);
        
        let time = audioCtx.currentTime;
        gainNode.gain.setValueAtTime(0.08, time + 0.1);
        gainNode.gain.setValueAtTime(0, time + 1.1);
        
        callTimerRingInterval = setInterval(() => {
            if (audioCtx) {
                let t = audioCtx.currentTime;
                gainNode.gain.setValueAtTime(0.08, t);
                gainNode.gain.setValueAtTime(0, t + 1);
            }
        }, 3000);
        
    } catch(e) {}
}

function stopRingingAudio() {
    clearInterval(callTimerRingInterval);
    try {
        if (oscNode1) { oscNode1.stop(); oscNode1 = null; }
        if (oscNode2) { oscNode2.stop(); oscNode2 = null; }
        if (audioCtx) { audioCtx.close(); audioCtx = null; }
    } catch(e) {}
}

function toggleCallMute() {
    const btn = document.getElementById('call-mute-toggle-btn');
    btn.classList.toggle('active');
    
    if (btn.classList.contains('active')) {
        btn.innerHTML = '<i data-lucide="mic"></i>';
        lucide.createIcons();
    } else {
        btn.innerHTML = '<i data-lucide="mic-off"></i>';
        lucide.createIcons();
    }
}

function endCallSimulation() {
    clearTimeout(callTimer);
    clearInterval(callTimer);
    stopRingingAudio();
    
    const soundsOn = document.getElementById('settings-sounds-toggle') ? document.getElementById('settings-sounds-toggle').checked : true;
    if (soundsOn) {
        playBeep(300, 0.3);
    }
    
    document.getElementById('call-simulation-overlay').style.display = 'none';
}


// --- OTHER INTERACTIVE UTILS ---

function searchTrend(hashtag) {
    document.getElementById('global-search').value = hashtag;
    const event = new Event('input', { bubbles: true });
    document.getElementById('global-search').dispatchEvent(event);
    switchTab('feed');
}

function toggleFollow(btn, targetEmail) {
    if (!Array.isArray(currentUser.following)) currentUser.following = [];
    if (!Array.isArray(currentUser.followers)) currentUser.followers = [];

    const targetUser = users.find(u => u.email === targetEmail);

    const isFollowing = currentUser.following.includes(targetEmail);
    if (isFollowing) {
        // Unfollow
        currentUser.following = currentUser.following.filter(e => e !== targetEmail);
        if (targetUser) {
            if (!Array.isArray(targetUser.followers)) targetUser.followers = [];
            targetUser.followers = targetUser.followers.filter(e => e !== currentUser.email);
        }
        btn.innerText = 'Obserwuj';
        btn.style.backgroundColor = 'transparent';
        btn.style.color = 'var(--orange-primary)';
    } else {
        // Follow
        currentUser.following.push(targetEmail);
        if (targetUser) {
            if (!Array.isArray(targetUser.followers)) targetUser.followers = [];
            if (!targetUser.followers.includes(currentUser.email)) {
                targetUser.followers.push(currentUser.email);
            }
        }
        btn.innerText = 'Obserwujesz';
        btn.style.backgroundColor = 'var(--orange-primary)';
        btn.style.color = '#fff';
    }

    // Sync current user state in users db
    const myUserInDb = users.find(u => u.email === currentUser.email);
    if (myUserInDb) {
        myUserInDb.following = currentUser.following;
        myUserInDb.followers = currentUser.followers;
    }

    saveState();
    updateUIForCurrentUser();
}


// ================================================================
// INSTAGRAM-INSPIRED FEATURES (Original SocialSphere Implementations)
// ================================================================

// --- LIVE ORBS (Stories equivalent) ---

function getOrbsData() {
    const list = [
        {
            id: 'orb-own',
            name: 'Twoja Orbita',
            avatar: currentUser.avatar,
            isOwn: true,
            slides: [
                { type: 'canvas', theme: 'own_pulse', caption: 'Twoja własna kulejąca lub tętniąca Orbita SocialSphere ✨' }
            ]
        }
    ];

    const themes = ['matrix', 'particles', 'waves', 'glitch', 'sparks'];

    users.filter(u => u.email.toLowerCase() !== currentUser.email.toLowerCase() && !u.isOwner && u.email !== 'admin@socialsphere.com').forEach((u, i) => {
        list.push({
            id: 'orb-' + u.email,
            name: u.name,
            handle: (u.handle || '').replace(/^@/, ''),
            avatar: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            isOwn: false,
            slides: [
                { type: 'canvas', theme: themes[i % themes.length], caption: `Witaj na profilu ${u.name}! 🚀` }
            ]
        });
    });

    return list;
}

function renderLiveOrbs() {
    const bar = document.getElementById('live-orbs-bar');
    if (!bar) return;
    bar.innerHTML = '';

    const orbs = getOrbsData();

    orbs.forEach((orb, idx) => {
        const hasUserNote = orb.isOwn && myNote !== '';
        const item = document.createElement('div');
        item.className = 'live-orb-item';
        const canvasId = `orb-canvas-${orb.id}`;

        if (orb.isOwn) {
            item.innerHTML = `
                <div class="live-orb-ring is-own ${hasUserNote ? 'has-note' : ''}" onclick="openMyNoteEditor()">
                    ${hasUserNote ? `<div class="orb-note-bubble">${myNote}</div>` : ''}
                    <div class="live-orb-inner live-orb-inner-canvas">
                        <canvas id="${canvasId}" width="60" height="60"></canvas>
                    </div>
                </div>
                <span class="live-orb-label">Twoja</span>
            `;
        } else {
            item.innerHTML = `
                <div class="live-orb-ring" onclick="openStoryViewer('${orb.id}')">
                    <div class="live-orb-inner live-orb-inner-canvas">
                        <canvas id="${canvasId}" width="60" height="60"></canvas>
                    </div>
                </div>
                <span class="live-orb-label">${orb.handle ? orb.handle.substring(0, 9) : orb.name.split(' ')[0]}</span>
            `;
        }

        bar.appendChild(item);

        // Draw canvas animation after DOM is ready
        setTimeout(() => {
            const c = document.getElementById(canvasId);
            if (!c) return;
            const ctx = c.getContext('2d');
            const theme = orb.isOwn ? 'own_pulse' : (orb.slides[0] ? orb.slides[0].theme : 'particles');
            drawOrbMiniCanvas(ctx, c, theme);
        }, 30 * (idx + 1));
    });
}

function drawOrbMiniCanvas(ctx, canvas, theme) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (theme === 'own_pulse') {
        // Pulsing orange gradient for own orb
        const grad = ctx.createRadialGradient(w/2, h/2, 2, w/2, h/2, w/2);
        grad.addColorStop(0, '#ff9933');
        grad.addColorStop(0.5, '#ff6600');
        grad.addColorStop(1, '#331100');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        // Plus icon in center
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(w/2, h/2 - 10); ctx.lineTo(w/2, h/2 + 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w/2 - 10, h/2); ctx.lineTo(w/2 + 10, h/2); ctx.stroke();

    } else if (theme === 'matrix') {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        const chars = '01ΩΛΨ∑';
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            ctx.fillStyle = `rgba(255, ${Math.floor(Math.random()*60)}, 0, ${0.4 + Math.random()*0.6})`;
            ctx.font = `${8 + Math.random()*4}px monospace`;
            ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, y);
        }

    } else if (theme === 'particles') {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#0a0a0a');
        grad.addColorStop(1, '#1a0500');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 30; i++) {
            ctx.beginPath();
            ctx.arc(Math.random()*w, Math.random()*h, Math.random()*2.5+0.5, 0, Math.PI*2);
            ctx.fillStyle = `rgba(255, ${Math.floor(60 + Math.random()*120)}, 0, ${0.4+Math.random()*0.6})`;
            ctx.fill();
        }

    } else if (theme === 'waves') {
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, w, h);
        for (let wave = 0; wave < 4; wave++) {
            ctx.beginPath();
            ctx.moveTo(0, h/2);
            for (let x = 0; x <= w; x += 2) {
                const y = h/2 + Math.sin((x * 0.15) + wave * 0.9) * (8 + wave * 4);
                ctx.lineTo(x, y);
            }
            ctx.strokeStyle = `rgba(255, 102, 0, ${0.1 + wave * 0.1})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

    } else if (theme === 'glitch') {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 8; i++) {
            const y = Math.random() * h;
            const sliceH = Math.random() * 6 + 1;
            const shift = (Math.random() - 0.5) * 14;
            ctx.fillStyle = `rgba(255, ${Math.floor(Math.random()*40)}, 0, ${Math.random()*0.5+0.2})`;
            ctx.fillRect(shift, y, w, sliceH);
        }
        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.08})`;
            ctx.fillRect(0, Math.random()*h, w, 1);
        }

    } else if (theme === 'sparks') {
        const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
        grad.addColorStop(0, '#1a0800');
        grad.addColorStop(1, '#000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const len = Math.random() * 22 + 5;
            ctx.beginPath();
            ctx.moveTo(w/2, h/2);
            ctx.lineTo(w/2 + Math.cos(angle)*len, h/2 + Math.sin(angle)*len);
            ctx.strokeStyle = `rgba(255, ${Math.floor(100+Math.random()*155)}, 0, ${Math.random()*0.6+0.2})`;
            ctx.lineWidth = Math.random()*1.5 + 0.5;
            ctx.stroke();
        }
    }

    // Animate orbs with requestAnimationFrame for living effect
    animateOrbCanvas(ctx, canvas, theme, 0);
}

const orbAnimTimers = {};

function animateOrbCanvas(ctx, canvas, theme, frame) {
    const id = canvas.id;
    if (orbAnimTimers[id]) cancelAnimationFrame(orbAnimTimers[id]);

    orbAnimTimers[id] = requestAnimationFrame(() => {
        if (!document.getElementById(id)) return; // Stop if removed from DOM
        if (frame % 8 === 0) {
            drawOrbMiniCanvas(ctx, canvas, theme);
        }
        animateOrbCanvas(ctx, canvas, theme, frame + 1);
    });
}


// --- STORY / ORB VIEWER ---

function openStoryViewer(orbId) {
    const orb = getOrbsData().find(o => o.id === orbId);
    if (!orb || orb.slides.length === 0) return;

    currentStoryUserId = orbId;
    currentStorySlideIndex = 0;

    const overlay = document.getElementById('story-viewer-overlay');
    overlay.style.display = 'flex';

    document.getElementById('story-viewer-avatar').src = orb.avatar;
    document.getElementById('story-viewer-name').innerText = orb.name;

    buildStoryProgressBar(orb.slides.length);
    renderStorySlide(orb, 0);
    startStoryProgress(orb);
}

function buildStoryProgressBar(count) {
    const container = document.getElementById('story-progress-container');
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const seg = document.createElement('div');
        seg.className = 'story-segment';
        seg.id = `story-seg-${i}`;
        const fill = document.createElement('div');
        fill.className = 'story-segment-fill';
        fill.id = `story-fill-${i}`;
        seg.appendChild(fill);
        container.appendChild(seg);
    }
}

function startStoryProgress(orb) {
    clearInterval(storyTimerInterval);
    clearInterval(storyProgressInterval);

    const DURATION = 4000;
    const TICK = 50;
    let elapsed = 0;

    const fillEl = document.getElementById(`story-fill-${currentStorySlideIndex}`);

    storyProgressInterval = setInterval(() => {
        elapsed += TICK;
        if (fillEl) fillEl.style.width = Math.min((elapsed / DURATION) * 100, 100) + '%';

        if (elapsed >= DURATION) {
            clearInterval(storyProgressInterval);
            if (fillEl) fillEl.classList.add('done');
            nextStorySlide();
        }
    }, TICK);
}

function renderStorySlide(orb, index) {
    const slide = orb.slides[index];
    if (!slide) return;

    document.getElementById('story-viewer-time').innerText = 'Przed chwilą';

    const canvas = document.getElementById('story-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 420;
    canvas.height = 700;

    drawStoryCanvas(ctx, canvas, slide);
}

function drawStoryCanvas(ctx, canvas, slide) {
    const theme = slide.theme || 'matrix';
    const caption = slide.caption || '';

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (theme === 'own_pulse') {
        const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 10, canvas.width/2, canvas.height/2, canvas.height/2);
        grad.addColorStop(0, '#ff9933');
        grad.addColorStop(0.5, '#ff6600');
        grad.addColorStop(1, '#110500');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (theme === 'matrix') {
        drawMatrixTheme(ctx, canvas, caption);
    } else if (theme === 'particles') {
        drawParticlesTheme(ctx, canvas, caption);
    } else if (theme === 'waves') {
        drawWavesTheme(ctx, canvas, caption);
    } else if (theme === 'glitch') {
        drawGlitchTheme(ctx, canvas, caption);
    } else if (theme === 'sparks') {
        drawSparksTheme(ctx, canvas, caption);
    }
}

function drawMatrixTheme(ctx, canvas, caption) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cols = Math.floor(canvas.width / 14);
    const chars = '01ABCDEFΩα∑∞ΛΨ';

    for (let i = 0; i < cols * 30; i++) {
        const x = Math.floor(Math.random() * cols) * 14;
        const y = Math.floor(Math.random() * (canvas.height / 14)) * 14;
        const alpha = Math.random() * 0.8 + 0.2;
        ctx.fillStyle = `rgba(255, ${Math.floor(Math.random() * 80)}, 0, ${alpha})`;
        ctx.font = '12px monospace';
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, y);
    }

    ctx.fillStyle = 'rgba(255, 102, 0, 0.85)';
    ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(caption, canvas.width / 2, canvas.height - 45);
}

function drawParticlesTheme(ctx, canvas, caption) {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0a0a0a');
    grad.addColorStop(1, '#1a0500');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 120; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const r = Math.random() * 3 + 1;
        const alpha = Math.random() * 0.8 + 0.2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${Math.floor(80 + Math.random() * 100)}, 0, ${alpha})`;
        ctx.fill();
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(caption, canvas.width / 2, canvas.height - 45);
}

function drawWavesTheme(ctx, canvas, caption) {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let w = 0; w < 6; w++) {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        for (let x = 0; x <= canvas.width; x += 4) {
            const y = (canvas.height / 2) + Math.sin((x * 0.02) + (w * 0.8)) * (40 + w * 15);
            ctx.lineTo(x, y);
        }
        const alpha = 0.1 + (w * 0.08);
        ctx.strokeStyle = `rgba(255, 102, 0, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255, 102, 0, 0.9)';
    ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(caption, canvas.width / 2, canvas.height - 45);
}

function drawGlitchTheme(ctx, canvas, caption) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 40; i++) {
        const y = Math.random() * canvas.height;
        const h = Math.random() * 8 + 1;
        const shift = (Math.random() - 0.5) * 30;
        ctx.drawImage(canvas, 0, y, canvas.width, h, shift, y, canvas.width, h);
        ctx.fillStyle = `rgba(255, ${Math.floor(Math.random() * 60)}, 0, ${Math.random() * 0.5})`;
        ctx.fillRect(0, y, canvas.width, h);
    }

    for (let i = 0; i < 15; i++) {
        const y2 = Math.random() * canvas.height;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.1})`;
        ctx.fillRect(0, y2, canvas.width, Math.random() * 3);
    }

    ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
    ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(caption, canvas.width / 2, canvas.height - 45);
}

function drawSparksTheme(ctx, canvas, caption) {
    const grad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.height / 2
    );
    grad.addColorStop(0, '#1a0800');
    grad.addColorStop(1, '#000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    for (let i = 0; i < 80; i++) {
        const angle = Math.random() * Math.PI * 2;
        const len = Math.random() * 200 + 20;
        const x2 = cx + Math.cos(angle) * len;
        const y2 = cy + Math.sin(angle) * len;
        const alpha = Math.random() * 0.6 + 0.1;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(255, ${Math.floor(100 + Math.random() * 155)}, 0, ${alpha})`;
        ctx.lineWidth = Math.random() * 2;
        ctx.stroke();
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(caption, canvas.width / 2, canvas.height - 45);
}

function nextStorySlide() {
    const orb = getOrbsData().find(o => o.id === currentStoryUserId);
    if (!orb) return;

    currentStorySlideIndex++;
    if (currentStorySlideIndex >= orb.slides.length) {
        closeStoryViewer();
        return;
    }

    const fillPrev = document.getElementById(`story-fill-${currentStorySlideIndex - 1}`);
    if (fillPrev) fillPrev.classList.add('done');

    renderStorySlide(orb, currentStorySlideIndex);
    startStoryProgress(orb);
}

function prevStorySlide() {
    if (currentStorySlideIndex <= 0) {
        closeStoryViewer();
        return;
    }

    const fillCur = document.getElementById(`story-fill-${currentStorySlideIndex}`);
    if (fillCur) { fillCur.style.width = '0%'; fillCur.classList.remove('done'); }

    currentStorySlideIndex--;

    const orb = getOrbsData().find(o => o.id === currentStoryUserId);
    if (orb) {
        renderStorySlide(orb, currentStorySlideIndex);
        startStoryProgress(orb);
    }
}

function closeStoryViewer() {
    clearInterval(storyProgressInterval);
    clearInterval(storyTimerInterval);
    document.getElementById('story-viewer-overlay').style.display = 'none';
    currentStoryUserId = null;
    currentStorySlideIndex = 0;
}


// --- ORB NOTES (my personal note visible on profile) ---

function loadMyNote() {
    const noteText = document.getElementById('profile-note-text');
    if (noteText) {
        noteText.innerText = myNote !== '' ? myNote : '+ Notatka';
    }
    renderLiveOrbs();
}

function openMyNoteEditor() {
    const overlay = document.getElementById('note-editor-overlay');
    overlay.style.display = 'flex';
    const textarea = document.getElementById('note-editor-textarea');
    textarea.value = myNote;
}

function closeMyNoteEditor() {
    document.getElementById('note-editor-overlay').style.display = 'none';
}

function saveMyNote() {
    const textarea = document.getElementById('note-editor-textarea');
    myNote = textarea.value.trim();
    saveState();
    closeMyNoteEditor();
    loadMyNote();
}


// --- ORBITS SECTION (Reels-inspired canvas loops) ---

const ORBITS_CONTENT = [
    {
        id: 'orbit-official-1',
        author: 'SocialSphere Official',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
        desc: '🔥 Witamy na platformie SocialSphere — inspiracje i dynamiczne wizualizacje',
        theme: 'sparks',
        likes: 42
    },
    {
        id: 'orbit-official-2',
        author: 'SocialSphere Design',
        avatar: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&w=150&q=80',
        desc: '🌌 Cyberpunkowy ciemny motyw i płynne animacje canvas',
        theme: 'matrix',
        likes: 89
    }
];

function renderSuggestedUsers() {
    const container = document.getElementById('suggested-users-list');
    if (!container) return;
    container.innerHTML = '';

    const otherUsers = users.filter(u => u.email.toLowerCase() !== currentUser.email.toLowerCase());

    if (otherUsers.length === 0) {
        container.innerHTML = `
            <li class="trending-item" style="cursor:default; padding: 10px 0;">
                <span class="trend-category">Brak innych użytkowników</span>
                <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Zarejestruj nowe konto w oknie logowania, aby połączyć się z innymi realnymi profilami!</p>
            </li>
        `;
        return;
    }

    if (!Array.isArray(currentUser.following)) currentUser.following = [];

    otherUsers.forEach(user => {
        const li = document.createElement('li');
        li.className = 'widget-user-item';
        const cleanH = (user.handle || 'user').replace(/^@/, '');
        const verifiedTag = user.verified
            ? `<span class="verified-badge" title="Zweryfikowany">${VERIFIED_STAR_SVG()}</span>`
            : '';
        const isFollowing = currentUser.following.includes(user.email);
        const btnText = isFollowing ? 'Obserwujesz' : 'Obserwuj';
        const btnStyle = isFollowing
            ? 'background-color:var(--orange-primary);color:#fff;'
            : 'background-color:transparent;color:var(--orange-primary);';
        li.innerHTML = `
            <div class="widget-user-info">
                <img src="${user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" alt="Avatar" class="user-avatar">
                <div class="user-info">
                    <span class="user-name">${escapeHtml(cleanH)}${verifiedTag}</span>
                    <span class="user-handle">${escapeHtml(user.name || '')}</span>
                </div>
            </div>
            <button class="follow-btn" style="${btnStyle}" onclick="toggleFollow(this, '${escapeHtml(user.email)}')">${btnText}</button>
        `;
        container.appendChild(li);
    });
}

let orbitLikes = {};
let currentOrbitTheme = 'sparks';
let currentOrbitCustomImage = null;

function handleOrbitFileSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        currentOrbitCustomImage = evt.target.result;
        const btnText = document.getElementById('orbit-file-btn-text');
        if (btnText) btnText.innerText = '✅ Wybrano: ' + file.name;
        previewOrbit();
    };
    reader.readAsDataURL(file);
}

function renderOrbits() {
    const feed = document.getElementById('orbits-feed');
    if (!feed) return;
    feed.innerHTML = '';

    // Merge official orbits + user-posted orbits from posts array
    const userOrbits = posts
        .filter(p => p.orbitTheme || p.isOrbit)
        .map(p => ({
            id: 'orbit-post-' + p.id,
            author: p.author ? (p.author.handle || '').replace(/^@/, '') || p.author.name : 'Użytkownik',
            avatar: p.author ? p.author.avatar : '',
            desc: p.orbitDesc || p.content || '',
            theme: p.orbitTheme || 'sparks',
            customImage: p.orbitImage || p.image || null,
            likes: p.likes || 0,
            official: false,
            postId: p.id
        }));

    const allOrbits = [...ORBITS_CONTENT, ...userOrbits];

    if (allOrbits.length === 0) {
        feed.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px 0;">
            <p>Brak Orbit. Bądź pierwszym, który dodaje swoją!</p></div>`;
        return;
    }

    allOrbits.forEach((orbit, idx) => {
        const card = document.createElement('div');
        card.className = 'orbit-card';

        const liked = orbitLikes[orbit.id] || false;
        const deleteBtn = (orbit.postId && currentUser && (currentUser.isOwner || (orbit.author === (currentUser.handle || '').replace(/^@/, ''))))
            ? `<button class="orbit-action-btn" onclick="deleteUserOrbit('${orbit.postId}')" style="color:#ff4444;margin-left:auto;">🗑️ Usuń</button>`
            : '';

        const customImgHtml = orbit.customImage
            ? `<img src="${orbit.customImage}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;z-index:1;">`
            : '';

        card.innerHTML = `
            <div class="orbit-canvas-wrapper" id="wrap-${orbit.id}">
                ${customImgHtml}
                <canvas id="orbit-canvas-${orbit.id}" width="300" height="280" style="${orbit.customImage ? 'display:none;' : ''}"></canvas>
            </div>
            <div class="orbit-overlay" style="z-index:2;">
                <div class="orbit-author">
                    <img src="${orbit.avatar}" alt="${orbit.author}" class="orbit-author-avatar" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'">
                    <span class="orbit-author-name">${orbit.author}${orbit.official ? ' <span class="official-badge" style="font-size:9px;">Oficjalny</span>' : ''}</span>
                </div>
                <p class="orbit-desc">${orbit.desc}</p>
                <div class="orbit-actions">
                    <button class="orbit-action-btn" id="orbit-like-${orbit.id}" onclick="toggleOrbitLike('${orbit.id}', ${orbit.likes})">
                        ❤️ <span id="orbit-like-count-${orbit.id}">${orbit.likes + (liked ? 1 : 0)}</span>
                    </button>
                    <button class="orbit-action-btn" onclick="shareOrbit('${orbit.id}')">🔗 Udostępnij</button>
                    ${deleteBtn}
                </div>
            </div>
        `;

        feed.appendChild(card);

        // Draw canvas if no custom image
        if (!orbit.customImage) {
            setTimeout(() => {
                const c = document.getElementById(`orbit-canvas-${orbit.id}`);
                if (!c) return;
                const ctx = c.getContext('2d');
                drawStoryCanvas(ctx, c, { theme: orbit.theme, caption: '' });
            }, 50 * (idx + 1));
        }
    });
}

function toggleOrbitLike(orbitId, baseLikes) {
    orbitLikes[orbitId] = !orbitLikes[orbitId];
    const countEl = document.getElementById(`orbit-like-count-${orbitId}`);
    if (countEl) {
        countEl.innerText = baseLikes + (orbitLikes[orbitId] ? 1 : 0);
    }
    const btn = document.getElementById(`orbit-like-${orbitId}`);
    if (btn) btn.style.color = orbitLikes[orbitId] ? 'var(--orange-primary)' : '#fff';
}

function shareOrbit(orbitId) {
    const url = window.location.origin + '/orbits/' + orbitId;
    navigator.clipboard.writeText(url).catch(() => {});
    alert('Skopiowano link do Orbity! 🔗');
}

function deleteUserOrbit(postId) {
    if (!confirm('Usunąć tę Orbitę?')) return;
    posts = posts.filter(p => p.id !== postId);
    saveState();
    renderOrbits();
}

// --- ADD ORBIT MODAL ---
function openAddOrbitModal() {
    currentOrbitTheme = 'sparks';
    currentOrbitCustomImage = null;
    const overlay = document.getElementById('add-orbit-modal-overlay');
    if (overlay) { overlay.style.display = 'flex'; }
    const descInput = document.getElementById('orbit-desc-input');
    if (descInput) descInput.value = '';
    const fileInput = document.getElementById('orbit-file-input');
    if (fileInput) fileInput.value = '';
    const btnText = document.getElementById('orbit-file-btn-text');
    if (btnText) btnText.innerText = 'Dodaj zdjęcie z urządzenia';

    document.querySelectorAll('.orbit-theme-btn').forEach(b => b.classList.remove('active'));
    const firstBtn = document.querySelector('.orbit-theme-btn[data-theme="sparks"]');
    if (firstBtn) firstBtn.classList.add('active');
    previewOrbit();
    if (lucide) lucide.createIcons();
}

function closeAddOrbitModal() {
    currentOrbitCustomImage = null;
    const overlay = document.getElementById('add-orbit-modal-overlay');
    if (overlay) overlay.style.display = 'none';
}

function selectOrbitTheme(theme, btn) {
    currentOrbitTheme = theme;
    document.querySelectorAll('.orbit-theme-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    previewOrbit();
}

function previewOrbit() {
    const c = document.getElementById('orbit-preview-canvas');
    if (!c) return;
    const ctx = c.getContext('2d');
    
    if (currentOrbitCustomImage) {
        ctx.clearRect(0, 0, c.width, c.height);
        const img = new Image();
        img.onload = function() {
            ctx.drawImage(img, 0, 0, c.width, c.height);
        };
        img.src = currentOrbitCustomImage;
    } else {
        drawStoryCanvas(ctx, c, { theme: currentOrbitTheme, caption: '' });
    }
}

function confirmAddOrbit() {
    if (!currentUser || !currentUser.isLoggedIn) {
        alert('Musisz być zalogowany, aby dodać Orbitę!');
        return;
    }
    const desc = (document.getElementById('orbit-desc-input')?.value || '').trim();
    if (!desc && !currentOrbitCustomImage) {
        alert('Wpisz opis lub dodaj zdjęcie do Orbity!');
        return;
    }

    const newOrbitPost = {
        id: 'orbit-' + Date.now(),
        author: {
            name: currentUser.name,
            handle: currentUser.handle,
            avatar: currentUser.avatar
        },
        time: 'Przed chwilą',
        content: desc || 'Nowa Orbita',
        orbitDesc: desc || '',
        orbitTheme: currentOrbitTheme,
        orbitImage: currentOrbitCustomImage,
        image: currentOrbitCustomImage,
        likes: 0,
        likedByUser: false,
        comments: [],
        isOrbit: true
    };

    posts.unshift(newOrbitPost);
    saveState();
    closeAddOrbitModal();
    renderOrbits();
    addNewNotification('Twoja nowa Orbita została opublikowana! 🌌', 'orbit');
}


// --- MORE POPOVER MENU ---

function toggleMorePopover() {
    morePopoverOpen = !morePopoverOpen;
    const menu = document.getElementById('more-popover-menu');
    if (menu) {
        menu.classList.toggle('open', morePopoverOpen);
    }
    lucide.createIcons();
}

function closeMorePopover() {
    morePopoverOpen = false;
    const menu = document.getElementById('more-popover-menu');
    if (menu) menu.classList.remove('open');
}


// --- PROFILE GRID WITH TABS ---

function switchProfileTab(tab) {
    ['grid', 'saved', 'liked'].forEach(t => {
        const btn = document.getElementById(`profile-tab-${t}`);
        if (btn) btn.classList.remove('active');
    });

    const activeBtn = document.getElementById(`profile-tab-${tab}`);
    if (activeBtn) activeBtn.classList.add('active');

    renderProfileGrid(tab);
}

function renderProfileGrid(tab) {
    const gridContainer = document.getElementById('profile-posts-grid');
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    let filteredPosts = [];

    if (tab === 'grid') {
        filteredPosts = posts.filter(p => p.author.handle === currentUser.handle);
    } else if (tab === 'saved') {
        filteredPosts = posts.filter(p => savedPostIds.includes(p.id));
    } else if (tab === 'liked') {
        filteredPosts = posts.filter(p => p.likedByUser);
    }

    if (filteredPosts.length === 0) {
        gridContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted); font-size: 13px;">
                <i data-lucide="${tab === 'saved' ? 'bookmark' : tab === 'liked' ? 'heart' : 'image'}" style="width:40px;height:40px;margin-bottom:12px;color:var(--orange-primary);display:block;margin-left:auto;margin-right:auto;"></i>
                ${tab === 'saved' ? 'Nie masz jeszcze zapisanych postów.' : tab === 'liked' ? 'Nie polubiłeś jeszcze żadnych postów.' : 'Nie opublikowałeś jeszcze żadnych postów.'}
            </div>
        `;
        lucide.createIcons();
        return;
    }

    filteredPosts.forEach(post => {
        const item = document.createElement('div');

        if (post.image) {
            item.className = 'profile-grid-item';
            item.onclick = () => openPostDetail(post.id);
            item.innerHTML = `
                <img src="${post.image}" alt="Post">
                <div class="profile-grid-overlay">
                    <span>❤️ ${post.likes}</span>
                    <span>💬 ${post.comments.length}</span>
                </div>
            `;
        } else {
            item.className = 'profile-grid-no-image';
            item.onclick = () => openPostDetail(post.id);
            item.innerHTML = `
                <div class="profile-grid-text-post">${post.content}</div>
                <div class="profile-grid-overlay">
                    <span>❤️ ${post.likes}</span>
                    <span>💬 ${post.comments.length}</span>
                </div>
            `;
        }

        gridContainer.appendChild(item);
    });

    lucide.createIcons();
}


// --- POST DETAIL MODAL (grid click) ---

function openPostDetail(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const modal = document.getElementById('post-detail-modal');
    modal.style.display = 'flex';

    const imgEl = document.getElementById('post-detail-img');
    const imgSide = document.querySelector('.post-detail-image-side');

    if (post.image) {
        imgEl.src = post.image;
        imgSide.style.display = 'flex';
    } else {
        imgSide.style.display = 'none';
        document.querySelector('.post-detail-content').style.gridTemplateColumns = '1fr';
    }

    const detailCleanHandle = (post.author.handle || '').replace(/^@/, '');
    const detailVerifiedBadge = getVerifiedBadgeForUser(post.author.handle);
    document.getElementById('post-detail-author').innerHTML = `
        <img src="${post.author.avatar}" alt="${escapeHtml(detailCleanHandle)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">
        <div>
            <div style="font-size:14px;font-weight:700;color:var(--text-white);display:flex;align-items:center;gap:4px;">${escapeHtml(detailCleanHandle)}${detailVerifiedBadge}</div>
            <div style="font-size:12px;color:var(--text-gray);">${escapeHtml(post.author.name)} · ${post.time}</div>
        </div>
    `;

    document.getElementById('post-detail-text').innerText = post.content;

    document.getElementById('post-detail-actions').innerHTML = `
        <span>❤️ ${post.likes} polubień</span>
        <span>💬 ${post.comments.length} komentarzy</span>
    `;

    lucide.createIcons();
}

function closePostDetail() {
    document.getElementById('post-detail-modal').style.display = 'none';
    // restore grid if changed
    const detailContent = document.querySelector('.post-detail-content');
    if (detailContent) detailContent.style.gridTemplateColumns = '';
}


// --- BOOKMARK / SAVE POSTS ---

function toggleBookmark(postId) {
    const idx = savedPostIds.indexOf(postId);
    if (idx === -1) {
        savedPostIds.push(postId);
    } else {
        savedPostIds.splice(idx, 1);
    }
    saveState();

    // Update bookmark button UI immediately without re-rendering whole feed
    const btn = document.getElementById(`bookmark-btn-${postId}`);
    if (btn) {
        const isSaved = savedPostIds.includes(postId);
        btn.classList.toggle('saved', isSaved);
        const icon = btn.querySelector('i');
        if (icon) icon.style.fill = isSaved ? 'var(--orange-primary)' : 'transparent';
    }
}

function showSavedPostsQuick() {
    switchTab('profile');
    setTimeout(() => switchProfileTab('saved'), 100);
}


// --- PROFILE UTILITIES ---

function scrollToEditProfile() {
    const anchor = document.getElementById('edit-profile-scroll-anchor');
    if (anchor) anchor.scrollIntoView({ behavior: 'smooth' });
}

// --- RULES & TERMS MODAL ---

function openRulesModal() {
    const modal = document.getElementById('rules-modal-overlay');
    if (modal) modal.style.display = 'flex';
}

function closeRulesModal() {
    const modal = document.getElementById('rules-modal-overlay');
    if (modal) modal.style.display = 'none';
}


// ================================================================
// OWNER ADMIN PANEL & MODERATION LOGIC
// ================================================================

let activeBanEmail = null;
let activeWarnEmail = null;

function renderAdminPanel() {
    const isOwner = currentUser && (currentUser.isOwner || currentUser.email === 'owner@socialsphere.local' || currentUser.handle === '@Itzz_Sigma03');
    if (!isOwner) return;

    // Analytics stats
    const totalUsers = users.length;
    const verifiedUsers = users.filter(u => u.verified).length;
    const bannedUsers = users.filter(u => u.banned).length;
    const totalPosts = posts.length;

    const uCountEl = document.getElementById('admin-stat-users-count');
    const vCountEl = document.getElementById('admin-stat-verified-count');
    const bCountEl = document.getElementById('admin-stat-banned-count');
    const pCountEl = document.getElementById('admin-stat-posts-count');

    if (uCountEl) uCountEl.innerText = totalUsers;
    if (vCountEl) vCountEl.innerText = verifiedUsers;
    if (bCountEl) bCountEl.innerText = bannedUsers;
    if (pCountEl) pCountEl.innerText = totalPosts;

    // Ensure IP & Device data on all users
    users.forEach((u, idx) => {
        if (!u.lastIp) u.lastIp = `192.168.1.${100 + (idx % 30)}`;
        if (!u.lastDevice) u.lastDevice = (idx % 2 === 0) ? 'Windows PC (Chrome)' : 'Mobile Smartphone (Safari)';
    });

    // Render users table
    const usersContainer = document.getElementById('admin-users-table-container');
    if (usersContainer) {
        if (users.length === 0) {
            usersContainer.innerHTML = '<p style="color:var(--text-gray);">Brak użytkowników.</p>';
        } else {
            let html = `<div style="display:flex; flex-direction:column; gap:12px;">`;

            users.forEach(u => {
                const isOwnerAccount = u.isOwner || u.email === 'owner@socialsphere.local';
                const cleanH = (u.handle || '').replace(/^@/, '');

                // Find alt accounts sharing same IP or device
                const altAccounts = users.filter(other => other.email !== u.email && (other.lastIp === u.lastIp || other.lastDevice === u.lastDevice));
                const altHandles = altAccounts.map(a => (a.handle || a.name).replace(/^@/,''));

                // Warning count
                const warnCount = (u.warnings || []).length;

                // Ban status label
                let banStatusBadge = '';
                if (u.banned) {
                    if (u.banUntil && u.banUntil > Date.now()) {
                        const remMs = u.banUntil - Date.now();
                        const h = Math.floor(remMs / (1000 * 60 * 60));
                        const m = Math.floor((remMs % (1000 * 60 * 60)) / (1000 * 60));
                        banStatusBadge = `<span style="font-size:10px; background:rgba(255,51,51,0.2); color:#ff5555; border:1px solid rgba(255,51,51,0.3); padding:2px 8px; border-radius:10px; font-weight:700;">TEMP-BAN (${h}h ${m}m)</span>`;
                    } else {
                        banStatusBadge = `<span style="font-size:10px; background:rgba(255,51,51,0.2); color:#ff5555; border:1px solid rgba(255,51,51,0.3); padding:2px 8px; border-radius:10px; font-weight:700;">BAN PERMANENTNY</span>`;
                    }
                }

                html += `
                    <div style="padding:16px 20px; background:var(--bg-dark); border:1px solid var(--border-color); border-radius:var(--border-radius-md);">
                        <div style="display:flex; align-items:center; justify-content:space-between;">
                            <div style="display:flex; align-items:center; gap:14px;">
                                <img src="${u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" alt="Avatar" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--border-color);">
                                <div>
                                    <div style="font-weight:700; color:var(--text-white); font-size:14px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                        ${escapeHtml(cleanH)}
                                        ${u.verified ? `<span class="verified-badge" title="Zweryfikowany">${VERIFIED_STAR_SVG()}</span>` : ''}
                                        ${banStatusBadge}
                                        ${warnCount > 0 ? `<span style="font-size:10px; background:rgba(255,170,0,0.15); color:#ffaa00; border:1px solid rgba(255,170,0,0.3); padding:2px 8px; border-radius:10px; font-weight:700;">⚠️ ${warnCount} Ostrzeżenie(a)</span>` : ''}
                                        ${isOwnerAccount ? `<span style="font-size:10px; background:rgba(255,102,0,0.2); color:var(--orange-primary); border:1px solid rgba(255,102,0,0.3); padding:2px 8px; border-radius:10px; font-weight:700;">👑 WŁAŚCICIEL</span>` : ''}
                                    </div>
                                    <div style="font-size:12px; color:var(--text-gray); margin-top:3px;">
                                        ${escapeHtml(u.name)} · ${escapeHtml(u.email)}
                                    </div>
                                </div>
                            </div>

                            ${isOwnerAccount ? `<span style="font-size:12px; color:var(--text-muted); font-style:italic;">Konto Właściciela</span>` : `
                                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                    <button onclick="adminToggleVerification('${escapeHtml(u.email)}')" style="padding:7px 12px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid ${u.verified ? '#ff5555' : 'var(--orange-primary)'}; background:${u.verified ? 'transparent' : 'rgba(255,102,0,0.15)'}; color:${u.verified ? '#ff5555' : 'var(--orange-primary)'};">
                                        ${u.verified ? '✕ Gwiazdka' : '⭐ Gwiazdka ★'}
                                    </button>
                                    <button onclick="adminOpenWarnModal('${escapeHtml(u.email)}')" style="padding:7px 12px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid #ffaa00; background:rgba(255,170,0,0.1); color:#ffaa00;">
                                        ⚠️ Ostrzeżenie
                                    </button>
                                    ${u.banned ? `
                                        <button onclick="adminUnbanUser('${escapeHtml(u.email)}')" style="padding:7px 12px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid #00e676; background:rgba(0,230,118,0.1); color:#00e676;">
                                            ✅ UNBAN
                                        </button>
                                    ` : `
                                        <button onclick="adminOpenBanModal('${escapeHtml(u.email)}')" style="padding:7px 12px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid #ff3333; background:rgba(255,51,51,0.1); color:#ff5555;">
                                            🚫 BAN / TempBan
                                        </button>
                                    `}
                                    <button onclick="adminDeleteUser('${escapeHtml(u.email)}')" style="padding:7px 10px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid #444; background:transparent; color:#888;" title="Usuń konto">
                                        🗑️
                                    </button>
                                </div>
                            `}
                        </div>

                        <!-- Technical IP & Device Info bar -->
                        <div style="margin-top:12px; padding-top:10px; border-top:1px dashed var(--border-color); display:flex; align-items:center; justify-content:space-between; font-size:11px; color:var(--text-muted); flex-wrap:wrap; gap:10px;">
                            <div style="display:flex; align-items:center; gap:16px;">
                                <span>📍 IP: <strong style="color:var(--text-white);">${u.lastIp}</strong></span>
                                <span>💻 Urządzenie: <strong style="color:var(--text-white);">${u.lastDevice}</strong></span>
                            </div>
                            ${altHandles.length > 0 ? `
                                <div style="color:#ffaa00; background:rgba(255,170,0,0.08); padding:3px 10px; border-radius:12px; border:1px solid rgba(255,170,0,0.2);">
                                    🔗 <strong>Inne konta z tego samego IP/Urządzenia (${altHandles.length}):</strong> @${altHandles.join(', @')}
                                </div>
                            ` : `
                                <span style="color:rgba(255,255,255,0.3);">Brak innych kont na tym IP</span>
                            `}
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
            usersContainer.innerHTML = html;
        }
    }

    // Render post moderation list
    const postsContainer = document.getElementById('admin-posts-moderation-container');
    if (postsContainer) {
        if (posts.length === 0) {
            postsContainer.innerHTML = '<p style="color:var(--text-gray);">Brak postów do moderacji.</p>';
        } else {
            let html = `<div style="display:flex; flex-direction:column; gap:10px;">`;
            posts.forEach(p => {
                const authorClean = (p.author && p.author.handle) ? p.author.handle.replace(/^@/,'') : (p.author ? p.author.name : 'Użytkownik');
                html += `
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:var(--bg-dark); border:1px solid var(--border-color); border-radius:var(--border-radius-md);">
                        <div style="display:flex; align-items:center; gap:12px; max-width:75%;">
                            <img src="${p.author.avatar}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">
                            <div>
                                <div style="font-weight:700; color:var(--text-white); font-size:13px;">${escapeHtml(authorClean)} · <span style="font-size:11px;color:var(--text-gray);font-weight:400;">${p.time}</span></div>
                                <div style="font-size:12px; color:var(--text-gray); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:380px;">${escapeHtml(p.content || '[Zdjęcie]')}</div>
                            </div>
                        </div>
                        <button onclick="adminDeletePost('${p.id}')" style="padding:6px 12px; border-radius:20px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid #ff3333; background:rgba(255,51,51,0.1); color:#ff5555;">
                            🗑️ Usuń post (Moderacja)
                        </button>
                    </div>
                `;
            });
            html += `</div>`;
            postsContainer.innerHTML = html;
        }
    }
}

function adminToggleVerification(email) {
    const user = users.find(u => u.email === email);
    if (!user) return;

    user.verified = !user.verified;
    saveState();
    updateUIForCurrentUser();
    renderFeed();
    renderSuggestedUsers();
    renderAdminPanel();
    alert(`Weryfikacja dla "${user.name}" została ${user.verified ? 'NADANA ★' : 'COFNIĘTA'}.`);
}

function adminOpenBanModal(email) {
    const targetUser = users.find(u => u.email === email);
    if (!targetUser) return;

    activeBanEmail = email;
    const label = document.getElementById('admin-ban-target-user-info');
    if (label) label.innerText = `Blokujesz użytkownika: ${(targetUser.handle || targetUser.name).replace(/^@/,'')} (${targetUser.email})`;

    const modal = document.getElementById('admin-ban-modal');
    if (modal) modal.style.display = 'flex';
}

function closeAdminBanModal() {
    const modal = document.getElementById('admin-ban-modal');
    if (modal) modal.style.display = 'none';
    activeBanEmail = null;
}

function confirmAdminBan() {
    if (!activeBanEmail) return;
    const user = users.find(u => u.email === activeBanEmail);
    if (!user) return;

    const durVal = document.getElementById('admin-ban-duration-select').value;
    const reasonVal = document.getElementById('admin-ban-reason-input').value.trim() || 'Złamanie regulaminu SocialSphere';

    let banUntil = null;
    const now = Date.now();

    if (durVal === '1h') banUntil = now + (1000 * 60 * 60);
    else if (durVal === '12h') banUntil = now + (1000 * 60 * 60 * 12);
    else if (durVal === '1d') banUntil = now + (1000 * 60 * 60 * 24);
    else if (durVal === '3d') banUntil = now + (1000 * 60 * 60 * 24 * 3);
    else if (durVal === '7d') banUntil = now + (1000 * 60 * 60 * 24 * 7);
    else if (durVal === '30d') banUntil = now + (1000 * 60 * 60 * 24 * 30);
    else if (durVal === 'perm') banUntil = null;

    user.banned = true;
    user.banUntil = banUntil;
    user.banReason = reasonVal;

    saveState();
    closeAdminBanModal();
    renderAdminPanel();
    alert(`Użytkownik "${user.name}" został zablokowany!`);
}

function adminUnbanUser(email) {
    const user = users.find(u => u.email === email);
    if (!user) return;

    user.banned = false;
    user.banUntil = null;
    user.banReason = null;

    saveState();
    renderAdminPanel();
    alert(`Użytkownik "${user.name}" został odblokowany (UNBAN)!`);
}

function adminOpenWarnModal(email) {
    const targetUser = users.find(u => u.email === email);
    if (!targetUser) return;

    activeWarnEmail = email;
    const label = document.getElementById('admin-warn-target-user-info');
    if (label) label.innerText = `Wysyłasz ostrzeżenie do: ${(targetUser.handle || targetUser.name).replace(/^@/,'')} (${targetUser.email})`;

    const input = document.getElementById('admin-warn-reason-input');
    if (input) input.value = 'Zauważyliśmy niestosowne zachowanie. Pamiętaj o przestrzeganiu regulaminu platformy (zakaz 18+, spamu i obrażania).';

    const modal = document.getElementById('admin-warn-modal');
    if (modal) modal.style.display = 'flex';
}

function closeAdminWarnModal() {
    const modal = document.getElementById('admin-warn-modal');
    if (modal) modal.style.display = 'none';
    activeWarnEmail = null;
}

function confirmAdminWarn() {
    if (!activeWarnEmail) return;
    const user = users.find(u => u.email === activeWarnEmail);
    if (!user) return;

    const reason = document.getElementById('admin-warn-reason-input').value.trim() || 'Ostrzeżenie od Administracji.';

    if (!Array.isArray(user.warnings)) user.warnings = [];
    user.warnings.push({
        id: 'warn-' + Date.now(),
        reason: reason,
        date: new Date().toLocaleDateString('pl-PL'),
        acknowledged: false
    });

    saveState();
    closeAdminWarnModal();
    renderAdminPanel();
    alert(`Wysłano ostrzeżenie do użytkownika "${user.name}"! Zobacz je przy wejściu.`);
}

function checkPendingUserWarnings() {
    if (!currentUser || !currentUser.isLoggedIn) return;

    // Refresh warnings from users array
    const userInDb = users.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
    if (userInDb && Array.isArray(userInDb.warnings)) {
        currentUser.warnings = userInDb.warnings;
    }

    if (!Array.isArray(currentUser.warnings)) return;

    const unackWarning = currentUser.warnings.find(w => !w.acknowledged);
    if (unackWarning) {
        const reasonEl = document.getElementById('user-warning-reason-text');
        const dateEl = document.getElementById('user-warning-date-text');
        if (reasonEl) reasonEl.innerText = unackWarning.reason;
        if (dateEl) dateEl.innerText = `Data wydania: ${unackWarning.date || 'Dzisiaj'}`;

        const modal = document.getElementById('user-warning-modal');
        if (modal) modal.style.display = 'flex';
    }
}

function acknowledgeUserWarning() {
    if (!currentUser || !Array.isArray(currentUser.warnings)) return;

    const unackWarning = currentUser.warnings.find(w => !w.acknowledged);
    if (unackWarning) {
        unackWarning.acknowledged = true;
    }

    const userInDb = users.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
    if (userInDb && Array.isArray(userInDb.warnings)) {
        const dbWarn = userInDb.warnings.find(w => !w.acknowledged);
        if (dbWarn) dbWarn.acknowledged = true;
    }

    saveState();
    const modal = document.getElementById('user-warning-modal');
    if (modal) modal.style.display = 'none';
}

function adminDeleteUser(email) {
    const user = users.find(u => u.email === email);
    if (!user) return;

    if (confirm(`Czy na pewno chcesz usunąć konto "${user.name}" (${user.email})?`)) {
        users = users.filter(u => u.email !== email);
        saveState();
        renderSuggestedUsers();
        renderAdminPanel();
    }
}

function adminDeletePost(postId) {
    if (confirm('Czy na pewno chcesz usunąć ten post jako Administrator?')) {
        posts = posts.filter(p => p.id !== postId);
        saveState();
        renderFeed();
        renderAdminPanel();
    }
}


