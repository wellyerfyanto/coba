/**
 * ADVANCED HTTP SIMULATOR WITH BEHAVIOR TRACKING
 * For Railway deployment with advanced metrics
 */

const BaseHTTPSimulator = require('./traffic-simulator');

class AdvancedHTTPSimulator extends BaseHTTPSimulator {
    constructor() {
        super();
        this.behaviorEngine = require('./behavior-engine');
        console.log('[ADV HTTP] Advanced HTTP simulator loaded');
    }
    
    async simulateAdvancedVisit(url, proxy = null, profileType = 'auto') {
        const startTime = Date.now();
        const profile = profileType === 'auto' ? 
            this.behaviorEngine.getRandomProfile() : 
            this.behaviorEngine.behaviorProfiles[profileType];
        
        const sessionPlan = this.behaviorEngine.generateSessionPlan(profile, url);
        
        console.log(`[ADV HTTP] Profile: ${profile.type}, Duration: ${sessionPlan.totalDuration}ms`);
        
        const metrics = {
            profile: profile.type,
            startTime: new Date().toISOString(),
            requests: [],
            impressions: 0,
            activeView: 0,
            pages: sessionPlan.pages,
            estimatedRPM: sessionPlan.metrics.estimatedRPM
        };
        
        // Main page request
        const mainResult = await this.makeAdvancedRequest(url, proxy, 'pageview');
        metrics.requests.push(mainResult);
        
        // Calculate impressions from main page
        metrics.impressions += this.calculateImpressions(profile, mainResult.size || 0);
        
        // Simulate active view time
        const activeViewTime = sessionPlan.metrics.estimatedActiveView * 1000;
        metrics.activeView = activeViewTime;
        
        // Simulate additional resource requests (like scrolling loads more content)
        if (profile.type !== 'bouncer') {
            await this.simulateResourceRequests(url, proxy, profile, metrics);
        }
        
        // Simulate internal navigation for non-bouncers
        if (sessionPlan.pages > 1 && !sessionPlan.bounce) {
            await this.simulateInternalNavigation(url, proxy, profile, sessionPlan.pages, metrics);
        }
        
        // Simulate AJAX calls (dynamic content loading)
        if (profile.type === 'explorer' || profile.type === 'buyer') {
            await this.simulateAJAXCalls(url, proxy, metrics);
        }
        
        // Calculate final metrics
        metrics.duration = Date.now() - startTime;
        metrics.success = metrics.requests.filter(r => r.success).length > 0;
        metrics.engagementScore = this.calculateHTTPEngagement(metrics, profile);
        
        // Simulate conversion events (for RPM)
        if (Math.random() < 0.1) { // 10% conversion rate
            metrics.conversion = true;
            metrics.conversionValue = 5 + Math.random() * 95; // $5-$100 value
        }
        
        console.log(`[ADV HTTP] Visit completed:`);
        console.log(`  - Impressions: ${metrics.impressions}`);
        console.log(`  - Active View: ${Math.round(metrics.activeView/1000)}s`);
        console.log(`  - Engagement: ${metrics.engagementScore}/100`);
        console.log(`  - Estimated RPM: $${metrics.estimatedRPM}`);
        
        return {
            success: true,
            metrics: metrics,
            behavior: profile.type
        };
    }
    
    async makeAdvancedRequest(url, proxy, requestType = 'document') {
        const result = await this.makeRequest(url, proxy);
        
        // Enhance with additional metrics based on request type
        switch(requestType) {
            case 'pageview':
                result.impressions = Math.floor(10 + Math.random() * 30);
                result.activeView = 3000 + Math.random() * 7000;
                break;
                
            case 'resource':
                result.impressions = Math.floor(5 + Math.random() * 15);
                result.activeView = 1000 + Math.random() * 3000;
                break;
                
            case 'ajax':
                result.impressions = Math.floor(3 + Math.random() * 8);
                result.activeView = 500 + Math.random() * 1500;
                break;
        }
        
        return result;
    }
    
    calculateImpressions(profile, contentSize) {
        const base = contentSize / 1024; // Rough estimate based on KB
        const multiplier = {
            scroller: 1.8,
            explorer: 2.2,
            reader: 1.5,
            bouncer: 0.7,
            buyer: 1.9
        }[profile.type] || 1.0;
        
        return Math.floor(base * multiplier * 0.1); // Scale down
    }
    
    async simulateResourceRequests(baseUrl, proxy, profile, metrics) {
        const resourceTypes = [
            '/style.css', '/main.js', '/app.js', 
            '/image.jpg', '/banner.png', '/ad.jpg',
            '/widget.js', '/tracking.js', '/analytics.js'
        ];
        
        // More resources for high-engagement profiles
        const resourceCount = {
            scroller: 5,
            explorer: 8,
            reader: 6,
            bouncer: 2,
            buyer: 7
        }[profile.type] || 4;
        
        for (let i = 0; i < resourceCount; i++) {
            if (Math.random() < 0.7) { // 70% chance per resource
                const resource = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
                const resourceUrl = this.resolveUrl(baseUrl, resource);
                
                // Delay between resource requests (simulates page load timing)
                await this.delay(200 + Math.random() * 800);
                
                const result = await this.makeAdvancedRequest(resourceUrl, proxy, 'resource');
                metrics.requests.push(result);
                
                // Add to impressions and active view
                metrics.impressions += result.impressions || 0;
                metrics.activeView += result.activeView || 0;
            }
        }
    }
    
    async simulateInternalNavigation(baseUrl, proxy, profile, pageCount, metrics) {
        const internalPages = this.generateInternalPages(baseUrl, pageCount - 1);
        
        for (const page of internalPages) {
            // Delay between page views (simulates user reading)
            const pageDelay = 3000 + Math.random() * 7000;
            await this.delay(pageDelay);
            
            const result = await this.makeAdvancedRequest(page, proxy, 'pageview');
            metrics.requests.push(result);
            
            metrics.impressions += result.impressions || 0;
            metrics.activeView += result.activeView || 0;
            
            // Random chance to go back to previous page
            if (Math.random() < 0.2) {
                await this.delay(1000 + Math.random() * 3000);
                // Simulate back navigation by requesting previous page again
                const backResult = await this.makeAdvancedRequest(baseUrl, proxy, 'ajax');
                metrics.requests.push(backResult);
            }
        }
    }
    
    async simulateAJAXCalls(baseUrl, proxy, metrics) {
        const ajaxEndpoints = [
            '/api/products', '/api/recommendations', '/api/related',
            '/load-more', '/infinite-scroll', '/live-update',
            '/chat/status', '/notifications', '/user/profile'
        ];
        
        const ajaxCount = 3 + Math.floor(Math.random() * 5);
        
        for (let i = 0; i < ajaxCount; i++) {
            // Random delay between AJAX calls
            await this.delay(1000 + Math.random() * 4000);
            
            const endpoint = ajaxEndpoints[Math.floor(Math.random() * ajaxEndpoints.length)];
            const ajaxUrl = this.resolveUrl(baseUrl, endpoint);
            
            const result = await this.makeAdvancedRequest(ajaxUrl, proxy, 'ajax');
            metrics.requests.push(result);
            
            metrics.impressions += Math.floor(1 + Math.random() * 4);
            metrics.activeView += 500 + Math.random() * 1500;
        }
    }
    
    generateInternalPages(baseUrl, count) {
        const pages = [];
        const pathTemplates = [
            '/product/{id}', '/article/{id}', '/category/{id}',
            '/page/{id}', '/item/{id}', '/post/{id}'
        ];
        
        for (let i = 0; i < count; i++) {
            const template = pathTemplates[Math.floor(Math.random() * pathTemplates.length)];
            const pageId = Math.floor(100 + Math.random() * 900);
            const path = template.replace('{id}', pageId);
            pages.push(baseUrl.replace(/\/$/, '') + path);
        }
        
        return pages;
    }
    
    resolveUrl(baseUrl, path) {
        try {
            const url = new URL(baseUrl);
            url.pathname = path;
            return url.toString();
        } catch (error) {
            return baseUrl.replace(/\/$/, '') + path;
        }
    }
    
    calculateHTTPEngagement(metrics, profile) {
        let score = 0;
        
        // Duration score (max 30)
        score += Math.min(30, metrics.duration / 2000);
        
        // Impressions score (max 25)
        score += Math.min(25, metrics.impressions * 0.3);
        
        // Active view score (max 25)
        score += Math.min(25, metrics.activeView / 40000);
        
        // Pages score (max 15)
        score += Math.min(15, metrics.pages * 3);
        
        // Requests score (max 5)
        score += Math.min(5, metrics.requests.length * 0.5);
        
        // Profile multiplier
        const multiplier = {
            scroller: 1.1,
            explorer: 1.3,
            reader: 1.2,
            bouncer: 0.6,
            buyer: 1.4
        }[profile.type] || 1.0;
        
        return Math.min(100, Math.round(score * multiplier));
    }
}

module.exports = AdvancedHTTPSimulator;
