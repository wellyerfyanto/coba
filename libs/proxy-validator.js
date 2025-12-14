/**
 * Proxy Format Validator
 * Supports: IP:PORT, http://IP:PORT, socks4://IP:PORT, socks5://IP:PORT
 */

class ProxyValidator {
    constructor() {
        this.patterns = {
            ip: /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
            port: /^([1-9][0-9]{0,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/,
            domain: /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
        };
    }

    parseProxy(proxyStr) {
        if (!proxyStr || typeof proxyStr !== 'string') {
            return { valid: false, error: 'Invalid input' };
        }

        const trimmed = proxyStr.trim();
        
        // Check for protocol
        let protocol = 'http';
        let hostPort = trimmed;

        if (trimmed.includes('://')) {
            const parts = trimmed.split('://');
            protocol = parts[0].toLowerCase();
            hostPort = parts[1];
            
            if (!['http', 'https', 'socks4', 'socks5'].includes(protocol)) {
                return { valid: false, error: `Unsupported protocol: ${protocol}` };
            }
        }

        // Extract host and port
        let host, port;
        
        if (hostPort.includes(':')) {
            const lastColon = hostPort.lastIndexOf(':');
            host = hostPort.substring(0, lastColon);
            port = hostPort.substring(lastColon + 1);
        } else {
            host = hostPort;
            port = protocol === 'https' ? '443' : '80';
        }

        // Validate host
        const isValidHost = this.patterns.ip.test(host) || 
                           this.patterns.domain.test(host) ||
                           host === 'localhost';

        if (!isValidHost) {
            return { valid: false, error: `Invalid host: ${host}` };
        }

        // Validate port
        if (!this.patterns.port.test(port)) {
            return { valid: false, error: `Invalid port: ${port}` };
        }

        return {
            valid: true,
            protocol: protocol,
            host: host,
            port: parseInt(port),
            string: `${protocol}://${host}:${port}`,
            raw: trimmed
        };
    }

    parseMultiple(proxyStrings) {
        const results = {
            valid: [],
            invalid: [],
            duplicates: new Set(),
            unique: []
        };

        const seen = new Set();
        
        proxyStrings.forEach((proxyStr) => {
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
}

module.exports = new ProxyValidator();
