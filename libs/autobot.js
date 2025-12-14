/**
 * Auto-scrolling and mouse movement simulation
 */

function scroll() {
    return `
    (function() {
        // Smooth scrolling simulation
        var scrollHeight = 0;
        var scrollDown = true;
        var scrollValue = 200;
        
        function random(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        
        // Mouse movement simulation
        function simulateMouseMovement() {
            var mouseX = window.innerWidth / 2;
            var mouseY = window.innerHeight / 2;
            
            setInterval(function() {
                mouseX += random(-50, 50);
                mouseY += random(-50, 50);
                
                // Keep within bounds
                mouseX = Math.max(0, Math.min(window.innerWidth, mouseX));
                mouseY = Math.max(0, Math.min(window.innerHeight, mouseY));
                
                // Simulate mouse move
                var evt = new MouseEvent('mousemove', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: mouseX,
                    clientY: mouseY
                });
                document.dispatchEvent(evt);
                
                // Random clicks
                if (Math.random() > 0.95) {
                    var clickEvt = new MouseEvent('click', {
                        view: window,
                        bubbles: true,
                        cancelable: true,
                        clientX: mouseX,
                        clientY: mouseY
                    });
                    
                    var element = document.elementFromPoint(mouseX, mouseY);
                    if (element && element.click) {
                        setTimeout(function() {
                            element.click();
                        }, random(100, 500));
                    }
                }
            }, random(1000, 3000));
        }
        
        // Main scrolling function
        function startScrolling() {
            var scrollInterval = setInterval(function() {
                var scrollLimit = document.body.scrollHeight - window.innerHeight;
                
                if (scrollDown) {
                    if (scrollHeight < scrollLimit) {
                        scrollHeight += random(50, scrollValue);
                    } else {
                        scrollDown = false;
                        // Random pause at bottom
                        setTimeout(function() {
                            scrollDown = false;
                        }, random(2000, 5000));
                    }
                } else {
                    if (scrollHeight > 0) {
                        scrollHeight -= random(50, scrollValue);
                    } else {
                        scrollDown = true;
                        // Random pause at top
                        setTimeout(function() {
                            scrollDown = true;
                        }, random(2000, 5000));
                    }
                }
                
                // Smooth scroll
                window.scrollTo({
                    top: scrollHeight > scrollLimit ? scrollLimit : (scrollHeight < 0 ? 0 : scrollHeight),
                    behavior: 'smooth'
                });
                
                // Random page interactions
                if (Math.random() > 0.8) {
                    // Random keyboard events
                    var keys = ['Tab', 'ArrowDown', 'ArrowUp', ' '];
                    var keyEvt = new KeyboardEvent('keydown', {
                        key: keys[Math.floor(Math.random() * keys.length)],
                        bubbles: true
                    });
                    document.dispatchEvent(keyEvt);
                }
                
            }, random(800, 1500));
        }
        
        // Start simulations
        simulateMouseMovement();
        startScrolling();
        
        console.log('[AUTOBOT] Behavioral simulation started');
    })();
    `;
}

function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateUserAgent() {
    const agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
    ];
    return agents[Math.floor(Math.random() * agents.length)];
}

module.exports = {
    scroll: scroll,
    randomDelay: randomDelay,
    generateUserAgent: generateUserAgent
};
