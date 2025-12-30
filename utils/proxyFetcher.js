const axios = require('axios');
const fs = require('fs');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

class ProxyFetcher {
    constructor() {
        this.sources = [
            // Free Proxy Sources
            'https://raw.githubusercontent.com/mertguvencli/http-proxy-list/main/proxy-list/data.txt',
            'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
            'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
            'https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS_RAW.txt',
            'https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-https.txt',
            'https://www.proxy-list.download/api/v1/get?type=https',
            'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
            'https://api.openproxylist.xyz/http.txt',
            'https://proxyspace.pro/http.txt',
            'https://multiproxy.org/txt_all/proxy.txt'
        ];
        
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36'
        ];
    }

    async fetchFromAllSources() {
        console.log('🌐 Fetching proxies from multiple sources...');
        
        const allProxies = new Set();
        
        for (const source of this.sources) {
            try {
                console.log(`📡 Fetching from: ${source}`);
                const response = await axios.get(source, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': this.userAgents[Math.floor(Math.random() * this.userAgents.length)]
                    }
                });
                
                const proxies = this.parseProxies(response.data);
                proxies.forEach(proxy => allProxies.add(proxy));
                
                console.log(`✅ Got ${proxies.length} proxies from ${source}`);
                
                // Delay to avoid rate limiting
                await this.sleep(1000);
                
            } catch (error) {
                console.log(`❌ Failed to fetch from ${source}: ${error.message}`);
                continue;
            }
        }
        
        return Array.from(allProxies);
    }

    parseProxies(data) {
        const proxies = [];
        const lines = data.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Support multiple formats
            if (this.isValidProxy(trimmed)) {
                proxies.push(trimmed);
            }
        }
        
        return proxies;
    }

    isValidProxy(proxyStr) {
        // Check common proxy formats
        const patterns = [
            /^(\d{1,3}\.){3}\d{1,3}:\d{1,5}$/, // IP:PORT
            /^(\d{1,3}\.){3}\d{1,3}:\d{1,5}:\w+:\w+$/, // IP:PORT:USER:PASS
            /^[a-zA-Z0-9.-]+:\d{1,5}$/, // HOSTNAME:PORT
            /^[a-zA-Z0-9.-]+:\d{1,5}:\w+:\w+$/ // HOSTNAME:PORT:USER:PASS
        ];
        
        return patterns.some(pattern => pattern.test(proxyStr));
    }

    async testProxy(proxy, testUrl = 'http://httpbin.org/ip') {
        try {
            const timeout = 10000; // 10 seconds
            
            // Parse proxy
            let proxyConfig;
            if (proxy.includes('@')) {
                // Format: user:pass@host:port
                const [auth, hostPort] = proxy.split('@');
                const [host, port] = hostPort.split(':');
                const [username, password] = auth.split(':');
                
                proxyConfig = {
                    host,
                    port: parseInt(port),
                    auth: { username, password }
                };
            } else {
                const [host, port] = proxy.split(':');
                proxyConfig = {
                    host,
                    port: parseInt(port)
                };
            }
            
            // Test with axios
            const response = await axios.get(testUrl, {
                timeout,
                proxy: proxyConfig,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (response.data && response.data.origin) {
                return {
                    proxy,
                    working: true,
                    ip: response.data.origin,
                    latency: response.duration || 'N/A',
                    source: 'httpbin'
                };
            }
        } catch (error) {
            // Try alternative test
            return await this.testProxyAlternative(proxy);
        }
        
        return { proxy, working: false, error: 'No IP returned' };
    }

    async testProxyAlternative(proxy) {
        try {
            const testUrl = 'https://api.ipify.org?format=json';
            const [host, port] = proxy.includes('@') 
                ? proxy.split('@')[1].split(':') 
                : proxy.split(':');
            
            const response = await axios.get(testUrl, {
                timeout: 8000,
                proxy: {
                    host,
                    port: parseInt(port),
                    protocol: 'http'
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            
            if (response.data && response.data.ip) {
                return {
                    proxy,
                    working: true,
                    ip: response.data.ip,
                    latency: 'N/A',
                    source: 'ipify'
                };
            }
        } catch (error) {
            // Final test with simple HTTP
            return await this.testProxySimple(proxy);
        }
        
        return { proxy, working: false, error: 'All tests failed' };
    }

    async testProxySimple(proxy) {
        try {
            const testUrl = 'http://checkip.amazonaws.com';
            const [host, port] = proxy.includes('@') 
                ? proxy.split('@')[1].split(':') 
                : proxy.split(':');
            
            const response = await axios.get(testUrl, {
                timeout: 5000,
                proxy: {
                    host,
                    port: parseInt(port)
                }
            });
            
            if (response.data && response.data.trim()) {
                return {
                    proxy,
                    working: true,
                    ip: response.data.trim(),
                    latency: 'N/A',
                    source: 'amazonaws'
                };
            }
        } catch (error) {
            return { proxy, working: false, error: error.message };
        }
    }

    async testProxiesConcurrently(proxies, maxConcurrent = 20) {
        console.log(`🔍 Testing ${proxies.length} proxies...`);
        
        const results = [];
        const workingProxies = [];
        
        // Split into chunks for concurrent testing
        for (let i = 0; i < proxies.length; i += maxConcurrent) {
            const chunk = proxies.slice(i, i + maxConcurrent);
            
            const promises = chunk.map(proxy => 
                this.testProxy(proxy).catch(error => ({
                    proxy,
                    working: false,
                    error: error.message
                }))
            );
            
            const chunkResults = await Promise.allSettled(promises);
            
            chunkResults.forEach(result => {
                if (result.status === 'fulfilled' && result.value.working) {
                    workingProxies.push(result.value.proxy);
                    console.log(`✅ Working: ${result.value.proxy} (${result.value.ip})`);
                }
            });
            
            // Update progress
            const progress = Math.min(i + chunk.length, proxies.length);
            console.log(`📊 Progress: ${progress}/${proxies.length} (${workingProxies.length} working)`);
            
            // Small delay to avoid overwhelming
            await this.sleep(500);
        }
        
        console.log(`🎉 Found ${workingProxies.length} working proxies out of ${proxies.length}`);
        return workingProxies;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    saveProxies(proxies, filename = 'proxies.txt') {
        const content = proxies.join('\n');
        fs.writeFileSync(filename, content);
        console.log(`💾 Saved ${proxies.length} proxies to ${filename}`);
        return proxies.length;
    }

    async autoFetchAndTest() {
        try {
            console.log('🚀 Starting auto proxy fetch & test...');
            
            // Step 1: Fetch from all sources
            const rawProxies = await this.fetchFromAllSources();
            console.log(`📥 Total proxies fetched: ${rawProxies.length}`);
            
            if (rawProxies.length === 0) {
                throw new Error('No proxies fetched from sources');
            }
            
            // Step 2: Test proxies
            const workingProxies = await this.testProxiesConcurrently(rawProxies, 15);
            
            // Step 3: Save working proxies
            if (workingProxies.length > 0) {
                this.saveProxies(workingProxies);
            } else {
                console.log('⚠️ No working proxies found');
            }
            
            return {
                totalFetched: rawProxies.length,
                working: workingProxies.length,
                proxies: workingProxies
            };
            
        } catch (error) {
            console.error('❌ Auto fetch failed:', error.message);
            throw error;
        }
    }
}

module.exports = ProxyFetcher;