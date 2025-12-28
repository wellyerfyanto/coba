require('dotenv').config();
const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const path = require('path');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const { v4: uuidv4 } = require('uuid');

// PENTING: Gunakan puppeteer-core dan chromium untuk Railway
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

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

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint untuk Railway
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'traffic-bot'
  });
});

// Fungsi utama untuk menjalankan sesi bot dengan error handling yang kuat
async function runTrafficBot(config, socketId = null) {
  const sessionId = config.sessionId || uuidv4();
  let browser = null;
  
  console.log(`[${sessionId}] Starting bot session for target: ${config.target}`);
  
  try {
    // 1. KONFIGURASI LAUNCH OPTIMIZED UNTUK RAILWAY
    const launchOptions = {
      args: [
        ...chromium.args,
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
        '--window-size=1920,1080'
      ],
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: await chromium.executablePath(),
      headless: 'new', // Headless mode baru yang lebih efisien
      ignoreHTTPSErrors: true,
      timeout: 120000 // Timeout 2 menit untuk launch
    };

    // Tambahkan proxy jika dikonfigurasi
    if (config.proxyServer && config.proxyServer.trim() !== '') {
      launchOptions.args.push(`--proxy-server=${config.proxyServer}`);
      console.log(`[${sessionId}] Using proxy: ${config.proxyServer}`);
    }

    // 2. LAUNCH BROWSER
    console.log(`[${sessionId}] Launching browser...`);
    browser = await puppeteer.launch(launchOptions);
    console.log(`[${sessionId}] Browser launched successfully`);

    // Emit status via Socket.IO
    emitStatus(socketId, {
      sessionId,
      status: 'browser_launched',
      message: 'Browser berhasil dijalankan'
    });

    const page = await browser.newPage();
    
    // 3. KONFIGURASI PAGE
    if (config.userAgent) {
      await page.setUserAgent(config.userAgent);
    }
    
    // Setup proxy authentication jika diperlukan
    if (config.proxyAuth && config.proxyAuth.username) {
      await page.authenticate({
        username: config.proxyAuth.username,
        password: config.proxyAuth.password || ''
      });
    }

    // Set timeout untuk navigation
    page.setDefaultNavigationTimeout(30000);
    page.setDefaultTimeout(30000);

    emitStatus(socketId, {
      sessionId,
      status: 'navigating',
      message: 'Membuka halaman target...'
    });

    // 4. EKSEKUSI BERDASARKAN TARGET
    let result;
    if (config.target === 'youtube') {
      result = await handleYouTubeTraffic(page, config, sessionId, socketId);
    } else if (config.target === 'website') {
      result = await handleWebsiteTraffic(page, config, sessionId, socketId);
    } else {
      throw new Error(`Target tidak didukung: ${config.target}`);
    }

    // 5. CLEANUP
    await page.close().catch(e => console.error(`[${sessionId}] Error closing page:`, e));
    
    emitStatus(socketId, {
      sessionId,
      status: 'completed',
      message: 'Sesi bot berhasil diselesaikan'
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
  }
}

// Fungsi untuk traffic YouTube
async function handleYouTubeTraffic(page, config, sessionId, socketId) {
  console.log(`[${sessionId}] Starting YouTube traffic...`);
  
  emitStatus(socketId, {
    sessionId,
    status: 'progress',
    message: 'Membuka YouTube...',
    progress: 10
  });

  try {
    // Pergi ke YouTube
    await page.goto('https://www.youtube.com', { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    emitStatus(socketId, {
      sessionId,
      status: 'progress',
      message: 'YouTube berhasil dimuat',
      progress: 20
    });

    // Cari video jika keyword disediakan
    if (config.ytKeyword) {
      console.log(`[${sessionId}] Searching for: ${config.ytKeyword}`);
      await page.type('input[name="search_query"]', config.ytKeyword);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);

      emitStatus(socketId, {
        sessionId,
        status: 'progress',
        message: `Mencari "${config.ytKeyword}"...`,
        progress: 30
      });
    }

    // Scroll manusiawi
    await humanLikeScroll(page, sessionId);
    
    // Cari video pertama
    const videoSelector = 'ytd-video-renderer #thumbnail';
    await page.waitForSelector(videoSelector, { timeout: 10000 });
    
    const videos = await page.$$(videoSelector);
    if (videos.length > 0) {
      console.log(`[${sessionId}] Found ${videos.length} videos, clicking first`);
      await videos[0].click();
      await page.waitForTimeout(5000);

      emitStatus(socketId, {
        sessionId,
        status: 'progress',
        message: 'Video ditemukan dan diputar',
        progress: 50
      });

      // Simulasi menonton (versi singkat untuk testing)
      const watchTime = Math.min((config.watchDuration || 1) * 1000, 10000);
      console.log(`[${sessionId}] Watching for ${watchTime}ms`);
      
      for (let i = 0; i < 3; i++) {
        await humanLikeScroll(page, sessionId);
        await page.waitForTimeout(watchTime / 3);
      }

      emitStatus(socketId, {
        sessionId,
        status: 'progress',
        message: 'Selesai menonton video',
        progress: 80
      });

      // Interaksi sederhana
      if (config.ytLike) {
        try {
          const likeButton = await page.$('button[aria-label^="Like"]');
          if (likeButton) {
            await likeButton.click();
            console.log(`[${sessionId}] Liked the video`);
            await page.waitForTimeout(1000);
          }
        } catch (e) {
          console.log(`[${sessionId}] Could not like video:`, e.message);
        }
      }

      emitStatus(socketId, {
        sessionId,
        status: 'progress',
        message: 'Interaksi selesai',
        progress: 100
      });

    } else {
      console.log(`[${sessionId}] No videos found`);
      emitStatus(socketId, {
        sessionId,
        status: 'warning',
        message: 'Tidak ada video yang ditemukan'
      });
    }

    return { action: 'youtube_traffic', videosFound: videos.length };

  } catch (error) {
    console.error(`[${sessionId}] Error in YouTube traffic:`, error);
    throw error;
  }
}

// Fungsi untuk traffic website
async function handleWebsiteTraffic(page, config, sessionId, socketId) {
  console.log(`[${sessionId}] Starting website traffic...`);
  
  if (!config.webUrl) {
    throw new Error('webUrl diperlukan untuk traffic website');
  }

  emitStatus(socketId, {
    sessionId,
    status: 'progress',
    message: `Membuka ${config.webUrl}...`,
    progress: 10
  });

  try {
    // Pergi ke website target
    await page.goto(config.webUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    emitStatus(socketId, {
      sessionId,
      status: 'progress',
      message: 'Website berhasil dimuat',
      progress: 30
    });

    // Scroll manusiawi
    await humanLikeScroll(page, sessionId);
    await page.waitForTimeout(2000);
    
    // Scroll lagi dengan pola berbeda
    await humanLikeScroll(page, sessionId, 500, 1500);
    
    emitStatus(socketId, {
      sessionId,
      status: 'progress',
      message: 'Melakukan navigasi di website',
      progress: 70
    });

    // Klik link internal jika diaktifkan
    if (config.clickLinks) {
      try {
        const links = await page.$$eval('a', anchors => 
          anchors
            .filter(a => a.href && !a.href.includes('#') && a.textContent.trim().length > 3)
            .map(a => a.href)
            .slice(0, 5)
        );

        if (links.length > 0) {
          const randomLink = links[Math.floor(Math.random() * links.length)];
          console.log(`[${sessionId}] Clicking internal link: ${randomLink}`);
          await page.goto(randomLink, { waitUntil: 'networkidle2', timeout: 15000 });
          await page.waitForTimeout(2000);
          await humanLikeScroll(page, sessionId);
        }
      } catch (e) {
        console.log(`[${sessionId}] Could not click internal link:`, e.message);
      }
    }

    emitStatus(socketId, {
      sessionId,
      status: 'progress',
      message: 'Traffic website selesai',
      progress: 100
    });

    return { action: 'website_traffic', url: config.webUrl };

  } catch (error) {
    console.error(`[${sessionId}] Error in website traffic:`, error);
    throw error;
  }
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

// Helper: Emit status via Socket.IO
function emitStatus(socketId, data) {
  if (socketId && io) {
    io.to(socketId).emit('bot-status', data);
  }
  // Juga log ke console
  console.log(`[${data.sessionId}] ${data.status}: ${data.message}`);
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

    // Generate session ID jika belum ada
    config.sessionId = config.sessionId || `${requestId}-${Date.now()}`;
    
    // Kirim respons segera (async processing)
    res.json({ 
      success: true, 
      message: 'Bot session started',
      sessionId: config.sessionId,
      requestId
    });

    console.log(`[${config.sessionId}] Starting bot session asynchronously`);
    
    // Jalankan bot secara asynchronous dengan delay kecil
    setTimeout(async () => {
      try {
        await runTrafficBot(config, socketId);
        console.log(`[${config.sessionId}] Bot session finished successfully`);
      } catch (error) {
        console.error(`[${config.sessionId}] Bot session failed:`, error.message);
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
  res.json({ 
    sessionId, 
    status: 'unknown', // Implementasi tracking sesi yang lebih baik bisa ditambahkan
    timestamp: new Date().toISOString()
  });
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Simpan socket ID untuk emisi status spesifik
  socket.emit('connected', { 
    socketId: socket.id,
    message: 'Connected to bot server'
  });
  
  socket.on('start-bot', async (config) => {
    console.log(`[SOCKET-${socket.id}] Received start-bot command`);
    try {
      config.socketId = socket.id;
      const result = await runTrafficBot(config, socket.id);
      socket.emit('bot-complete', result);
    } catch (error) {
      socket.emit('bot-error', { error: error.message });
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
});

// Ekspor untuk testing
module.exports = { 
  app, 
  runTrafficBot, 
  handleYouTubeTraffic, 
  handleWebsiteTraffic 
};
