document.addEventListener('DOMContentLoaded', function() {
    const socket = io();
    
    // DOM Elements
    const proxySource = document.getElementById('proxySource');
    const manualProxyDiv = document.getElementById('manualProxy');
    const loginMethod = document.getElementById('loginMethod');
    const manualLoginDiv = document.getElementById('manualLogin');
    const targetRadios = document.querySelectorAll('input[name="target"]');
    const youtubeOptions = document.querySelector('.youtube-options');
    const websiteOptions = document.querySelector('.website-options');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    const logOutput = document.getElementById('logOutput');
    const progressContainer = document.querySelector('.progress-container');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    // Toggle manual proxy input
    proxySource.addEventListener('change', function() {
        manualProxyDiv.classList.toggle('hidden', this.value !== 'manual');
    });

    // Toggle manual login input
    loginMethod.addEventListener('change', function() {
        manualLoginDiv.classList.toggle('hidden', this.value !== 'manual');
    });

    // Toggle target-specific options
    targetRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            youtubeOptions.classList.toggle('hidden', this.value !== 'youtube');
            websiteOptions.classList.toggle('hidden', this.value !== 'website');
        });
    });

    // Start Bot
    startBtn.addEventListener('click', function() {
        const config = gatherConfig();
        
        // Disable start button, enable stop button
        startBtn.disabled = true;
        stopBtn.disabled = false;
        
        // Show progress
        progressContainer.classList.remove('hidden');
        
        // Clear logs
        logOutput.innerHTML = '<div class="log-entry">Starting bot sessions...</div>';
        
        // Send config to server
        socket.emit('start-bot', config);
    });

    // Stop Bot
    stopBtn.addEventListener('click', function() {
        socket.emit('stop-bot');
        log('Stopping all bot sessions...', 'warning');
    });

    // Clear Cache
    clearCacheBtn.addEventListener('click', function() {
        socket.emit('clear-cache');
        log('Cache cleared for all sessions', 'info');
    });

    // Socket event listeners
    socket.on('log', (data) => {
        log(data.message, data.type);
    });

    socket.on('progress', (data) => {
        progressFill.style.width = `${data.percentage}%`;
        progressText.textContent = `${data.percentage}% - ${data.message}`;
    });

    socket.on('session-complete', (data) => {
        log(`Session ${data.sessionId} completed successfully`, 'success');
    });

    socket.on('bot-stopped', () => {
        startBtn.disabled = false;
        stopBtn.disabled = true;
        log('Bot stopped by user', 'warning');
    });

    // Helper function to gather configuration
    function gatherConfig() {
        const target = document.querySelector('input[name="target"]:checked').value;
        
        return {
            // Session Config
            sessionCount: parseInt(document.getElementById('sessionCount').value),
            differentProfiles: document.getElementById('differentProfiles').checked,
            
            // Proxy Config
            proxySource: proxySource.value,
            manualProxy: document.getElementById('manualProxyInput').value,
            autoDetectProxy: document.getElementById('autoDetectProxy').checked,
            testProxy: document.getElementById('testProxy').checked,
            
            // Login Config
            loginMethod: loginMethod.value,
            googleEmail: document.getElementById('googleEmail').value,
            googlePassword: document.getElementById('googlePassword').value,
            
            // Browser Config
            useProxyTimezone: document.getElementById('useProxyTimezone').checked,
            rotateUA: document.getElementById('rotateUA').checked,
            
            // Security
            checkLeaks: document.getElementById('checkLeaks').checked,
            
            // Search Engine
            searchEngine: document.querySelector('input[name="searchEngine"]:checked').value,
            
            // Target Specific
            target: target,
            
            // YouTube Config
            ytKeyword: document.getElementById('ytKeyword').value,
            ytDirectUrl: document.getElementById('ytDirectUrl').value,
            watchDuration: parseInt(document.getElementById('watchDuration').value),
            ytLike: document.getElementById('ytLike').checked,
            ytComment: document.getElementById('ytComment').checked,
            ytSubscribe: document.getElementById('ytSubscribe').checked,
            ytPattern: document.getElementById('ytPattern').value,
            
            // Website Config
            webKeyword: document.getElementById('webKeyword').value,
            webUrl: document.getElementById('webUrl').value,
            visitDuration: parseInt(document.getElementById('visitDuration').value),
            scrollPattern: document.getElementById('scrollPattern').value,
            clickLinks: document.getElementById('clickLinks').checked
        };
    }

    // Helper function to log messages
    function log(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        
        // Add color based on type
        switch(type) {
            case 'success':
                entry.style.borderLeftColor = '#10b981';
                break;
            case 'warning':
                entry.style.borderLeftColor = '#f59e0b';
                break;
            case 'error':
                entry.style.borderLeftColor = '#ef4444';
                break;
            default:
                entry.style.borderLeftColor = '#667eea';
        }
        
        // Add timestamp
        const timestamp = new Date().toLocaleTimeString();
        entry.textContent = `[${timestamp}] ${message}`;
        
        logOutput.appendChild(entry);
        logOutput.scrollTop = logOutput.scrollHeight;
    }

    // Auto-scroll to bottom of logs
    const observer = new MutationObserver(() => {
        logOutput.scrollTop = logOutput.scrollHeight;
    });
    
    observer.observe(logOutput, { childList: true });
});
