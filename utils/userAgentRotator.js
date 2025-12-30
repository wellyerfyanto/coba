const fs = require('fs');

class UserAgentRotator {
    constructor() {
        this.userAgents = {
            desktop: {
                windows: [],
                macos: [],
                linux: []
            },
            mobile: {
                android: [],
                ios: []
            },
            tablet: {
                android: [],
                ios: []
            }
        };
        this.loadUserAgents();
    }

    loadUserAgents(filePath = 'user-agents.txt') {
        try {
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8');
                const allAgents = data.split('\n')
                    .filter(line => line.trim() && !line.startsWith('#'))
                    .map(line => line.trim());
                
                if (allAgents.length > 0) {
                    this.categorizeUserAgents(allAgents);
                } else {
                    this.loadDefaultUserAgents();
                }
            } else {
                this.loadDefaultUserAgents();
                this.saveUserAgentsToFile(filePath);
            }
            
            this.printStats();
            return this.userAgents;
        } catch (error) {
            console.error('Error loading user agents:', error);
            this.loadDefaultUserAgents();
            return this.userAgents;
        }
    }

    categorizeUserAgents(userAgents) {
        userAgents.forEach(ua => {
            const category = this.categorizeUserAgent(ua);
            if (this.userAgents[category.deviceType] && this.userAgents[category.deviceType][category.platform]) {
                this.userAgents[category.deviceType][category.platform].push(ua);
            }
        });
    }

    categorizeUserAgent(userAgent) {
        let deviceType = 'desktop';
        let platform = 'windows';
        
        // Deteksi device type
        if (userAgent.includes('Mobile') && !userAgent.includes('Tablet')) {
            deviceType = 'mobile';
        } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
            deviceType = 'tablet';
        }
        
        // Deteksi platform
        if (userAgent.includes('Windows')) {
            platform = 'windows';
        } else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS X')) {
            platform = 'macos';
        } else if (userAgent.includes('Linux') && !userAgent.includes('Android')) {
            platform = 'linux';
        } else if (userAgent.includes('Android')) {
            platform = 'android';
        } else if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iOS')) {
            platform = 'ios';
        }
        
        return { deviceType, platform };
    }

    loadDefaultUserAgents() {
        this.userAgents = {
            desktop: {
                windows: [
                    // Chrome Windows
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
                    // Firefox Windows
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
                    // Edge Windows
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
                    // Opera Windows
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 OPR/107.0.0.0',
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
                    // Brave Windows
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Brave/121.0',
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Brave/120.0'
                ],
                macos: [
                    // Chrome macOS
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                    // Firefox macOS
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/115.0',
                    // Safari macOS
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
                    // Edge macOS
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
                ],
                linux: [
                    // Chrome Linux
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                    // Firefox Linux
                    'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
                    'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
                    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0'
                ]
            },
            mobile: {
                android: [
                    // Chrome Android
                    'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
                    'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
                    'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
                    'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36',
                    // Firefox Android
                    'Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0',
                    'Mozilla/5.0 (Android 13; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0',
                    // Samsung Browser
                    'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/21.0 Chrome/110.0.5481.154 Mobile Safari/537.36',
                    'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/20.0 Chrome/106.0.5249.126 Mobile Safari/537.36',
                    // Opera Mobile
                    'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36 OPR/73.0.3856.0',
                    // Brave Android
                    'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36 Brave/121.0',
                    'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36 Brave/120.0'
                ],
                ios: [
                    // Safari iPhone
                    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
                    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
                    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                    // Chrome iPhone
                    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/121.0.0.0 Mobile/15E148 Safari/604.1',
                    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1',
                    // Firefox iPhone
                    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/121.0 Mobile/15E148 Safari/605.1.15',
                    // Brave iPhone
                    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1 Brave/121.0'
                ]
            },
            tablet: {
                android: [
                    // Chrome Android Tablet
                    'Mozilla/5.0 (Linux; Android 13; SM-X810) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Mozilla/5.0 (Linux; Android 12; Lenovo TB-8705F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Safari/537.36',
                    'Mozilla/5.0 (Linux; Android 11; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.163 Safari/537.36',
                    // Firefox Android Tablet
                    'Mozilla/5.0 (Android 13; Tablet; rv:121.0) Gecko/121.0 Firefox/121.0',
                    // Samsung Tablet
                    'Mozilla/5.0 (Linux; Android 13; SM-X810) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/21.0 Chrome/110.0.5481.154 Safari/537.36'
                ],
                ios: [
                    // Safari iPad
                    'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
                    'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
                    'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                    // Chrome iPad
                    'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/121.0.0.0 Mobile/15E148 Safari/604.1',
                    // Firefox iPad
                    'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/121.0 Mobile/15E148 Safari/605.1.15'
                ]
            }
        };
    }

    saveUserAgentsToFile(filePath) {
        try {
            let content = '# Auto-generated user agents database\n# Generated on: ' + new Date().toISOString() + '\n\n';
            
            // Gabungkan semua user agents
            Object.keys(this.userAgents).forEach(deviceType => {
                content += `# ${deviceType.toUpperCase()}\n`;
                Object.keys(this.userAgents[deviceType]).forEach(platform => {
                    content += `## ${platform}\n`;
                    this.userAgents[deviceType][platform].forEach(ua => {
                        content += ua + '\n';
                    });
                    content += '\n';
                });
            });
            
            fs.writeFileSync(filePath, content);
            console.log(`💾 Saved ${this.getTotalCount()} user agents to ${filePath}`);
        } catch (error) {
            console.error('Error saving user agents:', error);
        }
    }

    printStats() {
        let total = 0;
        console.log('📊 User Agent Statistics:');
        
        Object.keys(this.userAgents).forEach(deviceType => {
            Object.keys(this.userAgents[deviceType]).forEach(platform => {
                const count = this.userAgents[deviceType][platform].length;
                total += count;
                console.log(`  ${deviceType.toUpperCase()} ${platform}: ${count} agents`);
            });
        });
        
        console.log(`  TOTAL: ${total} user agents loaded`);
    }

    getTotalCount() {
        let total = 0;
        Object.keys(this.userAgents).forEach(deviceType => {
            Object.keys(this.userAgents[deviceType]).forEach(platform => {
                total += this.userAgents[deviceType][platform].length;
            });
        });
        return total;
    }

    getUserAgentForSession(sessionIndex, deviceType = 'desktop', platform = 'windows') {
        let availableAgents = [];
        
        if (deviceType === 'random') {
            // Gabungkan semua device types
            Object.keys(this.userAgents).forEach(dt => {
                Object.keys(this.userAgents[dt]).forEach(p => {
                    availableAgents = availableAgents.concat(this.userAgents[dt][p]);
                });
            });
        } else if (platform === 'random') {
            // Gabungkan semua platforms untuk device type tertentu
            if (this.userAgents[deviceType]) {
                Object.keys(this.userAgents[deviceType]).forEach(p => {
                    availableAgents = availableAgents.concat(this.userAgents[deviceType][p]);
                });
            }
        } else {
            if (this.userAgents[deviceType] && this.userAgents[deviceType][platform]) {
                availableAgents = this.userAgents[deviceType][platform];
            }
        }
        
        if (availableAgents.length === 0) {
            // Fallback ke default
            return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
        }
        
        // Pilih user agent berdasarkan session index
        const uaIndex = sessionIndex % availableAgents.length;
        return availableAgents[uaIndex];
    }

    getRandomUserAgent() {
        const deviceTypes = Object.keys(this.userAgents);
        const randomDeviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
        
        const platforms = Object.keys(this.userAgents[randomDeviceType]);
        const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)];
        
        const agents = this.userAgents[randomDeviceType][randomPlatform];
        return agents[Math.floor(Math.random() * agents.length)];
    }

    getUserAgentInfo(userAgent) {
        const info = {
            browser: 'Unknown',
            version: 'Unknown',
            os: 'Unknown',
            platform: 'Unknown',
            device: 'Desktop',
            isMobile: false,
            isTablet: false
        };

        // Deteksi browser
        if (userAgent.includes('Chrome') && userAgent.includes('Safari')) {
            if (userAgent.includes('Edg')) {
                info.browser = 'Edge';
                const match = userAgent.match(/Edg\/(\d+\.\d+)/);
                if (match) info.version = match[1];
            } else if (userAgent.includes('OPR')) {
                info.browser = 'Opera';
                const match = userAgent.match(/OPR\/(\d+\.\d+)/);
                if (match) info.version = match[1];
            } else if (userAgent.includes('Brave')) {
                info.browser = 'Brave';
                const match = userAgent.match(/Brave\/(\d+\.\d+)/);
                if (match) info.version = match[1];
            } else if (userAgent.includes('CriOS')) {
                info.browser = 'Chrome iOS';
                const match = userAgent.match(/CriOS\/(\d+\.\d+)/);
                if (match) info.version = match[1];
            } else {
                info.browser = 'Chrome';
                const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
                if (match) info.version = match[1];
            }
        } else if (userAgent.includes('Firefox') || userAgent.includes('FxiOS')) {
            info.browser = 'Firefox';
            const match = userAgent.match(/Firefox\/(\d+\.\d+)/) || userAgent.match(/FxiOS\/(\d+\.\d+)/);
            if (match) info.version = match[1];
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            info.browser = 'Safari';
            const match = userAgent.match(/Version\/(\d+\.\d+)/);
            if (match) info.version = match[1];
        } else if (userAgent.includes('SamsungBrowser')) {
            info.browser = 'Samsung Browser';
            const match = userAgent.match(/SamsungBrowser\/(\d+\.\d+)/);
            if (match) info.version = match[1];
        }

        // Deteksi OS dan device
        if (userAgent.includes('Windows NT 10.0')) {
            info.os = 'Windows 10';
            info.platform = 'windows';
        } else if (userAgent.includes('Windows NT 11.0') || userAgent.includes('Windows NT 10.0; Win64; x64;')) {
            info.os = 'Windows 11';
            info.platform = 'windows';
        } else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS X')) {
            info.os = 'macOS';
            info.platform = 'macos';
        } else if (userAgent.includes('X11') || (userAgent.includes('Linux x86_64') && !userAgent.includes('Android'))) {
            info.os = 'Linux';
            info.platform = 'linux';
        } else if (userAgent.includes('Android')) {
            info.os = 'Android';
            info.platform = 'android';
            info.device = 'Mobile';
            info.isMobile = true;
        } else if (userAgent.includes('iPhone')) {
            info.os = 'iOS';
            info.platform = 'ios';
            info.device = 'Mobile';
            info.isMobile = true;
        } else if (userAgent.includes('iPad')) {
            info.os = 'iOS';
            info.platform = 'ios';
            info.device = 'Tablet';
            info.isTablet = true;
        }

        // Deteksi device type berdasarkan string
        if (userAgent.includes('Mobile') && !userAgent.includes('Tablet')) {
            info.device = 'Mobile';
            info.isMobile = true;
        } else if (userAgent.includes('Tablet')) {
            info.device = 'Tablet';
            info.isTablet = true;
        }

        return info;
    }

    // Helper untuk mendapatkan semua user agents berdasarkan kategori
    getAgentsByCategory(deviceType, platform) {
        return this.userAgents[deviceType]?.[platform] || [];
    }
}

module.exports = UserAgentRotator;
