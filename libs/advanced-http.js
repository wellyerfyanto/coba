/**
 * ADVANCED HTTP SIMULATOR WITH BEHAVIOR TRACKING
 * For Railway deployment with advanced metrics
 * FIXED VERSION: Fixed inheritance and method binding issues
 */

const BaseHTTPSimulator = require('./traffic-simulator');

class AdvancedHTTPSimulator extends BaseHTTPSimulator {
    constructor() {
        super(); // CRITICAL FIX: Must call parent constructor first
        
        // Load behavior engine after calling super()
        try {
            this.behaviorEngine = require('./behavior-engine');
            console.log('[ADV HTTP] Behavior engine loaded');
        } catch (error) {
            console.log('[ADV HTTP] Behavior engine not available:', error.message);
            this.behaviorEngine = null;
        }
        
        // Bind methods to ensure correct 'this' context
        this.makeAdvancedRequest = this.makeAdvancedRequest.bind(this);
        this.simulateAdvancedVisit = this.simulateAdvancedVisit.bind(this);
        this.simulateGoogleSearchAdvanced = this.simulateGoogleSearchAdvanced.bind(this);
        
        console.log('[ADV HTTP] Advanced HTTP simulator initialized');
    }
    
    // FIXED: Use super.makeRequest() instead of this.makeRequest()
    async makeAdvancedRequest(url, proxy, requestType = 'document') {
        try {
            // CRITICAL FIX: Call parent method using super
            const result = await super.makeRequest(url, proxy);
            
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
            
        } catch (error) {
            console.error(`[ADV HTTP] makeAdvancedRequest failed for ${url}:`, error.message);
            return {
                success: false,
                error: error.message,
                impressions: 0,
                activeView: 0
            };
        }
    }
    
    async simulateAdvancedVisit(url, proxy = null, profileType = 'auto') {
        const startTime = Date.now();
        const visitId = `adv_${Math.random().toString(36).substr(2, 6)}`;
        
        console.log(`[${visitId}] Starting advanced visit to: ${url}`);
        
        // Check if behavior engine is available
        if (!this.behaviorEngine) {
            console.log(`[${visitId}] Behavior engine not available, using basic visit`);
            const basicResult = await super.makeRequest(url, proxy);
            return {
                success: basicResult.success,
                metrics: {
                    duration: Date.now() - startTime,
                    profile: 'basic_fallback',
                    requests: [basicResult]
                }
            };
        }
        
        // Get behavior profile
        const profile = profileType === 'auto' ? 
            this.behaviorEngine.getRandomProfile() : 
            this.behaviorEngine.behaviorProfiles[profileType];
        
        if (!profile) {
            console.log(`[${visitId}] Profile ${profileType} not found, using auto`);
            return await this.simulateAdvancedVisit(url, proxy, 'auto');
        }
        
        const sessionPlan = this.behaviorEngine.generateSessionPlan(profile, url);
        
        console.log(`[${visitId}] Profile: ${profile.type}, Duration: ${sessionPlan.totalDuration}ms, Pages: ${sessionPlan.pages}`);
        
        const metrics = {
            profile: profile.type,
            startTime: new Date().toISOString(),
            visitId: visitId,
            requests: [],
            impressions: 0,
            activeView: 0,
            pages: sessionPlan.pages,
            estimatedRPM: sessionPlan.metrics.estimatedRPM,
            engagementScore: 0
        };
        
        try {
            // 1. Main page request
            const mainResult = await this.makeAdvancedRequest(url, proxy, 'pageview');
            metrics.requests.push(mainResult);
            
            if (!mainResult.success) {
                console.log(`[${visitId}] Main page request failed, aborting advanced simulation`);
                metrics.duration = Date.now() - startTime;
                return {
                    success: false,
                    error: 'Main page request failed',
                    metrics: metrics
                };
            }
            
            // Calculate initial impressions
            metrics.impressions += this.calculateImpressions(profile, mainResult.size || 0);
            
            // Simulate active view time (based on profile)
            const baseViewTime = profile.timeOnSite.min + 
                               Math.random() * (profile.timeOnSite.max - profile.timeOnSite.min);
            metrics.activeView = baseViewTime * 0.7; // 70% as active view
            
            // 2. Simulate resource requests (CSS, JS, images)
            if (profile.type !== 'bouncer') {
                await this.simulateResourceRequests(url, proxy, profile, metrics);
            }
            
            // 3. Simulate internal navigation for non-bouncers
            if (sessionPlan.pages > 1 && !sessionPlan.bounce) {
                await this.simulateInternalNavigation(url, proxy, profile, sessionPlan.pages, metrics);
            }
            
            // 4. Simulate AJAX calls for high-engagement profiles
            if (profile.type === 'explorer' || profile.type === 'buyer') {
                await this.simulateAJAXCalls(url, proxy, metrics);
            }
            
            // Calculate final metrics
            metrics.duration = Date.now() - startTime;
            metrics.success = metrics.requests.filter(r => r.success).length > 0;
            metrics.engagementScore = this.calculateHTTPEngagement(metrics, profile);
            
            // Simulate conversion events (for RPM)
            if (Math.random() < profile.clickProbability * 0.5) {
                metrics.conversion = true;
                metrics.conversionValue = 5 + Math.random() * 95; // $5-$100 value
            }
            
            console.log(`[${visitId}] Advanced visit completed:`);
            console.log(`  - Success: ${metrics.success}`);
            console.log(`  - Impressions: ${metrics.impressions}`);
            console.log(`  - Active View: ${Math.round(metrics.activeView/1000)}s`);
            console.log(`  - Engagement: ${metrics.engagementScore}/100`);
            console.log(`  - Estimated RPM: $${metrics.estimatedRPM}`);
            
            return {
                success: true,
                metrics: metrics,
                behavior: profile.type
            };
            
        } catch (error) {
            console.error(`[${visitId}] Advanced visit failed:`, error.message);
            metrics.duration = Date.now() - startTime;
            metrics.error = error.message;
            
            return {
                success: false,
                error: error.message,
                metrics: metrics
            };
        }
    }
    
    // NEW: Added missing method that's called from index.js
    async simulateGoogleSearchAdvanced(url, keywords, proxy = null, profileType = 'auto') {
        const searchId = `google_${Math.random().toString(36).substr(2, 6)}`;
        console.log(`[${searchId}] Advanced Google search for "${keywords}"`);
        
        const startTime = Date.now();
        const metrics = {
            method: 'google',
            startTime: new Date().toISOString(),
            searchId: searchId,
            requests: [],
            keywords: keywords,
            profile: profileType,
            steps: []
        };
        
        try {
            // Step 1: Simulate Google search
            const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(keywords)}`;
            const searchResult = await this.makeAdvancedRequest(googleUrl, proxy, 'pageview');
            metrics.requests.push(searchResult);
            metrics.steps.push('google_search');
            
            // Simulate user reading search results
            await this.delay(2000 + Math.random() * 3000);
            
            // Step 2: Visit target URL with advanced behavior
            const visitResult = await this.simulateAdvancedVisit(url, proxy, profileType);
            
            // Combine metrics
            metrics.duration = Date.now() - startTime;
            metrics.finalVisit = visitResult;
            
            if (visitResult.metrics) {
                metrics.impressions = visitResult.metrics.impressions || 0;
                metrics.activeView = visitResult.metrics.activeView || 0;
                metrics.engagementScore = visitResult.metrics.engagementScore || 0;
            }
            
            return {
                success: visitResult.success,
                metrics: metrics,
                behavior: visitResult.behavior || profileType,
                method: 'google'
            };
            
        } catch (error) {
            console.error(`[${searchId}] Google search failed:`, error.message);
            metrics.duration = Date.now() - startTime;
            metrics.error = error.message;
            
            // Fallback: direct visit
            console.log(`[${searchId}] Falling back to direct visit`);
            return await this.simulateAdvancedVisit(url, proxy, profileType);
        }
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
            scroller: 3,
            explorer: 5,
            reader: 4,
            bouncer: 1,
            buyer: 4
        }[profile.type] || 3;
        
        console.log(`[${metrics.visitId}] Simulating ${resourceCount} resource requests`);
        
        for (let i = 0; i < resourceCount; i++) {
            if (Math.random() < 0.7) { // 70% chance per resource
                const resource = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
                const resourceUrl = this.resolveUrl(baseUrl, resource);
                
                // Delay between resource requests (simulates page load timing)
                await this.delay(100 + Math.random() * 500);
                
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
        
        console.log(`[${metrics.visitId}] Simulating ${internalPages.length} internal page visits`);
        
        for (const page of internalPages) {
            // Delay between page views (simulates user reading)
            const pageDelay = 2000 + Math.random() * 4000;
            await this.delay(pageDelay);
            
            const result = await this.makeAdvancedRequest(page, proxy, 'pageview');
            metrics.requests.push(result);
            
            metrics.impressions += result.impressions || 0;
            metrics.activeView += result.activeView || 0;
            
            // Random chance to go back to previous page
            if (Math.random() < 0.2) {
                await this.delay(800 + Math.random() * 2000);
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
        
        const ajaxCount = 2 + Math.floor(Math.random() * 3);
        
        console.log(`[${metrics.visitId}] Simulating ${ajaxCount} AJAX calls`);
        
        for (let i = 0; i < ajaxCount; i++) {
            // Random delay between AJAX calls
            await this.delay(800 + Math.random() * 2000);
            
            const endpoint = ajaxEndpoints[Math.floor(Math.random() * ajaxEndpoints.length)];
            const ajaxUrl = this.resolveUrl(baseUrl, endpoint);
            
            const result = await this.makeAdvancedRequest(ajaxUrl, proxy, 'ajax');
            metrics.requests.push(result);
            
            metrics.impressions += Math.floor(1 + Math.random() * 4);
            metrics.activeView += 300 + Math.random() * 1200;
        }
    }
    
    generateInternalPages(baseUrl, count) {
        const pages = [];
        const pathTemplates = [
            '/product/{id}', '/article/{id}', '/category/{id}',
            '/page/{id}', '/item/{id}', '/post/{id}',
            '/about', '/contact', '/services', '/blog'
        ];
        
        for (let i = 0; i < count; i++) {
            const template = pathTemplates[Math.floor(Math.random() * pathTemplates.length)];
            
            if (template.includes('{id}')) {
                const pageId = Math.floor(100 + Math.random() * 900);
                const path = template.replace('{id}', pageId);
                pages.push(baseUrl.replace(/\/$/, '') + path);
            } else {
                pages.push(baseUrl.replace(/\/$/, '') + template);
            }
        }
        
        return pages;
    }
    
    resolveUrl(baseUrl, path) {
        try {
            // Try to create proper URL object
            const url = new URL(baseUrl);
            
            // Handle relative paths
            if (path.startsWith('/')) {
                url.pathname = path;
            } else {
                url.pathname = '/' + path;
            }
            
            return url.toString();
        } catch (error) {
            // Fallback: simple string concatenation
            if (path.startsWith('/')) {
                return baseUrl.replace(/\/$/, '') + path;
            } else {
                return baseUrl.replace(/\/$/, '') + '/' + path;
            }
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
    
    // Helper method for delays (already in parent, but defined here for safety)
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = AdvancedHTTPSimulator;
