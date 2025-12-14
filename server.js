// ======================
// SEO TRAFFIC BOT SERVER - FULL FEATURES
// Dual Mode: Chrome (Local) / HTTP (Railway)
// ======================

console.log('🚀 ==========================================');
console.log('🚀 SEO TRAFFIC BOT - FULL FEATURE SERVER');
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
// 2. ENVIRONMENT DETECTION
// ======================
const IS_RAILWAY = process.env.RAILWAY_ENVIRONMENT === 'production' || 
                   process.env.NODE_ENV === 'production' ||
                   process.env.DISABLE_CHROME === 'true';

if (IS_RAILWAY) {
    console.log('🚂 Platform: Railway (HTTP Mode Only)');
    process.env.DISABLE_CHROME = 'true';
} else {
    console.log('💻 Platform: Local (Chrome/HTTP Dual Mode)');
}

// ======================
// 3. LOAD CORE DEPENDENCIES
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
// 4. CREATE DIRECTORIES
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
// 5. LOAD BOT MODULES
// ======================
console.log('📦 Loading bot modules...');

let botModule, proxyModule, validatorModule;

// Try to load bot module
try {
    botModule = require('./libs/index');
    console.log('✅ Bot module loaded');
} catch (error) {
    console.error('❌ Failed to load bot module:', error.message);
    
    // Create emergency bot module
    botModule = {
        main: async () => ({ success: false, error: 'Bot module not loaded' }),
        stop: () => ({ success: true }),
        getStatus: () => ({ isRunning: false }),
        getBehaviorProfiles: () => ({})
    };
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
// 6. CREATE EXPRESS APP
// ======================
const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// 7. MIDDLEWARE
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
// 8. CRITICAL ENDPOINTS
// ======================

// Health check (Railway required)
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'seo-traffic-bot',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        mode: IS_RAILWAY ? 'Railway (HTTP)' : 'Local (Chrome/HTTP)'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>SEO Traffic Bot</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; background: #0F1014; color: white; }
                    .container { max-width: 800px; margin: 0 auto; }
                    .card { background: #1e1f26; padding: 20px; border-radius: 10px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🚀 SEO Traffic Bot</h1>
                    <div class="card">
                        <h2>✅ Server is Running</h2>
                        <p>Mode: ${IS_RAILWAY ? 'Railway (HTTP Only)' : 'Local (Chrome/HTTP)'}</p>
                        <p>Port: ${PORT}</p>
                        <p>API is available at: <code>/api/*</code></p>
                        <p><a href="/health">Health Check</a></p>
                    </div>
                </div>
            </body>
            </html>
        `);
    }
});

// ======================
// 9. API ENDPOINTS (FULL FEATURES)
// ======================

// Server status
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        server: {
            status: 'running',
            port: PORT,
            uptime: process.uptime(),
            mode: IS_RAILWAY ? 'Railway' : 'Local',
            memory: process.memoryUsage()
        },
        bot: botModule.getStatus ? botModule.getStatus() : { isRunning: false }
    });
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
        const profiles = botModule.getBehaviorProfiles ? botModule.getBehaviorProfiles() : {};
        
        const profileList = Object.values(profiles).map(p => ({
            type: p.type,
            weight: p.weight,
            description: `${p.type} - Scroll: ${p.scrollDepth * 100}%, Clicks: ${p.clickProbability * 100}%, Time: ${p.timeOnSite.min/1000}-${p.timeOnSite.max/1000}s`
        }));
        
        res.json({
            success: true,
            profiles: profileList
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
        
        // Start bot in background with advanced options
        botModule.main(url, keyboard, visitorCount, option, proxyList, advancedOptions || {})
            .then(result => {
                console.log('✅ [API] Bot completed:', result);
            })
            .catch(error => {
                console.error('❌ [API] Bot error:', error);
            });
        
        console.log('✅ [API] Bot started successfully');
        res.json({
            success: true,
            message: 'Bot started successfully',
            mode: IS_RAILWAY ? 'HTTP (Railway)' : 'Auto',
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
    res.json({
        success: true,
        message: 'API is working',
        modules: {
            bot: !!botModule,
            proxy: !!proxyModule,
            validator: !!validatorModule
        },
        platform: IS_RAILWAY ? 'Railway' : 'Local'
    });
});

// ======================
// 10. ERROR HANDLING
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
        error: 'Internal server error'
    });
});

// ======================
// 11. START SERVER
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
        console.log(`🤖 Mode: ${IS_RAILWAY ? 'Railway (HTTP)' : 'Local (Chrome/HTTP)'}`);
        console.log('='.repeat(60));
        
        // Initialize bot status
        if (botModule.getStatus) {
            console.log('🤖 Bot status:', botModule.getStatus());
        }
    });
} catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
}

// ======================
// 12. GRACEFUL SHUTDOWN - SIMPLIFIED VERSION
// ======================
const shutdown = (signal) => {
    console.log(`\n🔻 ${signal} received, shutting down...`);
    
    // Stop bot - SIMPLE: Just call the function
    if (botModule && typeof botModule.stop === 'function') {
        console.log('🛑 Stopping bot...');
        try {
            // Call stop() without expecting anything back
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
// 13. ADDITIONAL SAFETY CHECKS
// ======================

// Prevent server crash on EADDRINUSE
process.on('EADDRINUSE', () => {
    console.error('❌ Port already in use. Trying alternative port...');
    const newPort = PORT + 1;
    server = app.listen(newPort, '0.0.0.0', () => {
        console.log(`✅ Server started on alternative port: ${newPort}`);
    });
});

// Handle process warnings
process.on('warning', (warning) => {
    console.warn('⚠️ Process warning:', warning.name);
    console.warn('   Message:', warning.message);
    console.warn('   Stack:', warning.stack);
});

// ======================
// 14. FINAL INITIALIZATION LOG
// ======================
console.log('🚀 Server initialization complete');
console.log('📊 Ready to handle requests...');