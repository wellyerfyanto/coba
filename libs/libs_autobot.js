/**
 * Auto-scrolling and behavior simulation
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
        
        // Mouse movement
        function simulateMouse() {
            var mouseX = window.innerWidth / 2;
            var mouseY = window.innerHeight / 2;
            
            setInterval(function() {
                mouseX += random(-50, 50);
                mouseY += random(-50, 50);
                
                mouseX = Math.max(0, Math.min(window.innerWidth, mouseX));
                mouseY = Math.max(0, Math.min(window.innerHeight, mouseY));
                
                // Dispatch mousemove event
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
                    var element = document.elementFromPoint(mouseX, mouseY);
                    if (element && element.click) {
                        setTimeout(function() {
                            element.click();
                        }, random(100, 500));
                    }
                }
            }, random(1000, 3000));
        }
        
        // Scrolling
        function startScrolling() {
            var scrollInterval = setInterval(function() {
                var scrollLimit = document.body.scrollHeight - window.innerHeight;
                
                if (scrollDown) {
                    if (scrollHeight < scrollLimit) {
                        scrollHeight += random(50, scrollValue);
                    } else {
                        scrollDown = false;
                    }
                } else {
                    if (scrollHeight > 0) {
                        scrollHeight -= random(50, scrollValue);
                    } else {
                        scrollDown = true;
                    }
                }
                
                window.scrollTo({
                    top: Math.max(0, Math.min(scrollHeight, scrollLimit)),
                    behavior: 'smooth'
                });
                
            }, random(800, 1500));
        }
        
        simulateMouse();
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
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    ];
    return agents[Math.floor(Math.random() * agents.length)];
}

module.exports = {
    scroll: scroll,
    randomDelay: randomDelay,
    generateUserAgent: generateUserAgent
};