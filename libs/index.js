/**
 * SEO TRAFFIC BOT - MAIN CONTROLLER
 * Dual Mode: Chrome for Local, HTTP for Railway
 */

console.log('[BOT] Loading SEO Traffic Bot Controller...');

const fs = require('fs');
const path = require('path');

// ======================
// CONFIGURATION
// ======================
const IS_RAILWAY = process.env.RAILWAY_ENVIRONMENT === 'production' || 
                   process.env.NODE_ENV === 'production' ||
                   process.env.DISABLE_CHROME === 'true';

const USE_CHROME = !IS_RAILWAY && process.env.DISABLE_CHROME !== 'true';

console.log(`[BOT] Mode: ${USE_CHROME ? 'Chrome (Local)' : 'HTTP (Railway)'}`);

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
// HTTP TRAFFIC SIMULATOR
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
                // Note: For actual proxy support, need proxy-agent
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
// CHROME BOT (LOCAL ONLY)
// ======================
class ChromeBot {
    constructor() {
        this.available = false;
        
        try {
            // Check if Chrome dependencies exist
            const hasSelenium = fs.existsSync(
                path.join(__dirname, '../node_modules/selenium-webdriver')
            );
            
            const hasChromeDriver = fs.existsSync(
                path.join(__dirname, '../node_modules/chromedriver')
            );
            
            if (hasSelenium && hasChromeDriver) {
                this.selenium = require('selenium-webdriver');
                this.chrome = require('selenium-webdriver/chrome');
                this.by = this.selenium.By;
                this.key = this.selenium.Key;
                this.available = true;
                console.log('[CHROME] Chrome/Selenium loaded');
            } else {
                console.log('[CHROME] Chrome dependencies not found');
            }
        } catch (error) {
            console.log('[CHROME] Failed to load:', error.message);
        }
    }
    
    async createDriver(proxy = null) {
        if (!this.available) {
            throw new Error('Chrome not available');
        }
        
        const options = new this.chrome.Options();
        options.addArguments(
            '--headless=new',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1920,1080',
            '--user-agent=' + getRandomUserAgent(),
            '--disable-blink-features=AutomationControlled'
        );
        
        if (proxy) {
            options.addArguments(`--proxy-server=${proxy}`);
        }
        
        options.excludeSwitches('enable-logging', 'enable-automation');
        
        const driver = await new this.selenium.Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();
        
        // Remove webdriver flag
        await driver.executeScript(`
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        `);
        
        return driver;
    }
    
    async visitDirect(driver, url) {
        try {
            console.log(`[CHROME] Visiting: ${url}`);
            await driver.get(url);
            await delay(randomDelay(3000, 8000));
            
            // Simulate scrolling
            await driver.executeScript(`
                window.scrollTo(0, Math.random() * document.body.scrollHeight);
            `);
            
            await delay(randomDelay(10000, 20000));
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async visitViaGoogle(driver, url, keywords) {
        try {
            console.log(`[CHROME] Searching: "${keywords}"`);
            
            await driver.get('https://www.google.com');
            await delay(randomDelay(2000, 4000));
            
            // Search
            const searchBox = await driver.findElement(this.by.name('q'));
            await searchBox.sendKeys(keywords);
            await delay(randomDelay(500, 1500));
            await searchBox.sendKeys(this.key.ENTER);
            
            await delay(randomDelay(3000, 6000));
            
            // Find and click result
            const links = await driver.findElements(this.by.css('div.g a'));
            
            for (const link of links) {
                try {
                    const href = await link.getAttribute('href');
                    if (href && href.includes(url)) {
                        await link.click();
                        await delay(randomDelay(3000, 6000));
                        await delay(randomDelay(10000, 15000));
                        return { success: true };
                    }
                } catch (e) {
                    continue;
                }
            }
            
            return { success: false, error: 'URL not found in results' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// ======================
// MAIN BOT CONTROLLER
// ======================
async function main(url, keywords = '', count = 1, method = 'direct', proxyList = []) {
    if (isRunning) {
        return { success: false, error: 'Bot is already running' };
    }
    
    isRunning = true;
    totalVisitors = parseInt(count) || 1;
    completedVisitors = 0;
    activeTasks = [];
    
    console.log(`[BOT] Starting ${totalVisitors} visitors to ${url}`);
    console.log(`[BOT] Method: ${method}, Proxies: ${proxyList.length}`);
    
    const results = {
        successful: 0,
        failed: 0,
        visits: []
    };
    
    try {
        // Choose bot mode
        let bot;
        
        if (USE_CHROME) {
            const chromeBot = new ChromeBot();
            if (chromeBot.available) {
                bot = chromeBot;
                console.log('[BOT] Using Chrome mode');
            } else {
                bot = new HttpTrafficSimulator();
                console.log('[BOT] Chrome not available, using HTTP mode');
            }
        } else {
            bot = new HttpTrafficSimulator();
            console.log('[BOT] Using HTTP mode (Railway)');
        }
        
        // Execute visits
        for (let i = 0; i < totalVisitors && isRunning; i++) {
            console.log(`[${i + 1}/${totalVisitors}] Starting visit...`);
            
            let proxy = null;
            if (proxyList.length > 0) {
                proxy = proxyList[i % proxyList.length];
            }
            
            let visitResult;
            
            if (method === 'google' && keywords && bot.simulateGoogleSearch) {
                visitResult = await bot.simulateGoogleSearch(url, keywords, proxy);
            } else if (bot.visitDirect) {
                // Chrome bot
                const driver = await bot.createDriver(proxy);
                
                if (method === 'google' && keywords) {
                    visitResult = await bot.visitViaGoogle(driver, url, keywords);
                } else {
                    visitResult = await bot.visitDirect(driver, url);
                }
                
                try {
                    await driver.quit();
                } catch (e) {
                    // Ignore quit errors
                }
            } else {
                // HTTP bot direct visit
                visitResult = await bot.makeRequest(url, proxy);
            }
            
            results.visits.push(visitResult);
            
            if (visitResult.success) {
                results.successful++;
            } else {
                results.failed++;
            }
            
            completedVisitors++;
            
            // Delay between visits
            if (i < totalVisitors - 1) {
                const waitTime = randomDelay(3000, 10000);
                console.log(`⏱️ Waiting ${Math.round(waitTime/1000)}s...`);
                await delay(waitTime);
            }
        }
        
        console.log(`[BOT] Completed: ${results.successful} successful, ${results.failed} failed`);
        
        isRunning = false;
        
        return {
            success: true,
            visitors: results.successful,
            total: totalVisitors,
            mode: USE_CHROME ? 'Chrome' : 'HTTP',
            message: `Completed ${results.successful}/${totalVisitors} visits`
        };
        
    } catch (error) {
        console.error('[BOT] Error:', error);
        isRunning = false;
        
        return {
            success: false,
            error: error.message,
            completed: completedVisitors
        };
    }
}

async function stop() {
    console.log('[BOT] Stopping...');
    isRunning = false;
    
    // Cancel any pending tasks
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

function getStatus() {
    return {
        isRunning,
        totalVisitors,
        completedVisitors,
        mode: USE_CHROME ? 'Chrome' : 'HTTP',
        platform: IS_RAILWAY ? 'Railway' : 'Local'
    };
}
/**
 * MAIN BOT WITH ADVANCED BEHAVIOR INTEGRATION
 */

console.log('[BOT] Loading SEO Traffic Bot with Advanced Behavior Engine...');

const IS_RAILWAY = process.env.RAILWAY_ENVIRONMENT === 'production' || 
                   process.env.NODE_ENV === 'production' ||
                   process.env.DISABLE_CHROME === 'true';

const USE_CHROME = !IS_RAILWAY && process.env.DISABLE_CHROME !== 'true';

// Load behavior engine
let BehaviorEngine, AdvancedChromeBot, AdvancedHTTPSimulator;

try {
    BehaviorEngine = require('./behavior-engine');
    
    if (USE_CHROME) {
        try {
            AdvancedChromeBot = require('./advanced-bot');
        } catch {
            console.log('[BOT] Advanced Chrome Bot not available, using basic');
        }
    } else {
        AdvancedHTTPSimulator = require('./advanced-http');
    }
    
    console.log('[BOT] Advanced behavior modules loaded');
} catch (error) {
    console.log('[BOT] Advanced behavior not available:', error.message);
}

// Extend main function with advanced behavior
async function mainAdvanced(url, keywords = '', count = 1, method = 'direct', proxyList = [], options = {}) {
    const advancedOptions = {
        behaviorMode: options.behaviorMode || 'auto', // auto, random, scroller, explorer, etc.
        maxDuration: options.maxDuration || 60000, // 60 seconds max
        targetImpressions: options.targetImpressions || 20,
        targetActiveView: options.targetActiveView || 15000, // 15 seconds
        ...options
    };
    
    console.log(`[ADV BOT] Starting ${count} advanced visitors`);
    console.log(`[ADV BOT] Behavior mode: ${advancedOptions.behaviorMode}`);
    console.log(`[ADV BOT] Target: ${advancedOptions.targetImpressions} impressions, ${advancedOptions.targetActiveView}ms active view`);
    
    const results = {
        successful: 0,
        failed: 0,
        totalImpressions: 0,
        totalActiveView: 0,
        totalEngagement: 0,
        estimatedRPM: 0,
        visits: []
    };
    
    for (let i = 0; i < count; i++) {
        console.log(`\n[ADV VISITOR ${i + 1}/${count}] Starting...`);
        
        // Select proxy
        let proxy = null;
        if (proxyList.length > 0) {
            proxy = proxyList[i % proxyList.length];
        }
        
        // Select behavior profile
        let profileType = advancedOptions.behaviorMode;
        if (profileType === 'random') {
            const profiles = ['scroller', 'explorer', 'reader', 'bouncer', 'buyer'];
            profileType = profiles[Math.floor(Math.random() * profiles.length)];
        }
        
        let visitResult;
        
        if (USE_CHROME && AdvancedChromeBot) {
            // Use advanced Chrome bot
            const chromeBot = new AdvancedChromeBot();
            
            if (method === 'google' && keywords) {
                // Google search with advanced behavior
                visitResult = await chromeBot.visitViaGoogleWithBehavior(url, keywords, proxy, profileType);
            } else {
                // Direct visit with advanced behavior
                visitResult = await chromeBot.visitWithBehavior(url, proxy, profileType);
            }
        } else {
            // Use advanced HTTP simulator
            const httpBot = new AdvancedHTTPSimulator();
            
            if (method === 'google' && keywords) {
                // Simulate Google search
                visitResult = await httpBot.simulateGoogleSearchAdvanced(url, keywords, proxy, profileType);
            } else {
                // Direct visit with advanced simulation
                visitResult = await httpBot.simulateAdvancedVisit(url, proxy, profileType);
            }
        }
        
        // Collect metrics
        if (visitResult.success) {
            results.successful++;
            results.totalImpressions += visitResult.metrics?.impressions || 0;
            results.totalActiveView += visitResult.metrics?.activeView || 0;
            results.totalEngagement += visitResult.metrics?.engagementScore || 0;
            results.estimatedRPM += visitResult.metrics?.estimatedRPM || 0;
            
            console.log(`✅ Visitor ${i + 1} completed:`);
            console.log(`   Impressions: ${visitResult.metrics?.impressions || 0}`);
            console.log(`   Active View: ${Math.round((visitResult.metrics?.activeView || 0) / 1000)}s`);
            console.log(`   Engagement: ${visitResult.metrics?.engagementScore || 0}/100`);
            console.log(`   Behavior: ${visitResult.behavior || 'standard'}`);
        } else {
            results.failed++;
            console.log(`❌ Visitor ${i + 1} failed: ${visitResult.error}`);
        }
        
        results.visits.push(visitResult);
        
        // Delay between visitors (shorter for HTTP mode)
        if (i < count - 1) {
            const delay = USE_CHROME ? 
                randomDelay(8000, 15000) : 
                randomDelay(3000, 8000);
            console.log(`⏱️ Next visitor in ${Math.round(delay/1000)}s...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    
    // Calculate averages
    results.avgImpressions = Math.round(results.totalImpressions / Math.max(1, results.successful));
    results.avgActiveView = Math.round(results.totalActiveView / Math.max(1, results.successful));
    results.avgEngagement = Math.round(results.totalEngagement / Math.max(1, results.successful));
    results.avgRPM = results.estimatedRPM / Math.max(1, results.successful);
    
    // Calculate estimated revenue (RPM = Revenue Per 1000 impressions)
    results.estimatedRevenue = (results.totalImpressions / 1000) * results.avgRPM;
    
    console.log('\n📊 ADVANCED SESSION SUMMARY:');
    console.log('='.repeat(50));
    console.log(`✅ Successful: ${results.successful}/${count}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`👁️ Total Impressions: ${results.totalImpressions}`);
    console.log(`⏱️ Total Active View: ${Math.round(results.totalActiveView / 1000)}s`);
    console.log(`🎯 Avg Engagement: ${results.avgEngagement}/100`);
    console.log(`💰 Estimated RPM: $${results.avgRPM.toFixed(2)}`);
    console.log(`💵 Estimated Revenue: $${results.estimatedRevenue.toFixed(2)}`);
    console.log('='.repeat(50));
    
    return {
        success: results.successful > 0,
        advanced: true,
        ...results,
        mode: USE_CHROME ? 'Chrome (Advanced)' : 'HTTP (Advanced)'
    };
}

// Update the exported main function
async function main(url, keywords = '', count = 1, method = 'direct', proxyList = [], options = {}) {
    // Check if advanced mode is requested
    const useAdvanced = options.useAdvanced !== false && 
                       (options.behaviorMode || options.targetImpressions || options.targetActiveView);
    
    if (useAdvanced) {
        return await mainAdvanced(url, keywords, count, method, proxyList, options);
    }
    
    // Original main function here...
    // ... [existing main function code] ...
}

// Add new function for behavior configuration
function getBehaviorProfiles() {
    try {
        const engine = require('./behavior-engine');
        return engine.behaviorProfiles;
    } catch {
        return {};
    }
}

// Export additional functions
module.exports = {
    main,
    stop,
    getStatus,
    mainAdvanced, // New advanced function
    getBehaviorProfiles, // Get available behavior profiles
    behaviorModes: ['auto', 'random', 'scroller', 'explorer', 'reader', 'bouncer', 'buyer']
};

// ======================
// EXPORT
// ======================
module.exports = {
    main,
    stop,
    getStatus
};
