/**
 * ADVANCED CHROME BOT WITH BEHAVIOR ENGINE
 * Extends ChromeBot with advanced behavior simulation
 */

const BaseChromeBot = require('./chrome-bot');

class AdvancedChromeBot extends BaseChromeBot {
    constructor() {
        super();
        
        // Try to load behavior engine
        try {
            this.behaviorEngine = require('./behavior-engine');
            console.log('[ADV BOT] Advanced behavior engine loaded');
        } catch (error) {
            console.log('[ADV BOT] Behavior engine not available:', error.message);
            this.behaviorEngine = null;
        }
    }
    
    async visitWithBehavior(driver, url, profileType = 'auto') {
        try {
            console.log(`[ADV BOT] Starting advanced visit to: ${url}`);
            
            // Check if behavior engine is available
            if (!this.behaviorEngine) {
                console.log('[ADV BOT] Behavior engine not available, using basic visit');
                return await this.visitDirect(driver, url);
            }
            
            // Get or generate behavior profile
            const profile = profileType === 'auto' ? 
                this.behaviorEngine.getRandomProfile() : 
                this.behaviorEngine.behaviorProfiles[profileType];
            
            if (!profile) {
                console.log(`[ADV BOT] Profile ${profileType} not found, using auto`);
                return await this.visitDirect(driver, url);
            }
            
            // Generate session plan
            const sessionPlan = this.behaviorEngine.generateSessionPlan(profile, url);
            
            console.log(`[ADV BOT] Profile: ${profile.type}`);
            console.log(`[ADV BOT] Duration: ${Math.round(sessionPlan.totalDuration/1000)}s`);
            console.log(`[ADV BOT] Pages: ${sessionPlan.pages}`);
            
            // Navigate to URL
            await driver.get(url);
            await this.delay(3000 + Math.random() * 2000);
            
            // Inject behavior tracking
            await driver.executeScript(`
                window.__botMetrics = {
                    startTime: Date.now(),
                    impressions: [],
                    clicks: [],
                    scrolls: [],
                    activeView: 0,
                    pageViews: 1
                };
                
                // Enhanced impression tracking
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const adId = entry.target.id || entry.target.className;
                            if (!window.__botMetrics.impressions.includes(adId)) {
                                window.__botMetrics.impressions.push({
                                    id: adId,
                                    timestamp: Date.now(),
                                    duration: 0,
                                    viewable: true
                                });
                                
                                // Start duration tracking
                                const startTime = Date.now();
                                const interval = setInterval(() => {
                                    const impression = window.__botMetrics.impressions.find(i => i.id === adId);
                                    if (impression && entry.isIntersecting) {
                                        impression.duration = Date.now() - startTime;
                                        window.__botMetrics.activeView += 100;
                                    } else {
                                        clearInterval(interval);
                                    }
                                }, 100);
                            }
                        }
                    });
                }, { threshold: 0.5 });
                
                // Observe all potential ad elements
                document.querySelectorAll('.ad, [id*="ad"], .banner, .ads, .advertisement').forEach(el => {
                    observer.observe(el);
                });
            `);
            
            // Execute behavior script
            const behaviorScript = this.behaviorEngine.getBehaviorScript(profile, sessionPlan);
            await driver.executeScript(behaviorScript);
            
            // Simulate multi-page navigation
            if (sessionPlan.pages > 1 && !sessionPlan.bounce) {
                for (let i = 1; i < sessionPlan.pages; i++) {
                    const page = sessionPlan.sequence[i];
                    const pageTime = page.timeAllocated * 0.7; // 70% of allocated time
                    
                    // Navigate to internal page
                    await driver.get(page.page);
                    await this.delay(2000 + Math.random() * 2000);
                    
                    // Update page view count
                    await driver.executeScript(`
                        window.__botMetrics.pageViews++;
                    `);
                    
                    // Execute page-specific behavior
                    await this.simulatePageBehavior(driver, profile, pageTime);
                    
                    // Random chance to go back
                    if (Math.random() < 0.3 && i > 1) {
                        await driver.navigate().back();
                        await this.delay(2000 + Math.random() * 3000);
                    }
                }
            }
            
            // Collect final metrics
            const finalMetrics = await driver.executeScript(`
                return {
                    duration: Date.now() - window.__botMetrics.startTime,
                    impressions: window.__botMetrics.impressions.length,
                    clicks: window.__botMetrics.clicks.length,
                    scrolls: window.__botMetrics.scrolls,
                    activeView: window.__botMetrics.activeView,
                    pageViews: window.__botMetrics.pageViews,
                    estimatedRPM: ${sessionPlan.metrics.estimatedRPM}
                };
            `);
            
            // Add profile data
            finalMetrics.profile = profile.type;
            finalMetrics.behaviorPlan = {
                pages: sessionPlan.pages,
                totalTime: sessionPlan.totalDuration,
                bounce: sessionPlan.bounce
            };
            
            // Calculate engagement score (0-100)
            finalMetrics.engagementScore = this.calculateEngagementScore(finalMetrics);
            
            console.log(`[ADV BOT] Visit completed with score: ${finalMetrics.engagementScore}`);
            console.log(`[ADV BOT] Impressions: ${finalMetrics.impressions}`);
            console.log(`[ADV BOT] Active View: ${Math.round(finalMetrics.activeView/1000)}s`);
            
            return {
                success: true,
                metrics: finalMetrics,
                behavior: profile.type
            };
            
        } catch (error) {
            console.error(`[ADV BOT] Behavior visit failed:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async simulatePageBehavior(driver, profile, pageTime) {
        // Generate random scroll pattern for this page
        const scrollDepth = profile.scrollDepth * (0.7 + Math.random() * 0.6);
        const scrollSpeed = profile.scrollSpeed.min + 
                          Math.random() * (profile.scrollSpeed.max - profile.scrollSpeed.min);
        
        // Scroll simulation
        await driver.executeScript(`
            (function() {
                const depth = ${scrollDepth};
                const speed = ${scrollSpeed};
                const maxScroll = document.body.scrollHeight - window.innerHeight;
                const targetScroll = maxScroll * depth;
                let current = 0;
                
                const scrollInterval = setInterval(() => {
                    if (current >= targetScroll) {
                        clearInterval(scrollInterval);
                        return;
                    }
                    
                    current += speed * (0.5 + Math.random());
                    window.scrollTo({
                        top: Math.min(current, maxScroll),
                        behavior: 'smooth'
                    });
                    
                    window.__botMetrics.scrolls++;
                    
                    // Random pauses
                    if (Math.random() < 0.1) {
                        setTimeout(() => {
                            // Simulate reading/viewing
                            window.__botMetrics.activeView += 500 + Math.random() * 1500;
                        }, 300);
                    }
                }, 50 + Math.random() * 150);
            })();
        `);
        
        // Wait for scroll to complete
        const scrollDuration = (scrollDepth * 10000) / scrollSpeed;
        await this.delay(Math.min(scrollDuration, pageTime * 0.6));
        
        // Random clicks
        if (Math.random() < profile.clickProbability) {
            await this.simulateRandomClicks(driver, profile.clickProbability * 3);
        }
        
        // Form interaction
        if (Math.random() < profile.formInteraction) {
            await this.interactWithForms(driver);
        }
    }
    
    async simulateRandomClicks(driver, probability) {
        const clickable = await driver.findElements(this.by.css('a, button, .btn, [onclick]'));
        
        for (const element of clickable) {
            if (Math.random() < probability) {
                try {
                    // Check if element is in viewport
                    const isDisplayed = await element.isDisplayed();
                    if (isDisplayed) {
                        // Simulate hover
                        await driver.actions()
                            .move({origin: element})
                            .pause(300 + Math.random() * 700)
                            .perform();
                        
                        // Click
                        await element.click();
                        
                        // Track click
                        await driver.executeScript(`
                            window.__botMetrics.clicks.push({
                                timestamp: Date.now(),
                                element: '${element.constructor.name}'
                            });
                        `);
                        
                        await this.delay(1000 + Math.random() * 2000);
                        
                        // 30% chance to go back
                        if (Math.random() < 0.3) {
                            await driver.navigate().back();
                            await this.delay(2000 + Math.random() * 3000);
                        }
                        
                        break; // One click per iteration
                    }
                } catch (error) {
                    // Ignore click errors
                }
            }
        }
    }
    
    async interactWithForms(driver) {
        const forms = await driver.findElements(this.by.css('form'));
        
        for (const form of forms) {
            try {
                const inputs = await form.findElements(this.by.css('input, textarea, select'));
                
                for (let i = 0; i < Math.min(inputs.length, 3); i++) {
                    const input = inputs[i];
                    
                    // Focus
                    await input.click();
                    await this.delay(300 + Math.random() * 700);
                    
                    // Type text
                    const text = this.generateRandomText();
                    await input.sendKeys(text);
                    await this.delay(500 + Math.random() * 1000);
                    
                    // Clear or leave
                    if (Math.random() < 0.3) {
                        await input.clear();
                    }
                    
                    await this.delay(300 + Math.random() * 700);
                }
                
                // Track form interaction
                await driver.executeScript(`
                    window.__botMetrics.activeView += ${inputs.length * 2000};
                `);
                
            } catch (error) {
                // Ignore form errors
            }
        }
    }
    
    generateRandomText() {
        const texts = [
            'Testing form functionality',
            'Sample input for analytics',
            'User engagement simulation',
            'Conversion tracking test',
            'Behavior analysis input'
        ];
        return texts[Math.floor(Math.random() * texts.length)];
    }
    
    calculateEngagementScore(metrics) {
        let score = 0;
        
        // Time based (max 30 points)
        score += Math.min(30, metrics.duration / 1000);
        
        // Impressions based (max 25 points)
        score += Math.min(25, metrics.impressions * 0.5);
        
        // Active view based (max 25 points)
        score += Math.min(25, metrics.activeView / 10000);
        
        // Page views based (max 15 points)
        score += Math.min(15, metrics.pageViews * 3);
        
        // Clicks based (max 5 points)
        score += Math.min(5, metrics.clicks * 2);
        
        return Math.min(100, Math.round(score));
    }
    
    async visitViaGoogleWithBehavior(driver, url, keywords, proxy = null, profileType = 'auto') {
        try {
            console.log(`[ADV GOOGLE] Searching "${keywords}" for ${url}`);
            
            // Navigate to Google
            await driver.get('https://www.google.com');
            await this.delay(3000 + Math.random() * 2000);
            
            // Search for keywords
            const searchBox = await driver.findElement(this.by.name('q'));
            await searchBox.sendKeys(keywords);
            await this.delay(1000 + Math.random() * 1000);
            await searchBox.sendKeys(this.key.ENTER);
            
            await this.delay(4000 + Math.random() * 3000);
            
            // Find the target URL in search results
            const links = await driver.findElements(this.by.css('div.g a'));
            let targetLink = null;
            
            for (const link of links) {
                try {
                    const href = await link.getAttribute('href');
                    if (href && href.includes(url)) {
                        targetLink = link;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            if (targetLink) {
                // Click the target link
                await targetLink.click();
                await this.delay(4000 + Math.random() * 3000);
                
                // Execute advanced behavior on the target page
                return await this.visitWithBehavior(driver, url, profileType);
            } else {
                // If URL not found, go directly
                console.log(`[ADV GOOGLE] URL not found in results, going directly`);
                await driver.get(url);
                return await this.visitWithBehavior(driver, url, profileType);
            }
            
        } catch (error) {
            console.error(`[ADV GOOGLE] Error:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = AdvancedChromeBot;