// ======================
// 1. DEBUG STARTUP
// ======================
console.log('🔧 [1] Starting server.js...');
console.log('📁 Current directory:', __dirname);
console.log('📦 Node version:', process.version);
console.log('🌍 Platform:', process.platform);
console.log('⚙️ NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('🚪 PORT:', process.env.PORT || 3000);

try {
    // ======================
    // 2. CHECK REQUIRED FILES
    // ======================
    const fs = require('fs');
    const path = require('path');
    
    console.log('📋 [2] Checking required files...');
    
    const requiredFiles = [
        'package.json',
        'public/index.html',
        'libs/index.js',
        'libs/proxy.js',
        'libs/proxy-validator.js',
        'libs/autobot.js',
        'libs/spoofing.js'
    ];
    
    requiredFiles.forEach(file => {
        const filePath = path.join(__dirname, file);
        const exists = fs.existsSync(filePath);
        console.log(`   ${exists ? '✅' : '❌'} ${file} - ${exists ? 'Found' : 'MISSING'}`);
    });
    
    // ======================
    // 3. CREATE MISSING DIRECTORIES
    // ======================
    console.log('📁 [3] Creating directories...');
    
    const directories = ['proxy', 'temp', 'logs', 'public'];
    directories.forEach(dir => {
        const dirPath = path.join(__dirname, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`   📁 Created: ${dir}`);
            
            // Create placeholder files if needed
            if (dir === 'public') {
                const placeholderHTML = `<!DOCTYPE html>
<html>
<head>
    <title>SEO Bot - Placeholder</title>
</head>
<body>
    <h1>SEO Bot Placeholder</h1>
    <p>Public folder created. Please upload index.html</p>
</body>
</html>`;
                fs.writeFileSync(path.join(dirPath, 'index.html'), placeholderHTML);
                fs.writeFileSync(path.join(dirPath, 'renderer.js'), 'console.log("Renderer loaded");');
            }
        } else {
            console.log(`   ✅ Directory exists: ${dir}`);
        }
    });
    
    // ======================
    // 4. LOAD DEPENDENCIES WITH ERROR HANDLING
    // ======================
    console.log('📦 [4] Loading dependencies...');
    
    let express, cors, bodyParser;
    try {
        express = require('express');
        cors = require('cors');
        bodyParser = require('body-parser');
        console.log('   ✅ Core dependencies loaded');
    } catch (err) {
        console.error('   ❌ Failed to load core dependencies:', err.message);
        console.log('   🔧 Installing missing dependencies...');
        
        // Try to install missing dependencies (for Railway)
        const { execSync } = require('child_process');
        try {
            execSync('npm install express cors body-parser --no-save', { stdio: 'inherit' });
            console.log('   ✅ Dependencies installed');
            
            // Retry loading
            express = require('express');
            cors = require('cors');
            bodyParser = require('body-parser');
        } catch (installErr) {
            console.error('   ❌ Failed to install dependencies:', installErr.message);
            throw new Error('Dependencies missing');
        }
    }
    
    // ======================
    // 5. LOAD CUSTOM MODULES
    // ======================
    console.log('🤖 [5] Loading custom modules...');
    
    // Try to load bot modules, but continue even if they fail
    let seobot = { 
        main: () => console.log('Bot module not loaded'), 
        stop: () => console.log('Bot module not loaded'),
        getStatus: () => ({ isRunning: false })
    };
    
    let proxyLoader = () => Promise.resolve([]);
    let proxyValidator = { parseMultiple: () => ({ validCount: 0, unique: [] }) };
    
    try {
        seobot = require('./libs/index');
        console.log('   ✅ Bot module loaded');
    } catch (err) {
        console.warn('   ⚠️ Bot module not loaded:', err.message);
        // Create dummy module
        seobot = {
            main: (url, keywords, count, method, proxies) => {
                console.log(`[DUMMY BOT] Would visit ${url} ${count} times`);
                return Promise.resolve({ success: true, visitors: count });
            },
            stop: () => {
                console.log('[DUMMY BOT] Stopped');
                return Promise.resolve({ success: true });
            },
            getStatus: () => ({ isRunning: false, totalVisitors: 0, completedVisitors: 0 })
        };
    }
    
    try {
        proxyLoader = require('./libs/proxy');
        console.log('   ✅ Proxy loader loaded');
    } catch (err) {
        console.warn('   ⚠️ Proxy loader not loaded:', err.message);
        proxyLoader = () => Promise.resolve([]);
    }
    
    try {
        proxyValidator = require('./libs/proxy-validator');
        console.log('   ✅ Proxy validator loaded');
    } catch (err) {
        console.warn('   ⚠️ Proxy validator not loaded:', err.message);
        proxyValidator = {
            parseMultiple: (lines) => ({
                total: lines.length,
                validCount: 0,
                invalidCount: lines.length,
                duplicateCount: 0,
                unique: [],
                valid: [],
                invalid: lines.map(l => ({ raw: l, error: 'Validator not loaded' }))
            })
        };
    }
    
    // ======================
    // 6. CREATE EXPRESS APP
    // ======================
    console.log('🚀 [6] Creating Express app...');
    
    const app = express();
    const PORT = process.env.PORT || 3000;
    
    // ======================
    // 7. MIDDLEWARE
    // ======================
    console.log('🔧 [7] Setting up middleware...');
    
    app.use(cors());
    app.use(bodyParser.json({ limit: '10mb' }));
    app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
    app.use(express.static(path.join(__dirname, 'public')));
    
    // ======================
    // 8. CRITICAL ENDPOINTS (must work)
    // ======================
    console.log('🔌 [8] Setting up critical endpoints...');
    
    // HEALTH CHECK - MUST WORK FOR RAILWAY
    app.get('/health', (req, res) => {
        console.log('✅ Health check called');
        res.status(200).json({
            status: 'OK',
            service: 'seo-traffic-bot',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: '1.0.0'
        });
    });
    
    // ROOT ENDPOINT - MUST WORK
    app.get('/', (req, res) => {
        console.log('✅ Root endpoint called');
        
        // Check if index.html exists
        const indexPath = path.join(__dirname, 'public', 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            // Fallback HTML
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>SEO Traffic Bot</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 40px; background: #0F1014; color: white; }
                        .container { max-width: 800px; margin: 0 auto; }
                        .status { background: #28a745; padding: 10px; border-radius: 5px; }
                        .warning { background: #ffc107; color: black; padding: 10px; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🚀 SEO Traffic Bot</h1>
                        <div class="status">✅ Server is running!</div>
                        
                        <h2>Server Information</h2>
                        <ul>
                            <li>Port: ${PORT}</li>
                            <li>Uptime: ${Math.round(process.uptime())} seconds</li>
                            <li>Node.js: ${process.version}</li>
                            <li>Environment: ${process.env.NODE_ENV || 'development'}</li>
                        </ul>
                        
                        <div class="warning">
                            <h3>⚠️ Important</h3>
                            <p>index.html not found in public folder. Please upload your frontend files.</p>
                            <p>API endpoints are available:</p>
                            <ul>
                                <li><a href="/health">/health</a> - Health check</li>
                                <li><a href="/api/status">/api/status</a> - Server status</li>
                                <li><a href="/api/test">/api/test</a> - Test endpoint</li>
                            </ul>
                        </div>
                    </div>
                </body>
                </html>
            `);
        }
    });
    
    // ======================
    // 9. BASIC API ENDPOINTS
    // ======================
    console.log('🔧 [9] Setting up basic API endpoints...');
    
    // Server status
    app.get('/api/status', (req, res) => {
        res.json({
            server: {
                status: 'running',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                nodeVersion: process.version
            },
            directories: {
                proxy: fs.existsSync('./proxy') ? fs.readdirSync('./proxy').length : 0,
                temp: fs.existsSync('./temp') ? fs.readdirSync('./temp').length : 0,
                public: fs.existsSync('./public') ? fs.readdirSync('./public').length : 0
            },
            bot: seobot.getStatus ? seobot.getStatus() : { isRunning: false }
        });
    });
    
    // Test endpoint
    app.get('/api/test', (req, res) => {
        res.json({
            success: true,
            message: 'API is working!',
            timestamp: new Date().toISOString(),
            modules: {
                bot: seobot.main ? 'loaded' : 'not loaded',
                proxy: proxyLoader ? 'loaded' : 'not loaded',
                validator: proxyValidator ? 'loaded' : 'not loaded'
            }
        });
    });
    
    // File structure endpoint
    app.get('/api/files', (req, res) => {
        const listFiles = (dir, prefix = '') => {
            const items = [];
            try {
                const files = fs.readdirSync(dir);
                files.forEach(file => {
                    const fullPath = path.join(dir, file);
                    const stat = fs.statSync(fullPath);
                    items.push({
                        name: prefix + file,
                        type: stat.isDirectory() ? 'directory' : 'file',
                        size: stat.size,
                        modified: stat.mtime
                    });
                });
            } catch (err) {
                items.push({ error: err.message });
            }
            return items;
        };
        
        res.json({
            root: listFiles(__dirname),
            libs: fs.existsSync('./libs') ? listFiles('./libs') : 'Directory not found',
            public: fs.existsSync('./public') ? listFiles('./public') : 'Directory not found',
            proxy: fs.existsSync('./proxy') ? listFiles('./proxy') : 'Directory not found'
        });
    });
    
    // ======================
    // 10. PROXY MANAGEMENT ENDPOINTS
    // ======================
    console.log('🔌 [10] Setting up proxy management endpoints...');
    
    // Get proxy information
    app.get('/api/proxy-info', async (req, res) => {
        try {
            const proxyDir = './proxy/';
            
            if (!fs.existsSync(proxyDir)) {
                return res.json({
                    success: true,
                    totalProxies: 0,
                    count: 0,
                    files: []
                });
            }
            
            const files = fs.readdirSync(proxyDir);
            const textFiles = files.filter(file => 
                file.match(/\.(txt|list|proxy|conf|csv)$/i) || 
                !file.includes('.')
            );
            
            let totalProxies = 0;
            const fileInfo = [];
            
            for (const fileName of textFiles) {
                try {
                    const filePath = path.join(proxyDir, fileName);
                    const content = fs.readFileSync(filePath, 'utf8');
                    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
                    
                    // Parse proxies if validator is available
                    let validCount = lines.length;
                    let uniqueCount = lines.length;
                    
                    if (proxyValidator && proxyValidator.parseMultiple) {
                        const results = proxyValidator.parseMultiple(lines);
                        validCount = results.validCount;
                        uniqueCount = results.unique.length;
                        totalProxies += results.unique.length;
                    } else {
                        totalProxies += lines.length;
                    }
                    
                    fileInfo.push({
                        name: fileName,
                        lines: lines.length,
                        valid: validCount,
                        invalid: lines.length - validCount,
                        unique: uniqueCount
                    });
                } catch (fileErr) {
                    console.error(`Error reading file ${fileName}:`, fileErr.message);
                }
            }
            
            res.json({
                success: true,
                totalProxies: totalProxies,
                count: textFiles.length,
                files: fileInfo
            });
        } catch (error) {
            console.error('Error in /api/proxy-info:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });
    
    // Validate proxies
    app.post('/api/validate-proxies', async (req, res) => {
        try {
            const { proxies } = req.body;
            
            if (!proxies) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'No proxies provided' 
                });
            }
            
            const lines = proxies.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
            
            let stats = {
                total: lines.length,
                valid: 0,
                invalid: lines.length,
                duplicates: 0,
                unique: 0
            };
            
            let validProxies = [];
            let invalidProxies = [];
            let sample = [];
            
            if (proxyValidator && proxyValidator.parseMultiple) {
                const results = proxyValidator.parseMultiple(lines);
                stats = {
                    total: results.total,
                    valid: results.validCount,
                    invalid: results.invalidCount,
                    duplicates: results.duplicateCount,
                    unique: results.unique.length
                };
                validProxies = results.valid;
                invalidProxies = results.invalid;
                sample = results.unique.slice(0, 10);
            } else {
                // Basic validation if validator not available
                validProxies = lines.map(line => ({ 
                    string: line,
                    raw: line,
                    valid: true 
                }));
                stats.valid = lines.length;
                stats.unique = lines.length;
                sample = lines.slice(0, 10);
            }
            
            res.json({
                success: true,
                stats: stats,
                validProxies: validProxies,
                invalidProxies: invalidProxies,
                sample: sample
            });
        } catch (error) {
            console.error('Error in /api/validate-proxies:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });
    
    // Save proxies
    app.post('/api/save-proxies', async (req, res) => {
        try {
            const { proxies, filename = `proxies_${Date.now()}.txt` } = req.body;
            
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
            
            const filePath = path.join(proxyDir, filename);
            fs.writeFileSync(filePath, proxies, 'utf8');
            
            // Count lines
            const lines = proxies.split(/\r?\n/).filter(line => line.trim().length > 0);
            
            res.json({
                success: true,
                message: `Proxies saved to ${filename}`,
                filename: filename,
                stats: {
                    saved: lines.length
                }
            });
        } catch (error) {
            console.error('Error in /api/save-proxies:', error);
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
            
            // Basic validation
            if (!url) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'URL is required' 
                });
            }
            
            if (option === 'Google' && !keyboard) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Keywords are required for Google method' 
                });
            }
            
            // Load proxies if needed
            let proxyList = [];
            if (useProxies) {
                try {
                    proxyList = await proxyLoader();
                    if (proxyList.length === 0) {
                        return res.status(400).json({ 
                            success: false, 
                            error: 'No proxies available. Please upload proxies first.' 
                        });
                    }
                } catch (proxyErr) {
                    console.error('Error loading proxies:', proxyErr);
                }
            }
            
            // Start bot in background (non-blocking)
            seobot.main(url, keyboard, parseInt(count) || 1, option.toLowerCase(), proxyList)
                .then(result => {
                    console.log('Bot finished:', result);
                })
                .catch(error => {
                    console.error('Bot error:', error);
                });
            
            res.json({
                success: true,
                message: 'Bot started successfully',
                config: {
                    url,
                    keywords: keyboard,
                    count: parseInt(count) || 1,
                    method: option,
                    useProxies,
                    proxyCount: proxyList.length
                }
            });
        } catch (error) {
            console.error('Error in /api/start:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });
    
    // Stop bot
    app.post('/api/stop', async (req, res) => {
        try {
            const result = await seobot.stop();
            res.json({
                success: true,
                message: 'Bot stopped',
                result: result
            });
        } catch (error) {
            console.error('Error in /api/stop:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });
    
    // ======================
    // 11. ERROR HANDLING
    // ======================
    console.log('🛡️ [11] Setting up error handling...');
    
    // 404 handler
    app.use((req, res) => {
        console.log(`❌ 404: ${req.method} ${req.path}`);
        res.status(404).json({
            success: false,
            error: 'Endpoint not found',
            path: req.path,
            method: req.method,
            available: [
                '/health', '/', '/api/status', '/api/test', '/api/files',
                '/api/proxy-info', '/api/validate-proxies', '/api/save-proxies',
                '/api/start', '/api/stop'
            ]
        });
    });
    
    // Global error handler
    app.use((err, req, res, next) => {
        console.error('❌ Global error:', err);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    });
    
    // ======================
    // 12. START SERVER
    // ======================
    console.log('🚀 [12] Starting server...');
    
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log('='.repeat(60));
        console.log('✅ SEO TRAFFIC BOT SERVER STARTED SUCCESSFULLY');
        console.log('='.repeat(60));
        console.log(`📡 URL: http://localhost:${PORT}`);
        console.log(`🔧 Health: http://localhost:${PORT}/health`);
        console.log(`📊 Status: http://localhost:${PORT}/api/status`);
        console.log(`🔄 Test: http://localhost:${PORT}/api/test`);
        console.log('='.repeat(60));
        console.log('Available endpoints:');
        console.log('  GET  /                    - Frontend interface');
        console.log('  GET  /health              - Health check');
        console.log('  GET  /api/status          - Server status');
        console.log('  GET  /api/test            - Test endpoint');
        console.log('  GET  /api/files           - File structure');
        console.log('  GET  /api/proxy-info      - Get proxy information');
        console.log('  POST /api/validate-proxies - Validate proxy list');
        console.log('  POST /api/save-proxies    - Save proxies to file');
        console.log('  POST /api/start           - Start bot');
        console.log('  POST /api/stop            - Stop bot');
        console.log('='.repeat(60));
        console.log('Server startup completed at:', new Date().toISOString());
        console.log('='.repeat(60));
    });
    
    // ======================
    // 13. GRACEFUL SHUTDOWN
    // ======================
    process.on('SIGTERM', () => {
        console.log('🔻 Received SIGTERM. Graceful shutdown...');
        server.close(() => {
            console.log('✅ Server closed');
            process.exit(0);
        });
        
        setTimeout(() => {
            console.log('⚠️ Forcing shutdown');
            process.exit(1);
        }, 5000);
    });
    
    process.on('SIGINT', () => {
        console.log('🔻 Received SIGINT. Graceful shutdown...');
        server.close(() => {
            console.log('✅ Server closed');
            process.exit(0);
        });
    });
    
    // Handle uncaught errors
    process.on('uncaughtException', (err) => {
        console.error('❌ UNCAUGHT EXCEPTION:', err);
        // Don't exit - keep server running
    });
    
    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
    });
    
} catch (error) {
    console.error('❌ FATAL ERROR DURING STARTUP:', error);
    console.error('Stack:', error.stack);
    
    // Try to write error to file
    try {
        const fs = require('fs');
        const errorLog = `
=== FATAL STARTUP ERROR ===
Time: ${new Date().toISOString()}
Error: ${error.message}
Stack: ${error.stack}
=== END ===
`;
        fs.writeFileSync('./startup-error.log', errorLog);
    } catch (fileErr) {
        console.error('Could not write error log:', fileErr);
    }
    
    // Exit with error code
    process.exit(1);
}