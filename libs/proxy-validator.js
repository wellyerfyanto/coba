/**
 * Auto-detect proxy format validator
 * Supports: IP:PORT, http://IP:PORT, socks4://IP:PORT, socks5://IP:PORT
 */

class ProxyValidator {
    constructor() {
        this.patterns = {
            ip: /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
            port: /^([1-9][0-9]{0,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/,
            domain: /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)+([A-Za-z]{2,}|[0-9]{1,3})$/,
        };
    }

    /**
     * Parse and validate proxy string
     * @param {string} proxyStr - Proxy string in any format
     * @returns {Object} Normalized proxy object
     */
    parseProxy(proxyStr) {
        if (!proxyStr || typeof proxyStr !== 'string') {
            return { valid: false, error: 'Invalid proxy string' };
        }

        const trimmed = proxyStr.trim();
        if (!trimmed) {
            return { valid: false, error: 'Empty proxy string' };
        }

        try {
            // Check for protocol prefix
            let protocol = 'http';
            let hostPort = trimmed;

            if (trimmed.includes('://')) {
                const parts = trimmed.split('://');
                protocol = parts[0].toLowerCase();
                hostPort = parts[1];
                
                // Validate protocol
                if (!['http', 'https', 'socks4', 'socks5', 'socks'].includes(protocol)) {
                    return { valid: false, error: `Unsupported protocol: ${protocol}` };
                }
                
                // Normalize socks to socks5
                if (protocol === 'socks') protocol = 'socks5';
            }

            // Extract host and port
            let host, port;
            
            // Handle IPv6 addresses
            if (hostPort.startsWith('[')) {
                const ipv6End = hostPort.indexOf(']');
                if (ipv6End === -1) {
                    return { valid: false, error: 'Invalid IPv6 format' };
                }
                host = hostPort.substring(1, ipv6End);
                const afterHost = hostPort.substring(ipv6End + 1);
                
                if (afterHost.startsWith(':')) {
                    port = afterHost.substring(1);
                } else if (afterHost === '') {
                    port = protocol === 'https' ? '443' : '80';
                } else {
                    return { valid: false, error: 'Invalid port specification' };
                }
            } else {
                // IPv4 or domain
                const colonCount = (hostPort.match(/:/g) || []).length;
                
                if (colonCount === 0) {
                    // No port specified
                    host = hostPort;
                    port = protocol === 'https' ? '443' : '80';
                } else if (colonCount === 1 || (colonCount > 1 && !hostPort.includes('['))) {
                    // IPv4 with port or domain with port
                    const lastColon = hostPort.lastIndexOf(':');
                    host = hostPort.substring(0, lastColon);
                    port = hostPort.substring(lastColon + 1);
                } else {
                    return { valid: false, error: 'Invalid host:port format' };
                }
            }

            // Validate host
            let isValidHost = false;
            if (this.patterns.ip.test(host)) {
                isValidHost = true;
            } else if (this.patterns.domain.test(host)) {
                isValidHost = true;
            } else if (/^[a-fA-F0-9:]+$/.test(host)) { // IPv6 without brackets
                isValidHost = true;
                host = `[${host}]`; // Add brackets for IPv6
            }

            if (!isValidHost) {
                return { valid: false, error: `Invalid host: ${host}` };
            }

            // Validate port
            if (!this.patterns.port.test(port)) {
                return { valid: false, error: `Invalid port: ${port}` };
            }

            // Build normalized proxy string
            const normalized = {
                protocol,
                host,
                port: parseInt(port, 10),
                string: `${protocol}://${host}:${port}`,
                raw: trimmed,
                valid: true
            };

            return normalized;

        } catch (error) {
            return { 
                valid: false, 
                error: `Parse error: ${error.message}`,
                raw: trimmed
            };
        }
    }

    /**
     * Parse multiple proxy strings
     * @param {string[]} proxyStrings - Array of proxy strings
     * @returns {Object} Results with valid and invalid proxies
     */
    parseMultiple(proxyStrings) {
        const results = {
            valid: [],
            invalid: [],
            duplicates: new Set(),
            unique: []
        };

        const seen = new Set();
        
        proxyStrings.forEach((proxyStr, index) => {
            const result = this.parseProxy(proxyStr);
            
            if (result.valid) {
                const key = `${result.protocol}://${result.host}:${result.port}`;
                
                if (seen.has(key)) {
                    results.duplicates.add(result.string);
                } else {
                    seen.add(key);
                    results.valid.push(result);
                    results.unique.push(result.string);
                }
            } else {
                results.invalid.push({
                    raw: proxyStr,
                    error: result.error
                });
            }
        });

        results.total = proxyStrings.length;
        results.validCount = results.valid.length;
        results.invalidCount = results.invalid.length;
        results.duplicateCount = results.duplicates.size;

        return results;
    }

    /**
     * Detect proxy type based on port
     * @param {number} port - Proxy port
     * @returns {string} Suggested protocol
     */
    detectProtocolByPort(port) {
        const portProtocols = {
            80: 'http',
            443: 'https',
            8080: 'http',
            8443: 'https',
            1080: 'socks5',
            1081: 'socks5',
            9050: 'socks5', // Tor
            9150: 'socks5', // Tor Browser
            4145: 'socks4',
            3128: 'http', // Squid
            8888: 'http',
        };
        
        return portProtocols[port] || 'http';
    }

    /**
     * Export proxies in various formats
     * @param {Object[]} proxies - Array of parsed proxy objects
     * @param {string} format - Output format
     * @returns {string} Formatted proxy list
     */
    exportProxies(proxies, format = 'string') {
        if (format === 'string') {
            return proxies.map(p => p.string).join('\n');
        } else if (format === 'json') {
            return JSON.stringify(proxies, null, 2);
        } else if (format === 'array') {
            return proxies.map(p => p.string);
        } else if (format === 'selenium') {
            return proxies.map(p => {
                if (p.protocol === 'socks4' || p.protocol === 'socks5') {
                    return `${p.protocol}://${p.host}:${p.port}`;
                }
                return `http://${p.host}:${p.port}`;
            }).join('\n');
        }
        
        return proxies.map(p => p.string).join('\n');
    }
}

module.exports = new ProxyValidator();
