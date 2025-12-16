/**
 * SEO TRAFFIC BOT - MAIN CONTROLLER (SYNTAX-FIXED VERSION)
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

console.log('[BOT] Loading advanced modules...');

// Try to load Behavior Engine
try {
    console.log('  ↳ Loading behavior-engine...');
    BehaviorEngine = require('./behavior-engine');
    console.log('  ✅ Behavior Engine loaded');
} catch (error) {
    console.log('  ❌ Behavior Engine not available:', error.message);
}

// Load appropriate advanced simulator
try {
    console.log('  ↳ Loading advanced-http simulator...');
    AdvancedHTTPSimulator = require('./libs_advanced-http');
    console.log('  ✅ Advanced HTTP Simulator loaded');
} catch (error) {
    console.log('  ❌ Advanced HTTP Simulator not available:', error.message);
}

// ======================
// MAIN BOT FUNCTION - FORCE ADVANCED MODE
// ======================
async function main(url, keywords = '', count = 1, method = 'direct', proxyList = [], options = {}) {
    console.log('\n=== [MAIN DEBUG START] ===');
    console.log('[DEBUG] URL:', url);
    console.log('[DEBUG] Method:', method);
    console.log('[DEBUG] Advanced Modules:', {
        BehaviorEngine: !!BehaviorEngine,
        AdvancedHTTPSimulator: !!AdvancedHTTPSimulator
    });
    
    if (isRunning) {
        return { success: false, error: 'Bot is already running' };
    }
    
    isRunning = true;
    totalVisitors = parseInt(count) || 1;
    completedVisitors = 0;
    
    // ===== FORCE ADVANCED MODE =====
    console.log('[FORCE] Attempting to force ADVANCED mode...');
    
    // Check if advanced modules are available
    if (BehaviorEngine && AdvancedHTTPSimulator) {
        console.log('[FORCE] ✅ Advanced modules available. Creating instance...');
        
        try {
            // 1. Create instance
            const advancedBot = new AdvancedHTTPSimulator();
            console.log('[FORCE] ✅ Instance created');
            
            // 2. Prepare parameters
            const behaviorProfile = (options && options.behaviorMode) || 'auto';
            console.log('[FORCE] Using behavior profile:', behaviorProfile);
            
            // 3. Execute based on method
            let result;
            if (method === 'google' && keywords) {
                console.log(`[FORCE] Executing simulateGoogleSearchAdvanced...`);
                result = await advancedBot.simulateGoogleSearchAdvanced(url, keywords, null, behaviorProfile);
            } else {
                console.log(`[FORCE] Executing simulateAdvancedVisit...`);
                result = await advancedBot.simulateAdvancedVisit(url, null, behaviorProfile);
            }
            
            console.log('[FORCE] ✅ Advanced execution successful!');
            
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
        advancedAvailable: !!(BehaviorEngine && AdvancedHTTPSimulator)
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
    getBehaviorProfiles
};