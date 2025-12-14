const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const seobot = require('./libs/index');
const proxyLoader = require('./libs/proxy');
const proxyValidator = require('./libs/proxy-validator');

const app = express();
const PORT = process.env.PORT || 3000;

// ======================
// MIDDLEWARE
// ======================
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'temp')));

// ======================
// HELPER FUNCTIONS
// ======================
function createDirectories() {
    const dirs = ['proxy', 'temp', 'logs'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Created directory: ${dir}`);
        }
    });
}

// ======================
// API ENDPOINTS
// ======================

// Health check endpoint (required for Railway)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'seo-traffic-bot',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
    });
});

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get server status
app.get('/api/status', (req, res) => {
    const botStatus = seobot.getStatus ? seobot.getStatus() : { isRunning: false };
    
    res.json({
        server: {
            status: 'running',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            nodeVersion: process.version
        },
        bot: botStatus,
        directories: {
            proxy: fs.existsSync('./proxy') ? fs.readdirSync('./proxy').length : 0,
            temp: fs.existsSync('./temp') ? fs.readdirSync('./temp').length : 0,
            logs: fs.existsSync('./logs') ? fs.readdirSync('./logs').length : 0
        }
    });
});

// Get proxy information
app.get('/api/proxy-info', async (req, res) => {
    try {
        const proxyDir = './proxy';
        
        if (!fs.existsSync(proxyDir)) {
            return res.json({
                count: 0,
                files: [],
                totalProxies: 0
            });
        }
        
        const files = fs.readdirSync(proxyDir)
            .filter(file => file.match(/\.(txt|list|proxy|conf|csv)$/i) || !file.includes('.'));
        
        let totalProxies = 0;
        const fileInfo = [];
        
        for (const file of files) {
            try {
                const content = fs.readFileSync(path.join(proxyDir, file), 'utf8');
                const lines = content.split(/\r?\n/)
                    .map(line => line.trim())
                    .filter(line => line.length > 0 && !line.startsWith('#'));
                
                const results = proxyValidator.parseMultiple(lines);
                totalProxies += results.unique.length;
                
                fileInfo.push({
                    name: file,
                    size: content.length,
                    lines: lines.length,
                    valid: results.validCount,
                    invalid: results.invalidCount,
                    unique: results.unique.length
                });
            } catch (fileError) {
                fileInfo.push({
                    name: file,
                    error: fileError.message,
                    valid: 0,
                    invalid: 0,
                    unique: 0
                });
            }
        }
        
        res.json({
            success: true,
            count: files.length,
            files: fileInfo,
            totalProxies: totalProxies
        });
        
    } catch (error) {
        console.error('Proxy info error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Validate proxy format
app.post('/api/validate-proxies', (req, res) => {
    try {
        const { proxies } = req.body;
        
        if (!proxies || typeof proxies !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'No proxies provided'
            });
        }
        
        const lines = proxies.split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        if (lines.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Empty proxy list'
            });
        }
        
        const results = proxyValidator.parseMultiple(lines);
        
        res.json({
            success: true,
            stats: {
                total: results.total,
                valid: results.validCount,
                invalid: results.invalidCount,
                duplicates: results.duplicateCount,
                unique: results.validCount - results.duplicateCount
            },
            validProxies: results.valid,
            invalidProxies: results.invalid,
            duplicateProxies: Array.from(results.duplicates),
            sample: results.valid.slice(0, 10).map(p => p.string)
        });
        
    } catch (error) {
        console.error('Proxy validation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Save validated proxies
app.post('/api/save-proxies', async (req, res) => {
    try {
        const { proxies, filename = `proxies_${Date.now()}.txt` } = req.body;
        
        if (!proxies || typeof proxies !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'No proxies provided'
            });
        }
        
        // Parse and validate
        const lines = proxies.split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        if (lines.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid proxy data'
            });
        }
        
        const results = proxyValidator.parseMultiple(lines);
        
        if (results.validCount === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid proxies found',
                details: results.invalid
            });
        }
        
        // Create proxy directory if it doesn't exist
        const proxyDir = './proxy';
        if (!fs.existsSync(proxyDir)) {
            fs.mkdirSync(proxyDir, { recursive: true });
        }
        
        // Save valid proxies
        const proxyText = results.unique.join('\n');
        const filePath = path.join(proxyDir, filename);
        fs.writeFileSync(filePath, proxyText, 'utf8');
        
        console.log(`✅ Saved ${results.unique.length} proxies to ${filename}`);
        
        res.json({
            success: true,
            message: `Saved ${results.unique.length} valid proxies`,
            stats: {
                totalInput: results.total,
                valid: results.validCount,
                invalid: results.invalidCount,
                duplicates: results.duplicateCount,
                saved: results.unique.length
            },
            filename: filename,
            filePath: filePath,
            sample: results.unique.slice(0, 5)
        });
        
    } catch (error) {
        console.error('Save proxies error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Clear all proxies
app.delete('/api/clear-proxies', async (req, res) => {
    try {
        const proxyDir = './proxy';
        
        if (!fs.existsSync(proxyDir)) {
            return res.json({
                success: true,
                message: 'Proxy directory does not exist'
            });
        }
        
        const files = fs.readdirSync(proxyDir);
        let deletedCount = 0;
        
        files.forEach(file => {
            try {
                fs.unlinkSync(path.join(proxyDir, file));
                deletedCount++;
            } catch (error) {
                console.error(`Failed to delete ${file}:`, error.message);
            }
        });
        
        console.log(`🗑️  Deleted ${deletedCount} proxy files`);
        
        res.json({
            success: true,
            message: `Deleted ${deletedCount} proxy files`,
            deletedCount: deletedCount
        });
        
    } catch (error) {
        console.error('Clear proxies error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start bot
app.post('/api/start-bot', async (req, res) => {
    try {
        const { url, keywords, count, method, useProxies = true } = req.body;
        
        // Validation
        if (!url || typeof url !== 'string' || url.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Valid URL is required'
            });
        }
        
        if (method === 'google' && (!keywords || keywords.trim().length === 0)) {
            return res.status(400).json({
                success: false,
                error: 'Search keywords are required for Google method'
            });
        }
        
        const visitorCount = parseInt(count) || 1;
        if (visitorCount < 1 || visitorCount > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Visitor count must be between 1 and 1000'
            });
        }
        
        // Load proxies if enabled
        let proxyList = [];
        if (useProxies) {
            try {
                proxyList = await proxyLoader();
                console.log(`Loaded ${proxyList.length} proxies`);
                
                if (proxyList.length === 0) {
                    console.log('⚠️  No proxies available, running without proxies');
                } else if (visitorCount > proxyList.length) {
                    console.log(`⚠️  Requested ${visitorCount} visitors but only ${proxyList.length} proxies available`);
                }
            } catch (proxyError) {
                console.error('Failed to load proxies:', proxyError);
                proxyList = [];
            }
        }
        
        // Start bot asynchronously
        setTimeout(async () => {
            try {
                console.log(`🚀 Starting bot with configuration:`);
                console.log(`   URL: ${url}`);
                console.log(`   Method: ${method}`);
                console.log(`   Visitors: ${visitorCount}`);
                console.log(`   Proxies: ${proxyList.length} available`);
                
                const result = await seobot.main(
                    url,
                    keywords || '',
                    visitorCount,
                    method || 'direct',
                    proxyList
                );
                
                console.log(`✅ Bot completed:`, result);
            } catch (botError) {
                console.error('❌ Bot execution failed:', botError);
            }
        }, 100);
        
        // Return immediate response
        res.json({
            success: true,
            message: 'Bot started successfully',
            config: {
                url: url,
                method: method || 'direct',
                visitors: visitorCount,
                proxies: proxyList.length,
                useProxies: useProxies
            },
            note: 'Bot is running in background. Check logs for progress.'
        });
        
    } catch (error) {
        console.error('Start bot error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Stop bot
app.post('/api/stop-bot', async (req, res) => {
    try {
        const result = await seobot.stop();
        
        res.json({
            success: true,
            message: 'Bot stopped successfully',
            result: result
        });
        
    } catch (error) {
        console.error('Stop bot error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get bot status
app.get('/api/bot-status', (req, res) => {
    try {
        const status = seobot.getStatus ? seobot.getStatus() : { isRunning: false };
        
        res.json({
            success: true,
            status: status
        });
        
    } catch (error) {
        console.error('Bot status error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get logs
app.get('/api/logs', (req, res) => {
    try {
        const logDir = './logs';
        const logs = [];
        
        if (fs.existsSync(logDir)) {
            const files = fs.readdirSync(logDir)
                .filter(file => file.endsWith('.log'))
                .sort()
                .reverse()
                .slice(0, 10); // Get last 10 log files
            
            files.forEach(file => {
                try {
                    const stats = fs.statSync(path.join(logDir, file));
                    logs.push({
                        name: file,
                        size: stats.size,
                        modified: stats.mtime,
                        path: `/logs/${file}`
                    });
                } catch (e) {
                    // Skip file if error
                }
            });
        }
        
        res.json({
            success: true,
            logs: logs
        });
        
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get temporary files (screenshots, etc.)
app.get('/api/temp-files', (req, res) => {
    try {
        const tempDir = './temp';
        const files = [];
        
        if (fs.existsSync(tempDir)) {
            const fileList = fs.readdirSync(tempDir)
                .filter(file => file.match(/\.(png|jpg|jpeg|gif|log|txt)$/i))
                .sort()
                .reverse()
                .slice(0, 20);
            
            fileList.forEach(file => {
                try {
                    const stats = fs.statSync(path.join(tempDir, file));
                    files.push({
                        name: file,
                        size: stats.size,
                        modified: stats.mtime,
                        url: `/temp/${file}`
                    });
                } catch (e) {
                    // Skip file if error
                }
            });
        }
        
        res.json({
            success: true,
            files: files
        });
        
    } catch (error) {
        console.error('Get temp files error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Clear temporary files
app.delete('/api/clear-temp', (req, res) => {
    try {
        const tempDir = './temp';
        let deletedCount = 0;
        
        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            
            files.forEach(file => {
                try {
                    fs.unlinkSync(path.join(tempDir, file));
                    deletedCount++;
                } catch (error) {
                    console.error(`Failed to delete ${file}:`, error.message);
                }
            });
        }
        
        res.json({
            success: true,
            message: `Cleared ${deletedCount} temporary files`,
            deletedCount: deletedCount
        });
        
    } catch (error) {
        console.error('Clear temp error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Upload proxy file
app.post('/api/upload-file', (req, res) => {
    try {
        const { filename, content } = req.body;
        
        if (!filename || !content) {
            return res.status(400).json({
                success: false,
                error: 'Filename and content are required'
            });
        }
        
        // Validate filename
        if (!filename.match(/^[a-zA-Z0-9_.-]+\.(txt|list|proxy|conf)$/)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid filename. Use .txt, .list, .proxy, or .conf extension'
            });
        }
        
        const proxyDir = './proxy';
        if (!fs.existsSync(proxyDir)) {
            fs.mkdirSync(proxyDir, { recursive: true });
        }
        
        const filePath = path.join(proxyDir, filename);
        fs.writeFileSync(filePath, content, 'utf8');
        
        // Validate the uploaded proxies
        const lines = content.split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        const results = proxyValidator.parseMultiple(lines);
        
        res.json({
            success: true,
            message: `File uploaded: ${filename}`,
            stats: {
                lines: lines.length,
                valid: results.validCount,
                invalid: results.invalidCount,
                unique: results.unique.length
            },
            filePath: filePath
        });
        
    } catch (error) {
        console.error('Upload file error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Download proxy file
app.get('/api/download-proxies', (req, res) => {
    try {
        const proxyDir = './proxy';
        
        if (!fs.existsSync(proxyDir)) {
            return res.status(404).json({
                success: false,
                error: 'No proxy directory found'
            });
        }
        
        const files = fs.readdirSync(proxyDir)
            .filter(file => file.match(/\.(txt|list|proxy|conf)$/i));
        
        if (files.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No proxy files found'
            });
        }
        
        // Get the first proxy file
        const filePath = path.join(proxyDir, files[0]);
        const content = fs.readFileSync(filePath, 'utf8');
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${files[0]}"`);
        res.send(content);
        
    } catch (error) {
        console.error('Download proxies error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get system info
app.get('/api/system-info', (req, res) => {
    try {
        const os = require('os');
        
        res.json({
            success: true,
            system: {
                platform: os.platform(),
                arch: os.arch(),
                release: os.release(),
                hostname: os.hostname(),
                cpus: os.cpus().length,
                totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024) * 100) / 100,
                freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024) * 100) / 100,
                uptime: os.uptime()
            },
            node: {
                version: process.version,
                versions: process.versions,
                pid: process.pid,
                memoryUsage: process.memoryUsage()
            },
            app: {
                directory: __dirname,
                files: fs.readdirSync(__dirname).length,
                libs: fs.existsSync('./libs') ? fs.readdirSync('./libs').length : 0,
                public: fs.existsSync('./public') ? fs.readdirSync('./public').length : 0
            }
        });
        
    } catch (error) {
        console.error('System info error:', error);
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
        message: 'API is working correctly',
        timestamp: new Date().toISOString(),
        endpoints: [
            '/health',
            '/api/status',
            '/api/proxy-info',
            '/api/validate-proxies',
            '/api/save-proxies',
            '/api/start-bot',
            '/api/stop-bot',
            '/api/bot-status',
            '/api/system-info'
        ]
    });
});

// ======================
// ERROR HANDLING
// ======================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// ======================
// SERVER STARTUP
// ======================

// Create necessary directories
createDirectories();

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log('🚀 SEO TRAFFIC BOT SERVER');
    console.log('='.repeat(50));
    console.log(`📡 Server URL: http://localhost:${PORT}`);
    console.log(`🔧 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 API status: http://localhost:${PORT}/api/status`);
    console.log(`📁 Proxy directory: ${fs.existsSync('./proxy') ? 'OK' : 'MISSING'}`);
    console.log(`📁 Temp directory: ${fs.existsSync('./temp') ? 'OK' : 'MISSING'}`);
    console.log(`📁 Logs directory: ${fs.existsSync('./logs') ? 'OK' : 'MISSING'}`);
    console.log('='.repeat(50));
    console.log('Ready to accept connections...');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔻 Received SIGINT. Shutting down gracefully...');
    
    // Stop the bot if running
    if (seobot.stop) {
        seobot.stop().catch(console.error);
    }
    
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
    
    // Force shutdown after 5 seconds
    setTimeout(() => {
        console.log('⚠️  Forcing shutdown...');
        process.exit(1);
    }, 5000);
});

process.on('SIGTERM', () => {
    console.log('\n🔻 Received SIGTERM. Shutting down gracefully...');
    
    // Stop the bot if running
    if (seobot.stop) {
        seobot.stop().catch(console.error);
    }
    
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    
    // Write error to log file
    const logDir = './logs';
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    const errorLog = `
=== UNCAUGHT EXCEPTION ===
Time: ${new Date().toISOString()}
Error: ${error.message}
Stack: ${error.stack}
=== END ===
`;
    
    fs.appendFileSync(path.join(logDir, 'errors.log'), errorLog);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    
    // Write error to log file
    const logDir = './logs';
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    const errorLog = `
=== UNHANDLED REJECTION ===
Time: ${new Date().toISOString()}
Promise: ${promise}
Reason: ${reason}
=== END ===
`;
    
    fs.appendFileSync(path.join(logDir, 'errors.log'), errorLog);
});

module.exports = server;