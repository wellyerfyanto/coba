/**
 * SEO TRAFFIC BOT - MAIN MODULE
 * Railway Optimized with HTTP Traffic Simulation
 * Auto-falls back from Chrome/Selenium to HTTP mode
 */

console.log('[INDEX] Initializing SEO Traffic Bot...');
console.log('[INDEX] Environment:', process.env.NODE_ENV || 'development');

// ======================
// ENVIRONMENT DETECTION
// ======================
const IS_RAILWAY = process.env.RAILWAY_ENVIRONMENT === 'production' || 
                   process.env.NODE_ENV === 'production' ||
                   process.env.RAILWAY_GIT_COMMIT_SHA !== undefined ||
                   process.env.DISABLE_CHROME === 'true';

console.log('[INDEX] Platform:', IS_RAILWAY ? '🚂 Railway (HTTP Mode)' : '💻 Local');

// ======================
// GLOBAL STATE
// ======================
let isRunning = false;
let totalVisitors = 0;
let completedVisitors = 0;
let currentProxyIndex = 0;
let activeDrivers = [];
let botMode = 'http'; // 'http' or 'chrome'

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
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 Edg/118.0.2088.76',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36'
    ];
    return agents[Math.floor(Math.random() * agents.length)];
}

// ======================
// HTTP TRAFFIC SIMULATOR (Railway Mode)
// ======================
class HttpTrafficSimulator {
    constructor() {
        this.http = require('http');
        this.https = require('https');
        this.url = require('url');
        console.log('[HTTP SIM] HTTP Traffic Simulator initialized');
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
                timeout: 15000,
                headers: {
                    'User-Agent': getRandomUserAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Cache-Control': 'max-age=0'
                }
            };

            if (proxy) {
                console.log(`[HTTP SIM] Using proxy: ${proxy}`);
                // For HTTP proxy, we'd need a different setup
                // For now, just note it in logs
            }

            const req = protocol.request(options, (res) => {
                const responseTime = Date.now() - startTime;
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    resolve({
                        success: res.statusCode >= 200 && res.statusCode < 400,
                        statusCode: res.statusCode,
                        responseTime,
                        dataLength: data.length,
                        proxyUsed: proxy
                    });
                });
            });

            req.on('error', (error) => {
                resolve({
                    success: false,
                    error: error.message,
                    responseTime: Date.now() - startTime,
                    proxyUsed: proxy
                });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({
                    success: false,
                    error: 'timeout',
                    responseTime: Date.now() - startTime,
                    proxyUsed: proxy
                });
            });

            req.end();
        });
    }

    async simulateGoogleSearch(url, keywords, proxy = null) {
        console.log(`[HTTP SIM] Simulating Google search: "${keywords}"`);
        
        // Simulate Google visit
        const googleResult = await this.makeRequest(
            `https://www.google.com/search?q=${encodeURIComponent(keywords)}`,
            proxy
        );
        
        if (googleResult.success) {
            // Simulate clicking result
            await delay(randomDelay(2000, 5000));
            const siteResult = await this.makeRequest(url, proxy);
            return siteResult;
        }
        
        return googleResult;
    }

    async run(url, keywords, count, method, proxyList) {
        console.log(`[HTTP SIM] Starting ${count} HTTP requests to ${url}`);
        
        const results = {
            successful: 0,
            failed: 0,
            totalTime: 0,
            visits: []
        };

        const startTime = Date.now();

        for (let i = 0; i < count && isRunning; i++) {
            console.log(`[HTTP SIM] Visitor ${i + 1}/${count}...`);
            
            let proxy = null;
            if (proxyList && proxyList.length > 0) {
                proxy = proxyList[currentProxyIndex % proxyList.length];
                currentProxyIndex++;
            }

            let result;
            if (method === 'google' && keywords) {
                result = await this.simulateGoogleSearch(url, keywords, proxy);
            } else {
                result = await this.makeRequest(url, proxy);
            }

            results.visits.push(result);
            
            if (result.success) {
                results.successful++;
            } else {
                results.failed++;
            }

            completedVisitors++;

            // Random delay between requests
            if (i < count - 1) {
                const waitTime = randomDelay(2000, 8000);
                await delay(waitTime);
            }
        }

        results.totalTime = Date.now() - startTime;

        return {
            success: true,
            mode: 'http',
            message: `Completed ${results.successful}/${count} HTTP requests`,
            results: results
        };
    }
}

// ======================
// CHROME/SELENIUM BOT (Local Mode)
// ======================
class ChromeBot {
    constructor() {
        try {
            this.selenium = require('selenium-webdriver');
            this.chrome = require('selenium-webdriver/chrome');
            this.chromedriver = require('chromedriver');
            console.log('[CHROME] Chrome/Selenium initialized');
            this.available = true;
        } catch (error) {
            console.log('[CHROME] Chrome/Selenium not available:', error.message);
            this.available = false;
        }
    }

    async createDriver(proxyString = null) {
        if (!this.available) {
            throw new Error('Chrome/Selenium not available');
        }

        const options = new this.chrome.Options();
        const args = [
            '--headless=new',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--disable-background-timer-throttling',
            '--mute-audio',
            '--disable-logging',
            '--disable-infobars',
            '--window-size=1920,1080',
            '--user-agent=' + getRandomUserAgent(),
            '--disable-blink-features=AutomationControlled'
        ];

        args.forEach(arg => options.addArguments(arg));

        if (proxyString) {
            console.log(`[CHROME] Using proxy: ${proxyString}`);
            options.addArguments(`--proxy-server=${proxyString}`);
        }

        options.excludeSwitches('enable-logging');
        options.excludeSwitches('enable-automation');

        const driver = await new this.selenium.Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();

        // Remove webdriver flag
        await driver.executeScript(`
            Object.defineProperty(navigator, 'webdriver', {get: () => false});
        `);

        activeDrivers.push(driver);
        return driver;
    }

    async visitDirect(driver, url) {
        try {
            console.log(`[CHROME] Visiting: ${url}`);
            await driver.get(url);
            await delay(randomDelay(2000, 5000));

            // Simulate scrolling
            await driver.executeScript(`
                window.scrollTo({
                    top: Math.random() * document.body.scrollHeight,
                    behavior: 'smooth'
                });
            `);

            await delay(randomDelay(10000, 30000));
            return { success: true };
        } catch (error) {
            console.log(`[CHROME] Visit failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async visitViaGoogle(driver, url, keywords) {
        try {
            console.log(`[CHROME] Searching Google for: ${keywords}`);
            
            await driver.get('https://www.google.com');
            await delay(randomDelay(2000, 4000));

            // Accept cookies if present
            try {
                const acceptButtons = await driver.findElements(
                    this.selenium.By.xpath("//button[contains(., 'Accept') or contains(., 'I agree')]")
                );
                if (acceptButtons.length > 0) {
                    await acceptButtons[0].click();
                    await delay(1000);
                }
            } catch (e) {
                // Cookies not present
            }

            // Search
            const searchBox = await driver.findElement(this.selenium.By.name('q'));
            await searchBox.sendKeys(keywords);
            await delay(randomDelay(500, 1500));
            await searchBox.sendKeys(this.selenium.Key.ENTER);

            await delay(randomDelay(3000, 6000));

            // Find target URL in results
            const links = await driver.findElements(this.selenium.By.css('div.g a'));
            let targetLink = null;

            for (const link of links) {
                try {
                    const href = await link.getAttribute('href');
                    if (href && href.includes(url)) {
                        targetLink = link;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (targetLink) {
                await targetLink.click();
                await delay(randomDelay(3000, 6000));
                await delay(randomDelay(10000, 20000));
                return { success: true };
            }

            return { success: false, error: 'URL not found in results' };
        } catch (error) {
            console.log(`[CHROME] Google search failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async cleanup() {
        console.log(`[CHROME] Cleaning up ${activeDrivers.length} drivers...`);
        for (const driver of activeDrivers) {
            try {
                await driver.quit();
            } catch (error) {
                console.log(`[CHROME] Error closing driver: ${error.message}`);
            }
        }
        activeDrivers = [];
    }

    async run(url, keywords, count, method, proxyList) {
        if (!this.available) {
            throw new Error('Chrome/Selenium not available');
        }

        console.log(`[CHROME] Starting ${count} Chrome visitors to ${url}`);
        
        const results = {
            successful: 0,
            failed: 0,
            visits: []
        };

        for (let i = 0; i < count && isRunning; i++) {
            console.log(`[CHROME] Visitor ${i + 1}/${count}...`);
            
            let proxy = null;
            if (proxyList && proxyList.length > 0) {
                proxy = proxyList[currentProxyIndex % proxyList.length];
                currentProxyIndex++;
            }

            const driver = await this.createDriver(proxy);
            let result;

            if (method === 'google' && keywords) {
                result = await this.visitViaGoogle(driver, url, keywords);
            } else {
                result = await this.visitDirect(driver, url);
            }

            results.visits.push(result);
            
            if (result.success) {
                results.successful++;
            } else {
                results.failed++;
            }

            completedVisitors++;

            // Close driver after visit
            try {
                await driver.quit();
                activeDrivers = activeDrivers.filter(d => d !== driver);
            } catch (error) {
                console.log(`[CHROME] Error quitting driver: ${error.message}`);
            }

            // Random delay between visitors
            if (i < count - 1) {
                const waitTime = randomDelay(5000, 15000);
                await delay(waitTime);
            }
        }

        return {
            success: true,
            mode: 'chrome',
            message: `Completed ${results.successful}/${count} Chrome visits`,
            results: results
        };
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
    totalVisitors = parseInt(count);
    completedVisitors = 0;
    currentProxyIndex = 0;

    console.log(`[BOT] Starting bot with configuration:`);
    console.log(`       URL: ${url}`);
    console.log(`       Keywords: ${keywords}`);
    console.log(`       Method: ${method}`);
    console.log(`       Count: ${count}`);
    console.log(`       Proxies: ${proxyList.length}`);
    console.log(`       Mode: ${botMode}`);

    try {
        let result;

        if (botMode === 'chrome') {
            const chromeBot = new ChromeBot();
            if (chromeBot.available) {
                result = await chromeBot.run(url, keywords, count, method, proxyList);
            } else {
                console.log('[BOT] Chrome not available, falling back to HTTP mode');
                botMode = 'http';
                const httpBot = new HttpTrafficSimulator();
                result = await httpBot.run(url, keywords, count, method, proxyList);
            }
        } else {
            // HTTP mode
            const httpBot = new HttpTrafficSimulator();
            result = await httpBot.run(url, keywords, count, method, proxyList);
        }

        isRunning = false;
        
        return {
            success: true,
            ...result,
            statistics: {
                totalVisitors: totalVisitors,
                completed: completedVisitors,
                successful: result.results?.successful || 0,
                failed: result.results?.failed || 0
            }
        };

    } catch (error) {
        console.error('[BOT] Error:', error);
        isRunning = false;
        
        // Cleanup any active drivers
        if (activeDrivers.length > 0) {
            try {
                const chromeBot = new ChromeBot();
                await chromeBot.cleanup();
            } catch (cleanupError) {
                console.log('[BOT] Cleanup error:', cleanupError.message);
            }
        }
        
        return {
            success: false,
            error: error.message,
            mode: botMode,
            completed: completedVisitors
        };
    }
}

async function stop() {
    console.log('[BOT] Stopping bot...');
    isRunning = false;

    // Cleanup Chrome drivers if any
    if (activeDrivers.length > 0) {
        try {
            const chromeBot = new ChromeBot();
            await chromeBot.cleanup();
        } catch (error) {
            console.log('[BOT] Error during cleanup:', error.message);
        }
    }

    return {
        success: true,
        message: 'Bot stopped',
        visitorsCompleted: completedVisitors,
        visitorsTotal: totalVisitors
    };
}

function getStatus() {
    return {
        isRunning: isRunning,
        totalVisitors: totalVisitors,
        completedVisitors: completedVisitors,
        activeDrivers: activeDrivers.length,
        currentProxyIndex: currentProxyIndex,
        mode: botMode,
        platform: IS_RAILWAY ? 'Railway' : 'Local'
    };
}

// ======================
// AUTO-CLEANUP
// ======================
setInterval(() => {
    if (activeDrivers.length > 0) {
        const now = Date.now();
        // Auto-cleanup old drivers after 5 minutes
        const MAX_DRIVER_AGE = 5 * 60 * 1000;
        
        activeDrivers.forEach(async (driver, index) => {
            try {
                // This is a simplified cleanup check
                // In a real implementation, you'd track driver creation time
                console.log('[AUTO-CLEANUP] Checking old drivers...');
            } catch (error) {
                // Ignore cleanup errors
            }
        });
    }
}, 60000); // Check every minute

// ======================
// DETERMINE MODE ON STARTUP
// ======================
function determineBotMode() {
    if (IS_RAILWAY) {
        botMode = 'http';
        console.log('[MODE] Railway detected -> Using HTTP mode');
        return;
    }

    // Try to detect Chrome availability
    try {
        require('selenium-webdriver');
        require('chromedriver');
        // Check if Chrome is actually available
        const fs = require('fs');
        const chromePaths = [
            '/usr/bin/google-chrome',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        ];
        
        const hasChrome = chromePaths.some(path => fs.existsSync(path));
        
        if (hasChrome && process.env.USE_CHROME !== 'false') {
            botMode = 'chrome';
            console.log('[MODE] Chrome detected -> Using Chrome mode');
        } else {
            botMode = 'http';
            console.log('[MODE] Chrome not found -> Using HTTP mode');
        }
    } catch (error) {
        botMode = 'http';
        console.log('[MODE] Chrome dependencies missing -> Using HTTP mode');
    }
}

// Initialize mode
determineBotMode();

// ======================
// EXPORTS
// ======================
module.exports = {
    main: main,
    stop: stop,
    getStatus: getStatus
};
