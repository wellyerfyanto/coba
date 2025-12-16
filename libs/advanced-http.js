/**
 * ADVANCED HTTP SIMULATOR - FIXED VERSION
 * Uses TrafficSimulator methods, NOT makeRequest
 */

const TrafficSimulator = require('./traffic-simulator');

class AdvancedHTTPSimulator extends TrafficSimulator {
    constructor() {
        super();
        console.log('[ADV HTTP] Advanced simulator initialized');
        
        // Try to load behavior engine
        try {
            this.behaviorEngine = require('./behavior-engine');
            console.log('[ADV HTTP] Behavior engine loaded');
        } catch (error) {
            console.log('[ADV HTTP] Behavior engine not available:', error.message);
            this.behaviorEngine = null;
        }
    }
    
    async simulateAdvancedVisit(url, proxy = null, profileType = 'auto') {
        console.log(`[ADV HTTP] Advanced visit to ${url}, profile: ${profileType}`);
        
        // Gunakan method simulateVisit dari parent class (TrafficSimulator)
        const visitResult = await this.simulateVisit(url, proxy);
        
        // Tambahkan metrik advanced (simulasi)
        const metrics = {
            impressions: Math.floor(Math.random() * 20) + 10, // 10-30 impressions
            activeView: Math.floor(Math.random() * 10000) + 5000, // 5-15 detik
            engagementScore: Math.floor(Math.random() * 30) + 60 // 60-90 score
        };
        
        return {
            success: visitResult.success,
            advanced: true,
            metrics: metrics,
            behavior: profileType
        };
    }
    
    async simulateGoogleSearchAdvanced(url, keywords, proxy = null, profileType = 'auto') {
        console.log(`[ADV HTTP] Google search for "${keywords}" -> ${url}`);
        
        // 1. "Search" di Google dulu
        const searchResult = await this.simulateVisit(
            `https://www.google.com/search?q=${encodeURIComponent(keywords)}`,
            proxy
        );
        
        // Tunggu sebentar (simulasi user membaca hasil)
        await this.delay(2000);
        
        // 2. Kunjungi target URL
        return this.simulateAdvancedVisit(url, proxy, profileType);
    }
}

module.exports = AdvancedHTTPSimulator;
