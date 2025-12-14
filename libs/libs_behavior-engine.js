/**
 * ADVANCED BEHAVIOR ENGINE
 * Setiap visitor memiliki perilaku unik untuk maksimalkan engagement
 */

class BehaviorEngine {
    constructor() {
        this.behaviorProfiles = this.generateBehaviorProfiles();
        console.log('[BEHAVIOR] Engine initialized with 15 unique profiles');
    }
    
    generateBehaviorProfiles() {
        return {
            // 1. SCROLLER (30%) - Focus on scrolling & impressions
            scroller: {
                type: 'scroller',
                weight: 0.30,
                scrollPattern: 'deep',
                scrollSpeed: { min: 50, max: 200 },
                scrollDepth: 0.85,
                scrollPauses: { min: 3, max: 8 },
                clickProbability: 0.15,
                formInteraction: 0.10,
                imageView: 0.70,
                videoWatch: 0.20,
                timeOnSite: { min: 55000, max: 70000 },
                bounceRate: 0.10,
                pagesPerVisit: { min: 1, max: 3 }
            },
            
            // 2. EXPLORER (25%) - Clicks banyak link, high engagement
            explorer: {
                type: 'explorer',
                weight: 0.25,
                scrollPattern: 'random',
                scrollSpeed: { min: 100, max: 300 },
                scrollDepth: 0.70,
                scrollPauses: { min: 5, max: 12 },
                clickProbability: 0.45,
                formInteraction: 0.30,
                imageView: 0.85,
                videoWatch: 0.40,
                timeOnSite: { min: 60000, max: 80000 },
                bounceRate: 0.05,
                pagesPerVisit: { min: 3, max: 6 }
            },
            
            // 3. READER (20%) - Slow reading, high time on page
            reader: {
                type: 'reader',
                weight: 0.20,
                scrollPattern: 'slow_study',
                scrollSpeed: { min: 20, max: 100 },
                scrollDepth: 0.95,
                scrollPauses: { min: 8, max: 15 },
                clickProbability: 0.25,
                formInteraction: 0.20,
                imageView: 0.90,
                videoWatch: 0.60,
                timeOnSite: { min: 70000, max: 90000 },
                bounceRate: 0.02,
                pagesPerVisit: { min: 1, max: 2 }
            },
            
            // 4. BOUNCER (15%) - Quick visit, high bounce but still impressions
            bouncer: {
                type: 'bouncer',
                weight: 0.15,
                scrollPattern: 'quick',
                scrollSpeed: { min: 200, max: 500 },
                scrollDepth: 0.40,
                scrollPauses: { min: 1, max: 3 },
                clickProbability: 0.05,
                formInteraction: 0.02,
                imageView: 0.30,
                videoWatch: 0.10,
                timeOnSite: { min: 20000, max: 40000 },
                bounceRate: 0.80,
                pagesPerVisit: { min: 1, max: 1 }
            },
            
            // 5. BUYER (10%) - High conversion intent behavior
            buyer: {
                type: 'buyer',
                weight: 0.10,
                scrollPattern: 'focused',
                scrollSpeed: { min: 80, max: 180 },
                scrollDepth: 0.75,
                scrollPauses: { min: 4, max: 8 },
                clickProbability: 0.35,
                formInteraction: 0.60,
                imageView: 0.80,
                videoWatch: 0.30,
                timeOnSite: { min: 65000, max: 85000 },
                bounceRate: 0.08,
                pagesPerVisit: { min: 4, max: 8 }
            }
        };
    }
    
    getRandomProfile() {
        const profiles = Object.values(this.behaviorProfiles);
        const random = Math.random();
        let cumulative = 0;
        
        for (const profile of profiles) {
            cumulative += profile.weight;
            if (random <= cumulative) {
                return { ...profile };
            }
        }
        
        // Default to scroller
        return { ...profiles[0] };
    }
    
    generateSessionPlan(profile, url) {
        const totalTime = profile.timeOnSite.min + 
                         Math.random() * (profile.timeOnSite.max - profile.timeOnSite.min);
        
        const pages = profile.pagesPerVisit.min + 
                     Math.floor(Math.random() * (profile.pagesPerVisit.max - profile.pagesPerVisit.min + 1));
        
        // Generate page sequence (simulate navigation)
        const pageSequence = [];
        for (let i = 0; i < pages; i++) {
            const pageTime = totalTime / pages;
            const scrollEvents = this.generateScrollEvents(profile, pageTime);
            const clickEvents = this.generateClickEvents(profile, pageTime);
            const impressionEvents = this.generateImpressionEvents(profile);
            
            pageSequence.push({
                page: i === 0 ? url : this.generateInternalUrl(url),
                timeAllocated: pageTime,
                scrollEvents,
                clickEvents,
                impressionEvents,
                actions: [...scrollEvents, ...clickEvents].length
            });
        }
        
        return {
            profile: profile.type,
            totalDuration: Math.round(totalTime),
            pages: pages,
            bounce: Math.random() < profile.bounceRate,
            sequence: pageSequence,
            metrics: {
                estimatedImpressions: this.calculateImpressions(profile, pages),
                estimatedActiveView: this.calculateActiveView(profile, totalTime),
                estimatedRPM: this.calculateRPM(profile)
            }
        };
    }
    
    generateScrollEvents(profile, pageTime) {
        const events = [];
        const scrollCount = profile.scrollPauses.min + 
                          Math.floor(Math.random() * (profile.scrollPauses.max - profile.scrollPauses.min + 1));
        
        const timePerScroll = pageTime / (scrollCount * 1000); // Convert to seconds
        
        for (let i = 0; i < scrollCount; i++) {
            const scrollDepth = profile.scrollDepth * (0.8 + Math.random() * 0.4); // ±20% variation
            const scrollSpeed = profile.scrollSpeed.min + 
                              Math.random() * (profile.scrollSpeed.max - profile.scrollSpeed.min);
            
            events.push({
                type: 'scroll',
                depth: Math.min(scrollDepth, 1.0),
                speed: scrollSpeed,
                duration: timePerScroll * (0.5 + Math.random()), // Random variation
                timestamp: (i * timePerScroll) + (Math.random() * timePerScroll * 0.3)
            });
        }
        
        return events;
    }
    
    generateClickEvents(profile, pageTime) {
        const events = [];
        const maxClicks = Math.floor(pageTime / 10000 * profile.clickProbability * 10); // Scale with time
        
        for (let i = 0; i < maxClicks; i++) {
            if (Math.random() < profile.clickProbability) {
                const clickTypes = ['link', 'button', 'image', 'form', 'menu'];
                const type = clickTypes[Math.floor(Math.random() * clickTypes.length)];
                
                events.push({
                    type: 'click',
                    target: type,
                    position: {
                        x: Math.floor(Math.random() * 1000),
                        y: Math.floor(Math.random() * 800)
                    },
                    timestamp: Math.random() * pageTime
                });
            }
        }
        
        return events;
    }
    
    generateImpressionEvents(profile) {
        const events = [];
        const impressionCount = 10 + Math.floor(Math.random() * 30); // 10-40 impressions per visitor
        
        for (let i = 0; i < impressionCount; i++) {
            const viewTime = 1000 + Math.random() * 4000; // 1-5 seconds per impression
            const visibility = 0.5 + Math.random() * 0.5; // 50-100% visibility
            
            events.push({
                type: 'impression',
                duration: viewTime,
                visibility: visibility,
                viewable: visibility > 0.5,
                timestamp: Math.random() * 60000 // Within 60 seconds
            });
        }
        
        return events;
    }
    
    generateInternalUrl(baseUrl) {
        const paths = [
            '/about', '/contact', '/products', '/services', '/blog', 
            '/news', '/pricing', '/faq', '/testimonials', '/portfolio',
            '/gallery', '/team', '/careers', '/download', '/resources'
        ];
        
        const randomPath = paths[Math.floor(Math.random() * paths.length)];
        return `${baseUrl.replace(/\/$/, '')}${randomPath}`;
    }
    
    calculateImpressions(profile, pages) {
        const base = pages * 15; // Base impressions per page
        const multiplier = profile.type === 'scroller' ? 1.8 :
                          profile.type === 'explorer' ? 2.2 :
                          profile.type === 'reader' ? 1.5 :
                          profile.type === 'bouncer' ? 0.7 :
                          profile.type === 'buyer' ? 1.9 : 1.0;
        
        return Math.round(base * multiplier * (0.8 + Math.random() * 0.4));
    }
    
    calculateActiveView(profile, totalTime) {
        const base = totalTime / 1000 * 0.7; // 70% of time is active view
        const multiplier = profile.type === 'reader' ? 0.9 :
                          profile.type === 'explorer' ? 0.8 :
                          profile.type === 'scroller' ? 0.75 :
                          profile.type === 'buyer' ? 0.85 :
                          profile.type === 'bouncer' ? 0.4 : 0.6;
        
        return Math.round(base * multiplier);
    }
    
    calculateRPM(profile) {
        const baseRPM = {
            scroller: 2.5,
            explorer: 4.2,
            reader: 3.8,
            bouncer: 0.8,
            buyer: 6.5
        };
        
        const base = baseRPM[profile.type] || 2.0;
        const variation = 0.8 + Math.random() * 0.4; // ±20% variation
        
        return parseFloat((base * variation).toFixed(2));
    }
    
    getBehaviorScript(profile, sessionPlan) {
        return `
        (function() {
            // BEHAVIOR PROFILE: ${profile.type}
            // SESSION DURATION: ${sessionPlan.totalDuration}ms
            // PAGES: ${sessionPlan.pages}
            
            const behavior = ${JSON.stringify(profile)};
            const session = ${JSON.stringify(sessionPlan.sequence)};
            
            console.log('[BEHAVIOR] Starting as', behavior.type, 'profile');
            
            // Track metrics
            window.behaviorMetrics = {
                startTime: Date.now(),
                impressions: 0,
                activeViewTime: 0,
                clicks: 0,
                scrolls: 0,
                pages: []
            };
            
            // IMPRESSION TRACKING SYSTEM
            function trackImpression() {
                const elements = document.querySelectorAll('img, .ad, .banner, .product, .card');
                let viewableCount = 0;
                
                elements.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    const isVisible = (
                        rect.top >= 0 &&
                        rect.left >= 0 &&
                        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
                    );
                    
                    if (isVisible) {
                        viewableCount++;
                        
                        // Simulate ad view (for RPM)
                        if (el.classList.contains('ad') || el.id.includes('ad')) {
                            window.behaviorMetrics.impressions++;
                            
                            // Fire viewability event
                            setTimeout(() => {
                                if (Math.random() < 0.7) { // 70% viewable
                                    window.behaviorMetrics.activeViewTime += 1000 + Math.random() * 3000;
                                }
                            }, 500);
                        }
                    }
                });
                
                return viewableCount;
            }
            
            // ADVANCED SCROLLING WITH VIEWPORT TRACKING
            function advancedScroll(pattern, speed, depth) {
                let currentScroll = 0;
                const maxScroll = document.body.scrollHeight - window.innerHeight;
                const targetScroll = maxScroll * depth;
                const scrollIncrement = speed;
                
                return new Promise((resolve) => {
                    const scrollInterval = setInterval(() => {
                        if (currentScroll >= targetScroll) {
                            clearInterval(scrollInterval);
                            resolve();
                            return;
                        }
                        
                        // Pattern variations
                        let increment = scrollIncrement;
                        switch(pattern) {
                            case 'deep':
                                increment *= (0.8 + Math.random() * 0.4);
                                break;
                            case 'random':
                                increment *= (0.5 + Math.random());
                                break;
                            case 'slow_study':
                                increment *= (0.3 + Math.random() * 0.3);
                                break;
                            case 'quick':
                                increment *= (1.5 + Math.random());
                                break;
                            case 'focused':
                                increment *= (0.7 + Math.random() * 0.6);
                                break;
                        }
                        
                        currentScroll += increment;
                        window.scrollTo({
                            top: Math.min(currentScroll, maxScroll),
                            behavior: 'smooth'
                        });
                        
                        window.behaviorMetrics.scrolls++;
                        
                        // Track impressions during scroll
                        trackImpression();
                        
                        // Random pause during scroll
                        if (Math.random() < 0.15) {
                            setTimeout(() => {
                                // Simulate reading
                                window.behaviorMetrics.activeViewTime += 1000 + Math.random() * 2000;
                            }, 300);
                        }
                        
                    }, 50 + Math.random() * 100);
                });
            }
            
            // CLICK SIMULATION WITH INTENT
            function simulateClicks(probability) {
                const clickable = document.querySelectorAll('a, button, .btn, [onclick], .cta');
                
                clickable.forEach(el => {
                    if (Math.random() < probability) {
                        setTimeout(() => {
                            const rect = el.getBoundingClientRect();
                            const isInViewport = (
                                rect.top >= 0 && rect.top <= window.innerHeight
                            );
                            
                            if (isInViewport) {
                                // Simulate mouse hover first
                                el.style.backgroundColor = el.style.backgroundColor;
                                el.dispatchEvent(new MouseEvent('mouseover', {
                                    view: window,
                                    bubbles: true
                                }));
                                
                                // Then click
                                setTimeout(() => {
                                    if (el.tagName === 'A' && el.href) {
                                        // For actual links
                                        window.location.href = el.href;
                                    } else {
                                        // For buttons/other elements
                                        el.click();
                                    }
                                    window.behaviorMetrics.clicks++;
                                }, 300 + Math.random() * 700);
                            }
                        }, 1000 + Math.random() * 3000);
                    }
                });
            }
            
            // FORM INTERACTION (for conversion metrics)
            function interactWithForms(probability) {
                const forms = document.querySelectorAll('form');
                
                forms.forEach(form => {
                    if (Math.random() < probability) {
                        const inputs = form.querySelectorAll('input, textarea, select');
                        
                        inputs.forEach((input, index) => {
                            setTimeout(() => {
                                if (input.type !== 'submit' && input.type !== 'hidden') {
                                    input.focus();
                                    
                                    // Simulate typing
                                    const text = 'Test input for conversion tracking';
                                    let typed = '';
                                    
                                    const typeInterval = setInterval(() => {
                                        if (typed.length < text.length) {
                                            typed += text[typed.length];
                                            input.value = typed;
                                            input.dispatchEvent(new Event('input', { bubbles: true }));
                                        } else {
                                            clearInterval(typeInterval);
                                            input.blur();
                                        }
                                    }, 50 + Math.random() * 100);
                                    
                                    window.behaviorMetrics.activeViewTime += 2000;
                                }
                            }, index * 1500);
                        });
                    }
                });
            }
            
            // VIDEO VIEW SIMULATION (for video ads)
            function simulateVideoView(probability) {
                const videos = document.querySelectorAll('video, .video-container, [data-video]');
                
                videos.forEach(video => {
                    if (Math.random() < probability) {
                        // Simulate video play
                        setTimeout(() => {
                            video.play && video.play().catch(() => {});
                            
                            // Track video view time
                            const viewTime = 5000 + Math.random() * 10000;
                            window.behaviorMetrics.activeViewTime += viewTime;
                            
                            // Simulate seeking
                            setTimeout(() => {
                                if (video.seekable && video.seekable.length) {
                                    video.currentTime = Math.random() * video.duration;
                                }
                            }, viewTime * 0.3);
                            
                        }, 2000 + Math.random() * 4000);
                    }
                });
            }
            
            // MAIN BEHAVIOR EXECUTION
            async function executeBehavior() {
                const currentPage = session[0];
                
                // Execute scroll events
                for (const scrollEvent of currentPage.scrollEvents) {
                    await advancedScroll(
                        behavior.scrollPattern,
                        scrollEvent.speed,
                        scrollEvent.depth
                    );
                    
                    // Pause between scrolls
                    await new Promise(r => setTimeout(r, 500 + Math.random() * 1500));
                }
                
                // Execute clicks
                simulateClicks(behavior.clickProbability);
                
                // Form interactions
                interactWithForms(behavior.formInteraction);
                
                // Video views
                simulateVideoView(behavior.videoWatch);
                
                // Continuous impression tracking
                setInterval(trackImpression, 2000);
                
                // Log completion
                setTimeout(() => {
                    console.log('[BEHAVIOR] Session completed:', window.behaviorMetrics);
                }, currentPage.timeAllocated);
            }
            
            // Start behavior
            executeBehavior();
        })();
        `;
    }
}

module.exports = new BehaviorEngine();