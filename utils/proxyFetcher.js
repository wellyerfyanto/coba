const axios = require('axios');
const fs = require('fs');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

class ProxyFetcher {
    constructor() {
        this.sources = [
            // Free HTTP/HTTPS Proxy Sources
            'https://raw.githubusercontent.com/mertguvencli/http-proxy-list/main/proxy-list/data.txt',
            'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
            'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
            'https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-https.txt',
            'https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS_RAW.txt',
            'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
            'https://www.proxy-list.download/api/v1/get?type=http',
            'https://www.proxy-list.download/api/v1/get?type=https',
            'https://api.openproxylist.xyz/http.txt',
            'https://proxyspace.pro/http.txt',
            'https://multiproxy.org/txt_all/proxy.txt',
            'https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt',
            'https://raw.githubusercontent.com/ALIILAPRO/Proxy/main/https.txt'
        ];
        
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
        ];
    }

    async fetchFromAllSources() {
        console.log('🌐 Fetching proxies from multiple sources...');
        
        const allProxies = new Set();
        const sourceStatus = [];
        
        for (let i = 0; i < this.sources.length; i++) {
            const source = this.sources[i];
            try {
                console.log(`📡 [${i + 1}/${this.sources.length}] Fetching from: ${this.shortenUrl(source)}`);
                
                const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
                const response = await axios.get(source, {
                    timeout: 15000,
                    headers: {
                        'User-Agent': userAgent,
                        'Accept': 'text/plain,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive'
                    }
                });
                
                const proxies = this.parseProxies(response.data);
                proxies.forEach(proxy => allProxies.add(proxy));
                
                console.log(`✅ Got ${proxies.length} proxies from ${this.shortenUrl(source)}`);
                sourceStatus.push({ source, success: true, count: proxies.length });
                
            } catch (error) {
                console.log(`❌ Failed to fetch from ${this.shortenUrl(source)}: ${error.message}`);
                sourceStatus.push({ source, success: false, error: error.message });
                continue;
            }
            
            // Random delay to avoid rate limiting
            await this.sleep(Math.random() * 2000 + 1000);
        }
        
        const uniqueProxies = Array.from(allProxies);
        console.log(`📥 Total unique proxies fetched: ${uniqueProxies.length}`);
        
        return {
            proxies: uniqueProxies,
            sourceStatus
        };
    }

    shortenUrl(url) {
        if (url.length > 60) {
            return url.substring(0, 60) + '...';
        }
        return url;
    }

    parseProxies(data) {
        const proxies = new Set();
        const lines = data.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
                continue;
            }
            
            // Extract proxy from various formats
            const proxy = this.extractProxy(trimmed);
            if (proxy) {
                proxies.add(proxy);
            }
        }
        
        return Array.from(proxies);
    }

    extractProxy(line) {
        // Pattern 1: IP:PORT
        const ipPortPattern = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5})/;
        
        // Pattern 2: HOST:PORT
        const hostPortPattern = /([a-zA-Z0-9.-]+:\d{1,5})/;
        
        // Pattern 3: IP:PORT:USER:PASS
        const ipPortAuthPattern = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5}:[^:\s]+:[^:\s]+)/;
        
        // Pattern 4: HOST:PORT:USER:PASS
        const hostPortAuthPattern = /([a-zA-Z0-9.-]+:\d{1,5}:[^:\s]+:[^:\s]+)/;
        
        let match = line.match(ipPortAuthPattern);
        if (match) return match[1];
        
        match = line.match(hostPortAuthPattern);
        if (match) return match[1];
        
        match = line.match(ipPortPattern);
        if (match) return match[1];
        
        match = line.match(hostPortPattern);
        if (match) return match[1];
        
        return null;
    }

    async testProxy(proxy, testUrl = 'http://httpbin.org/ip') {
        const timeout = 10000;
        
        try {
            // Parse proxy
            const proxyConfig = this.parseProxyConfig(proxy);
            if (!proxyConfig) {
                return { proxy, working: false, error: 'Invalid proxy format' };
            }
            
            // Test with axios
            const startTime = Date.now();
            const response = await axios.get(testUrl, {
                timeout,
                proxy: proxyConfig,
                headers: {
                    'User-Agent': this.userAgents[0],
                    'Accept': 'application/json,text/html'
                },
                validateStatus: () => true // Accept any status
            });
            
            const latency = Date.now() - startTime;
            
            if (response.status === 200) {
                let ip = 'Unknown';
                if (response.data && typeof response.data === 'object') {
                    ip = response.data.origin || 'Unknown';
                } else if (typeof response.data === 'string') {
                    const ipMatch = response.data.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
                    ip = ipMatch ? ipMatch[0] : 'Unknown';
                }
                
                return {
                    proxy,
                    working: true,
                    ip: ip,
                    latency: latency,
                    status: response.status,
                    source: 'httpbin'
                };
            } else {
                return { proxy, working: false, error: `HTTP ${response.status}`, latency };
            }
            
        } catch (error) {
            // Fallback to alternative test
            return await this.testProxyAlternative(proxy);
        }
    }

    parseProxyConfig(proxyStr) {
        try {
            if (proxyStr.includes('@')) {
                // Format: user:pass@host:port
                const [auth, hostPort] = proxyStr.split('@');
                const [username, password] = auth.split(':');
                const [host, port] = hostPort.split(':');
                
                return {
                    protocol: 'http',
                    host: host,
                    port: parseInt(port),
                    auth: {
                        username: username,
                        password: password
                    }
                };
            } else {
                const [host, port] = proxyStr.split(':');
                return {
                    protocol: 'http',
                    host: host,
                    port: parseInt(port)
                };
            }
        } catch (error) {
            return null;
        }
    }

    async testProxyAlternative(proxy) {
        const testUrls = [
            'https://api.ipify.org?format=json',
            'http://checkip.amazonaws.com',
            'https://icanhazip.com'
        ];
        
        for (const testUrl of testUrls) {
            try {
                const proxyConfig = this.parseProxyConfig(proxy);
                if (!proxyConfig) continue;
                
                const response = await axios.get(testUrl, {
                    timeout: 8000,
                    proxy: proxyConfig,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                
                if (response.status === 200) {
                    let ip = 'Unknown';
                    if (testUrl.includes('ipify') && response.data && response.data.ip) {
                        ip = response.data.ip;
                    } else if (typeof response.data === 'string') {
                        ip = response.data.trim();
                    }
                    
                    return {
                        proxy,
                        working: true,
                        ip: ip,
                        latency: 'N/A',
                        source: testUrl
                    };
                }
            } catch (error) {
                continue; // Try next test URL
            }
        }
        
        return { proxy, working: false, error: 'All test URLs failed' };
    }

    async testProxiesConcurrently(proxies, maxConcurrent = 10) {
        console.log(`🔍 Testing ${proxies.length} proxies (concurrent: ${maxConcurrent})...`);
        
        const results = [];
        const workingProxies = [];
        let tested = 0;
        
        // Split proxies into chunks
        for (let i = 0; i < proxies.length; i += maxConcurrent) {
            const chunk = proxies.slice(i, i + maxConcurrent);
            const promises = [];
            
            for (const proxy of chunk) {
                promises.push(
                    this.testProxy(proxy)
                        .then(result => {
                            tested++;
                            if (result.working) {
                                workingProxies.push(result.proxy);
                                console.log(`✅ [${tested}/${proxies.length}] Working: ${result.proxy} (${result.ip})`);
                            }
                            
                            // Update progress every 10 proxies
                            if (tested % 10 === 0) {
                                const progress = Math.round((tested / proxies.length) * 100);
                                const successRate = workingProxies.length > 0 ? 
                                    Math.round((workingProxies.length / tested) * 100) : 0;
                                
                                console.log(`📊 Progress: ${progress}% - ${workingProxies.length}/${tested} working (${successRate}% success)`);
                            }
                            
                            return result;
                        })
                        .catch(error => ({
                            proxy,
                            working: false,
                            error: error.message
                        }))
                );
            }
            
            const chunkResults = await Promise.allSettled(promises);
            chunkResults.forEach(result => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                }
            });
            
            // Small delay between chunks
            if (i + maxConcurrent < proxies.length) {
                await this.sleep(1000);
            }
        }
        
        console.log(`🎉 Testing completed: ${workingProxies.length} working out of ${proxies.length} (${Math.round((workingProxies.length / proxies.length) * 100)}% success)`);
        
        return {
            working: workingProxies,
            results: results,
            stats: {
                total: proxies.length,
                working: workingProxies.length,
                failed: proxies.length - workingProxies.length,
                successRate: Math.round((workingProxies.length / proxies.length) * 100)
            }
        };
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    saveProxies(proxies, filename = 'proxies.txt') {
        try {
            // Add header comment
            let content = `# Auto-fetched proxies - ${new Date().toISOString()}\n`;
            content += `# Total: ${proxies.length} working proxies\n#\n`;
            
            // Add proxies
            content += proxies.join('\n');
            
            fs.writeFileSync(filename, content);
            console.log(`💾 Saved ${proxies.length} working proxies to ${filename}`);
            
            // Also create a backup
            const backupFile = `proxies_backup_${Date.now()}.txt`;
            fs.writeFileSync(backupFile, content);
            
            return {
                success: true,
                saved: proxies.length,
                filename: filename,
                backup: backupFile
            };
        } catch (error) {
            console.error('Error saving proxies:', error);
            return { success: false, error: error.message };
        }
    }

    async autoFetchAndTest(limit = 200) {
        try {
            console.log('🚀 Starting auto proxy fetch & test...');
            
            // Step 1: Fetch from all sources
            const fetchResult = await this.fetchFromAllSources();
            let rawProxies = fetchResult.proxies;
            
            if (rawProxies.length === 0) {
                throw new Error('No proxies fetched from any source');
            }
            
            console.log(`📥 Fetched ${rawProxies.length} raw proxies`);
            
            // Limit number of proxies to test (for performance)
            if (rawProxies.length > limit) {
                console.log(`⚠️ Limiting testing to ${limit} random proxies`);
                rawProxies = this.shuffleArray(rawProxies).slice(0, limit);
            }
            
            // Step 2: Test proxies
            const testResult = await this.testProxiesConcurrently(rawProxies, 15);
            
            // Step 3: Save working proxies
            let saveResult = null;
            if (testResult.working.length > 0) {
                saveResult = this.saveProxies(testResult.working);
            }
            
            return {
                success: true,
                totalFetched: fetchResult.proxies.length,
                totalTested: rawProxies.length,
                working: testResult.working.length,
                proxies: testResult.working,
                stats: testResult.stats,
                saveResult: saveResult,
                sourceStatus: fetchResult.sourceStatus
            };
            
        } catch (error) {
            console.error('❌ Auto fetch failed:', error);
            return {
                success: false,
                error: error.message,
                totalFetched: 0,
                working: 0
            };
        }
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Quick test for manual proxy input
    async quickTest(proxyStr) {
        try {
            const result = await this.testProxy(proxyStr);
            return {
                proxy: proxyStr,
                working: result.working,
                ip: result.ip || 'Unknown',
                latency: result.latency || 'N/A',
                message: result.working ? 'Proxy is working!' : 'Proxy failed: ' + (result.error || 'Unknown error')
            };
        } catch (error) {
            return {
                proxy: proxyStr,
                working: false,
                error: error.message
            };
        }
    }
}

module.exports = ProxyFetcher;