const fs = require('fs');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

class ProxyManager {
    constructor() {
        this.proxies = [];
        this.validProxies = [];
    }

    async loadProxies(filePath = 'proxies.txt') {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            this.proxies = data.split('\n')
                .filter(line => line.trim() && !line.startsWith('#'))
                .map(line => line.trim());
            
            console.log(`Loaded ${this.proxies.length} proxies from ${filePath}`);
            return this.proxies;
        } catch (error) {
            console.error('Error loading proxies:', error);
            return [];
        }
    }

    detectProxyType(proxyString) {
        if (proxyString.includes('socks5://') || proxyString.includes('socks4://')) {
            return 'socks';
        } else if (proxyString.includes('http://')) {
            return 'http';
        } else if (proxyString.includes('https://')) {
            return 'https';
        } else {
            // Default to HTTP if no protocol specified
            return 'http';
        }
    }

    parseProxy(proxyString) {
        let proxy = {};
        
        if (proxyString.includes('://')) {
            const [protocol, rest] = proxyString.split('://');
            proxy.protocol = protocol;
            
            if (rest.includes('@')) {
                const [auth, hostport] = rest.split('@');
                const [host, port] = hostport.split(':');
                const [username, password] = auth.split(':');
                
                proxy.host = host;
                proxy.port = parseInt(port);
                proxy.username = username;
                proxy.password = password;
            } else {
                const [host, port] = rest.split(':');
                proxy.host = host;
                proxy.port = parseInt(port);
            }
        } else {
            // Format: host:port or host:port:user:pass
            const parts = proxyString.split(':');
            if (parts.length === 4) {
                proxy.host = parts[0];
                proxy.port = parseInt(parts[1]);
                proxy.username = parts[2];
                proxy.password = parts[3];
                proxy.protocol = 'http';
            } else if (parts.length === 2) {
                proxy.host = parts[0];
                proxy.port = parseInt(parts[1]);
                proxy.protocol = 'http';
            }
        }
        
        return proxy;
    }

    async testProxy(proxy) {
        const testUrl = 'http://httpbin.org/ip';
        const timeout = 10000;
        
        try {
            const config = {
                timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            };

            if (proxy.protocol === 'socks' || proxy.protocol === 'socks5' || proxy.protocol === 'socks4') {
                const proxyUrl = `${proxy.protocol}://${proxy.username ? `${proxy.username}:${proxy.password}@` : ''}${proxy.host}:${proxy.port}`;
                config.httpsAgent = new SocksProxyAgent(proxyUrl);
                config.httpAgent = config.httpsAgent;
            } else {
                const proxyUrl = `${proxy.protocol}://${proxy.host}:${proxy.port}`;
                config.proxy = {
                    protocol: proxy.protocol,
                    host: proxy.host,
                    port: proxy.port
                };
                
                if (proxy.username && proxy.password) {
                    config.proxy.auth = {
                        username: proxy.username,
                        password: proxy.password
                    };
                }
            }

            const response = await axios.get(testUrl, config);
            
            if (response.data && response.data.origin) {
                return {
                    success: true,
                    ip: response.data.origin,
                    latency: response.headers['request-duration'] || 'N/A',
                    proxy: proxy
                };
            }
        } catch (error) {
            console.error(`Proxy ${proxy.host}:${proxy.port} failed:`, error.message);
        }
        
        return { success: false, proxy };
    }

    async validateProxies(proxies = null) {
        const proxiesToTest = proxies || this.proxies;
        const results = [];
        
        console.log(`Testing ${proxiesToTest.length} proxies...`);
        
        for (const proxyString of proxiesToTest) {
            const proxyType = this.detectProxyType(proxyString);
            const proxy = this.parseProxy(proxyString);
            proxy.type = proxyType;
            
            const result = await this.testProxy(proxy);
            results.push(result);
            
            if (result.success) {
                this.validProxies.push(proxy);
                console.log(`✓ Proxy ${proxy.host}:${proxy.port} is working`);
            }
        }
        
        console.log(`Found ${this.validProxies.length} valid proxies`);
        return this.validProxies;
    }

    getRandomProxy() {
        if (this.validProxies.length === 0) {
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * this.validProxies.length);
        return this.validProxies[randomIndex];
    }

    getProxyForSession(sessionIndex) {
        if (this.validProxies.length === 0) {
            return null;
        }
        
        // Use round-robin distribution
        const proxyIndex = sessionIndex % this.validProxies.length;
        return this.validProxies[proxyIndex];
    }
}

module.exports = ProxyManager;