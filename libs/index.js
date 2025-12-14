/**
 * Main bot logic with auto proxy detection
 */

const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const proxyValidator = require('./proxy-validator');
const autobot = require('./autobot');
const spoofing = require('./spoofing');

// Chrome driver service
const chromedriver = require('chromedriver');
const chromeService = new chrome.ServiceBuilder(chromedriver.path);

// Global state
let driverList = [];
let isRunning = false;
let currentProxyIndex = 0;
let totalVisitors = 0;
let completedVisitors = 0;

// Chrome options
const CHROME_OPTIONS = [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=AudioServiceOutOfProcess',
    '--mute-audio',
    '--disable-logging',
    '--disable-infobars',
    '--disable-extensions',
    '--disable-notifications',
    '--disable-popup-blocking',
    '--disable-translate',
    '--disable-sync',
    '--metrics-recording-only',
    '--disable-default-apps',
    '--no-first-run',
    '--window-size=1920,1080',
    '--user-agent=' + autobot.generateUserAgent(),
    '--lang=en-US,en;q=0.9',
    '--disable-blink-features=AutomationControlled'
];

// Helper functions
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createDriver(proxyString = null) {
    try {
        const options = new chrome.Options();
        
        // Add all Chrome options
        CHROME_OPTIONS.forEach(option => {
            options.addArguments(option);
        });
        
        // Add proxy if provided
        if (proxyString) {
            console.log(`[PROXY] Using proxy: ${proxyString}`);
            options.addArguments(`--proxy-server=${proxyString}`);
        }
        
        // Exclude logging switches
        options.excludeSwitches('enable-logging');
        options.excludeSwitches('enable-automation');
        
        // Disable automation flag
        options.setChromeOption('excludeSwitches', ['enable-automation']);
        options.setChromeOption('useAutomationExtension', false);
        
        // Create driver
        const driver = await new Builder()
            .forBrowser('chrome')
            .setChromeService(chromeService)
            .setChromeOptions(options)
            .build();
        
        // Execute stealth scripts
        await driver.executeScript(spoofing());
        
        // Remove automation flags
        await driver.executeScript(`
            Object.defineProperty(navigator, 'webdriver', {get: () => false});
        `);
        
        console.log(`[DRIVER] Created successfully ${proxyString ? 'with proxy' : 'without proxy'}`);
        return driver;
        
    } catch (error) {
        console.error(`[ERROR] Failed to create driver:`, error.message);
        throw error;
    }
}

async function visitDirect(driver, url) {
    try {
        console.log(`[VISIT] Direct visit to: ${url}`);
        
        await driver.get(url);
        await delay(autobot.randomDelay(2000, 5000));
        
        // Execute auto behavior
        await driver.executeScript(autobot.scroll());
        
        // Random browsing duration
        const visitDuration = autobot.randomDelay(15000, 45000);
        console.log(`[VISIT] Staying for ${Math.round(visitDuration/1000)} seconds...`);
        
        await delay(visitDuration);
        
        // Take screenshot for debugging
        try {
            const screenshot = await driver.takeScreenshot();
            const fs = require('fs');
            const path = require('path');
            const tempDir = './temp';
            
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            const filename = `visit_${Date.now()}.png`;
            fs.writeFileSync(path.join(tempDir, filename), screenshot, 'base64');
            console.log(`[DEBUG] Screenshot saved: ${filename}`);
        } catch (screenshotError) {
            // Silent fail for screenshots
        }
        
        console.log(`[VISIT] Completed successfully`);
        return true;
        
    } catch (error) {
        console.error(`[ERROR] Visit failed:`, error.message);
        return false;
    }
}

async function visitViaGoogle(driver, url, keywords) {
    try {
        console.log(`[GOOGLE] Searching for: ${keywords}`);
        
        // Go to Google
        await driver.get('https://www.google.com');
        await delay(autobot.randomDelay(2000, 4000));
        
        // Accept cookies if present
        try {
            const acceptButtons = await driver.findElements(By.xpath("//button[contains(., 'Accept') or contains(., 'I agree')]"));
            if (acceptButtons.length > 0) {
                await acceptButtons[0].click();
                await delay(1000);
            }
        } catch (e) {
            // Cookies not present or already accepted
        }
        
        // Enter search query
        const searchBox = await driver.findElement(By.name('q'));
        await searchBox.sendKeys(keywords);
        await delay(autobot.randomDelay(500, 1500));
        await searchBox.sendKeys(selenium.Key.ENTER);
        
        await delay(autobot.randomDelay(3000, 6000));
        
        // Find target URL in results
        const links = await driver.findElements(By.css('div.g a'));
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
            console.log(`[GOOGLE] Found target URL in results`);
            await targetLink.click();
            await delay(autobot.randomDelay(3000, 6000));
            
            // Execute auto behavior
            await driver.executeScript(autobot.scroll());
            
            // Stay on site
            await delay(autobot.randomDelay(10000, 30000));
            
            console.log(`[GOOGLE] Visit completed successfully`);
            return true;
        } else {
            console.log(`[GOOGLE] Target URL not found in first page results`);
            // Click random result
            if (links.length > 0) {
                const randomLink = links[Math.floor(Math.random() * links.length)];
                await randomLink.click();
                await delay(autobot.randomDelay(5000, 10000));
            }
            return false;
        }
        
    } catch (error) {
        console.error(`[ERROR] Google search failed:`, error.message);
        return false;
    }
}

async function cleanupDrivers() {
    console.log(`[CLEANUP] Cleaning up ${driverList.length} drivers...`);
    
    for (const driverInfo of driverList) {
        try {
            await driverInfo.driver.quit();
            console.log(`[CLEANUP] Driver closed`);
        } catch (error) {
            console.error(`[ERROR] Failed to close driver:`, error.message);
        }
    }
    
    driverList = [];
    console.log(`[CLEANUP] All drivers cleaned up`);
}

async function main(url, keywords = '', count = 1, method = 'direct', proxyList = []) {
    if (isRunning) {
        console.log(`[ERROR] Bot is already running`);
        return { success: false, error: 'Bot is already running' };
    }
    
    isRunning = true;
    totalVisitors = parseInt(count);
    completedVisitors = 0;
    currentProxyIndex = 0;
    
    console.log(`[BOT] Starting with configuration:`);
    console.log(`       URL: ${url}`);
    console.log(`       Method: ${method}`);
    console.log(`       Visitors: ${count}`);
    console.log(`       Proxies available: ${proxyList.length}`);
    
    try {
        for (let i = 0; i < totalVisitors && isRunning; i++) {
            console.log(`\n[VISITOR ${i + 1}/${totalVisitors}] Starting...`);
            
            // Select proxy
            let proxy = null;
            if (proxyList.length > 0) {
                proxy = proxyList[currentProxyIndex % proxyList.length];
                currentProxyIndex++;
            }
            
            // Create driver
            const driver = await createDriver(proxy);
            
            // Perform visit based on method
            let success = false;
            switch (method.toLowerCase()) {
                case 'google':
                    success = await visitViaGoogle(driver, url, keywords);
                    break;
                case 'direct':
                default:
                    success = await visitDirect(driver, url);
                    break;
            }
            
            // Store driver for cleanup
            driverList.push({
                driver: driver,
                timestamp: Date.now(),
                success: success,
                proxy: proxy
            });
            
            completedVisitors++;
            
            // Random delay between visitors
            if (i < totalVisitors - 1) {
                const waitTime = autobot.randomDelay(5000, 15000);
                console.log(`[BOT] Waiting ${Math.round(waitTime/1000)}s before next visitor...`);
                await delay(waitTime);
            }
        }
        
        console.log(`\n[BOT] Completed ${completedVisitors}/${totalVisitors} visitors`);
        
        // Cleanup after all visitors
        await cleanupDrivers();
        
        isRunning = false;
        return {
            success: true,
            visitors: completedVisitors,
            proxiesUsed: Math.min(proxyList.length, completedVisitors)
        };
        
    } catch (error) {
        console.error(`[ERROR] Bot execution failed:`, error);
        await cleanupDrivers();
        isRunning = false;
        return {
            success: false,
            error: error.message,
            visitors: completedVisitors
        };
    }
}

async function stop() {
    console.log(`[BOT] Stopping bot...`);
    isRunning = false;
    
    await cleanupDrivers();
    
    console.log(`[BOT] Bot stopped successfully`);
    return {
        success: true,
        visitorsCompleted: completedVisitors,
        visitorsTotal: totalVisitors
    };
}

// Auto cleanup old drivers
setInterval(() => {
    const now = Date.now();
    const MAX_DRIVER_AGE = 5 * 60 * 1000; // 5 minutes
    
    for (let i = driverList.length - 1; i >= 0; i--) {
        if (now - driverList[i].timestamp > MAX_DRIVER_AGE) {
            try {
                driverList[i].driver.quit();
                console.log(`[AUTO-CLEANUP] Removed old driver`);
                driverList.splice(i, 1);
            } catch (error) {
                console.error(`[ERROR] Auto cleanup failed:`, error.message);
            }
        }
    }
}, 60000); // Check every minute

module.exports = {
    main: main,
    stop: stop,
    getStatus: () => ({
        isRunning: isRunning,
        totalVisitors: totalVisitors,
        completedVisitors: completedVisitors,
        activeDrivers: driverList.length,
        currentProxyIndex: currentProxyIndex
    })
};
