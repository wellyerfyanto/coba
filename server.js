require('dotenv').config();
const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const path = require('path');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const fsSync = require('fs');

// FIX: Gunakan puppeteer regular (bukan puppeteer-core)
const puppeteer = require('puppeteer');

// Import modul utilitas
const ProxyManager = require('./utils/proxyManager');
const UserAgentRotator = require('./utils/userAgentRotator');
const SecurityChecker = require('./utils/checker');

const app = express();
const server = http.createServer(app);

// Konfigurasi Socket.IO untuk Railway
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(express.static('public'));

// Buat folder sessions jika belum ada
const sessionsDir = path.join(__dirname, 'sessions');
if (!fsSync.existsSync(sessionsDir)) {
  fsSync.mkdirSync(sessionsDir, { recursive: true });
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint untuk Railway
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'traffic-bot',
    chrome: process.env.CHROMIUM_PATH || 'system'
  });
});

// Store active sessions
const activeSessions = new Map();

// Fungsi untuk membuat profile directory unik
async function createProfileDirectory(sessionId, sessionIndex) {
  const profileDir = path.join(sessionsDir, `profile-${sessionId}-${sessionIndex}-${Date.now()}`);
  await fs.mkdir(profileDir, { recursive: true });
  return profileDir;
}

// Helper: Emit status via Socket.IO
function emitStatus(socketId, data) {
  if (socketId && io) {
    io.to(socketId).emit('bot-status', data);
  }
  // Juga log ke console
  console.log(`[${data.sessionId}] ${data.status}: ${data.message}`);
}

// Helper: Scroll seperti manusia
async function humanLikeScroll(page, sessionId, minPx = 200, maxPx = 800) {
  const scrollAmount = Math.floor(Math.random() * (maxPx - minPx + 1)) + minPx;
  const scrollTime = Math.random() * 800 + 400;
  
  await page.evaluate((amount, time) => {
    window.scrollBy({ top: amount, behavior: 'smooth' });
  }, scrollAmount);
  
  await page.waitForTimeout(scrollTime);
  console.log(`[${sessionId}] Scrolled ${scrollAmount}px`);
}

// Helper: Get browser launch options - FIXED FOR RAILWAY
async function getBrowserLaunchOptions(config, sessionId) {
  // FIX: Tentukan executable path untuk Railway
  let executablePath;
  
  if (process.env.RAILWAY_ENVIRONMENT) {
    // Di Railway, gunakan system Chromium
    executablePath = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
    console.log(`[${sessionId}] Using Railway Chromium at: ${executablePath}`);
  } else {
    // Untuk local development, gunakan puppeteer's bundled Chrome
    executablePath = puppeteer.executablePath();
    console.log(`[${sessionId}] Using Puppeteer Chrome at: ${executablePath}`);
  }

  const launchOptions = {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Penting untuk environment dengan memory terbatas
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-default-apps',
      '--disable-translate',
      '--disable-features=site-per-process,TranslateUI,BlinkGenPropertyTrees',
      '--enable-features=NetworkService,NetworkServiceInProcess',
      '--window-size=1920,1080',
      '--single-process', // Mengurangi memory usage untuk Railway
      '--no-zygote',
      '--no-first-run',
      '--no-default-browser-check'
    ],
    defaultViewport: { width: 1920, height: 1080 },
    executablePath: executablePath,
    headless: 'new', // Headless mode baru
    ignoreHTTPSErrors: true,
    timeout: 120000
  };

  // Tambahkan user data dir jika differentProfiles diaktifkan
  if (config.differentProfiles && config.profileDir) {
    launchOptions.userDataDir = config.profileDir;
    console.log(`[${sessionId}] Using profile directory: ${config.profileDir}`);
  }

  return launchOptions;
}

// Fungsi untuk setup proxy
async function setupProxy(config, sessionId, socketId) {
  const proxyConfig = {
    proxyServer: null,
    proxyAuth: null
  };

  if (config.proxySource === 'file' || config.proxySource === 'manual') {
    const proxyManager = new ProxyManager();
    
    if (config.proxySource === 'file') {
      // Load proxies dari file
      await proxyManager.loadProxies();
      await proxyManager.validateProxies();
      
      if (proxyManager.validProxies.length > 0) {
        const proxy = proxyManager.getRandomProxy();
        proxyConfig.proxyServer = `${proxy.host}:${proxy.port}`;
        if (proxy.username && proxy.password) {
          proxyConfig.proxyAuth = {
            username: proxy.username,
            password: proxy.password
          };
        }
        
        emitStatus(socketId, {
          sessionId,
          status: 'proxy_connected',
          message: `Using proxy: ${proxy.host}:${proxy.port}`
        });
      } else {
        emitStatus(socketId, {
          sessionId,
          status: 'warning',
          message: 'No valid proxies found, continuing without proxy'
        });
      }
    } else if (config.proxySource === 'manual' && config.manualProxy) {
      // Parse manual proxy
      const proxy = proxyManager.parseProxy(config.manualProxy);
      if (proxy) {
        proxyConfig.proxyServer = `${proxy.host}:${proxy.port}`;
        if (proxy.username && proxy.password) {
          proxyConfig.proxyAuth = {
            username: proxy.username,
            password: proxy.password
          };
        }
        
        emitStatus(socketId, {
          sessionId,
          status: 'proxy_connected',
          message: `Using manual proxy: ${proxy.host}:${proxy.port}`
        });
      }
    }
  }

  return proxyConfig;
}

// Fungsi untuk security check - FIXED WHOER ERROR
async function performSecurityCheck(config, sessionId, socketId, proxyConfig) {
  if (config.checkLeaks && proxyConfig.proxyServer) {
    emitStatus(socketId, {
      sessionId,
      status: 'security_check',
      message: 'Performing security check...'
    });

    try {
      const securityChecker = new SecurityChecker();
      
      // FIX: Gunakan URL yang lebih reliable untuk security check
      const securityResults = await securityChecker.checkIPInfo({
        host: proxyConfig.proxyServer.split(':')[0],
        port: parseInt(proxyConfig.proxyServer.split(':')[1]),
        protocol: 'http',
        ...(proxyConfig.proxyAuth ? {
          auth: {
            username: proxyConfig.proxyAuth.username,
            password: proxyConfig.proxyAuth.password
          }
        } : {})
      });

      if (securityResults.success) {
        emitStatus(socketId, {
          sessionId,
          status: 'security_result',
          message: `Security check: ${securityResults.data ? 'PASS' : 'Basic check completed'}`,
          data: securityResults.data
        });
        return true;
      } else {
        // Skip security check jika gagal, tapi tetap lanjut
        emitStatus(socketId, {
          sessionId,
          status: 'warning',
          message: 'Security check skipped, continuing...'
        });
        return true;
      }
    } catch (error) {
      console.error(`[${sessionId}] Security check failed:`, error.message);
      emitStatus(socketId, {
        sessionId,
        status: 'warning',
        message: `Security check failed: ${error.message}. Continuing...`
      });
      return true; // Continue anyway untuk menghindari blocking
    }
  }
  
  return true;
}

// Fungsi utama untuk menjalankan sesi bot - FIXED BROWSER LAUNCH
async function runBotSession(config, sessionIndex, mainSessionId, socketId = null) {
  const sessionId = `${mainSessionId}-${sessionIndex}`;
  const sessionConfig = { ...config };
  let browser = null;
  
  console.log(`[${sessionId}] Starting bot session ${sessionIndex + 1}/${config.sessionCount}`);
  
  try {
    // 1. Setup Profile Directory jika diperlukan
    if (config.differentProfiles) {
      sessionConfig.profileDir = await createProfileDirectory(mainSessionId, sessionIndex);
    }

    // 2. Setup User Agent Rotation
    const uaRotator = new UserAgentRotator();
    if (config.rotateUA) {
      sessionConfig.userAgent = uaRotator.getUserAgentForSession(sessionIndex);
      console.log(`[${sessionId}] Using User Agent: ${sessionConfig.userAgent}`);
    }

    // 3. Setup Proxy
    const proxyConfig = await setupProxy(config, sessionId, socketId);
    if (proxyConfig.proxyServer) {
      sessionConfig.proxyServer = proxyConfig.proxyServer;
      sessionConfig.proxyAuth = proxyConfig.proxyAuth;
    }

    // 4. Security Check (optional, tidak block jika gagal)
    await performSecurityCheck(config, sessionId, socketId, proxyConfig);

    // 5. Get Browser Launch Options - FIXED
    const launchOptions = await getBrowserLaunchOptions(sessionConfig, sessionId);
    
    // Tambahkan proxy jika ada
    if (sessionConfig.proxyServer) {
      launchOptions.args.push(`--proxy-server=${sessionConfig.proxyServer}`);
    }

    // 6. LAUNCH BROWSER - DENGAN ERROR HANDLING YANG LEBIH BAIK
    emitStatus(socketId, {
      sessionId,
      status: 'launching_browser',
      message: 'Launching browser...',
      progress: 10
    });

    try {
      browser = await puppeteer.launch(launchOptions);
    } catch (launchError) {
      console.error(`[${sessionId}] Failed to launch with primary method:`, launchError.message);
      
      // Fallback: Coba dengan minimal args jika gagal
      emitStatus(socketId, {
        sessionId,
        status: 'warning',
        message: 'Trying fallback browser launch...'
      });
      
      const fallbackOptions = {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: '/usr/bin/chromium',
        headless: 'new',
        timeout: 60000
      };
      
      browser = await puppeteer.launch(fallbackOptions);
    }
    
    emitStatus(socketId, {
      sessionId,
      status: 'browser_launched',
      message: 'Browser launched successfully',
      progress: 20
    });

    const page = await browser.newPage();
    
    // Set user agent jika ada
    if (sessionConfig.userAgent) {
      await page.setUserAgent(sessionConfig.userAgent);
    }
    
    // Setup proxy authentication jika diperlukan
    if (sessionConfig.proxyAuth && sessionConfig.proxyAuth.username) {
      await page.authenticate({
        username: sessionConfig.proxyAuth.username,
        password: sessionConfig.proxyAuth.password || ''
      });
    }

    // Set timeout untuk navigation
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(30000);

    // 7. EKSEKUSI BERDASARKAN TARGET
    let result;
    if (config.target === 'youtube') {
      result = await handleYouTubeTraffic(page, sessionConfig, sessionId, socketId);
    } else if (config.target === 'website') {
      result = await handleWebsiteTraffic(page, sessionConfig, sessionId, socketId);
    } else {
      throw new Error(`Target tidak didukung: ${config.target}`);
    }

    // 8. CLEANUP
    await page.close().catch(e => console.error(`[${sessionId}] Error closing page:`, e));
    
    emitStatus(socketId, {
      sessionId,
      status: 'completed',
      message: 'Sesi bot berhasil diselesaikan',
      progress: 100
    });

    console.log(`[${sessionId}] Bot session completed successfully`);
    return { success: true, sessionId, ...result };

  } catch (error) {
    console.error(`[${sessionId}] Error in bot session:`, error);
    
    emitStatus(socketId, {
      sessionId,
      status: 'error',
      message: `Error: ${error.message}`
    });

    throw error;
  } finally {
    // PASTIKAN BROWSER SELALU DITUTUP
    if (browser) {
      try {
        await browser.close();
        console.log(`[${sessionId}] Browser closed`);
      } catch (error) {
        console.error(`[${sessionId}] Error closing browser:`, error);
      }
    }
    
    // Cleanup profile directory jika ada
    if (sessionConfig.profileDir) {
      try {
        await fs.rm(sessionConfig.profileDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

// Fungsi untuk traffic YouTube (sama seperti sebelumnya)
async function handleYouTubeTraffic(page, config, sessionId, socketId) {
  // ... (kode tetap sama seperti sebelumnya) ...
}

// Fungsi untuk traffic website (sama seperti sebelumnya)
async function handleWebsiteTraffic(page, config, sessionId, socketId) {
  // ... (kode tetap sama seperti sebelumnya) ...
}

// Fungsi utama untuk menjalankan semua sesi bot
async function runTrafficBot(config, socketId = null) {
  const mainSessionId = config.sessionId || uuidv4();
  const sessionCount = config.sessionCount || 1;
  
  console.log(`[${mainSessionId}] Starting ${sessionCount} bot sessions`);
  
  activeSessions.set(mainSessionId, {
    status: 'running',
    startTime: new Date(),
    sessions: []
  });

  try {
    const results = [];
    
    for (let i = 0; i < sessionCount; i++) {
      emitStatus(socketId, {
        sessionId: mainSessionId,
        status: 'session_start',
        message: `Memulai sesi ${i + 1}/${sessionCount}`,
        progress: Math.floor((i / sessionCount) * 10)
      });

      const result = await runBotSession(config, i, mainSessionId, socketId);
      results.push(result);
      
      // Update active sessions
      const sessionData = activeSessions.get(mainSessionId);
      sessionData.sessions.push({
        index: i,
        status: 'completed',
        result: result.success
      });
      activeSessions.set(mainSessionId, sessionData);
    }

    emitStatus(socketId, {
      sessionId: mainSessionId,
      status: 'all_completed',
      message: `Semua ${sessionCount} sesi selesai`,
      progress: 100,
      data: results
    });

    return { 
      success: true, 
      mainSessionId, 
      sessionCount, 
      results,
      completedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`[${mainSessionId}] Error in main bot execution:`, error);
    
    emitStatus(socketId, {
      sessionId: mainSessionId,
      status: 'main_error',
      message: `Error utama: ${error.message}`
    });

    throw error;
  } finally {
    // Clean up session data after a delay
    setTimeout(() => {
      activeSessions.delete(mainSessionId);
    }, 300000);
  }
}

// Route untuk memulai bot
app.post('/api/start-bot', async (req, res) => {
  const requestId = uuidv4().slice(0, 8);
  console.log(`[REQ-${requestId}] Received start-bot request`);
  
  try {
    const config = req.body || {};
    const socketId = req.headers['x-socket-id'] || null;
    
    // Validasi minimal
    if (!config.target) {
      return res.status(400).json({ 
        success: false, 
        error: 'Target harus ditentukan (youtube/website)',
        requestId 
      });
    }

    // Default values
    config.sessionCount = config.sessionCount || 1;
    config.sessionId = config.sessionId || `${requestId}-${Date.now()}`;
    config.differentProfiles = config.differentProfiles || false;
    config.rotateUA = config.rotateUA || false;
    config.checkLeaks = config.checkLeaks || false;
    config.proxySource = config.proxySource || 'none';
    
    // Kirim respons segera (async processing)
    res.json({ 
      success: true, 
      message: 'Bot session started',
      sessionId: config.sessionId,
      sessionCount: config.sessionCount,
      requestId
    });

    console.log(`[${config.sessionId}] Starting ${config.sessionCount} bot sessions asynchronously`);
    
    // Jalankan bot secara asynchronous
    setTimeout(async () => {
      try {
        const result = await runTrafficBot(config, socketId);
        console.log(`[${config.sessionId}] Bot sessions finished successfully`);
        
        // Emit via Socket.IO jika ada socketId
        if (socketId && io) {
          io.to(socketId).emit('bot-complete', result);
        }
      } catch (error) {
        console.error(`[${config.sessionId}] Bot sessions failed:`, error.message);
        
        if (socketId && io) {
          io.to(socketId).emit('bot-error', { 
            sessionId: config.sessionId,
            error: error.message 
          });
        }
      }
    }, 100);

  } catch (error) {
    console.error(`[REQ-${requestId}] Error in /api/start-bot:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error',
      requestId 
    });
  }
});

// Route untuk mendapatkan status session
app.get('/api/session-status/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const sessionData = activeSessions.get(sessionId);
  
  if (sessionData) {
    res.json({ 
      sessionId, 
      status: sessionData.status,
      startTime: sessionData.startTime,
      sessions: sessionData.sessions,
      runningTime: Date.now() - sessionData.startTime.getTime()
    });
  } else {
    res.json({ 
      sessionId, 
      status: 'not_found',
      message: 'Session tidak ditemukan atau sudah selesai'
    });
  }
});

// Route untuk mendapatkan semua active sessions
app.get('/api/active-sessions', (req, res) => {
  const sessions = Array.from(activeSessions.entries()).map(([id, data]) => ({
    sessionId: id,
    status: data.status,
    startTime: data.startTime,
    sessionCount: data.sessions.length
  }));
  
  res.json({ sessions });
});

// Route untuk menghentikan session
app.post('/api/stop-session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (activeSessions.has(sessionId)) {
    activeSessions.delete(sessionId);
    res.json({ 
      success: true, 
      message: `Session ${sessionId} dihentikan`,
      sessionId 
    });
  } else {
    res.status(404).json({ 
      success: false, 
      message: 'Session tidak ditemukan',
      sessionId 
    });
  }
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Simpan socket ID untuk emisi status spesifik
  socket.emit('connected', { 
    socketId: socket.id,
    message: 'Connected to bot server',
    timestamp: new Date().toISOString()
  });
  
  socket.on('start-bot', async (config) => {
    console.log(`[SOCKET-${socket.id}] Received start-bot command`);
    
    try {
      // Tambahkan socketId ke config
      config.socketId = socket.id;
      config.sessionId = config.sessionId || `${socket.id}-${Date.now()}`;
      
      // Kirim konfirmasi
      socket.emit('bot-started', {
        sessionId: config.sessionId,
        message: 'Bot session started via WebSocket'
      });
      
      // Jalankan bot
      const result = await runTrafficBot(config, socket.id);
      socket.emit('bot-complete', result);
    } catch (error) {
      console.error(`[SOCKET-${socket.id}] Bot error:`, error);
      socket.emit('bot-error', { 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  socket.on('stop-bot', (data) => {
    const sessionId = data?.sessionId;
    console.log(`[SOCKET-${socket.id}] Stop bot for session: ${sessionId}`);
    
    if (sessionId && activeSessions.has(sessionId)) {
      activeSessions.delete(sessionId);
      socket.emit('bot-stopped', {
        sessionId,
        message: 'Bot session stopped',
        timestamp: new Date().toISOString()
      });
    }
  });
  
  socket.on('clear-cache', () => {
    console.log(`[SOCKET-${socket.id}] Clear cache requested`);
    
    // Bersihkan folder sessions
    try {
      fsSync.readdirSync(sessionsDir).forEach(file => {
        const filePath = path.join(sessionsDir, file);
        if (fsSync.statSync(filePath).isDirectory()) {
          fsSync.rmSync(filePath, { recursive: true, force: true });
        }
      });
      
      socket.emit('cache-cleared', {
        message: 'Cache cleared successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
      socket.emit('cache-error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 WebSocket enabled: ${io ? 'Yes' : 'No'}`);
  console.log(`📁 Sessions directory: ${sessionsDir}`);
  console.log(`🐢 Puppeteer executable: ${puppeteer.executablePath()}`);
});

// Ekspor untuk testing
module.exports = { 
  app, 
  runTrafficBot, 
  handleYouTubeTraffic, 
  handleWebsiteTraffic,
  activeSessions 
};