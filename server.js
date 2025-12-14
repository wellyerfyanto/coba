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
        getStatus: () => ({ isRunning: false })
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
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start bot
app.post('/api/start', async (req, res) => {
    try {
        const { url, keyboard, count, option, useProxies } = req.body;
        
        // Validation
        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL is required'
            });
        }
        
        if (option === 'Google' && !keyboard) {
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
                proxyList = await proxyModule();
            } catch (error) {
                console.error('Failed to load proxies:', error);
            }
        }
        
        // Start bot in background
        botModule.main(url, keyboard, visitorCount, option, proxyList)
            .then(result => {
                console.log('Bot completed:', result);
            })
            .catch(error => {
                console.error('Bot error:', error);
            });
        
        res.json({
            success: true,
            message: 'Bot started successfully',
            mode: IS_RAILWAY ? 'HTTP (Railway)' : 'Auto',
            config: {
                url,
                count: visitorCount,
                method: option,
                proxies: proxyList.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Stop bot
app.post('/api/stop', async (req, res) => {
    try {
        const result = await botModule.stop();
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
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
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        available: ['/health', '/api/status', '/api/start', '/api/stop', '/api/proxy-info']
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// ======================
// 11. START SERVER
// ======================
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('✅ SEO TRAFFIC BOT SERVER STARTED');
    console.log('='.repeat(60));
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🔧 Health: http://localhost:${PORT}/health`);
    console.log(`📊 Status: http://localhost:${PORT}/api/status`);
    console.log(`🤖 Mode: ${IS_RAILWAY ? 'Railway (HTTP)' : 'Local (Chrome/HTTP)'}`);
    console.log('='.repeat(60));
});

// ======================
// 12. GRACEFUL SHUTDOWN - FIXED VERSION
// ======================
const shutdown = (signal) => {
    console.log(`\n🔻 ${signal} received, shutting down...`);
    
    // Stop bot - SIMPLE AND SAFE APPROACH
    if (botModule && typeof botModule.stop === 'function') {
        console.log('🛑 Stopping bot...');
        try {
            // Simply call the function without expecting a Promise
            botModule.stop();
            console.log('✅ Bot stop requested');
        } catch (error) {
            console.log('⚠️ Bot stop had error (non-critical):', error.message);
        }
    }
    
    // Close server
    console.log('🛑 Closing server...');
    server.close(() => {
        console.log('✅ Server closed gracefully');
        process.exit(0);
    });
    
    // Force shutdown after 5 seconds
    setTimeout(() => {
        console.log('⚠️ Forcing shutdown after timeout');
        process.exit(1);
    }, 5000);
};

// Clean shutdown handlers
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, initiating shutdown...');
    shutdown('SIGTERM');
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, initiating shutdown...');
    shutdown('SIGINT');
});