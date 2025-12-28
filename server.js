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

// Route untuk cek proxy
app.get('/api/proxy-status', async (req, res) => {
  try {
    const proxyManager = new ProxyManager();
    await proxyManager.loadProxiesFromFile('proxies.txt');
    const stats = proxyManager.getStats();
    res.json({ success: true, ...stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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

// Fungsi untuk login ke Google/YouTube
async function loginToGoogle(page, config, sessionId, socketId) {
  console.log(`[${sessionId}] Attempting Google login...`);
  
  emitStatus(socketId, {
    sessionId,
    status: 'login',
    message: 'Mencoba login ke Google...'
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
        message: 'Login ke Google berhasil'
      });
      return true;
    } else {
      // Mungkin ada 2FA atau error
      console.log(`[${sessionId}] Login mungkin membutuhkan verifikasi 2FA`);
      emitStatus(socketId, {
        sessionId,
        status: 'login_2fa',
        message: 'Login mungkin membutuhkan verifikasi 2FA'
      });
      return false;
    }

  } catch (error) {
    console.error(`[${sessionId}] Google login failed:`, error.message);
    emitStatus(socketId, {
      sessionId,
      status: 'login_error',
      message: `Login gagal: ${error.message}`
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
    message: 'Mencoba login ke YouTube...'
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
        message: 'Sudah login ke YouTube'
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
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-crash-reporter',
      '--user-data-dir=/tmp/chrome-user-data',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-default-apps',
      '--disable-translate',
      '--disable-features=site-per-process,TranslateUI,BlinkGenPropertyTrees',
      '--enable-features=NetworkService,NetworkServiceInProcess',
      '--window-size=1920,1080',
      '--single-process',
      '--no-zygote',
      '--no-first-run',
      '--no-default-browser-check'
    ],
    defaultViewport: { width: 1920, height: 1080 },
    executablePath: executablePath,
    headless: 'new',
    ignoreHTTPSErrors: true,
    timeout: 120000,
    protocolTimeout: 120000
  };

  // Tambahkan user data dir jika differentProfiles diaktifkan
  if (config.differentProfiles && config.profileDir) {
    launchOptions.userDataDir = config.profileDir;
    console.log(`[${sessionId}] Using profile directory: ${config.profileDir}`);
  }

  return launchOptions;
}

// Fungsi untuk setup proxy dengan support multiple proxies
async function setupProxy(config, sessionId, socketId, sessionIndex) {
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
        message: 'Testing proxies...'
      });
      
      const results = await proxyManager.validateAllProxies();
      emitStatus(socketId, {
        sessionId,
        status: 'proxy_results',
        message: `Proxy test: ${results.working}/${results.total} working`,
        data: results
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
        data: { proxyIndex: sessionIndex, totalProxies: proxyManager.validProxies.length }
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
    const proxyList = config.multiProxies.split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    // Buat proxy manager untuk multiple proxies
    proxyManager.proxies = proxyList.map(proxyStr => {
      const parts = proxyStr.split(':');
      if (parts.length === 4) {
        return {
          host: parts[0],
          port: parseInt(parts[1]),
          username: parts[2],
          password: parts[3],
          protocol: 'http'
        };
      } else if (parts.length === 2) {
        return {
          host: parts[0],
          port: parseInt(parts[1]),
          protocol: 'http'
        };
      }
      return null;
    }).filter(p => p !== null);
    
    // Pilih proxy berdasarkan session index
    const proxyIndex = sessionIndex % proxyManager.proxies.length;
    const proxy = proxyManager.proxies[proxyIndex];
    
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

  return proxyConfig;
}

// Fungsi untuk security check
async function performSecurityCheck(config, sessionId, socketId, proxyConfig) {
  if (config.checkLeaks && proxyConfig.proxyServer) {
    emitStatus(socketId, {
      sessionId,
      status: 'security_check',
      message: 'Performing security check...'
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
          data: securityResults.data
        });
        return true;
      } else {
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

    // 3. Setup Proxy dengan support multiple
    const proxyConfig = await setupProxy(config, sessionId, socketId, sessionIndex);
    if (proxyConfig.proxyServer) {
      sessionConfig.proxyServer = proxyConfig.proxyServer;
      sessionConfig.proxyAuth = proxyConfig.proxyAuth;
    }

    // 4. Security Check
    await performSecurityCheck(config, sessionId, socketId, proxyConfig);

    // 5. Get Browser Launch Options
    const launchOptions = await getBrowserLaunchOptions(sessionConfig, sessionId);
    
    // Tambahkan proxy jika ada
    if (sessionConfig.proxyServer) {
      launchOptions.args.push(`--proxy-server=${sessionConfig.proxyServer}`);
    }

    // 6. LAUNCH BROWSER
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

    // 7. LOGIN JIKA DIKONFIGURASI
    if (config.loginMethod && config.loginMethod !== 'none' && 
        config.googleEmail && config.googlePassword) {
      
      emitStatus(socketId, {
        sessionId,
        status: 'login_start',
        message: 'Memulai proses login...',
        progress: 25
      });
      
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
          progress: 30
        });
        await page.waitForTimeout(2000);
      } else {
        emitStatus(socketId, {
          sessionId,
          status: 'warning',
          message: 'Login gagal, melanjutkan tanpa login'
        });
      }
    }

    // 8. EKSEKUSI BERDASARKAN TARGET
    let result;
    if (config.target === 'youtube') {
      result = await handleYouTubeTraffic(page, sessionConfig, sessionId, socketId);
    } else if (config.target === 'website') {
      result = await handleWebsiteTraffic(page, sessionConfig, sessionId, socketId);
    } else {
      throw new Error(`Target tidak didukung: ${config.target}`);
    }

    // 9. CLEANUP
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

// Fungsi untuk traffic YouTube
async function handleYouTubeTraffic(page, config, sessionId, socketId) {
  console.log(`[${sessionId}] Starting YouTube traffic...`);
  
  emitStatus(socketId, {
    sessionId,
    status: 'progress',
    message: 'Membuka YouTube...',
    progress: 30
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
        progress: 40
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
      progress: 50
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
        progress: 50 + Math.floor((i / segments) * 30)
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

  const targetUrl = config.webUrl.startsWith('http') ? config.webUrl : `https://${config.webUrl}`;
  
  emitStatus(socketId, {
    sessionId,
    status: 'progress',
    message: `Membuka ${targetUrl}...`,
    progress: 30
  });

  try {
    await page.goto(targetUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    emitStatus(socketId, {
      sessionId,
      status: 'progress',
      message: 'Website berhasil dimuat',
      progress: 40
    });

    // TENTUKAN POLA SCROLL BERDASARKAN KONFIG
    let scrollPattern = {
      count: 5,
      minDelay: 1000,
      maxDelay: 3000,
      minScroll: 300,
      maxScroll: 800
    };
    
    if (config.scrollPattern === 'skimmer') {
      scrollPattern = { count: 3, minDelay: 500, maxDelay: 1500, minScroll: 500, maxScroll: 1200 };
    } else if (config.scrollPattern === 'reader') {
      scrollPattern = { count: 8, minDelay: 2000, maxDelay: 5000, minScroll: 200, maxScroll: 500 };
    } else if (config.scrollPattern === 'researcher') {
      scrollPattern = { count: 10, minDelay: 1500, maxDelay: 4000, minScroll: 100, maxScroll: 400 };
    }

    // EKSEKUSI SCROLL
    for (let i = 0; i < scrollPattern.count; i++) {
      const scrollAmount = Math.floor(Math.random() * (scrollPattern.maxScroll - scrollPattern.minScroll + 1)) + scrollPattern.minScroll;
      const delay = Math.random() * (scrollPattern.maxDelay - scrollPattern.minDelay) + scrollPattern.minDelay;
      
      await page.evaluate((amount) => {
        window.scrollBy({ top: amount, behavior: 'smooth' });
      }, scrollAmount);
      
      await page.waitForTimeout(delay);
      
      console.log(`[${sessionId}] Scroll ${i+1}/${scrollPattern.count}: ${scrollAmount}px`);
      
      emitStatus(socketId, {
        sessionId,
        status: 'progress',
        message: `Menjelajahi halaman... (${i+1}/${scrollPattern.count})`,
        progress: 40 + Math.floor((i / scrollPattern.count) * 30)
      });
    }
    
    // KLIK LINK INTERNAL (jika diaktifkan)
    if (config.clickLinks) {
      try {
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
            progress: 75
          });
        }
      } catch (e) {
        console.log(`[${sessionId}] Could not navigate to internal link:`, e.message);
      }
    }

    // TINGGAL DI HALAMAN SESUAI DURASI
    const visitTime = Math.min((config.visitDuration || 1) * 60000, 300000);
    if (visitTime > 0) {
      const staySegments = Math.ceil(visitTime / 10000);
      console.log(`[${sessionId}] Staying for ${visitTime/1000}s (${staySegments} segments)`);
      
      for (let i = 0; i < staySegments; i++) {
        await page.waitForTimeout(10000);
        
        if (i % 3 === 0) {
          await page.evaluate(() => {
            window.scrollBy({ top: Math.random() > 0.5 ? 100 : -50, behavior: 'smooth' });
          });
        }
        
        emitStatus(socketId, {
          sessionId,
          status: 'progress',
          message: `Mengamati konten... (${i+1}/${staySegments})`,
          progress: 75 + Math.floor((i / staySegments) * 20)
        });
      }
    }

    emitStatus(socketId, {
      sessionId,
      status: 'progress',
      message: 'Traffic website selesai',
      progress: 100
    });

    return { action: 'website_traffic', success: true, url: targetUrl };

  } catch (error) {
    console.error(`[${sessionId}] Error in website traffic:`, error);
    emitStatus(socketId, {
      sessionId,
      status: 'error',
      message: `Website Error: ${error.message}`
    });
    return { action: 'website_traffic', success: false, error: error.message };
  }
}

// Fungsi utama untuk menjalankan semua sesi bot
async function runTrafficBot(config, socketId = null) {
  const mainSessionId = config.sessionId || uuidv4();
  const sessionCount = config.sessionCount || 1;
  
  console.log(`[${mainSessionId}] Starting ${sessionCount} bot sessions`);
  
  activeSessions.set(mainSessionId, {
    status: 'running',
    startTime: new Date(),
    sessions: [],
    config: config
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
    
    if (!config.target) {
      return res.status(400).json({ 
        success: false, 
        error: 'Target harus ditentukan (youtube/website)',
        requestId 
      });
    }

    // Default values dengan fitur baru
    config.sessionCount = config.sessionCount || 1;
    config.sessionId = config.sessionId || `${requestId}-${Date.now()}`;
    config.differentProfiles = config.differentProfiles || false;
    config.rotateUA = config.rotateUA || false;
    config.checkLeaks = config.checkLeaks || false;
    config.proxySource = config.proxySource || 'none';
    config.validateProxies = config.validateProxies || false;
    config.loginMethod = config.loginMethod || 'none';
    
    res.json({ 
      success: true, 
      message: 'Bot session started',
      sessionId: config.sessionId,
      sessionCount: config.sessionCount,
      requestId
    });

    console.log(`[${config.sessionId}] Starting ${config.sessionCount} bot sessions asynchronously`);
    
    setTimeout(async () => {
      try {
        const result = await runTrafficBot(config, socketId);
        console.log(`[${config.sessionId}] Bot sessions finished successfully`);
        
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

// Route untuk mendapatkan semua active sessions
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
  
  socket.emit('connected', { 
    socketId: socket.id,
    message: 'Connected to bot server',
    timestamp: new Date().toISOString()
  });
  
  socket.on('start-bot', async (config) => {
    console.log(`[SOCKET-${socket.id}] Received start-bot command`);
    
    try {
      config.socketId = socket.id;
      config.sessionId = config.sessionId || `${socket.id}-${Date.now()}`;
      
      socket.emit('bot-started', {
        sessionId: config.sessionId,
        message: 'Bot session started via WebSocket'
      });
      
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

module.exports = { 
  app, 
  runTrafficBot, 
  handleYouTubeTraffic, 
  handleWebsiteTraffic,
  activeSessions 
};