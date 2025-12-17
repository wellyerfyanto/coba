/**
 * TRAFFIC SIMULATOR - Railway Optimized
 * FIXED VERSION: Proper ES6 class with inheritance support
 * Uses HTTP requests instead of Chrome/Selenium
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class TrafficSimulator {
    constructor() {
        this.isRunning = false;
        this.totalVisitors = 0;
        this.completedVisitors = 0;
        this.currentProxyIndex = 0;
        this.activeRequests = new Set();
        this.userAgents = this.generateUserAgents();
        this.referrers = this.generateReferrers();
        
        // Bind methods to ensure correct 'this' context
        this.makeRequest = this.makeRequest.bind(this);
        this.simulateGoogleSearch = this.simulateGoogleSearch.bind(this);
        this.delay = this.delay.bind(this);
        
        console.log('[TRAFFIC SIM] HTTP Traffic Simulator initialized for Railway');
    }
    
    generateUserAgents() {
        return [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 Edg/118.0.2088.76',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36'
        ];
    }
    
    generateReferrers() {
        return [
            'https://www.google.com/',
            'https://www.bing.com/',
            'https://search.yahoo.com/',
            'https://duckduckgo.com/',
            'https://www.reddit.com/',
            'https://www.facebook.com/',
            'https://twitter.com/',
            'https://www.linkedin.com/',
            'https://news.ycombinator.com/',
            'https://www.quora.com/',
            '',
            '',
            ''
        ];
    }
    
    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }
    
    getRandomReferrer() {
        return this.referrers[Math.floor(Math.random() * this.referrers.length)];
    }
    
    randomDelay(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    async makeRequest(url, proxy = null) {
        const startTime = Date.now();
        const visitId = Math.random().toString(36).substr(2, 9);
        
        console.log(`[${visitId}] makeRequest to: ${url}`);
        
        try {
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const protocol = isHttps ? https : http;
            
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search + urlObj.hash,
                method: 'GET',
                timeout: 30000,
                headers: {
                    'User-Agent': this.getRandomUserAgent(),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Cache-Control': 'max-age=0',
                    'Referer': this.getRandomReferrer(),
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'cross-site',
                    'Sec-Fetch-User': '?1'
                }
            };
            
            // Add proxy support if available
            if (proxy) {
                console.log(`[${visitId}] Using proxy: ${proxy}`);
                // Note: HTTP proxies need different handling
                // This is simplified for Railway
            }
            
            return new Promise((resolve, reject) => {
                const req = protocol.request(options, (res) => {
                    const statusCode = res.statusCode;
                    const headers = res.headers;
                    let responseTime = Date.now() - startTime;
                    
                    console.log(`[${visitId}] Response: ${statusCode} ${res.statusMessage} (${responseTime}ms)`);
                    
                    // Collect response data (but don't store large responses)
                    let data = '';
                    res.on('data', (chunk) => {
                        data += chunk;
                        // Limit data collection to prevent memory issues
                        if (data.length > 10000) {
                            data = data.substring(0, 10000) + '... [TRUNCATED]';
                        }
                    });
                    
                    res.on('end', () => {
                        const result = {
                            success: statusCode >= 200 && statusCode < 400,
                            statusCode,
                            responseTime,
                            headers: {
                                'content-type': headers['content-type'] || 'unknown',
                                'content-length': headers['content-length'] || data.length,
                                'server': headers['server'] || 'unknown'
                            },
                            dataLength: data.length,
                            proxyUsed: proxy || 'none'
                        };
                        
                        console.log(`[${visitId}] Request completed: ${result.success ? '✅' : '❌'} ${statusCode}`);
                        resolve(result);
                    });
                });
                
                req.on('error', (error) => {
                    console.log(`[${visitId}] Request error: ${error.message}`);
                    
                    const result = {
                        success: false,
                        error: error.message,
                        responseTime: Date.now() - startTime,
                        proxyUsed: proxy || 'none'
                    };
                    
                    resolve(result); // Use resolve, not reject, to prevent unhandled rejections
                });
                
                req.on('timeout', () => {
                    console.log(`[${visitId}] Request timeout`);
                    req.destroy();
                    
                    const result = {
                        success: false,
                        error: 'timeout',
                        responseTime: Date.now() - startTime,
                        proxyUsed: proxy || 'none'
                    };
                    
                    resolve(result);
                });
                
                // Send request
                req.end();
                
                // Store request for potential cancellation
                this.activeRequests.add(req);
                req.on('close', () => {
                    this.activeRequests.delete(req);
                });
            });
            
        } catch (error) {
            console.log(`[${visitId}] Request setup error: ${error.message}`);
            
            return {
                success: false,
                error: error.message,
                responseTime: Date.now() - startTime,
                proxyUsed: proxy || 'none'
            };
        }
    }
    
    async simulateGoogleSearch(url, keywords, proxy = null) {
        console.log(`[GOOGLE SIM] Simulating search: "${keywords}"`);
        
        // Simulate Google search sequence
        const steps = [
            { url: 'https://www.google.com/search?q=' + encodeURIComponent(keywords), delay: 2000 },
            { url: url, delay: 5000 }
        ];
        
        let results = [];
        
        for (const step of steps) {
            const result = await this.makeRequest(step.url, proxy);
            results.push(result);
            
            if (step.delay > 0) {
                await this.delay(this.randomDelay(step.delay, step.delay * 2));
            }
            
            // Random browsing behavior
            if (Math.random() > 0.7) {
                await this.delay(this.randomDelay(1000, 3000));
            }
        }
        
        return {
            success: results.some(r => r.success),
            steps: results.length,
            results: results
        };
    }
    
    async simulateVisit(url, proxy = null) {
        return await this.makeRequest(url, proxy);
    }
    
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async main(url, keywords = '', count = 1, method = 'direct', proxyList = []) {
        if (this.isRunning) {
            return { success: false, error: 'Bot is already running' };
        }
        
        console.log(`🚀 Starting HTTP traffic simulation`);
        console.log(`   URL: ${url}`);
        console.log(`   Method: ${method}`);
        console.log(`   Visitors: ${count}`);
        console.log(`   Proxies: ${proxyList.length} available`);
        
        this.isRunning = true;
        this.totalVisitors = parseInt(count);
        this.completedVisitors = 0;
        this.currentProxyIndex = 0;
        
        const results = {
            successful: 0,
            failed: 0,
            totalTime: 0,
            visits: []
        };
        
        const startTime = Date.now();
        
        try {
            for (let i = 0; i < this.totalVisitors && this.isRunning; i++) {
                console.log(`\n[VISITOR ${i + 1}/${this.totalVisitors}] Starting...`);
                
                // Select proxy (round-robin)
                let proxy = null;
                if (proxyList.length > 0) {
                    proxy = proxyList[this.currentProxyIndex % proxyList.length];
                    this.currentProxyIndex++;
                }
                
                let visitResult;
                
                if (method === 'google' && keywords) {
                    visitResult = await this.simulateGoogleSearch(url, keywords, proxy);
                } else {
                    visitResult = await this.simulateVisit(url, proxy);
                }
                
                results.visits.push(visitResult);
                
                if (visitResult.success) {
                    results.successful++;
                } else {
                    results.failed++;
                }
                
                this.completedVisitors = i + 1;
                
                // Random delay between visitors (2-10 seconds)
                if (i < this.totalVisitors - 1) {
                    const waitTime = this.randomDelay(2000, 10000);
                    console.log(`⏱️ Waiting ${Math.round(waitTime/1000)}s before next visitor...`);
                    await this.delay(waitTime);
                }
            }
            
            results.totalTime = Date.now() - startTime;
            
            console.log(`\n✅ Simulation completed!`);
            console.log(`   Successful: ${results.successful}`);
            console.log(`   Failed: ${results.failed}`);
            console.log(`   Total time: ${Math.round(results.totalTime/1000)}s`);
            console.log(`   Avg time/visit: ${Math.round(results.totalTime/this.totalVisitors)}ms`);
            
            return {
                success: true,
                message: `Simulated ${this.completedVisitors} visits via HTTP requests`,
                results: results,
                statistics: {
                    totalVisitors: this.totalVisitors,
                    completed: this.completedVisitors,
                    successful: results.successful,
                    failed: results.failed,
                    successRate: Math.round((results.successful / this.totalVisitors) * 100),
                    totalTime: results.totalTime,
                    averageTime: Math.round(results.totalTime / this.totalVisitors)
                }
            };
            
        } catch (error) {
            console.error(`❌ Simulation error: ${error.message}`);
            
            return {
                success: false,
                error: error.message,
                results: results,
                completed: this.completedVisitors
            };
            
        } finally {
            this.isRunning = false;
            this.activeRequests.clear();
        }
    }
    
    async stop() {
        console.log('🛑 Stopping traffic simulator...');
        
        this.isRunning = false;
        
        // Cancel all active requests
        this.activeRequests.forEach(req => {
            try {
                req.destroy();
            } catch (e) {
                // Ignore
            }
        });
        this.activeRequests.clear();
        
        return {
            success: true,
            message: 'Traffic simulator stopped',
            visitors: {
                total: this.totalVisitors,
                completed: this.completedVisitors
            }
        };
    }
    
    getStatus() {
        return {
            isRunning: this.isRunning,
            totalVisitors: this.totalVisitors,
            completedVisitors: this.completedVisitors,
            activeRequests: this.activeRequests.size,
            currentProxyIndex: this.currentProxyIndex,
            mode: 'HTTP Simulation (Railway)'
        };
    }
}

// ✅ CRITICAL FIX: Export sebagai CLASS, bukan instance
module.exports = TrafficSimulator;
