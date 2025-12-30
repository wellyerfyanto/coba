const fs = require('fs');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

class ProxyManager {
  constructor() {
    this.proxies = [];
    this.validProxies = [];
    this.currentProxyIndex = 0;
  }

  // Load banyak proxy dari file
  async loadProxiesFromFile(filePath = 'proxies.txt') {
    try {
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        this.proxies = data.split('\n')
          .filter(line => {
            const trimmed = line.trim();
            return trimmed && 
                   !trimmed.startsWith('#') && 
                   !trimmed.startsWith('//') &&
                   trimmed.includes(':');
          })
          .map(line => {
            const parts = line.trim().split(':');
            
            // Format: host:port:user:pass
            if (parts.length === 4) {
              return {
                host: parts[0],
                port: parseInt(parts[1]),
                username: parts[2],
                password: parts[3],
                protocol: 'http',
                active: true,
                lastUsed: null,
                successCount: 0,
                failCount: 0
              };
            }
            // Format: host:port
            else if (parts.length === 2) {
              return {
                host: parts[0],
                port: parseInt(parts[1]),
                protocol: 'http',
                active: true,
                lastUsed: null,
                successCount: 0,
                failCount: 0
              };
            }
            // Format: protocol://host:port
            else if (line.includes('://')) {
              const [protocol, rest] = line.split('://');
              const [host, port] = rest.split(':');
              return {
                host,
                port: parseInt(port),
                protocol: protocol,
                active: true,
                lastUsed: null,
                successCount: 0,
                failCount: 0
              };
            }
            return null;
          })
          .filter(proxy => proxy !== null);
        
        console.log(`✅ Loaded ${this.proxies.length} proxies from ${filePath}`);
        return this.proxies;
      } else {
        console.log(`⚠️ Proxy file ${filePath} not found, creating empty file`);
        // Buat file kosong jika tidak ada
        fs.writeFileSync(filePath, '# Add your proxies here\n# Format: host:port:username:password\n');
        return [];
      }
    } catch (error) {
      console.error('❌ Error loading proxies:', error);
      return [];
    }
  }

  // Test semua proxy
  async validateAllProxies(timeout = 10000) {
    console.log(`🔄 Testing ${this.proxies.length} proxies...`);
    
    const testPromises = this.proxies.map(async (proxy, index) => {
      try {
        const testUrl = 'http://httpbin.org/ip';
        const config = {
          timeout: timeout,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        };

        // Setup proxy berdasarkan protocol
        if (proxy.protocol === 'socks5' || proxy.protocol === 'socks4') {
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
          proxy.ip = response.data.origin;
          proxy.latency = response.headers['request-duration'] || 'N/A';
          proxy.active = true;
          proxy.successCount = (proxy.successCount || 0) + 1;
          proxy.lastTested = new Date();
          this.validProxies.push(proxy);
          console.log(`✅ Proxy ${index + 1}: ${proxy.host}:${proxy.port} - WORKING (IP: ${proxy.ip})`);
          return { success: true, proxy, index };
        }
      } catch (error) {
        proxy.active = false;
        proxy.error = error.message;
        proxy.failCount = (proxy.failCount || 0) + 1;
        proxy.lastTested = new Date();
        console.log(`❌ Proxy ${index + 1}: ${proxy.host}:${proxy.port} - FAILED (${error.message})`);
        return { success: false, proxy, index };
      }
    });
    
    const results = await Promise.allSettled(testPromises);
    
    // Sort valid proxies by success rate
    this.validProxies.sort((a, b) => {
      const aRate = a.successCount / (a.successCount + a.failCount);
      const bRate = b.successCount / (b.successCount + b.failCount);
      return bRate - aRate;
    });
    
    console.log(`📊 Proxy Test Results: ${this.validProxies.length}/${this.proxies.length} working`);
    
    return {
      total: this.proxies.length,
      working: this.validProxies.length,
      failed: this.proxies.length - this.validProxies.length,
      validProxies: this.validProxies.map(p => ({
        host: p.host,
        port: p.port,
        protocol: p.protocol,
        ip: p.ip,
        successCount: p.successCount,
        failCount: p.failCount
      }))
    };
  }

  // Test single proxy
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

      if (proxy.protocol === 'socks5' || proxy.protocol === 'socks4') {
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

  // Parse proxy string
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

  // Get proxy untuk session tertentu
  getProxyForSession(sessionIndex) {
    if (this.validProxies.length === 0) {
      return null;
    }
    
    // Round-robin distribution
    const proxyIndex = sessionIndex % this.validProxies.length;
    const proxy = this.validProxies[proxyIndex];
    
    proxy.lastUsed = new Date();
    proxy.usageCount = (proxy.usageCount || 0) + 1;
    
    return proxy;
  }

  // Get random proxy
  getRandomProxy() {
    if (this.validProxies.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * this.validProxies.length);
    const proxy = this.validProxies[randomIndex];
    proxy.lastUsed = new Date();
    proxy.usageCount = (proxy.usageCount || 0) + 1;
    
    return proxy;
  }

  // Get proxy stats
  getStats() {
    return {
      totalProxies: this.proxies.length,
      validProxies: this.validProxies.length,
      successRate: this.validProxies.length > 0 ? 
        (this.validProxies.reduce((sum, p) => sum + (p.successCount || 0), 0) / 
         this.validProxies.reduce((sum, p) => sum + (p.successCount || 0) + (p.failCount || 0), 1) * 100).toFixed(2) : 0,
      proxyList: this.validProxies.map(p => ({
        host: p.host,
        port: p.port,
        protocol: p.protocol,
        lastUsed: p.lastUsed,
        ip: p.ip,
        successCount: p.successCount || 0,
        failCount: p.failCount || 0,
        usageCount: p.usageCount || 0
      }))
    };
  }

  // Reset proxy list
  reset() {
    this.proxies = [];
    this.validProxies = [];
    this.currentProxyIndex = 0;
  }

  // Add proxy manually
  addProxy(proxyString) {
    const proxy = this.parseProxy(proxyString);
    if (proxy) {
      proxy.active = true;
      proxy.successCount = 0;
      proxy.failCount = 0;
      this.proxies.push(proxy);
      return proxy;
    }
    return null;
  }

  // Remove proxy
  removeProxy(host, port) {
    this.proxies = this.proxies.filter(p => !(p.host === host && p.port === port));
    this.validProxies = this.validProxies.filter(p => !(p.host === host && p.port === port));
  }
}

module.exports = ProxyManager;