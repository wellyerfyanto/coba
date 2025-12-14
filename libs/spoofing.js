/**
 * Stealth and anti-detection scripts
 */

module.exports = function() {
    return `
    (function() {
        // Remove webdriver flag
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
            enumerable: true,
            configurable: true
        });
        
        // Fake plugins
        Object.defineProperty(navigator, 'plugins', {
            get: function() {
                return {
                    length: 3,
                    item: function() { return null; }
                };
            }
        });
        
        // Fake languages
        Object.defineProperty(navigator, 'languages', {
            get: function() {
                return ['en-US', 'en'];
            }
        });
        
        // Always return visible
        Object.defineProperty(document, 'hidden', {
            get: function() {
                return false;
            }
        });
        
        Object.defineProperty(document, 'visibilityState', {
            get: function() {
                return 'visible';
            }
        });
        
        // Fake chrome object
        if (!window.chrome) {
            window.chrome = {
                runtime: {}
            };
        }
        
        console.log('[STEALTH] Anti-detection active');
    })();
    `;
};
