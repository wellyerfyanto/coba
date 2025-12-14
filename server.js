const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const seobot = require('./libs/index');
const proxys = require('./libs/proxy');
const proxyValidator = require('./libs/proxy-validator');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Validate proxy format endpoint
app.post('/api/validate-proxies', (req, res) => {
    try {
        const { proxies } = req.body;
        if (!proxies) {
            return res.status(400).json({ 
                error: 'No proxies provided',
                valid: false 
            });
        }
        
        const lines = proxies.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
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
            sample: results.valid.slice(0, 5).map(p => p.string)
        });
        
    } catch (error) {
        res.status(500).json({ 
            error: error.message,
            valid: false 
        });
    }
});

// Upload and save proxies
app.post('/api/save-proxies', (req, res) => {
    try {
        const { proxies, filename = 'proxies.txt' } = req.body;
        
        if (!proxies) {
            return res.status(400).json({ error: 'No proxies provided' });
        }
        
        // Parse and validate
        const lines = proxies.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        const results = proxyValidator.parseMultiple(lines);
        
        if (results.validCount === 0) {
            return res.status(400).json({ 
                error: 'No valid proxies found',
                details: results.invalid
            });
        }
        
        // Create proxy directory
        const proxyDir = './proxy';
        if (!fs.existsSync(proxyDir)) {
            fs.mkdirSync(proxyDir, { recursive: true });
        }
        
        // Clear old files (optional - you can keep multiple files)
        // const files = fs.readdirSync(proxyDir);
        // files.forEach(file => fs.unlinkSync(`${proxyDir}/${file}`));
        
        // Save valid proxies
        const proxyText = results.unique.join('\n');
        const filePath = path.join(proxyDir, filename);
        fs.writeFileSync(filePath, proxyText);
        
        res.json({
            success: true,
            message: `✅ Saved ${results.unique.length} valid proxies`,
            stats: {
                totalInput: results.total,
                valid: results.validCount,
                invalid: results.invalidCount,
                duplicates: results.duplicateCount,
                saved: results.unique.length
            },
            filename: filename,
            sample: results.unique.slice(0, 10)
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get saved proxies info
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
            .filter(file => file.match(/\.(txt|list|proxy|conf)$/i));
        
        let totalProxies = 0;
        const fileInfo = [];
        
        for (const file of files) {
            const content = fs.readFileSync(path.join(proxyDir, file), 'utf8');
            const lines = content.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
            
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
        }
        
        res.json({
            count: files.length,
            files: fileInfo,
            totalProxies: totalProxies
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ... setelah semua route

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'seo-traffic-bot'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Open http://localhost:${PORT} in your browser`);
});
