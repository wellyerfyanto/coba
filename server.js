// ======================
// SEO TRAFFIC BOT - RAILWAY EDITION
// HTTP Simulation Mode (No Chrome/Selenium)
// ======================

console.log('🚀 Starting SEO Traffic Bot - Railway Edition');
console.log('📅', new Date().toISOString());
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
console.log('🚪 Port:', process.env.PORT || 3000);
console.log('⚡ Mode: HTTP Simulation (Railway Optimized)');

// ======================
// 1. IMPORTS
// ======================
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Check if running on Railway
const IS_RAILWAY = process.env.RAILWAY_ENVIRONMENT === 'production' || 
                   process.env.NODE_ENV === 'production' ||
                   process.env.RAILWAY_GIT_COMMIT_SHA !== undefined;

// ======================
// 2. LOAD CUSTOM MODULES
// ======================
let trafficBot, proxyValidator, proxyLoader;

try {
    // Load bot module (HTTP simulator)
    trafficBot = require('./libs/traffic-simulator');
    console.log('✅ Traffic simulator loaded');
} catch (err) {
    console.error('❌ Failed to load traffic simulator:', err.message);
    // Create fallback
    trafficBot = {
        main: async () => ({ success: false, error: 'Module not loaded' }),
        stop: () => ({ success: true }),
        getStatus: () => ({ 
            isRunning: false, 
            totalVisitors: 0, 
            completedVisitors: 0,
            mode: 'HTTP Simulation' 
        })
    };
}

try {
    proxyValidator = require('./libs/proxy-validator');
    console.log('✅ Proxy validator loaded');
} catch (err) {
    console.warn('⚠️ Proxy validator not loaded:', err.message);
    proxyValidator = {
        parseMultiple: () => ({ validCount: 0, unique: [] })
    };
}

try {
    proxyLoader = require('./libs/proxy');
    console.log('✅ Proxy loader loaded');
} catch (err) {
    console.warn('⚠️ Proxy loader not loaded:', err.message);
    proxyLoader = () => Promise.resolve([]);
}

// ======================
// 3. CREATE EXPRESS APP
// ======================
const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// 4. CREATE DIRECTORIES
// ======================
const directories = ['proxy', 'temp', 'logs', 'public/uploads'];
directories.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 Created: ${dir}`);
    }
});

// Create proxy placeholder if empty
const proxyDir = './proxy/';
if (fs.existsSync(proxyDir) && fs.readdirSync(proxyDir).length === 0) {
    const placeholderContent = `# Add your proxies here
# Format: IP:PORT or http://IP:PORT
# Example:
# 192.168.1.1:8080
# http://proxy.example.com:3128
# socks5://socks.example.com:1080`;
    
    fs.writeFileSync(path.join(proxyDir, 'example_proxies.txt'), placeholderContent);
    console.log('📝 Created proxy placeholder file');
}

// ======================
// 5. MIDDLEWARE
// ======================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ======================
// 6. HEALTH & STATUS ENDPOINTS
// ======================

// Health check (Railway required)
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'seo-traffic-bot',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        platform: {
            type: IS_RAILWAY ? 'Railway' : 'Local',
            node: process.version,
            arch: process.arch,
            cpus: os.cpus().length
        }
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
                <title>SEO Traffic Bot - Railway</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; background: #0F1014; color: white; }
                    .container { max-width: 800px; margin: 0 auto; }
                    .card { background: #1e1f26; padding: 20px; border-radius: 10px; margin: 20px 0; }
                    .success { color: #28a745; }
                    .warning { color: #ffc107; }
                    .info { color: #17a2b8; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🚀 SEO Traffic Bot - Railway Edition</h1>
                    <div class="card">
                        <h2 class="success">✅ Server is running!</h2>
                        <p>🚂 <strong>Mode:</strong> ${IS_RAILWAY ? 'Railway (HTTP Simulation)' : 'Local'}</p>
                        <p>📡 <strong>Port:</strong> ${PORT}</p>
                        <p>⏱️ <strong>Uptime:</strong> ${Math.round(process.uptime())} seconds</p>
                        <p>🖥️ <strong>Node.js:</strong> ${process.version}</p>
                    </div>
                    
                    <div class="card">
                        <h3>📊 API Endpoints:</h3>
                        <ul>
                            <li><a href="/health">/health</a> - Health check</li>
                            <li><a href="/api/status">/api/status</a> - Server status</li>
                            <li><a href="/api/files">/api/files</a> - File structure</li>
                            <li><a href="/api/proxy-info">/api/proxy-info</a> - Proxy information</li>
                        </ul>
                    </div>
                    
                    <div class="card warning">
                        <h3>⚠️ Important Information</h3>
                        <p>This is the Railway-optimized version using HTTP simulation.</p>
                        <p>Chrome/Selenium is disabled for Railway compatibility.</p>
                        <p>Upload your proxy files via the web interface.</p>
                    </div>
                </div>
            </body>
            </html>
        `);
    }
});

// API status
app.get('/api/status', (req, res) => {
    const proxyDir = './proxy/';
    let proxyCount = 0;
    
    if (fs.existsSync(proxyDir)) {
        try {
            const files = fs.readdirSync(proxyDir);
            const textFiles = files.filter(f => f.endsWith('.txt'));
            textFiles.forEach(file => {
                const content = fs.readFileSync(path.join(proxyDir, file), 'utf8');
                const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
                proxyCount += lines.length;
            });
        } catch (e) {
            proxyCount = 0;
        }
    }
    
    res.json({
        server: {
            status: 'running',
            mode: IS_RAILWAY ? 'Railway (HTTP Simulation)' : 'Local',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            nodeVersion: process.version,
            platform: os.platform(),
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                total: Math.round(os.totalmem() / 1024 / 1024) + ' MB',
                free: Math.round(os.freemem() / 1024 / 1024) + ' MB'
            }
        },
        bot: trafficBot.getStatus ? trafficBot.getStatus() : { isRunning: false },
        proxies: {
            count: proxyCount,
            directory: proxyDir
        },
        directories: {
            proxy: fs.existsSync('./proxy') ? fs.readdirSync('./proxy').length : 0,
            temp: fs.existsSync('./temp') ? fs.readdirSync('./temp').length : 0,
            logs: fs.existsSync('./logs') ? fs.readdirSync('./logs').length : 0
        }
    });
});

// ======================
// 7. PROXY MANAGEMENT API
// ======================

// Get proxy files info
app.get('/api/proxy-info', async (req, res) => {
    try {
        const proxyDir = './proxy/';
        
        if (!fs.existsSync(proxyDir)) {
            return res.json({
                success: true,
                totalProxies: 0,
                count: 0,
                files: [],
                message: 'Proxy directory not found'
            });
        }
        
        const files = fs.readdirSync(proxyDir);
        const textFiles = files.filter(file => 
            file.endsWith('.txt') || 
            file.endsWith('.txt') || 
            !file.includes('.') ||
            file.endsWith('.list')
        );
        
        let totalProxies = 0;
        const fileInfo = [];
        
        for (const fileName of textFiles) {
            try {
                const filePath = path.join(proxyDir, fileName);
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split(/\r?\n/).filter(line => {
                    const trimmed = line.trim();
                    return trimmed.length > 0 && 
                           !trimmed.startsWith('#') && 
                           !trimmed.startsWith('//');
                });
                
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
                    size: fs.statSync(filePath).size,
                    lines: lines.length,
                    valid: validCount,
                    invalid: lines.length - validCount,
                    unique: uniqueCount,
                    lastModified: fs.statSync(filePath).mtime
                });
            } catch (fileErr) {
                console.error(`Error reading ${fileName}:`, fileErr.message);
                fileInfo.push({
                    name: fileName,
                    error: fileErr.message
                });
            }
        }
        
        res.json({
            success: true,
            totalProxies: totalProxies,
            count: textFiles.length,
            files: fileInfo,
            message: textFiles.length > 0 ? 
                `Found ${totalProxies} proxies in ${textFiles.length} file(s)` :
                'No proxy files found'
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
        
        if (!proxies || typeof proxies !== 'string') {
            return res.status(400).json({ 
                success: false, 
                error: 'No proxies provided or invalid format' 
            });
        }
        
        const lines = proxies.split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#'));
        
        if (lines.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'No valid proxy lines found' 
            });
        }
        
        let validationResult;
        
        if (proxyValidator && proxyValidator.parseMultiple) {
            validationResult = proxyValidator.parseMultiple(lines);
        } else {
            // Basic validation
            validationResult = {
                total: lines.length,
                validCount: lines.length,
                invalidCount: 0,
                duplicateCount: 0,
                unique: lines,
                valid: lines.map(line => ({ string: line, raw: line, valid: true })),
                invalid: []
            };
        }
        
        // Take sample (max 10)
        const sample = validationResult.unique.slice(0, 10);
        
        res.json({
            success: true,
            stats: {
                total: validationResult.total,
                valid: validationResult.validCount,
                invalid: validationResult.invalidCount,
                duplicates: validationResult.duplicateCount,
                unique: validationResult.unique.length
            },
            sample: sample,
            message: validationResult.validCount > 0 ? 
                `✅ Found ${validationResult.validCount} valid proxies` :
                '❌ No valid proxies found'
        });
    } catch (error) {
        console.error('Error in /api/validate-proxies:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Save proxies to file
app.post('/api/save-proxies', async (req, res) => {
    try {
        const { proxies, filename } = req.body;
        
        if (!proxies) {
            return res.status(400).json({ 
                success: false, 
                error: 'No proxies provided' 
            });
        }
        
        // Validate filename
        let safeFilename;
        if (filename && typeof filename === 'string' && filename.length > 0) {
            // Sanitize filename
            safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_') + '.txt';
        } else {
            safeFilename = `proxies_${Date.now()}.txt`;
        }
        
        const proxyDir = './proxy/';
        if (!fs.existsSync(proxyDir)) {
            fs.mkdirSync(proxyDir, { recursive: true });
        }
        
        const filePath = path.join(proxyDir, safeFilename);
        
        // Process and deduplicate proxies
        const lines = proxies.split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#'));
        
        // Remove duplicates
        const uniqueLines = [...new Set(lines)];
        
        // Add header comment
        const header = `# Proxies saved on ${new Date().toISOString()}\n# Total: ${uniqueLines.length} unique proxies\n\n`;
        const content = header + uniqueLines.join('\n');
        
        fs.writeFileSync(filePath, content, 'utf8');
        
        res.json({
            success: true,
            filename: safeFilename,
            stats: {
                total: lines.length,
                saved: uniqueLines.length,
                duplicates: lines.length - uniqueLines.length
            },
            message: `Saved ${uniqueLines.length} unique proxies to ${safeFilename}`
        });
    } catch (error) {
        console.error('Error in /api/save-proxies:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Upload proxy file
app.post('/api/upload-proxy-file', async (req, res) => {
    try {
        const { filename, content } = req.body;
        
        if (!content) {
            return res.status(400).json({ 
                success: false, 
                error: 'No file content provided' 
            });
        }
        
        const proxyDir = './proxy/';
        if (!fs.existsSync(proxyDir)) {
            fs.mkdirSync(proxyDir, { recursive: true });
        }
        
        const safeFilename = filename ? 
            filename.replace(/[^a-zA-Z0-9._-]/g, '_') : 
            `upload_${Date.now()}.txt`;
            
        const filePath = path.join(proxyDir, safeFilename);
        
        fs.writeFileSync(filePath, content, 'utf8');
        
        // Count lines
        const lines = content.split(/\r?\n/)
            .filter(line => line.trim().length > 0 && !line.trim().startsWith('#'));
        
        res.json({
            success: true,
            filename: safeFilename,
            lines: lines.length,
            message: `Uploaded ${lines.length} proxies to ${safeFilename}`
        });
    } catch (error) {
        console.error('Error uploading proxy file:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete proxy file
app.delete('/api/proxy-file/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        
        if (!filename) {
            return res.status(400).json({ 
                success: false, 
                error: 'Filename required' 
            });
        }
        
        // Security: prevent path traversal
        const safeFilename = path.basename(filename);
        const filePath = path.join('./proxy/', safeFilename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ 
                success: false, 
                error: 'File not found' 
            });
        }
        
        fs.unlinkSync(filePath);
        
        res.json({
            success: true,
            message: `Deleted ${safeFilename}`
        });
    } catch (error) {
        console.error('Error deleting proxy file:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ======================
// 8. BOT CONTROL API
// ======================

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
        
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return res.status(400).json({ 
                success: false, 
                error: 'URL must start with http:// or https://' 
            });
        }
        
        if (option === 'Google' && (!keyboard || keyboard.trim().length === 0)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Search keywords are required for Google method' 
            });
        }
        
        const visitorCount = parseInt(count) || 1;
        if (visitorCount < 1 || visitorCount > 100) {
            return res.status(400).json({ 
                success: false, 
                error: 'Visitor count must be between 1 and 100' 
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
                console.error('Error loading proxies:', proxyErr.message);
                // Continue without proxies
            }
        }
        
        // Start bot (non-blocking)
        const botResult = await trafficBot.main(
            url, 
            keyboard || '', 
            visitorCount, 
            option || 'direct', 
            proxyList
        );
        
        // Log to file
        const logEntry = {
            timestamp: new Date().toISOString(),
            url: url,
            keywords: keyboard,
            count: visitorCount,
            method: option,
            useProxies: useProxies,
            proxyCount: proxyList.length,
            result: botResult
        };
        
        const logDir = './logs/';
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        const logFile = path.join(logDir, 'bot_log.json');
        let logs = [];
        
        if (fs.existsSync(logFile)) {
            try {
                const existing = fs.readFileSync(logFile, 'utf8');
                logs = JSON.parse(existing);
            } catch (e) {
                logs = [];
            }
        }
        
        logs.push(logEntry);
        fs.writeFileSync(logFile, JSON.stringify(logs, null, 2), 'utf8');
        
        res.json({
            success: true,
            message: 'Bot started successfully',
            mode: IS_RAILWAY ? 'HTTP Simulation (Railway)' : 'Standard',
            config: {
                url,
                keywords: keyboard,
                count: visitorCount,
                method: option,
                useProxies,
                proxyCount: proxyList.length
            },
            result: botResult
        });
    } catch (error) {
        console.error('Error in /api/start:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            mode: IS_RAILWAY ? 'HTTP Simulation (Railway)' : 'Standard'
        });
    }
});

// Stop bot
app.post('/api/stop', async (req, res) => {
    try {
        const result = await trafficBot.stop();
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

// Get bot status
app.get('/api/bot-status', async (req, res) => {
    try {
        const status = trafficBot.getStatus ? trafficBot.getStatus() : { isRunning: false };
        res.json({
            success: true,
            status: status,
            mode: IS_RAILWAY ? 'HTTP Simulation (Railway)' : 'Standard'
        });
    } catch (error) {
        console.error('Error in /api/bot-status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ======================
// 9. FILE MANAGEMENT API
// ======================

// List files in directory
app.get('/api/files', async (req, res) => {
    try {
        const { dir = '.' } = req.query;
        
        // Security: prevent path traversal
        const safeDir = path.normalize(dir).replace(/^(\.\.[\/\\])+/, '');
        const fullPath = path.join(__dirname, safeDir);
        
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ 
                success: false, 
                error: 'Directory not found' 
            });
        }
        
        const files = fs.readdirSync(fullPath);
        const fileInfo = files.map(file => {
            const filePath = path.join(fullPath, file);
            const stat = fs.statSync(filePath);
            
            return {
                name: file,
                type: stat.isDirectory() ? 'directory' : 'file',
                size: stat.size,
                modified: stat.mtime,
                path: path.relative(__dirname, filePath)
            };
        });
        
        res.json({
            success: true,
            path: safeDir,
            files: fileInfo
        });
    } catch (error) {
        console.error('Error in /api/files:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get logs
app.get('/api/logs', async (req, res) => {
    try {
        const { limit = 100 } = req.query;
        const logFile = './logs/bot_log.json';
        
        if (!fs.existsSync(logFile)) {
            return res.json({
                success: true,
                logs: [],
                count: 0,
                message: 'No logs found'
            });
        }
        
        const content = fs.readFileSync(logFile, 'utf8');
        let logs = [];
        
        try {
            logs = JSON.parse(content);
        } catch (e) {
            logs = [];
        }
        
        // Apply limit
        const limitedLogs = logs.slice(-parseInt(limit));
        
        res.json({
            success: true,
            logs: limitedLogs,
            count: limitedLogs.length,
            total: logs.length
        });
    } catch (error) {
        console.error('Error in /api/logs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ======================
// 10. UTILITY ENDPOINTS
// ======================

// System info
app.get('/api/system', (req, res) => {
    res.json({
        success: true,
        system: {
            platform: os.platform(),
            arch: os.arch(),
            cpus: os.cpus().length,
            memory: {
                total: Math.round(os.totalmem() / 1024 / 1024) + ' MB',
                free: Math.round(os.freemem() / 1024 / 1024) + ' MB',
                used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024) + ' MB'
            },
            uptime: os.uptime(),
            loadavg: os.loadavg()
        },
        node: {
            version: process.version,
            versions: process.versions,
            memory: process.memoryUsage(),
            uptime: process.uptime()
        },
        app: {
            mode: IS_RAILWAY ? 'Railway (HTTP Simulation)' : 'Local',
            port: PORT,
            env: process.env.NODE_ENV || 'development'
        }
    });
});

// Test endpoint
app.get('/api/test', async (req, res) => {
    try {
        const testUrl = 'https://httpbin.org/get';
        const https = require('https');
        
        const testResult = await new Promise((resolve) => {
            https.get(testUrl, (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => {
                    resolve({
                        status: response.statusCode,
                        success: response.statusCode === 200,
                        url: testUrl
                    });
                });
            }).on('error', (error) => {
                resolve({
                    success: false,
                    error: error.message,
                    url: testUrl
                });
            });
        });
        
        res.json({
            success: true,
            message: 'Test completed',
            timestamp: new Date().toISOString(),
            modules: {
                trafficBot: trafficBot ? 'loaded' : 'not loaded',
                proxyValidator: proxyValidator ? 'loaded' : 'not loaded',
                proxyLoader: proxyLoader ? 'loaded' : 'not loaded'
            },
            environment: {
                railway: IS_RAILWAY,
                node: process.version,
                port: PORT
            },
            connectivity: testResult
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ======================
// 11. ERROR HANDLING
// ======================

// 404 handler
app.use((req, res) => {
    console.log(`❌ 404: ${req.method} ${req.path}`);
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        availableEndpoints: [
            'GET  /                    - Frontend interface',
            'GET  /health              - Health check',
            'GET  /api/status          - Server status',
            'GET  /api/test            - Test endpoint',
            'GET  /api/system          - System information',
            'GET  /api/files           - File browser',
            'GET  /api/logs            - View logs',
            'GET  /api/bot-status      - Bot status',
            'GET  /api/proxy-info      - Proxy information',
            'POST /api/validate-proxies - Validate proxy list',
            'POST /api/save-proxies    - Save proxies',
            'POST /api/upload-proxy-file - Upload proxy file',
            'DELETE /api/proxy-file/:filename - Delete proxy file',
            'POST /api/start           - Start bot',
            'POST /api/stop            - Stop bot'
        ]
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Global error:', err.stack || err);
    
    // Log error to file
    try {
        const errorLog = `[${new Date().toISOString()}] ${err.stack || err}\n\n`;
        const logDir = './logs/';
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        fs.appendFileSync(path.join(logDir, 'errors.log'), errorLog, 'utf8');
    } catch (logErr) {
        console.error('Failed to log error:', logErr);
    }
    
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString()
    });
});

// ======================
// 12. START SERVER
// ======================
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(70));
    console.log('✅ SEO TRAFFIC BOT SERVER STARTED SUCCESSFULLY');
    console.log('='.repeat(70));
    console.log(`🚂 Mode: ${IS_RAILWAY ? 'Railway (HTTP Simulation)' : 'Local'}`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🔧 Health: http://localhost:${PORT}/health`);
    console.log(`📊 Status: http://localhost:${PORT}/api/status`);
    console.log(`🔄 Test: http://localhost:${PORT}/api/test`);
    console.log('='.repeat(70));
    console.log('Server startup completed at:', new Date().toISOString());
    console.log('='.repeat(70));
    
    // Log to file
    const startupLog = `[${new Date().toISOString()}] Server started on port ${PORT}\n`;
    fs.appendFileSync('./logs/startup.log', startupLog, 'utf8');
});

// ======================
// 13. GRACEFUL SHUTDOWN
// ======================
const gracefulShutdown = (signal) => {
    console.log(`\n🔻 Received ${signal}. Graceful shutdown...`);
    
    server.close(() => {
        console.log('✅ HTTP server closed');
        
        // Stop bot if running
        if (trafficBot && trafficBot.stop) {
            trafficBot.stop().then(() => {
                console.log('✅ Bot stopped');
                process.exit(0);
            }).catch(() => {
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.warn('⚠️ Forcing shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
    console.error('❌ UNCAUGHT EXCEPTION:', err.stack || err);
    // Don't exit - keep server running
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
});