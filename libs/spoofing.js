/**
 * Stealth and anti-detection scripts
 */

module.exports = function() {
    console.log("[SPOOFING]: Injecting stealth scripts...");
    
    return `
    (function() {
        // Remove webdriver flag
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
            enumerable: true,
            configurable: true
        });
        
        // Delete webdriver prototype
        try {
            delete Object.getPrototypeOf(navigator).webdriver;
        } catch(e) {}
        
        // Overwrite permissions
        if (window.navigator.permissions && window.navigator.permissions.query) {
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = function(parameters) {
                if (parameters.name === 'notifications') {
                    return Promise.resolve({ state: Notification.permission });
                }
                return originalQuery(parameters);
            };
        }
        
        // Fake plugins
        const originalPlugins = navigator.plugins;
        Object.defineProperty(navigator, 'plugins', {
            get: function() {
                const fakePlugins = [...originalPlugins];
                // Add some randomness
                if (Math.random() > 0.5) {
                    return fakePlugins;
                }
                return originalPlugins;
            },
            enumerable: true,
            configurable: true
        });
        
        // Fake languages
        Object.defineProperty(navigator, 'languages', {
            get: function() {
                return ['en-US', 'en', 'es', 'fr'];
            },
            enumerable: true,
            configurable: true
        });
        
        // Always return true for hasFocus
        document.hasFocus = function() {
            return true;
        };
        
        // Fake hidden property
        Object.defineProperty(document, 'hidden', {
            get: function() {
                return false;
            },
            enumerable: true,
            configurable: true
        });
        
        // Fake visibilityState
        Object.defineProperty(document, 'visibilityState', {
            get: function() {
                return 'visible';
            },
            enumerable: true,
            configurable: true
        });
        
        // Fake chrome object (if not present)
        if (!window.chrome) {
            window.chrome = {
                runtime: {}
            };
        }
        
        // Randomize canvas fingerprint
        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function() {
            const context = originalGetContext.apply(this, arguments);
            if (context && context.__proto__ && context.__proto__.constructor && 
                context.__proto__.constructor.name === 'CanvasRenderingContext2D') {
                const originalFillText = context.fillText;
                context.fillText = function() {
                    arguments[1] += Math.random() / 1000000;
                    originalFillText.apply(this, arguments);
                };
            }
            return context;
        };
        
        // Fake WebGL
        const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
                return 'Intel Inc.';
            }
            if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
                return 'Intel Iris OpenGL Engine';
            }
            return originalGetParameter.apply(this, arguments);
        };
        
        // Override audio context
        if (window.AudioContext) {
            const originalCreateOscillator = AudioContext.prototype.createOscillator;
            AudioContext.prototype.createOscillator = function() {
                const oscillator = originalCreateOscillator.apply(this, arguments);
                const originalFrequency = oscillator.frequency;
                Object.defineProperty(oscillator.frequency, 'value', {
                    get: function() {
                        return originalFrequency.value + Math.random() * 0.1;
                    }
                });
                return oscillator;
            };
        }
        
        // Fake timezone
        const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
        Date.prototype.getTimezoneOffset = function() {
            const offset = originalGetTimezoneOffset.call(this);
            return offset + Math.floor(Math.random() * 3) - 1;
        };
        
        // Fake screen properties
        Object.defineProperty(screen, 'width', {
            get: function() {
                return window.innerWidth;
            }
        });
        
        Object.defineProperty(screen, 'height', {
            get: function() {
                return window.innerHeight;
            }
        });
        
        Object.defineProperty(screen, 'availWidth', {
            get: function() {
                return window.innerWidth;
            }
        });
        
        Object.defineProperty(screen, 'availHeight', {
            get: function() {
                return window.innerHeight;
            }
        });
        
        // Fake device memory
        Object.defineProperty(navigator, 'deviceMemory', {
            get: function() {
                return 8;
            },
            enumerable: true,
            configurable: true
        });
        
        // Fake hardware concurrency
        Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: function() {
                return 4;
            },
            enumerable: true,
            configurable: true
        });
        
        // Override Modernizr detection
        const elementDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
        Object.defineProperty(HTMLDivElement.prototype, "offsetHeight", {
            ...elementDescriptor,
            get: function() {
                if (this.id === "modernizr") {
                    return 1;
                }
                return elementDescriptor.get.apply(this);
            }
        });
        
        console.log('[STEALTH] Anti-detection scripts injected successfully');
    })();
    `;
};
