// ======================
// SEO TRAFFIC BOT SERVER - FULL FEATURES (FIXED VERSION)
// Dual Mode: Chrome (Local) / HTTP (Railway)
// ======================

console.log('🚀 ==========================================');
console.log('🚀 SEO TRAFFIC BOT SERVER - FIXED VERSION');
console.log('🚀 ==========================================');
console.log('📅 Startup Time:', new Date().toISOString());
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
console.log('🚪 PORT:', process.env.PORT || 3000);

// ======================
// 1. CRITICAL ERROR HANDLING
// ======================
process.on('uncaughtException', (error) => {
    console.error('❌ UNCAUGHT EXCEPTION:', error.message);
    console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ UNHANDLED REJECTION at:', promise);
    console.error('Reason:', reason);
});

// ======================
// 2. LOAD CORE DEPENDENCIES
// ======================
let express, cors, bodyParser, fs, path;

try {
    express = require('express');
    cors = require('cors');
    bodyParser = require('body-parser');
    fs = require('fs');
    path = require('path');
    console.log('✅ Core dependencies loaded');
} catch (error) {
    console.error('❌ Failed to load core dependencies:', error.message);
    console.log('⚠️ Attempting to install missing packages...');
    
    try {
        const { execSync } = require('child_process');
        execSync('npm install express cors body-parser --no-save', { stdio: 'inherit' });
        
        // Retry loading
        express = require('express');
        cors = require('cors');
        bodyParser = require('body-parser');
        fs = require('fs');
        path = require('path');
        console.log('✅ Dependencies installed and loaded');
    } catch (installError) {
        console.error('❌ Failed to install dependencies:', installError.message);
        console.log('⚠️ Starting minimal server...');
        
        // Start minimal HTTP server
        const http = require('http');
        const server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'booting',
                message: 'Server is installing dependencies, please wait...',
                timestamp: new Date().toISOString()
            }));
        });
        
        server.listen(process.env.PORT || 3000, '0.0.0.0', () => {
            console.log('⚠️ Minimal server started');
        });
        
        process.exit(0);
        return;
    }
}

// ======================
// 3. CREATE DIRECTORIES
// ======================
console.log('📁 Creating directories...');
const directories = ['proxy', 'logs', 'temp', 'public'];
directories.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`   ✅ Created: ${dir}`);
    }
});

// Create proxy example file
const proxyDir = './proxy/';
if (fs.existsSync(proxyDir) && fs.readdirSync(proxyDir).length === 0) {
    const exampleContent = `# Proxy Examples
# Format: IP:PORT or protocol://IP:PORT
# One per line
192.168.1.1:8080
http://proxy.example.com:3128
socks5://socks.example.com:1080
45.76.89.12:443`;
    
    fs.writeFileSync(path.join(proxyDir, 'example_proxies.txt'), exampleContent);
    console.log('📝 Created proxy example file');
}

// ======================
// 4. LOAD BOT MODULES (FIXED: Menggunakan require langsung)
// ======================
console.log('📦 Loading bot modules...');

let botModule, proxyModule, validatorModule;

// PERBAIKAN KUNCI: Load bot module dari index.js di root
try {
    botModule = require('./libs/index'); // PERBAIKAN: dari './index' bukan './libs/index'
    console.log('✅ Bot module loaded from ./index');
} catch (error) {
    console.error('❌ Failed to load bot module from ./index:', error.message);
    
    // Coba fallback ke alternatif
    try {
        botModule = require('./libs/index'); // Fallback
        console.log('✅ Bot module loaded from ./libs/index');
    } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError.message);
        
        // Create emergency bot module
        botModule = {
            main: async () => ({ success: false, error: 'Bot module not loaded' }),
            stop: () => ({ success: true }),
            getStatus: () => ({ 
                isRunning: false,
                advancedAvailable: false,
                error: 'Bot module failed to load'
            }),
            getBehaviorProfiles: () => ({})
        };
    }
}

// Try to load proxy module
try {
    proxyModule = require('./libs/proxy');
    console.log('✅ Proxy module loaded');
} catch (error) {
    console.error('❌ Failed to load proxy module:', error.message);
    proxyModule = () => Promise.resolve([]);
}

// Try to load validator module
try {
    validatorModule = require('./libs/proxy-validator');
    console.log('✅ Proxy validator loaded');
} catch (error) {
    console.error('❌ Failed to load proxy validator:', error.message);
    validatorModule = {
        parseMultiple: () => ({ validCount: 0, unique: [] })
    };
}

// ======================
// 5. CREATE EXPRESS APP
// ======================
const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// 6. MIDDLEWARE
// ======================
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// ======================
// 7. CRITICAL ENDPOINTS
// ======================

// Health check (Railway required)
app.get('/health', (req, res) => {
    const botStatus = botModule.getStatus ? botModule.getStatus() : { isRunning: false };
    
    res.json({
        status: 'healthy',
        service: 'seo-traffic-bot',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mode: botStatus.mode || 'unknown',
        platform: botStatus.platform || 'unknown',
        advancedAvailable: botStatus.advancedAvailable || false,
        nodeVersion: process.version
    });
});

// Root endpoint
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        // Fallback HTML
        const botStatus = botModule.getStatus ? botModule.getStatus() : { isRunning: false };
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>SEO Traffic Bot</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; background: #0F1014; color: white; }
                    .container { max-width: 800px; margin: 0 auto; }
                    .card { background: #1e1f26; padding: 20px; border-radius: 10px; margin: 20px 0; }
                    .status { padding: 10px; border-radius: 5px; margin: 5px 0; }
                    .status-success { background: #10b981; }
                    .status-warning { background: #f59e0b; }
                    .status-error { background: #ef4444; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🚀 SEO Traffic Bot</h1>
                    <div class="card">
                        <h2>✅ Server is Running</h2>
                        <p>Port: ${PORT}</p>
                        <p>Mode: ${botStatus.mode || 'unknown'}</p>
                        <p>Platform: ${botStatus.platform || 'unknown'}</p>
                        <p>Advanced Features: <span class="status ${botStatus.advancedAvailable ? 'status-success' : 'status-warning'}">${botStatus.advancedAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}</span></p>
                        <p>API is available at: <code>/api/*</code></p>
                        <p><a href="/health">Health Check</a> | <a href="/api/status">API Status</a></p>
                    </div>
                </div>
            </body>
            </html>
        `);
    }
});

// ======================
// 8. API ENDPOINTS (FULL FEATURES)
// ======================

// Server status
app.get('/api/status', (req, res) => {
    try {
        const botStatus = botModule.getStatus ? botModule.getStatus() : { isRunning: false };
        
        res.json({
            success: true,
            server: {
                status: 'running',
                port: PORT,
                uptime: process.uptime(),
                mode: botStatus.mode || 'unknown',
                platform: botStatus.platform || 'unknown',
                memory: process.memoryUsage()
            },
            bot: botStatus
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Bot status endpoint
app.get('/api/bot-status', (req, res) => {
    try {
        const status = botModule.getStatus ? botModule.getStatus() : { isRunning: false };
        res.json({
            success: true,
            status: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Behavior profiles endpoint
app.get('/api/behavior-profiles', (req, res) => {
    try {
        const profiles = botModule.getBehaviorProfiles ? botModule.getBehaviorProfiles() : [];
        
        res.json({
            success: true,
            profiles: profiles
        });
    } catch (error) {
        console.error('Error getting behavior profiles:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Proxy information
app.get('/api/proxy-info', async (req, res) => {
    try {
        const proxyDir = './proxy/';
        
        if (!fs.existsSync(proxyDir)) {
            return res.json({
                success: true,
                totalProxies: 0,
                files: []
            });
        }
        
        const files = fs.readdirSync(proxyDir);
        const textFiles = files.filter(f => f.endsWith('.txt'));
        
        let totalProxies = 0;
        const fileInfo = [];
        
        for (const file of textFiles) {
            try {
                const content = fs.readFileSync(path.join(proxyDir, file), 'utf8');
                const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
                totalProxies += lines.length;
                
                fileInfo.push({
                    name: file,
                    lines: lines.length,
                    size: content.length
                });
            } catch (error) {
                // Skip file
            }
        }
        
        res.json({
            success: true,
            totalProxies,
            files: fileInfo
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Validate proxies
app.post('/api/validate-proxies', (req, res) => {
    try {
        const { proxies } = req.body;
        
        if (!proxies) {
            return res.status(400).json({
                success: false,
                error: 'No proxies provided'
            });
        }
        
        const lines = proxies.split('\n')
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('#'));
        
        let validCount = 0;
        const validProxies = [];
        
        lines.forEach(line => {
            if (line.includes(':') && line.split(':').length === 2) {
                validCount++;
                validProxies.push(line);
            }
        });
        
        res.json({
            success: true,
            total: lines.length,
            valid: validCount,
            invalid: lines.length - validCount,
            sample: validProxies.slice(0, 5)
        });
    } catch (error) {
        console.error('❌ Error in validate-proxies:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Save proxies
app.post('/api/save-proxies', (req, res) => {
    try {
        const { proxies, filename } = req.body;
        
        if (!proxies) {
            return res.status(400).json({
                success: false,
                error: 'No proxies provided'
            });
        }
        
        const proxyDir = './proxy/';
        if (!fs.existsSync(proxyDir)) {
            fs.mkdirSync(proxyDir, { recursive: true });
        }
        
        const safeFilename = filename || `proxies_${Date.now()}.txt`;
        const filePath = path.join(proxyDir, safeFilename);
        
        // Deduplicate
        const lines = proxies.split('\n').filter(l => l.trim());
        const uniqueLines = [...new Set(lines)];
        
        fs.writeFileSync(filePath, uniqueLines.join('\n'), 'utf8');
        
        res.json({
            success: true,
            filename: safeFilename,
            saved: uniqueLines.length
        });
    } catch (error) {
        console.error('❌ Error in save-proxies:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start bot - WITH ADVANCED OPTIONS
app.post('/api/start', async (req, res) => {
    console.log('🔵 [API] /api/start called');
    
    try {
        const { url, keyboard, count, option, useProxies, advancedOptions } = req.body;
        
        // Validation
        if (!url) {
            console.log('❌ [API] Start failed: URL is required');
            return res.status(400).json({
                success: false,
                error: 'URL is required'
            });
        }
        
        if (option === 'google' && !keyboard) {
            console.log('❌ [API] Start failed: Keywords required for Google method');
            return res.status(400).json({
                success: false,
                error: 'Keywords required for Google method'
            });
        }
        
        const visitorCount = Math.min(parseInt(count) || 1, 100);
        
        // Load proxies if needed
        let proxyList = [];
        if (useProxies) {
            try {
                console.log('🔵 [API] Loading proxies...');
                proxyList = await proxyModule();
                console.log(`✅ [API] Loaded ${proxyList.length} proxies`);
            } catch (error) {
                console.error('❌ [API] Failed to load proxies:', error);
                proxyList = [];
            }
        }
        
        console.log(`🚀 [API] Starting bot with config:`);
        console.log(`   URL: ${url}`);
        console.log(`   Method: ${option}`);
        console.log(`   Visitors: ${visitorCount}`);
        console.log(`   Proxies: ${proxyList.length}`);
        console.log(`   Advanced Options:`, advancedOptions || 'None');
        
        // Get current bot status to show mode
        const botStatus = botModule.getStatus ? botModule.getStatus() : {};
        console.log(`   Current Bot Mode: ${botStatus.mode || 'unknown'}`);
        console.log(`   Advanced Available: ${botStatus.advancedAvailable || false}`);
        
        // Start bot in background with advanced options
        botModule.main(url, keyboard, visitorCount, option, proxyList, advancedOptions || {})
            .then(result => {
                console.log('✅ [API] Bot completed:', result.success ? 'Success' : 'Failed');
            })
            .catch(error => {
                console.error('❌ [API] Bot error:', error);
            });
        
        console.log('✅ [API] Bot started successfully');
        res.json({
            success: true,
            message: 'Bot started successfully',
            mode: botStatus.mode || 'unknown',
            config: {
                url,
                count: visitorCount,
                method: option,
                proxies: proxyList.length,
                advanced: !!advancedOptions
            }
        });
    } catch (error) {
        console.error('❌ [API] Error in /api/start:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Stop bot
app.post('/api/stop', async (req, res) => {
    console.log('🔵 [API] /api/stop called');
    
    try {
        const result = await botModule.stop();
        console.log('✅ [API] Bot stopped:', result);
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('❌ [API] Error in /api/stop:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Test endpoint
app.get('/api/test', (req, res) => {
    const botStatus = botModule.getStatus ? botModule.getStatus() : {};
    
    res.json({
        success: true,
        message: 'API is working',
        modules: {
            bot: !!botModule,
            proxy: !!proxyModule,
            validator: !!validatorModule
        },
        platform: botStatus.platform || 'unknown',
        mode: botStatus.mode || 'unknown',
        advancedAvailable: botStatus.advancedAvailable || false
    });
});

// ======================
// 9. ERROR HANDLING
// ======================

// 404 handler
app.use((req, res) => {
    console.log(`❌ [404] Endpoint not found: ${req.method} ${req.url}`);
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        available: [
            '/health',
            '/api/status', 
            '/api/bot-status',
            '/api/behavior-profiles',
            '/api/start', 
            '/api/stop', 
            '/api/proxy-info',
            '/api/validate-proxies',
            '/api/save-proxies',
            '/api/test'
        ]
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('❌ [SERVER] Global error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
    });
});

// ======================
// 10. START SERVER
// ======================
let server;

try {
    server = app.listen(PORT, '0.0.0.0', () => {
        console.log('='.repeat(60));
        console.log('✅ SEO TRAFFIC BOT SERVER STARTED');
        console.log('='.repeat(60));
        console.log(`📡 URL: http://localhost:${PORT}`);
        console.log(`🔧 Health: http://localhost:${PORT}/health`);
        console.log(`📊 Status: http://localhost:${PORT}/api/status`);
        
        // Show bot configuration
        if (botModule.getStatus) {
            const status = botModule.getStatus();
            console.log(`🤖 Mode: ${status.mode}`);
            console.log(`🤖 Platform: ${status.platform}`);
            console.log(`🤖 Advanced: ${status.advancedAvailable ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);
            
            if (!status.advancedAvailable) {
                console.log('⚠️  Warning: Advanced features not available. Bot will use basic mode.');
                console.log('ℹ️  Check if behavior-engine.js and advanced-http.js exist in root folder');
            }
        }
        
        console.log('='.repeat(60));
    });
} catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
}

// ======================
// 11. GRACEFUL SHUTDOWN
// ======================
const shutdown = (signal) => {
    console.log(`\n🔻 ${signal} received, shutting down...`);
    
    // Stop bot
    if (botModule && typeof botModule.stop === 'function') {
        console.log('🛑 Stopping bot...');
        try {
            const result = botModule.stop();
            console.log('✅ Bot stop requested. Result:', result);
        } catch (error) {
            console.log('⚠️ Bot stop had error:', error.message);
        }
    }
    
    // Close server
    console.log('🛑 Closing server...');
    if (server) {
        server.close(() => {
            console.log('✅ Server closed gracefully');
            process.exit(0);
        });
        
        // Force shutdown after 5 seconds
        setTimeout(() => {
            console.log('⚠️ Forcing shutdown after timeout');
            process.exit(1);
        }, 5000);
    } else {
        console.log('✅ Server closed (no server instance)');
        process.exit(0);
    }
};

// Clean shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ======================
// 12. ADDITIONAL SAFETY CHECKS
// ======================

// Prevent server crash on EADDRINUSE
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error('❌ Port already in use. Trying alternative port...');
        const newPort = PORT + 1;
        server = app.listen(newPort, '0.0.0.0', () => {
            console.log(`✅ Server started on alternative port: ${newPort}`);
        });
    } else {
        console.error('❌ Server error:', error);
    }
});

// ======================
// 13. FINAL INITIALIZATION LOG
// ======================
console.log('🚀 Server initialization complete');
console.log('📊 Ready to handle requests...');
