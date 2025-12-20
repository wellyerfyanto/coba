const fs = require('fs');

class UserAgentRotator {
    constructor() {
        this.userAgents = [];
        this.loadUserAgents();
    }

    loadUserAgents(filePath = 'user-agents.txt') {
        try {
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8');
                this.userAgents = data.split('\n')
                    .filter(line => line.trim() && !line.startsWith('#'))
                    .map(line => line.trim());
            } else {
                // Fallback to default user agents
                this.userAgents = this.getDefaultUserAgents();
                this.saveDefaultUserAgents(filePath);
            }
            
            console.log(`Loaded ${this.userAgents.length} user agents`);
            return this.userAgents;
        } catch (error) {
            console.error('Error loading user agents:', error);
            this.userAgents = this.getDefaultUserAgents();
            return this.userAgents;
        }
    }

    getDefaultUserAgents() {
        return [
            // Chrome on Windows
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            
            // Chrome on macOS
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            
            // Firefox on Windows
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
            
            // Firefox on macOS
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
            
            // Safari on macOS
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
            
            // Edge on Windows
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
            
            // Mobile User Agents
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36',
            'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36'
        ];
    }

    saveDefaultUserAgents(filePath) {
        try {
            const data = this.userAgents.join('\n');
            fs.writeFileSync(filePath, data);
            console.log(`Saved default user agents to ${filePath}`);
        } catch (error) {
            console.error('Error saving user agents:', error);
        }
    }

    getRandomUserAgent() {
        if (this.userAgents.length === 0) {
            return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        }
        
        const randomIndex = Math.floor(Math.random() * this.userAgents.length);
        return this.userAgents[randomIndex];
    }

    getUserAgentForSession(sessionIndex) {
        if (this.userAgents.length === 0) {
            return this.getRandomUserAgent();
        }
        
        // Use different user agent for each session
        const uaIndex = sessionIndex % this.userAgents.length;
        return this.userAgents[uaIndex];
    }

    getUserAgentInfo(userAgent) {
        const info = {
            browser: 'Unknown',
            version: 'Unknown',
            os: 'Unknown',
            device: 'Desktop'
        };

        // Detect browser
        if (userAgent.includes('Chrome') && userAgent.includes('Safari')) {
            if (userAgent.includes('Edg')) {
                info.browser = 'Edge';
                const match = userAgent.match(/Edg\/(\d+\.\d+)/);
                if (match) info.version = match[1];
            } else {
                info.browser = 'Chrome';
                const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
                if (match) info.version = match[1];
            }
        } else if (userAgent.includes('Firefox')) {
            info.browser = 'Firefox';
            const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
            if (match) info.version = match[1];
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            info.browser = 'Safari';
            const match = userAgent.match(/Version\/(\d+\.\d+)/);
            if (match) info.version = match[1];
        }

        // Detect OS
        if (userAgent.includes('Windows NT 10.0')) {
            info.os = 'Windows 10';
        } else if (userAgent.includes('Windows NT 6.3')) {
            info.os = 'Windows 8.1';
        } else if (userAgent.includes('Windows NT 6.2')) {
            info.os = 'Windows 8';
        } else if (userAgent.includes('Windows NT 6.1')) {
            info.os = 'Windows 7';
        } else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS X')) {
            info.os = 'macOS';
        } else if (userAgent.includes('Linux')) {
            info.os = 'Linux';
        } else if (userAgent.includes('Android')) {
            info.os = 'Android';
            info.device = 'Mobile';
        } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
            info.os = 'iOS';
            info.device = 'Mobile';
        }

        // Detect device type
        if (userAgent.includes('Mobile') || userAgent.includes('iPhone') || userAgent.includes('Android')) {
            info.device = 'Mobile';
        } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
            info.device = 'Tablet';
        }

        return info;
    }
}

module.exports = UserAgentRotator;
