/**
 * SEO TRAFFIC BOT - MAIN CONTROLLER (FIXED VERSION)
 * Advanced Mode Ready for Railway
 */

console.log('[BOT] Loading SEO Traffic Bot Controller...');

const fs = require('fs');
const path = require('path');

// ======================
// LOAD CONFIGURATION
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
let currentSession = null;

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
// LOAD ADVANCED MODULES
// ======================
let BehaviorEngine = null;
let AdvancedHTTPSimulator = null;
let lastLoadError = null;

console.log('[BOT] Loading advanced modules...');

// Try to load Behavior Engine
try {
    console.log('  ↳ Loading behavior-engine...');
    BehaviorEngine = require('./behavior-engine');
    console.log('  ✅ Behavior Engine loaded');
} catch (error) {
    console.log('  ❌ Behavior Engine not available:', error.message);
    lastLoadError = error.message;
}

// Load appropriate advanced simulator
try {
    console.log('  ↳ Loading libs_advanced-http...');
    AdvancedHTTPSimulator = require('./libs_advanced-http');
    console.log('  ✅ Advanced HTTP Simulator loaded');
} catch (error) {
    console.log('  ❌ Advanced HTTP Simulator not available:', error.message);
    lastLoadError = error.message;
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
    
    async simulateGoogleSearch(url, keywords, proxy = null) {
        console.log(`[HTTP] Simulating Google search: "${keywords}"`);
        
        // First, "search" on Google
        await this.makeRequest(
            `https://www.google.com/search?q=${encodeURIComponent(keywords)}`,
            proxy
        );
        
        await delay(randomDelay(2000, 5000));
        
        // Then visit the target URL
        const result = await this.makeRequest(url, proxy);
        
        return {
            success: result.success,
            simulated: true,
            method: 'google'
        };
    }
}

// ======================
// MAIN BOT FUNCTION - FORCE ADVANCED MODE WITH PROPER STATE MANAGEMENT
// ======================
async function main(url, keywords = '', count = 1, method = 'direct', proxyList = [], options = {}) {
    console.log('\n=== [BOT MAIN START] ===');
    console.log(`[BOT] Starting ${count} visitors to ${url}`);
    console.log(`[BOT] Method: ${method}, Proxies: ${proxyList.length}`);
    console.log(`[BOT] Advanced Available: ${!!(BehaviorEngine && AdvancedHTTPSimulator)}`);
    
    if (isRunning) {
        console.log('[BOT] ❌ Bot is already running');
        return { 
            success: false, 
            error: 'Bot is already running',
            currentSession: currentSession
        };
    }
    
    // Reset and set state
    isRunning = true;
    totalVisitors = parseInt(count) || 1;
    completedVisitors = 0;
    activeTasks = [];
    currentSession = {
        startTime: new Date().toISOString(),
        url: url,
        method: method,
        totalVisitors: totalVisitors,
        status: 'starting'
    };
    
    console.log(`[BOT] State initialized: totalVisitors=${totalVisitors}, isRunning=${isRunning}`);
    
    // ===== FORCE ADVANCED MODE FIRST =====
    if (ADVANCED_FEATURES_ENABLED && BehaviorEngine && AdvancedHTTPSimulator) {
        console.log('[BOT] 🚀 Attempting ADVANCED mode...');
        currentSession.mode = 'advanced';
        
        try {
            // Create advanced bot instance
            const advancedBot = new AdvancedHTTPSimulator();
            console.log('[BOT] ✅ Advanced instance created');
            
            // Determine behavior profile
            const behaviorProfile = options.behaviorMode || 'auto';
            console.log(`[BOT] Behavior profile: ${behaviorProfile}`);
            
            // Execute based on method
            let result;
            currentSession.status = 'running_advanced';
            
            if (method === 'google' && keywords) {
                console.log(`[BOT] 🔍 Advanced Google search: "${keywords}"`);
                result = await advancedBot.simulateGoogleSearchAdvanced(url, keywords, null, behaviorProfile);
            } else {
                console.log(`[BOT] 🌐 Advanced direct visit`);
                result = await advancedBot.simulateAdvancedVisit(url, null, behaviorProfile);
            }
            
            // ===== CRITICAL: UPDATE STATE AFTER COMPLETION =====
            completedVisitors = totalVisitors;
            isRunning = false;
            currentSession.status = 'completed';
            currentSession.endTime = new Date().toISOString();
            currentSession.completedVisitors = completedVisitors;
            currentSession.success = true;
            
            console.log(`[BOT] ✅ Advanced execution COMPLETED`);
            console.log(`[BOT] State updated: completedVisitors=${completedVisitors}, isRunning=${isRunning}`);
            
            return {
                success: true,
                advanced: true,
                message: `Advanced simulation completed successfully (${totalVisitors} visitors)`,
                visitors: totalVisitors,
                completed: completedVisitors,
                mode: 'HTTP (Advanced)',
                session: currentSession,
                ...result
            };
            
        } catch (advancedError) {
            // ===== CRITICAL: RESET STATE ON ERROR =====
            console.error('[BOT] ❌ Advanced mode execution failed:', advancedError.message);
            completedVisitors = 0;
            isRunning = false;
            currentSession.status = 'failed';
            currentSession.endTime = new Date().toISOString();
            currentSession.error = advancedError.message;
            
            return {
                success: false,
                error: `ADVANCED_MODE_FAILED: ${advancedError.message}`,
                advancedAttempted: true,
                completed: completedVisitors,
                total: totalVisitors,
                session: currentSession
            };
        }
    }
    
    // ===== FALLBACK TO BASIC MODE =====
    console.log('[BOT] ⚠️ Falling back to BASIC mode');
    currentSession.mode = 'basic';
    currentSession.status = 'running_basic';
    
    const basicBot = new HttpTrafficSimulator();
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
            }
            
            let visitResult;
            
            if (method === 'google' && keywords) {
                visitResult = await basicBot.simulateGoogleSearch(url, keywords, proxy);
            } else {
                visitResult = await basicBot.makeRequest(url, proxy);
            }
            
            results.visits.push(visitResult);
            
            if (visitResult.success) {
                results.successful++;
            } else {
                results.failed++;
            }
            
            completedVisitors = i + 1;
            console.log(`[BOT] Progress: ${completedVisitors}/${totalVisitors} visitors`);
            
            // Delay between visitors
            if (i < totalVisitors - 1) {
                const waitTime = randomDelay(3000, 10000);
                console.log(`⏱️ Waiting ${Math.round(waitTime/1000)}s...`);
                await delay(waitTime);
            }
        }
        
        // ===== CRITICAL: UPDATE STATE AFTER BASIC MODE COMPLETION =====
        isRunning = false;
        currentSession.status = 'completed';
        currentSession.endTime = new Date().toISOString();
        currentSession.completedVisitors = completedVisitors;
        currentSession.successful = results.successful;
        currentSession.failed = results.failed;
        
        console.log(`[BOT] ✅ Basic mode COMPLETED: ${results.successful} successful, ${results.failed} failed`);
        console.log(`[BOT] Final state: completedVisitors=${completedVisitors}, isRunning=${isRunning}`);
        
        return {
            success: results.successful > 0,
            advanced: false,
            visitors: results.successful,
            completed: completedVisitors,
            total: totalVisitors,
            mode: 'HTTP (Basic)',
            message: `Completed ${results.successful}/${totalVisitors} basic visits`,
            session: currentSession,
            results: results
        };
        
    } catch (error) {
        // ===== CRITICAL: RESET STATE ON BASIC MODE ERROR =====
        console.error('[BOT] ❌ Basic mode error:', error);
        isRunning = false;
        currentSession.status = 'failed';
        currentSession.endTime = new Date().toISOString();
        currentSession.error = error.message;
        
        return {
            success: false,
            error: error.message,
            completed: completedVisitors,
            total: totalVisitors,
            session: currentSession
        };
    }
}

// ======================
// STOP FUNCTION
// ======================
function stop() {
    console.log('[BOT] 🛑 Stopping bot...');
    
    const previousState = {
        wasRunning: isRunning,
        completed: completedVisitors,
        total: totalVisitors
    };
    
    isRunning = false;
    
    // Cancel any pending tasks
    activeTasks.forEach(task => {
        if (task.cancel) task.cancel();
    });
    activeTasks = [];
    
    if (currentSession && currentSession.status === 'running_advanced' || currentSession.status === 'running_basic') {
        currentSession.status = 'stopped_by_user';
        currentSession.endTime = new Date().toISOString();
    }
    
    console.log(`[BOT] ✅ Bot stopped. Previous state:`, previousState);
    
    return {
        success: true,
        message: 'Bot stopped successfully',
        completed: completedVisitors,
        total: totalVisitors,
        previousState: previousState,
        session: currentSession
    };
}

// ======================
// GET STATUS FUNCTION
// ======================
function getStatus() {
    const status = {
        isRunning,
        totalVisitors,
        completedVisitors,
        progress: totalVisitors > 0 ? Math.round((completedVisitors / totalVisitors) * 100) : 0,
        mode: IS_RAILWAY ? 'HTTP' : 'Chrome',
        platform: IS_RAILWAY ? 'Railway' : 'Local',
        advancedAvailable: !!(BehaviorEngine && AdvancedHTTPSimulator),
        lastLoadError: lastLoadError,
        currentSession: currentSession,
        timestamp: new Date().toISOString()
    };
    
    // Add human-readable status
    if (isRunning) {
        status.statusText = `Running (${completedVisitors}/${totalVisitors} visitors)`;
    } else if (completedVisitors > 0 && completedVisitors === totalVisitors) {
        status.statusText = `Completed (${completedVisitors}/${totalVisitors} visitors)`;
    } else {
        status.statusText = 'Ready';
    }
    
    return status;
}

// ======================
// GET BEHAVIOR PROFILES FUNCTION
// ======================
function getBehaviorProfiles() {
    try {
        if (BehaviorEngine && BehaviorEngine.behaviorProfiles) {
            const profiles = BehaviorEngine.behaviorProfiles;
            const profileList = Object.values(profiles).map(p => ({
                type: p.type,
                weight: p.weight,
                description: `${p.type} - Scroll: ${(p.scrollDepth * 100).toFixed(0)}%, Clicks: ${(p.clickProbability * 100).toFixed(0)}%, Time: ${p.timeOnSite.min/1000}-${p.timeOnSite.max/1000}s`
            }));
            
            return profileList;
        }
        return [];
    } catch (error) {
        console.log('[BOT] Failed to get behavior profiles:', error.message);
        return [];
    }
}

// ======================
// RESET FUNCTION
// ======================
function reset() {
    console.log('[BOT] 🔄 Resetting bot state...');
    
    const previousState = getStatus();
    
    isRunning = false;
    totalVisitors = 0;
    completedVisitors = 0;
    activeTasks = [];
    currentSession = null;
    
    console.log('[BOT] ✅ Bot state reset');
    
    return {
        success: true,
        message: 'Bot state reset successfully',
        previousState: previousState
    };
}

// ======================
// EXPORT
// ======================
module.exports = {
    main,
    stop,
    getStatus,
    getBehaviorProfiles,
    reset
};
