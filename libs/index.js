/**
 * SEO TRAFFIC BOT - MAIN CONTROLLER WITH ADVANCED BEHAVIOR INTEGRATION
 * Fixed: No circular dependency with centralized config
 */

console.log('[BOT] Loading SEO Traffic Bot Controller...');

const fs = require('fs');
const path = require('path');

// ======================
// LOAD CONFIGURATION (NO MORE CIRCULAR DEPENDENCY)
// ======================
const config = require('./config');
const { IS_RAILWAY, USE_CHROME, ADVANCED_FEATURES_ENABLED } = config;

console.log(`[BOT] Mode: ${IS_RAILWAY ? 'HTTP (Railway)' : 'Chrome (Local)'}`);
console.log(`[BOT] Advanced Features: ${ADVANCED_FEATURES_ENABLED ? 'ENABLED' : 'DISABLED'}`);

// ======================
// GLOBAL STATE
// ======================
let isRunning = false;
let totalVisitors = 0;
let completedVisitors = 0;
let activeTasks = [];

// ======================
// HELPER FUNCTIONS
// ======================
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomUserAgent() {
    const agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    ];
    return agents[Math.floor(Math.random() * agents.length)];
}

// ======================
// LOAD ADVANCED MODULES (SAFE - NO CIRCULAR REFS)
// ======================
let BehaviorEngine = null;
let AdvancedHTTPSimulator = null;

console.log('[BOT] Loading advanced modules...');

// Try to load Behavior Engine
try {
    console.log('  ↳ Loading behavior-engine...');
    BehaviorEngine = require('./behavior-engine');
    console.log('  ✅ Behavior Engine loaded');
} catch (error) {
    console.log('  ❌ Behavior Engine not available:', error.message);
}

// Load appropriate advanced simulator based on environment
if (IS_RAILWAY || !USE_CHROME) {
    try {
        console.log('  ↳ Loading advanced-http simulator...');
        AdvancedHTTPSimulator = require('./advanced-http');
        console.log('  ✅ Advanced HTTP Simulator loaded');
    } catch (error) {
        console.log('  ❌ Advanced HTTP Simulator not available:', error.message);
    }
}

// ======================
// BASIC HTTP TRAFFIC SIMULATOR (Fallback - only if advanced fails)
// ======================
class HttpTrafficSimulator {
    constructor() {
        this.http = require('http');
        this.https = require('https');
        this.url = require('url');
    }
    
    async makeRequest(targetUrl, proxy = null) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const parsedUrl = new this.url.URL(targetUrl);
            const isHttps = parsedUrl.protocol === 'https:';
            const protocol = isHttps ? this.https : this.http;
            
            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'GET',
                timeout: 10000,
                headers: {
                    'User-Agent': getRandomUserAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Connection': 'keep-alive'
                }
            };
            
            if (proxy) {
                console.log(`[HTTP] Using proxy: ${proxy}`);
            }
            
            const req = protocol.request(options, (res) => {
                const responseTime = Date.now() - startTime;
                let data = '';
                
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        success: res.statusCode >= 200 && res.statusCode < 400,
                        status: res.statusCode,
                        responseTime,
                        size: data.length
                    });
                });
            });
            
            req.on('error', (error) => {
                resolve({
                    success: false,
                    error: error.message,
                    responseTime: Date.now() - startTime
                });
            });
            
            req.on('timeout', () => {
                req.destroy();
                resolve({
                    success: false,
                    error: 'timeout',
                    responseTime: Date.now() - startTime
                });
            });
            
            req.end();
        });
    }
}

// ======================
// MAIN BOT FUNCTION - ALWAYS TRY ADVANCED FIRST
// ======================
async function main(url, keywords = '', count = 1, method = 'direct', proxyList = [], options = {}) {
    if (isRunning) {
        return { success: false, error: 'Bot is already running' };
    }
    
    isRunning = true;
    totalVisitors = parseInt(count) || 1;
    completedVisitors = 0;
    activeTasks = [];
    
    console.log(`[BOT] Starting ${totalVisitors} visitors to ${url}`);
    console.log(`[BOT] Method: ${method}, Proxies: ${proxyList.length}`);
    
    // ALWAYS TRY ADVANCED MODE FIRST (if enabled)
    if (ADVANCED_FEATURES_ENABLED && BehaviorEngine) {
        console.log('[BOT] Attempting ADVANCED mode with behavior profiles...');
        
        // Determine which simulator to use
        let advancedSimulator = null;
        if (IS_RAILWAY && AdvancedHTTPSimulator) {
            advancedSimulator = AdvancedHTTPSimulator;
            console.log('[BOT] Using Advanced HTTP Simulator (Railway)');
        }
        
        if (advancedSimulator) {
            try {
                const instance = new advancedSimulator();
                const advancedOptions = {
                    behaviorMode: options.behaviorMode || 'auto',
                    maxDuration: options.maxDuration || 60000,
                    targetImpressions: options.targetImpressions || 20,
                    targetActiveView: options.targetActiveView || 15000,
                    ...options
                };
                
                // Call appropriate method based on request type
                let result;
                if (method === 'google' && keywords) {
                    console.log(`[BOT] Advanced Google search: "${keywords}"`);
                    result = await instance.simulateGoogleSearchAdvanced(url, keywords, null, advancedOptions.behaviorMode);
                } else {
                    console.log(`[BOT] Advanced direct visit`);
                    result = await instance.simulateAdvancedVisit(url, null, advancedOptions.behaviorMode);
                }
                
                isRunning = false;
                return {
                    success: true,
                    advanced: true,
                    message: `Advanced simulation completed`,
                    mode: IS_RAILWAY ? 'HTTP (Advanced)' : 'Chrome (Advanced)',
                    ...result
                };
                
            } catch (error) {
                console.error(`[BOT] Advanced mode failed:`, error.message);
                // Fall through to basic mode
            }
        }
    }
    
    // FALLBACK TO BASIC MODE
    console.log('[BOT] Using BASIC mode (fallback)');
    const bot = new HttpTrafficSimulator();
    const results = {
        successful: 0,
        failed: 0,
        visits: []
    };
    
    try {
        for (let i = 0; i < totalVisitors && isRunning; i++) {
            console.log(`[${i + 1}/${totalVisitors}] Starting basic visit...`);
            
            let proxy = null;
            if (proxyList.length > 0) {
                proxy = proxyList[i % proxyList.length];
async function main(url, keywords = '', count = 1, method = 'direct', proxyList = [], options = {}) {
    console.log('\n=== [DEBUG MAIN START] ===');
    console.log('[DEBUG] URL:', url);
    console.log('[DEBUG] Keywords:', keywords);
    console.log('[DEBUG] Method:', method);
    console.log('[DEBUG] ADVANCED_FEATURES_ENABLED:', ADVANCED_FEATURES_ENABLED);
    console.log('[DEBUG] BehaviorEngine available:', !!BehaviorEngine);
    console.log('[DEBUG] AdvancedHTTPSimulator available:', !!AdvancedHTTPSimulator);
    console.log('[DEBUG] IS_RAILWAY:', IS_RAILWAY);
    console.log('[DEBUG] USE_CHROME:', USE_CHROME);
    
    if (isRunning) {
        return { success: false, error: 'Bot is already running' };
    }
    
    isRunning = true;
    totalVisitors = parseInt(count) || 1;
    completedVisitors = 0;
    activeTasks = [];
    
    // ===== FORCE ADVANCED MODE =====
    // JANGAN gunakan kondisi if, LANGSUNG coba advanced
    console.log('\n[FORCE] Attempting to force ADVANCED mode...');
    
    // Cek jika modul advanced tersedia
    if (BehaviorEngine && AdvancedHTTPSimulator) {
        console.log('[FORCE] ✅ Advanced modules available. Creating instance...');
        
        try {
            // 1. Buat instance AdvancedHTTPSimulator
            const advancedBot = new AdvancedHTTPSimulator();
            console.log('[FORCE] ✅ Instance created');
            
            // 2. Siapkan parameter
            const behaviorProfile = (options && options.behaviorMode) || 'auto';
            console.log('[FORCE] Using behavior profile:', behaviorProfile);
            
            // 3. Pilih method berdasarkan request
            let result;
            if (method === 'google' && keywords) {
                console.log(`[FORCE] Executing simulateGoogleSearchAdvanced...`);
                // Pastikan method ini ada di class Anda
                if (typeof advancedBot.simulateGoogleSearchAdvanced === 'function') {
                    result = await advancedBot.simulateGoogleSearchAdvanced(url, keywords, null, behaviorProfile);
                } else {
                    throw new Error('simulateGoogleSearchAdvanced not found in AdvancedHTTPSimulator');
                }
            } else {
                console.log(`[FORCE] Executing simulateAdvancedVisit...`);
                if (typeof advancedBot.simulateAdvancedVisit === 'function') {
                    result = await advancedBot.simulateAdvancedVisit(url, null, behaviorProfile);
                } else {
                    throw new Error('simulateAdvancedVisit not found in AdvancedHTTPSimulator');
                }
            }
            
            console.log('[FORCE] ✅ Advanced execution successful!');
            console.log('[FORCE] Result:', result);
            
            isRunning = false;
            return {
                success: true,
                advanced: true,
                message: 'Advanced simulation completed successfully',
                mode: 'HTTP (Advanced)',
                ...result
            };
            
        } catch (advancedError) {
            console.error('[FORCE] ❌ Advanced mode execution failed:', advancedError.message);
            console.error('[FORCE] Stack:', advancedError.stack);
            // JANGAN fallback ke basic, langsung return error
            isRunning = false;
            return {
                success: false,
                error: `ADVANCED_MODE_FAILED: ${advancedError.message}`,
                advancedAttempted: true
            };
        }
    } else {
        console.error('[FORCE] ❌ Advanced modules NOT available:');
        console.error('  - BehaviorEngine:', BehaviorEngine ? 'OK' : 'NULL');
        console.error('  - AdvancedHTTPSimulator:', AdvancedHTTPSimulator ? 'OK' : 'NULL');
        
        isRunning = false;
        return {
            success: false,
            error: 'ADVANCED_MODULES_MISSING',
            message: 'Cannot start advanced mode. Required modules are not loaded.'
        };
    }
}

// ======================
// STOP FUNCTION
// ======================
function stop() {
    console.log('[BOT] Stopping...');
    isRunning = false;
    
    activeTasks.forEach(task => {
        if (task.cancel) task.cancel();
    });
    activeTasks = [];
    
    return {
        success: true,
        message: 'Bot stopped',
        completed: completedVisitors,
        total: totalVisitors
    };
}

// ======================
// GET STATUS FUNCTION
// ======================
function getStatus() {
    return {
        isRunning,
        totalVisitors,
        completedVisitors,
        mode: IS_RAILWAY ? 'HTTP' : 'Chrome',
        platform: IS_RAILWAY ? 'Railway' : 'Local',
        advancedAvailable: !!(BehaviorEngine && (IS_RAILWAY ? AdvancedHTTPSimulator : null)),
    };
}

// ======================
// GET BEHAVIOR PROFILES FUNCTION
// ======================
function getBehaviorProfiles() {
    try {
        if (BehaviorEngine && BehaviorEngine.behaviorProfiles) {
            return BehaviorEngine.behaviorProfiles;
        }
        return {};
    } catch (error) {
        console.log('[BOT] Failed to get behavior profiles:', error.message);
        return {};
    }
}

// ======================
// EXPORT
// ======================
module.exports = {
    main,
    stop,
    getStatus,
    getBehaviorProfiles,
    config
};
