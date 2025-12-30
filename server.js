// Tangkap semua error yang tidak tertangkap
process.on('uncaughtException', (err) => {
  console.error('❌ [UNCAUGHT EXCEPTION] FATAL:', err.message, err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [UNHANDLED REJECTION] FATAL:', reason);
  process.exit(1);
});
// ======================== STARTUP DEBUGGING ========================
console.log('🚀 [DEBUG] Node.js process starting...');
console.log(`[DEBUG] Node ${process.version}, Platform: ${process.platform}`);
console.log(`[DEBUG] ENV: NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT}`);
console.log(`[DEBUG] CWD: ${process.cwd()}`);
console.log(`[DEBUG] PID: ${process.pid}`);

// Tangkap SEMUA sinyal dan log
const signals = ['SIGTERM', 'SIGINT', 'SIGHUP', 'SIGABRT', 'SIGQUIT', 'SIGUSR1', 'SIGUSR2'];
signals.forEach(signal => {
  process.on(signal, () => {
    console.error(`⚡ [DEBUG] Received signal: ${signal} at ${new Date().toISOString()}`);
    console.error(`[DEBUG] Uptime before exit: ${process.uptime()}s`);
    // Force flush logs
    if (process.stdout) process.stdout.write('');
    if (process.stderr) process.stderr.write('');
    // Exit dengan kode yang berbeda untuk identifikasi
    const exitCode = signal === 'SIGTERM' ? 143 : 130;
    setTimeout(() => process.exit(exitCode), 100);
  });
});

// Tangkap exit terakhir
process.on('exit', (code) => {
  console.error(`🔚 [DEBUG] Process exiting with code: ${code}`);
});

// Tangkap Warning
process.on('warning', (warning) => {
  console.warn(`⚠️ [DEBUG] Node Warning: ${warning.name}: ${warning.message}`);
  console.warn(`[DEBUG] Stack: ${warning.stack}`);
});
// ======================== END DEBUGGING ========================
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
// Log memory usage tiap 10 detik
setInterval(() => {
    const mem = process.memoryUsage();
    console.log(`[MEM] RSS: ${Math.round(mem.rss/1024/1024)}MB | Heap: ${Math.round(mem.heapUsed/1024/1024)}MB`);
}, 10000);

// Gunakan puppeteer dengan konfigurasi untuk Railway
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
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 10000
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));
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
  // Log setiap panggilan health check (untuk debug)
  console.log(`[HEALTH] Checked at ${new Date().toISOString()}, Uptime: ${process.uptime()}s`);
  
  // Status selalu OK asalkan server merespons
  // Railway hanya perlu melihat response 200, tidak peduli isinya
  res.status(200).json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'traffic-bot-v3',
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      heap: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
    }
  });
});

// API Status
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'Traffic Bot API v3.0 is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    activeSessions: activeSessions.size
  });
});

// Route untuk cek proxy
app.get('/api/proxy-status', async (req, res) => {
  try {
    const proxyManager = new ProxyManager();
    await proxyManager.loadProxiesFromFile('proxies.txt');
    const stats = proxyManager.getStats();
    res.json({ 
      success: true, 
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
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
  // Log ke console untuk debugging
  console.log(`[${data.sessionId || 'SERVER'}] ${data.status}: ${data.message}`);
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

// Fungsi untuk login ke Google/YouTube
async function loginToGoogle(page, config, sessionId, socketId) {
  console.log(`[${sessionId}] Attempting Google login...`);
  
  emitStatus(socketId, {
    sessionId,
    status: 'login',
    message: 'Mencoba login ke Google...',
    progress: 40
  });

  try {
    // Pergi ke halaman login Google
    await page.goto('https://accounts.google.com/signin', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Tunggu hingga form login muncul
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Isi email
    await page.type('input[type="email"]', config.googleEmail);
    await page.waitForTimeout(1000);
    
    // Klik "Berikutnya"
    const nextButton = await page.$('#identifierNext button');
    if (nextButton) {
      await nextButton.click();
    }
    
    await page.waitForTimeout(2000);

    // Tunggu form password
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    
    // Isi password
    await page.type('input[type="password"]', config.googlePassword);
    await page.waitForTimeout(1000);
    
    // Klik "Berikutnya"
    const passwordNext = await page.$('#passwordNext button');
    if (passwordNext) {
      await passwordNext.click();
    }

    // Tunggu login berhasil (maksimal 15 detik)
    await page.waitForTimeout(5000);
    
    // Cek apakah login berhasil
    const currentUrl = page.url();
    if (!currentUrl.includes('accounts.google.com')) {
      console.log(`[${sessionId}] Google login successful!`);
      emitStatus(socketId, {
        sessionId,
        status: 'login_success',
        message: 'Login ke Google berhasil',
        progress: 50
      });
      return true;
    } else {
      // Mungkin ada 2FA atau error
      console.log(`[${sessionId}] Login mungkin membutuhkan verifikasi 2FA`);
      emitStatus(socketId, {
        sessionId,
        status: 'login_2fa',
        message: 'Login mungkin membutuhkan verifikasi 2FA',
        progress: 45
      });
      return false;
    }

  } catch (error) {
    console.error(`[${sessionId}] Google login failed:`, error.message);
    emitStatus(socketId, {
      sessionId,
      status: 'login_error',
      message: `Login gagal: ${error.message}`,
      progress: 45
    });
    return false;
  }
}

// Fungsi untuk login ke YouTube
async function loginToYouTube(page, config, sessionId, socketId) {
  console.log(`[${sessionId}] Attempting YouTube login...`);
  
  emitStatus(socketId, {
    sessionId,
    status: 'login',
    message: 'Mencoba login ke YouTube...',
    progress: 40
  });

  try {
    // Pergi ke YouTube
    await page.goto('https://www.youtube.com', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Cek apakah sudah login (ada avatar)
    const avatar = await page.$('#avatar-btn');
    if (avatar) {
      console.log(`[${sessionId}] Already logged in to YouTube`);
      emitStatus(socketId, {
        sessionId,
        status: 'login_success',
        message: 'Sudah login ke YouTube',
        progress: 50
      });
      return true;
    }

    // Jika belum login, klik tombol login
    const loginButton = await page.$('ytd-button-renderer yt-button-shape a');
    if (loginButton) {
      await loginButton.click();
      await page.waitForTimeout(3000);
      
      // Sekarang akan diarahkan ke Google login
      return await loginToGoogle(page, config, sessionId, socketId);
    }

    return false;
  } catch (error) {
    console.error(`[${sessionId}] YouTube login failed:`, error.message);
    return false;
  }
}

// Helper: Get browser launch options untuk Railway
async function getBrowserLaunchOptions(config, sessionId) {
  let executablePath;
  
  // Tentukan executable path berdasarkan environment
  if (process.env.RAILWAY_ENVIRONMENT === 'true' || process.env.RAILWAY_ENVIRONMENT) {
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
    '--disable-dev-shm-usage',       // PENTING untuk Docker
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',                 // Hemat memory GPU
    '--single-process',              // MODE KRITIS: Hemat memory besar
    '--no-zygote',
    '--no-first-run',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--disable-translate',
    '--metrics-recording-only',
    '--mute-audio',
    '--no-default-browser-check',
    '--window-size=1280,720'         // Ukuran lebih kecil
  ],
  defaultViewport: { width: 1280, height: 720 },
  executablePath: executablePath,
  headless: 'new',                   // Gunakan headless baru
  ignoreHTTPSErrors: true,
  timeout: 30000                     // Timeout 30 detik
};

  // Tambahkan user data dir jika differentProfiles diaktifkan
  if (config.differentProfiles && config.profileDir) {
    launchOptions.userDataDir = config.profileDir;
    console.log(`[${sessionId}] Using profile directory: ${config.profileDir}`);
  }

  return launchOptions;
}

// Setup proxy dengan support multiple proxies
async function setupProxy(config, sessionId, socketId, sessionIndex) {
  console.log(`[${sessionId}] Setup proxy dengan source: ${config.proxySource}`);
  
  const proxyConfig = {
    proxyServer: null,
    proxyAuth: null,
    proxyInfo: null
  };

  const proxyManager = new ProxyManager();
  
  // OPTION 1: Load dari file proxies.txt
  if (config.proxySource === 'file') {
    await proxyManager.loadProxiesFromFile('proxies.txt');
    
    // Validasi proxy jika diaktifkan
    if (config.validateProxies) {
      emitStatus(socketId, {
        sessionId,
        status: 'proxy_test',
        message: 'Testing proxies...',
        progress: 15
      });
      
      const results = await proxyManager.validateAllProxies();
      emitStatus(socketId, {
        sessionId,
        status: 'proxy_results',
        message: `Proxy test: ${results.working}/${results.total} working`,
        data: results,
        progress: 20
      });
    } else {
      // Jika tidak divalidasi, anggap semua proxy valid
      proxyManager.validProxies = [...proxyManager.proxies];
    }
    
    // Dapatkan proxy untuk session ini
    const proxy = proxyManager.getProxyForSession(sessionIndex);
    
    if (proxy) {
      proxyConfig.proxyServer = `${proxy.host}:${proxy.port}`;
      proxyConfig.proxyInfo = proxy;
      
      if (proxy.username && proxy.password) {
        proxyConfig.proxyAuth = {
          username: proxy.username,
          password: proxy.password
        };
      }
      
      emitStatus(socketId, {
        sessionId,
        status: 'proxy_assigned',
        message: `Using proxy ${sessionIndex + 1}: ${proxy.host}:${proxy.port}`,
        data: { proxyIndex: sessionIndex, totalProxies: proxyManager.validProxies.length },
        progress: 25
      });
    }
  }
  // OPTION 2: Proxy manual (single)
  else if (config.proxySource === 'manual' && config.manualProxy) {
    const proxy = proxyManager.parseProxy(config.manualProxy);
    if (proxy) {
      proxyConfig.proxyServer = `${proxy.host}:${proxy.port}`;
      if (proxy.username && proxy.password) {
        proxyConfig.proxyAuth = {
          username: proxy.username,
          password: proxy.password
        };
      }
    }
  }
  // OPTION 3: Multiple manual proxies (dipisah koma)
  else if (config.proxySource === 'multi_manual' && config.multiProxies) {
    console.log(`[${sessionId}] Parsing multiple proxies: ${config.multiProxies}`);
    
    const proxyList = config.multiProxies.split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    if (proxyList.length === 0) {
      console.error(`[${sessionId}] ❌ ERROR: Tidak ada proxy valid dalam multiProxies`);
      throw new Error('Proxy list kosong. Format: host1:port1, host2:port2, ...');
    }
    
    console.log(`[${sessionId}] Found ${proxyList.length} proxies`);
    
    // Pilih proxy berdasarkan session index
    const proxyIndex = sessionIndex % proxyList.length;
    const proxyStr = proxyList[proxyIndex];
    
    // Parse proxy string
    const parts = proxyStr.split(':');
    if (parts.length === 4) {
      // Format: host:port:user:pass
      proxyConfig.proxyServer = `${parts[0]}:${parts[1]}`;
      proxyConfig.proxyAuth = {
        username: parts[2],
        password: parts[3]
      };
      console.log(`[${sessionId}] Menggunakan proxy ${proxyIndex+1}/${proxyList.length}: ${parts[0]}:${parts[1]} (dengan auth)`);
    } else if (parts.length === 2) {
      // Format: host:port
      proxyConfig.proxyServer = proxyStr;
      console.log(`[${sessionId}] Menggunakan proxy ${proxyIndex+1}/${proxyList.length}: ${proxyStr} (tanpa auth)`);
    } else {
      console.error(`[${sessionId}] ❌ Format proxy tidak valid: ${proxyStr}`);
      throw new Error(`Format proxy tidak valid. Gunakan "host:port" atau "host:port:user:pass"`);
    }
  }

  return proxyConfig;
}

// Fungsi untuk security check
async function performSecurityCheck(config, sessionId, socketId, proxyConfig) {
  if (config.checkLeaks && proxyConfig.proxyServer) {
    emitStatus(socketId, {
      sessionId,
      status: 'security_check',
      message: 'Performing security check...',
      progress: 30
    });

    try {
      const securityChecker = new SecurityChecker();
      
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
          data: securityResults.data,
          progress: 35
        });
        return true;
      } else {
        emitStatus(socketId, {
          sessionId,
          status: 'warning',
          message: 'Security check skipped, continuing...',
          progress: 35
        });
        return true;
      }
    } catch (error) {
      console.error(`[${sessionId}] Security check failed:`, error.message);
      emitStatus(socketId, {
        sessionId,
        status: 'warning',
        message: `Security check failed: ${error.message}. Continuing...`,
        progress: 35
      });
      return true;
    }
  }
  
  return true;
}

// Fungsi utama untuk menjalankan sesi bot dengan login support
async function runBotSession(config, sessionIndex, mainSessionId, socketId = null) {
  const sessionId = `${mainSessionId}-${sessionIndex}`;
  const sessionConfig = { ...config };
  let browser = null;
  
  console.log(`\n=== [${sessionId}] STARTING BOT SESSION ${sessionIndex + 1}/${config.sessionCount} ===`);
  console.log(`[${sessionId}] Config:`, {
    target: config.target,
    webUrl: config.webUrl,
    visitDuration: config.visitDuration,
    scrollPattern: config.scrollPattern,
    proxySource: config.proxySource,
    socketId: socketId ? socketId.substring(0, 8) + '...' : 'none'
  });
  
  try {
    // 1. Setup Profile Directory jika diperlukan
    if (config.differentProfiles) {
      sessionConfig.profileDir = await createProfileDirectory(mainSessionId, sessionIndex);
      console.log(`[${sessionId}] Created profile directory: ${sessionConfig.profileDir}`);
    }

    // 2. Setup User Agent Rotation
    const uaRotator = new UserAgentRotator();
    if (config.rotateUA) {
      sessionConfig.userAgent = uaRotator.getUserAgentForSession(sessionIndex);
      console.log(`[${sessionId}] Using User Agent: ${sessionConfig.userAgent.substring(0, 50)}...`);
    }

    // 3. Setup Proxy dengan support multiple
    const proxyConfig = await setupProxy(config, sessionId, socketId, sessionIndex);
    if (proxyConfig.proxyServer) {
      sessionConfig.proxyServer = proxyConfig.proxyServer;
      sessionConfig.proxyAuth = proxyConfig.proxyAuth;
      console.log(`[${sessionId}] Using proxy: ${proxyConfig.proxyServer}`);
    }

    // 4. Security Check
    await performSecurityCheck(config, sessionId, socketId, proxyConfig);

    // 5. Get Browser Launch Options
    const launchOptions = await getBrowserLaunchOptions(sessionConfig, sessionId);
    
    // Tambahkan proxy jika ada
    if (sessionConfig.proxyServer) {
      launchOptions.args.push(`--proxy-server=${sessionConfig.proxyServer}`);
      console.log(`[${sessionId}] Added proxy to browser args`);
    }

    // 6. LAUNCH BROWSER
    emitStatus(socketId, {
      sessionId,
      status: 'launching_browser',
      message: 'Launching browser...',
      progress: 40
    });

    console.log(`[${sessionId}] Launching browser with ${launchOptions.headless ? 'headless' : 'headed'} mode...`);
    
    try {
      browser = await puppeteer.launch(launchOptions);
      console.log(`[${sessionId}] Browser launched successfully`);
    } catch (launchError) {
      console.error(`[${sessionId}] Failed to launch with primary method:`, launchError.message);
      
      emitStatus(socketId, {
        sessionId,
        status: 'warning',
        message: 'Trying fallback browser launch...',
        progress: 40
      });
      
      // Fallback options untuk Railway
      const fallbackOptions = {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
        headless: 'new',
        timeout: 60000
      };
      
      browser = await puppeteer.launch(fallbackOptions);
      console.log(`[${sessionId}] Browser launched with fallback method`);
    }
    
    emitStatus(socketId, {
      sessionId,
      status: 'browser_launched',
      message: 'Browser launched successfully',
      progress: 50
    });

    const page = await browser.newPage();
    console.log(`[${sessionId}] New page created`);
    
    // Set user agent jika ada
    if (sessionConfig.userAgent) {
      await page.setUserAgent(sessionConfig.userAgent);
      console.log(`[${sessionId}] User agent set`);
    }
    
    // Setup proxy authentication jika diperlukan
    if (sessionConfig.proxyAuth && sessionConfig.proxyAuth.username) {
      await page.authenticate({
        username: sessionConfig.proxyAuth.username,
        password: sessionConfig.proxyAuth.password || ''
      });
      console.log(`[${sessionId}] Proxy authentication set`);
    }

    // Set timeout untuk navigation
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(30000);

    // 7. LOGIN JIKA DIKONFIGURASI
    if (config.loginMethod && config.loginMethod !== 'none' && 
        config.googleEmail && config.googlePassword) {
      
      emitStatus(socketId, {
        sessionId,
        status: 'login_start',
        message: 'Memulai proses login...',
        progress: 55
      });
      
      console.log(`[${sessionId}] Attempting login with method: ${config.loginMethod}`);
      
      let loginSuccess = false;
      
      if (config.loginMethod === 'google') {
        loginSuccess = await loginToGoogle(page, config, sessionId, socketId);
      } else if (config.loginMethod === 'youtube') {
        loginSuccess = await loginToYouTube(page, config, sessionId, socketId);
      }
      
      if (loginSuccess) {
        emitStatus(socketId, {
          sessionId,
          status: 'login_complete',
          message: 'Login berhasil, melanjutkan...',
          progress: 60
        });
        await page.waitForTimeout(2000);
      } else {
        emitStatus(socketId, {
          sessionId,
          status: 'warning',
          message: 'Login gagal, melanjutkan tanpa login',
          progress: 60
        });
      }
    } else {
      console.log(`[${sessionId}] No login required, proceeding directly...`);
    }

    // 8. EKSEKUSI BERDASARKAN TARGET
    let result;
    if (config.target === 'youtube') {
      console.log(`[${sessionId}] Executing YouTube traffic...`);
      result = await handleYouTubeTraffic(page, sessionConfig, sessionId, socketId);
    } else if (config.target === 'website') {
      console.log(`[${sessionId}] Executing Website traffic...`);
      result = await handleWebsiteTraffic(page, sessionConfig, sessionId, socketId);
    } else {
      throw new Error(`Target tidak didukung: ${config.target}`);
    }

    // 9. CLEANUP
    console.log(`[${sessionId}] Cleaning up...`);
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
    console.error(`[${sessionId}] Error stack:`, error.stack);
    
    emitStatus(socketId, {
      sessionId,
      status: 'error',
      message: `Error: ${error.message}`,
      progress: 100
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
        console.log(`[${sessionId}] Profile directory cleaned`);
      } catch (e) {
        console.log(`[${sessionId}] Error cleaning profile directory:`, e.message);
      }
    }
    
    console.log(`=== [${sessionId}] BOT SESSION ENDED ===\n`);
  }
}

// Fungsi untuk traffic YouTube
async function handleYouTubeTraffic(page, config, sessionId, socketId) {
  console.log(`[${sessionId}] Starting YouTube traffic...`);
  
  emitStatus(socketId, {
    sessionId,
    status: 'progress',
    message: 'Membuka YouTube...',
    progress: 65
  });

  try {
    // OPTION A: Pergi ke URL langsung jika disediakan
    if (config.ytDirectUrl) {
      console.log(`[${sessionId}] Navigating to direct URL: ${config.ytDirectUrl}`);
      await page.goto(config.ytDirectUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
    } 
    // OPTION B: Atau cari berdasarkan keyword
    else if (config.ytKeyword) {
      await page.goto('https://www.youtube.com', { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      console.log(`[${sessionId}] Searching for: ${config.ytKeyword}`);
      
      await page.waitForSelector('input[name="search_query"]', { timeout: 10000 });
      await page.type('input[name="search_query"]', config.ytKeyword);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);

      emitStatus(socketId, {
        sessionId,
        status: 'progress',
        message: `Mencari "${config.ytKeyword}"...`,
        progress: 70
      });
      
      // Klik video pertama yang ditemukan
      const videoSelector = 'ytd-video-renderer #thumbnail';
      await page.waitForSelector(videoSelector, { timeout: 10000 });
      const videos = await page.$$(videoSelector);
      if (videos.length > 0) {
        console.log(`[${sessionId}] Clicking first video from search`);
        await videos[0].click();
        await page.waitForTimeout(5000);
      } else {
        throw new Error('Tidak ada video ditemukan di hasil pencarian');
      }
    } else {
      throw new Error('Harap berikan ytKeyword ATAU ytDirectUrl');
    }

    // TUNGGU VIDEO DIMUAT
    emitStatus(socketId, {
      sessionId,
      status: 'progress',
      message: 'Video sedang dimuat...',
      progress: 75
    });
    
    await page.waitForTimeout(5000);

    // SIMULASI MENONTON DENGAN SCROLL
    const watchDuration = (config.watchDuration || 1) * 60000;
    const segmentDuration = 10000;
    const segments = Math.ceil(watchDuration / segmentDuration);
    
    console.log(`[${sessionId}] Simulating watch for ${watchDuration/1000}s in ${segments} segments`);
    
    for (let i = 0; i < segments; i++) {
      await humanLikeScroll(page, sessionId, 100, 400);
      
      if (Math.random() > 0.7) {
        await page.keyboard.press(' ');
        await page.waitForTimeout(1000);
        await page.keyboard.press(' ');
      }
      
      await page.waitForTimeout(segmentDuration);
      
      emitStatus(socketId, {
        sessionId,
        status: 'progress',
        message: `Menonton... (${i+1}/${segments})`,
        progress: 75 + Math.floor((i / segments) * 20)
      });
    }

    // INTERAKSI: LIKE
    if (config.ytLike) {
      try {
        const likeButton = await page.$('button[aria-label^="Like"]') || 
                           await page.$('button[aria-label*="like" i]') ||
                           await page.$('ytd-toggle-button-renderer yt-icon-button');
        
        if (likeButton) {
          await likeButton.click();
          console.log(`[${sessionId}] Liked the video`);
          await page.waitForTimeout(2000);
          emitStatus(socketId, {
            sessionId,
            status: 'interaction',
            message: 'Video telah di-like'
          });
        }
      } catch (e) {
        console.log(`[${sessionId}] Could not like video:`, e.message);
      }
    }

    // INTERAKSI: COMMENT (jika diaktifkan DAN config.commentText ada)
    if (config.ytComment && config.commentText) {
      try {
        await page.evaluate(() => {
          window.scrollBy(0, 800);
        });
        await page.waitForTimeout(2000);
        
        const commentBoxSelector = '#placeholder-area, #contenteditable-root, #container #contenteditable';
        const commentBox = await page.$(commentBoxSelector);
        if (commentBox) {
          await commentBox.click();
          await page.waitForTimeout(1000);
          
          await page.type(commentBoxSelector, config.commentText, { delay: 50 });
          await page.waitForTimeout(2000);
          
          const submitButton = await page.$('#submit-button, yt-button-renderer[aria-label^="Comment"]');
          if (submitButton) {
            await submitButton.click();
            console.log(`[${sessionId}] Comment posted`);
            emitStatus(socketId, {
              sessionId,
              status: 'interaction',
              message: 'Komentar telah diposting'
            });
          }
        }
      } catch (e) {
        console.log(`[${sessionId}] Could not post comment:`, e.message);
      }
    }

    // INTERAKSI: SUBSCRIBE
    if (config.ytSubscribe) {
      try {
        const subscribeButton = await page.$('#subscribe-button, ytd-subscribe-button-renderer, tp-yt-paper-button[aria-label^="Subscribe"]');
        if (subscribeButton) {
          const buttonText = await page.evaluate(btn => btn.textContent, subscribeButton);
          if (!buttonText.includes('Subscribed')) {
            await subscribeButton.click();
            console.log(`[${sessionId}] Subscribed to channel`);
            await page.waitForTimeout(2000);
            emitStatus(socketId, {
              sessionId,
              status: 'interaction',
              message: 'Berlangganan channel'
            });
          }
        }
      } catch (e) {
        console.log(`[${sessionId}] Could not subscribe:`, e.message);
      }
    }

    emitStatus(socketId, {
      sessionId,
      status: 'progress',
      message: 'Sesi YouTube selesai',
      progress: 95
    });

    return { action: 'youtube_traffic', success: true, watched: true };

  } catch (error) {
    console.error(`[${sessionId}] Error in YouTube traffic:`, error);
    emitStatus(socketId, {
      sessionId,
      status: 'error',
      message: `YouTube Error: ${error.message}`
    });
    return { action: 'youtube_traffic', success: false, error: error.message };
  }
}

// Fungsi untuk traffic website
async function handleWebsiteTraffic(page, config, sessionId, socketId) {
  console.log(`[${sessionId}] Starting website traffic...`);
  
  if (!config.webUrl) {
    throw new Error('webUrl diperlukan untuk traffic website');
  }

  // NORMALIZE URL
  let targetUrl = config.webUrl;
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
    console.log(`[${sessionId}] Normalized URL: ${targetUrl}`);
  }
  
  console.log(`[${sessionId}] Target URL: ${targetUrl}`);
  
  emitStatus(socketId, {
    sessionId,
    status: 'progress',
    message: `Membuka ${targetUrl}...`,
    progress: 65
  });

  try {
    console.log(`[${sessionId}] Navigating to ${targetUrl}`);
    await page.goto(targetUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Cek apakah halaman berhasil dimuat
    const pageTitle = await page.title();
    console.log(`[${sessionId}] Page loaded successfully. Title: "${pageTitle}"`);
    
    emitStatus(socketId, {
      sessionId,
      status: 'progress',
      message: `Website berhasil dimuat: "${pageTitle.substring(0, 50)}..."`,
      progress: 70
    });

    // Tunggu 2 detik untuk stabilisasi
    await page.waitForTimeout(2000);

    // TENTUKAN POLA SCROLL BERDASARKAN KONFIG
    let scrollConfig = {
      count: 5,
      minDelay: 1000,
      maxDelay: 3000,
      minScroll: 300,
      maxScroll: 800
    };
    
    if (config.scrollPattern === 'skimmer') {
      scrollConfig = { count: 3, minDelay: 500, maxDelay: 1500, minScroll: 500, maxScroll: 1200 };
    } else if (config.scrollPattern === 'reader') {
      scrollConfig = { count: 8, minDelay: 2000, maxDelay: 5000, minScroll: 200, maxScroll: 500 };
    } else if (config.scrollPattern === 'researcher') {
      scrollConfig = { count: 10, minDelay: 1500, maxDelay: 4000, minScroll: 100, maxScroll: 400 };
    }
    
    console.log(`[${sessionId}] Scroll pattern: ${config.scrollPattern}, Count: ${scrollConfig.count}`);

    // EKSEKUSI SCROLL
    for (let i = 0; i < scrollConfig.count; i++) {
      const scrollAmount = Math.floor(Math.random() * (scrollConfig.maxScroll - scrollConfig.minScroll + 1)) + scrollConfig.minScroll;
      const delay = Math.random() * (scrollConfig.maxDelay - scrollConfig.minDelay) + scrollConfig.minDelay;
      
      await page.evaluate((amount) => {
        window.scrollBy({ top: amount, behavior: 'smooth' });
      }, scrollAmount);
      
      await page.waitForTimeout(delay);
      
      console.log(`[${sessionId}] Scroll ${i+1}/${scrollConfig.count}: ${scrollAmount}px, delay: ${Math.round(delay)}ms`);
      
      emitStatus(socketId, {
        sessionId,
        status: 'progress',
        message: `Menjelajahi halaman... (${i+1}/${scrollConfig.count})`,
        progress: 70 + Math.floor((i / scrollConfig.count) * 20)
      });
    }
    
    // KLIK LINK INTERNAL (jika diaktifkan)
    if (config.clickLinks) {
      try {
        console.log(`[${sessionId}] Looking for internal links to click...`);
        
        const links = await page.$$eval('a', anchors => 
          anchors
            .filter(a => {
              const href = a.href;
              const text = a.textContent.trim();
              return href && 
                     href.length > 0 &&
                     !href.includes('#') &&
                     !href.startsWith('javascript:') &&
                     !href.startsWith('mailto:') &&
                     text.length > 1 &&
                     !a.hasAttribute('download');
            })
            .map(a => ({ href: a.href, text: a.textContent.trim().substring(0, 50) }))
            .slice(0, 8)
        );

        console.log(`[${sessionId}] Found ${links.length} internal links`);
        
        if (links.length > 0) {
          const randomLink = links[Math.floor(Math.random() * links.length)];
          console.log(`[${sessionId}] Clicking internal link: ${randomLink.text} -> ${randomLink.href}`);
          
          emitStatus(socketId, {
            sessionId,
            status: 'navigation',
            message: `Mengunjungi: ${randomLink.text}...`
          });

          await page.goto(randomLink.href, { 
            waitUntil: 'networkidle2', 
            timeout: 15000 
          });
          
          await page.waitForTimeout(2000);
          
          // Scroll sedikit di halaman baru
          for (let i = 0; i < 2; i++) {
            await page.evaluate(() => {
              window.scrollBy({ top: 400, behavior: 'smooth' });
            });
            await page.waitForTimeout(1500);
          }
          
          emitStatus(socketId, {
            sessionId,
            status: 'progress',
            message: 'Mengunjungi halaman internal',
            progress: 90
          });
        } else {
          console.log(`[${sessionId}] No suitable internal links found`);
        }
      } catch (e) {
        console.log(`[${sessionId}] Could not navigate to internal link:`, e.message);
        // Lanjutkan tanpa error
      }
    }

    // TINGGAL DI HALAMAN SESUAI DURASI
    const visitTime = Math.min((config.visitDuration || 1) * 60000, 300000);
    console.log(`[${sessionId}] Staying on page for ${visitTime/1000} seconds`);
    
    if (visitTime > 0) {
      const staySegments = Math.ceil(visitTime / 10000);
      console.log(`[${sessionId}] Stay segments: ${staySegments}`);
      
      for (let i = 0; i < staySegments; i++) {
        await page.waitForTimeout(10000);
        
        // Scroll kecil-kecil sesekali
        if (i % 3 === 0) {
          await page.evaluate(() => {
            window.scrollBy({ top: Math.random() > 0.5 ? 100 : -50, behavior: 'smooth' });
          });
        }
        
        emitStatus(socketId, {
          sessionId,
          status: 'progress',
          message: `Mengamati konten... (${i+1}/${staySegments})`,
          progress: 90 + Math.floor((i / staySegments) * 5)
        });
      }
    }

    console.log(`[${sessionId}] Website traffic completed successfully`);
    
    emitStatus(socketId, {
      sessionId,
      status: 'progress',
      message: 'Traffic website selesai',
      progress: 100
    });

    return { 
      action: 'website_traffic', 
      success: true, 
      url: targetUrl,
      title: pageTitle,
      duration: visitTime 
    };

  } catch (error) {
    console.error(`[${sessionId}] Error in website traffic:`, error);
    console.error(`[${sessionId}] Error details:`, {
      url: targetUrl,
      errorMessage: error.message,
      errorStack: error.stack
    });
    
    emitStatus(socketId, {
      sessionId,
      status: 'error',
      message: `Website Error: ${error.message}`
    });
    
    return { 
      action: 'website_traffic', 
      success: false, 
      error: error.message,
      url: targetUrl 
    };
  }
}

// Fungsi utama untuk menjalankan semua sesi bot
async function runTrafficBot(config, socketId = null) {
  const mainSessionId = config.sessionId || uuidv4();
  const sessionCount = config.sessionCount || 1;
  
  console.log(`\n🎯 [${mainSessionId}] Starting ${sessionCount} bot sessions`);
  console.log(`📋 Config:`, {
    target: config.target,
    webUrl: config.webUrl,
    sessionCount: sessionCount,
    proxySource: config.proxySource
  });
  
  activeSessions.set(mainSessionId, {
    status: 'running',
    startTime: new Date(),
    sessions: [],
    config: config
  });

  try {
    const results = [];
    
    for (let i = 0; i < sessionCount; i++) {
      try {
        emitStatus(socketId, {
          sessionId: mainSessionId,
          status: 'session_start',
          message: `Memulai sesi ${i + 1}/${sessionCount}`,
          progress: Math.floor((i / sessionCount) * 10)
        });

        const result = await runBotSession(config, i, mainSessionId, socketId);
        results.push(result);
        
        const sessionData = activeSessions.get(mainSessionId);
        sessionData.sessions.push({
          index: i,
          status: 'completed',
          result: result.success
        });
        activeSessions.set(mainSessionId, sessionData);
        
      } catch (sessionError) {
        console.error(`[${mainSessionId}] ❌ Session ${i} GAGAL:`, sessionError.message);
        
        emitStatus(socketId, {
          sessionId: mainSessionId,
          status: 'session_failed',
          message: `Session ${i + 1} gagal: ${sessionError.message}`,
          progress: Math.floor(((i + 1) / sessionCount) * 10)
        });
        
        // Jika gagal, lanjut ke session berikutnya
        results.push({ 
          success: false, 
          error: sessionError.message,
          sessionIndex: i 
        });
      }
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
    setTimeout(() => {
      activeSessions.delete(mainSessionId);
      console.log(`🧹 [${mainSessionId}] Cleaned up from active sessions`);
    }, 300000);
  }
}

// API Routes untuk session management
app.get('/api/session-status/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const sessionData = activeSessions.get(sessionId);
  
  if (sessionData) {
    res.json({ 
      sessionId, 
      status: sessionData.status,
      startTime: sessionData.startTime,
      sessions: sessionData.sessions,
      config: sessionData.config,
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

app.get('/api/active-sessions', (req, res) => {
  const sessions = Array.from(activeSessions.entries()).map(([id, data]) => ({
    sessionId: id,
    status: data.status,
    startTime: data.startTime,
    sessionCount: data.sessions.length,
    config: data.config ? {
      target: data.config.target,
      sessionCount: data.config.sessionCount,
      loginMethod: data.config.loginMethod,
      proxySource: data.config.proxySource
    } : null
  }));
  
  res.json({ 
    success: true, 
    sessions,
    total: sessions.length 
  });
});

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

// Socket.IO connection dengan logging diperbaiki
io.on('connection', (socket) => {
  console.log(`[SERVER] 👤 New client connected: ${socket.id}, Total clients: ${io.engine.clientsCount}`);
  
  // Send welcome message
  socket.emit('connected', { 
    socketId: socket.id,
    message: 'Connected to Traffic Bot Server v3.0',
    timestamp: new Date().toISOString()
  });

  // DEBUG: Log semua incoming events
  socket.onAny((eventName, ...args) => {
    console.log(`[SERVER] 📨 Event received from ${socket.id}: ${eventName}`, args[0] || {});
  });
  
  // Handle start-bot event
  socket.on('start-bot', async (config, acknowledge) => {
    console.log(`\n[SERVER] 🎯 Received "start-bot" from ${socket.id}`);
    console.log('[SERVER] Config:', {
      target: config.target || 'not set',
      sessionCount: config.sessionCount || 1,
      proxySource: config.proxySource || 'none',
      loginMethod: config.loginMethod || 'none',
      webUrl: config.webUrl || 'not set',
      ytKeyword: config.ytKeyword || 'not set',
      timestamp: new Date().toISOString()
    });
    
    // Send immediate acknowledgement
    if (typeof acknowledge === 'function') {
      acknowledge({ 
        received: true, 
        message: 'Bot start request received',
        timestamp: new Date().toISOString() 
      });
    }
    
    // VALIDASI KONFIGURASI
    if (!config.target) {
      console.error(`[SERVER] ❌ ERROR: Target not specified`);
      socket.emit('bot-error', { 
        error: 'Target not specified',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    if (config.target === 'website' && !config.webUrl) {
      console.error(`[SERVER] ❌ ERROR: Website URL required for website target`);
      socket.emit('bot-error', { 
        error: 'Website URL is required',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    if (config.target === 'youtube' && !config.ytKeyword && !config.ytDirectUrl) {
      console.error(`[SERVER] ❌ ERROR: YouTube keyword or URL required`);
      socket.emit('bot-error', { 
        error: 'YouTube keyword or URL is required',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    try {
      config.socketId = socket.id;
      config.sessionId = config.sessionId || `${socket.id}-${Date.now()}`;
      
      // Beri tahu client bahwa proses dimulai
      console.log(`[SERVER] 🚀 Starting bot session ${config.sessionId}...`);
      socket.emit('bot-started', {
        sessionId: config.sessionId,
        message: 'Bot session started on server',
        timestamp: new Date().toISOString()
      });
      
      // Jalankan bot
      console.log(`[SERVER] ⚡ Executing runTrafficBot for ${config.sessionCount} sessions...`);
      const result = await runTrafficBot(config, socket.id);
      
      console.log(`[SERVER] ✅ Bot session ${config.sessionId} completed:`, {
        success: result.success,
        sessionCount: result.sessionCount,
        completedAt: result.completedAt
      });
      
      socket.emit('bot-complete', result);
      
    } catch (error) {
      console.error(`[SERVER] ❌ ERROR in bot for ${socket.id}:`, error);
      console.error(`[SERVER] ❌ Error stack:`, error.stack);
      
      socket.emit('bot-error', { 
        error: error.message || 'Unknown server error',
        timestamp: new Date().toISOString(),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
  
  socket.on('disconnect', (reason) => {
    console.log(`[SERVER] Client disconnected: ${socket.id}, Reason: ${reason}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
    message: err.message
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`
  🚀 TRAFFIC BOT v3.0 SERVER STARTED
  ===================================
  📡 Port: ${PORT}
  🏠 Host: ${HOST}
  📦 Environment: ${process.env.NODE_ENV || 'development'}
  🌐 Railway: ${process.env.RAILWAY_ENVIRONMENT === 'true' ? '✅ Yes' : '❌ No'}
  🐢 Puppeteer: ${puppeteer.executablePath()}
  📁 Sessions: ${sessionsDir}
  ✅ Health: http://localhost:${PORT}/health
  ✅ Status: http://localhost:${PORT}/api/status
  ===================================
  `);
  
  // Log environment info
  if (process.env.RAILWAY_ENVIRONMENT === 'true') {
    console.log('✅ Running on Railway platform');
    console.log(`✅ Chromium path: ${process.env.CHROMIUM_PATH || '/usr/bin/chromium'}`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  
  // Close all active sessions
  activeSessions.clear();
  
  // Close server
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Export for testing
module.exports = { 
  app, 
  server,
  runTrafficBot, 
  handleYouTubeTraffic, 
  handleWebsiteTraffic,
  activeSessions 
};
