document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Dashboard initialized");

    // Initialize Toastr for notifications
    toastr.options = {
        positionClass: 'toast-top-right',
        progressBar: true,
        timeOut: 3000,
        extendedTimeOut: 1000
    };

    // Initialize Socket.IO with debugging
    console.log("📡 Initializing Socket.IO connection...");
    const socket = io({
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling'],
        debug: true
    });

    // DOM Elements
    const proxySource = document.getElementById('proxySource');
    const multiProxyInput = document.getElementById('multiProxyInput');
    const singleProxyInput = document.getElementById('singleProxyInput');
    const proxyOptions = document.getElementById('proxyOptions');
    const proxyStatus = document.getElementById('proxyStatus');
    const loginMethod = document.getElementById('loginMethod');
    const loginCredentials = document.getElementById('loginCredentials');
    const togglePassword = document.getElementById('togglePassword');
    const googlePassword = document.getElementById('googlePassword');
    const saveCredentials = document.getElementById('saveCredentials');
    const targetRadios = document.querySelectorAll('input[name="target"]');
    const youtubeOptions = document.querySelector('.youtube-options');
    const websiteOptions = document.querySelector('.website-options');
    const ytMethodRadios = document.querySelectorAll('input[name="ytMethod"]');
    const ytKeywordSection = document.getElementById('ytKeywordSection');
    const ytDirectSection = document.getElementById('ytDirectSection');
    const commentSection = document.getElementById('commentSection');
    const ytComment = document.getElementById('ytComment');
    
    // Control buttons
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    const clearLogsBtn = document.getElementById('clearLogsBtn');
    const copyLogsBtn = document.getElementById('copyLogsBtn');
    const pauseLogsBtn = document.getElementById('pauseLogsBtn');
    const testProxiesBtn = document.getElementById('testProxiesBtn');
    const loadProxiesBtn = document.getElementById('loadProxiesBtn');
    const exportConfigBtn = document.getElementById('exportConfigBtn');
    const importConfigBtn = document.getElementById('importConfigBtn');
    const quickBtns = document.querySelectorAll('.quick-btn');
    
    // Display elements
    const logOutput = document.getElementById('logOutput');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const progressPercent = document.getElementById('progressPercent');
    const connectionStatus = document.getElementById('connectionStatus');
    const activeSessionsSpan = document.getElementById('activeSessions');
    const serverStatus = document.getElementById('serverStatus');
    const sessionProgressContainer = document.getElementById('sessionProgressContainer');
    const sessionProgressList = document.getElementById('sessionProgressList');
    
    // Stats elements
    const totalSessions = document.getElementById('totalSessions');
    const completedSessions = document.getElementById('completedSessions');
    const failedSessions = document.getElementById('failedSessions');
    const avgDuration = document.getElementById('avgDuration');
    
    // Proxy stats
    const proxyLoadedCount = document.getElementById('proxyLoadedCount');
    const proxyWorkingCount = document.getElementById('proxyWorkingCount');
    const proxyFailedCount = document.getElementById('proxyFailedCount');
    
    // Range sliders
    const watchDurationRange = document.getElementById('watchDurationRange');
    const watchDurationValue = document.getElementById('watchDurationValue');
    const visitDurationRange = document.getElementById('visitDurationRange');
    const visitDurationValue = document.getElementById('visitDurationValue');
    
    // Application state
    let appState = {
        isRunning: false,
        isPaused: false,
        activeSessionCount: 0,
        totalSessionCount: 0,
        completedSessions: 0,
        failedSessions: 0,
        logsPaused: false,
        sessionDurations: [],
        proxyStats: {
            loaded: 0,
            working: 0,
            failed: 0
        }
    };
    
    // Load saved credentials from localStorage
    loadSavedCredentials();
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Initialize range sliders
    initializeSliders();
    
    // Initialize Socket.IO events
    initializeSocketEvents();
    
    // Check server health on load
    checkServerHealth();
    
    function initializeEventListeners() {
        console.log("🔧 Initializing event listeners...");
        
        // Toggle password visibility
        togglePassword.addEventListener('click', function() {
            const type = googlePassword.getAttribute('type') === 'password' ? 'text' : 'password';
            googlePassword.setAttribute('type', type);
            this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
        
        // Save credentials checkbox
        saveCredentials.addEventListener('change', function() {
            if (this.checked) {
                saveCredentialsToStorage();
                toastr.success('Credentials saved locally');
            } else {
                localStorage.removeItem('trafficBotCredentials');
                toastr.info('Credentials removed from storage');
            }
        });
        
        // Proxy source toggle
        proxySource.addEventListener('change', function() {
            const value = this.value;
            console.log(`🔧 Proxy source changed to: ${value}`);
            multiProxyInput.classList.toggle('hidden', value !== 'multi_manual');
            singleProxyInput.classList.toggle('hidden', value !== 'manual');
            proxyOptions.classList.toggle('hidden', value === 'none');
            proxyStatus.classList.toggle('hidden', value === 'none');
            
            if (value === 'file') {
                loadProxyStats();
            }
        });
        
        // Login method toggle
        loginMethod.addEventListener('change', function() {
            console.log(`🔧 Login method changed to: ${this.value}`);
            loginCredentials.classList.toggle('hidden', this.value === 'none');
        });
        
        // Target toggle
        targetRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                console.log(`🎯 Target changed to: ${this.value}`);
                youtubeOptions.classList.toggle('hidden', this.value !== 'youtube');
                websiteOptions.classList.toggle('hidden', this.value !== 'website');
            });
        });
        
        // YouTube method toggle
        ytMethodRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                console.log(`📺 YouTube method changed to: ${this.value}`);
                ytKeywordSection.classList.toggle('hidden', this.value !== 'keyword');
                ytDirectSection.classList.toggle('hidden', this.value !== 'direct');
            });
        });
        
        // Comment toggle
        ytComment.addEventListener('change', function() {
            console.log(`💬 Comment toggle: ${this.checked}`);
            commentSection.classList.toggle('hidden', !this.checked);
        });
        
        // Control buttons
        startBtn.addEventListener('click', startBotSessions);
        stopBtn.addEventListener('click', stopBotSessions);
        pauseBtn.addEventListener('click', togglePause);
        clearCacheBtn.addEventListener('click', clearCache);
        clearLogsBtn.addEventListener('click', clearLogs);
        copyLogsBtn.addEventListener('click', copyLogs);
        pauseLogsBtn.addEventListener('click', toggleLogsPause);
        testProxiesBtn.addEventListener('click', testProxies);
        loadProxiesBtn.addEventListener('click', loadProxyStats);
        exportConfigBtn.addEventListener('click', exportConfig);
        importConfigBtn.addEventListener('click', importConfig);
        
        // Quick action buttons
        quickBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                console.log("⚡ Quick action button clicked");
                const config = JSON.parse(this.getAttribute('data-config'));
                loadQuickConfig(config);
                toastr.info('Quick configuration loaded');
            });
        });
        
        // Auto-save credentials on input
        document.getElementById('googleEmail').addEventListener('input', debounce(saveCredentialsToStorage, 1000));
        document.getElementById('googlePassword').addEventListener('input', debounce(saveCredentialsToStorage, 1000));
        
        console.log("✅ Event listeners initialized");
    }
    
    function initializeSliders() {
        // Watch duration slider
        watchDurationRange.addEventListener('input', function() {
            watchDurationValue.textContent = this.value;
        });
        
        // Visit duration slider
        visitDurationRange.addEventListener('input', function() {
            visitDurationValue.textContent = this.value;
        });
    }
    
    function initializeSocketEvents() {
        console.log("🔌 Initializing Socket.IO events...");
        
        // Connection status
        socket.on('connect', function() {
            console.log("✅ Socket.IO Connected! ID:", socket.id);
            updateConnectionStatus(true);
            log('Connected to server', 'success');
            toastr.success('Connected to server');
        });
        
        socket.on('disconnect', function(reason) {
            console.log("❌ Socket.IO Disconnected. Reason:", reason);
            updateConnectionStatus(false);
            log('Disconnected from server', 'error');
            toastr.error('Disconnected from server');
        });
        
        socket.on('connect_error', function(error) {
            console.error("❌ Socket.IO Connection Error:", error);
            log(`Connection error: ${error.message}`, 'error');
            toastr.error('Connection error: ' + error.message);
        });
        
        // DEBUG: Log semua event socket
        socket.onAny((eventName, ...args) => {
            console.log(`📡 Socket Event: ${eventName}`, args.length > 0 ? args[0] : 'No data');
        });
        
        // Custom events from server
        socket.on('connected', function(data) {
            console.log("🖥️ Server connected event:", data);
            log(`Server connected: ${data.message}`, 'info');
            updateServerStatus('Connected');
        });
        
        socket.on('bot-status', function(data) {
            console.log("📊 Bot Status Event:", data);
            updateSessionProgress(data);
            log(`[${data.sessionId}] ${data.message}`, data.status);
        });
        
        socket.on('bot-complete', function(data) {
            console.log("✅ Bot Complete Event:", data);
            handleBotComplete(data);
        });
        
        socket.on('bot-error', function(data) {
            console.error("❌ Bot Error Event:", data);
            handleBotError(data);
        });
        
        socket.on('bot-started', function(data) {
            console.log("🚀 Bot Started Event:", data);
            log(`Bot session started: ${data.sessionId}`, 'info');
        });
        
        socket.on('bot-stopped', function(data) {
            console.log("⏹️ Bot Stopped Event:", data);
            log(`Bot stopped: ${data.message}`, 'warning');
            resetControls();
        });
        
        socket.on('cache-cleared', function(data) {
            console.log("🗑️ Cache Cleared Event:", data);
            log(`Cache cleared: ${data.message}`, 'success');
            toastr.success('Cache cleared successfully');
        });
        
        socket.on('cache-error', function(data) {
            console.error("❌ Cache Error Event:", data);
            log(`Cache error: ${data.error}`, 'error');
            toastr.error('Failed to clear cache');
        });
        
        console.log("✅ Socket.IO events initialized");
    }
    
    function updateConnectionStatus(connected) {
        if (connected) {
            connectionStatus.className = 'status-online';
            connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Connected';
        } else {
            connectionStatus.className = 'status-offline';
            connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
        }
    }
    
    function updateServerStatus(status) {
        serverStatus.textContent = status;
        serverStatus.className = status === 'Connected' ? 'status-online' : 'status-error';
    }
    
    function log(message, type = 'info') {
        if (appState.logsPaused) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        
        entry.innerHTML = `
            <span class="log-time">[${timestamp}]</span>
            <span class="log-message">${message}</span>
        `;
        
        logOutput.appendChild(entry);
        
        // Auto-scroll to bottom
        logOutput.scrollTop = logOutput.scrollHeight;
        
        // Trim logs if too long
        if (logOutput.children.length > 100) {
            logOutput.removeChild(logOutput.firstChild);
        }
    }
    
    function updateSessionProgress(data) {
        console.log("📈 Updating progress:", data);
        
        if (data.progress !== undefined) {
            progressFill.style.width = `${data.progress}%`;
            progressPercent.textContent = `${data.progress}%`;
            progressText.textContent = data.message || 'Processing...';
        }
        
        // Update individual session progress
        if (data.sessionId && data.status) {
            updateIndividualSessionProgress(data);
        }
    }
    
    function updateIndividualSessionProgress(data) {
        // Create or update session progress item
        let sessionItem = document.getElementById(`session-${data.sessionId}`);
        
        if (!sessionItem) {
            sessionItem = document.createElement('div');
            sessionItem.className = 'session-progress-item';
            sessionItem.id = `session-${data.sessionId}`;
            
            sessionItem.innerHTML = `
                <div class="session-info">
                    <span class="session-id">${data.sessionId}</span>
                    <span class="session-status">${data.status}</span>
                </div>
                <div class="session-progress-bar">
                    <div class="session-progress-fill" style="width: ${data.progress || 0}%"></div>
                </div>
            `;
            
            sessionProgressList.appendChild(sessionItem);
            sessionProgressContainer.classList.remove('hidden');
        } else {
            // Update existing session
            const statusSpan = sessionItem.querySelector('.session-status');
            const progressFill = sessionItem.querySelector('.session-progress-fill');
            
            if (statusSpan) statusSpan.textContent = data.status;
            if (progressFill) progressFill.style.width = `${data.progress || 0}%`;
        }
    }
    
    function handleBotComplete(data) {
        console.log("🎉 Handling bot complete:", data);
        
        appState.completedSessions++;
        appState.activeSessionCount--;
        
        // Update stats
        updateStats();
        
        log(`Session ${data.mainSessionId} completed successfully`, 'success');
        toastr.success(`${data.sessionCount} sessions completed`);
        
        // Remove individual session progress
        if (data.results) {
            data.results.forEach(result => {
                const sessionItem = document.getElementById(`session-${result.sessionId}`);
                if (sessionItem) {
                    sessionItem.remove();
                }
            });
        }
        
        // Check if all sessions are done
        if (appState.activeSessionCount === 0) {
            resetControls();
            log('All bot sessions completed', 'success');
        }
    }
    
    function handleBotError(data) {
        console.error("💥 Handling bot error:", data);
        
        appState.failedSessions++;
        appState.activeSessionCount--;
        
        updateStats();
        
        log(`Bot error: ${data.error}`, 'error');
        toastr.error(`Session failed: ${data.error}`);
        
        if (appState.activeSessionCount === 0) {
            resetControls();
        }
    }
    
    function updateStats() {
        totalSessions.textContent = appState.totalSessionCount;
        completedSessions.textContent = appState.completedSessions;
        failedSessions.textContent = appState.failedSessions;
        activeSessionsSpan.textContent = `Active Sessions: ${appState.activeSessionCount}`;
        
        // Calculate average duration
        if (appState.sessionDurations.length > 0) {
            const avg = appState.sessionDurations.reduce((a, b) => a + b, 0) / appState.sessionDurations.length;
            avgDuration.textContent = `${Math.round(avg)}s`;
        }
    }
    
    function resetControls() {
        console.log("🔄 Resetting controls");
        
        appState.isRunning = false;
        appState.isPaused = false;
        
        startBtn.disabled = false;
        stopBtn.disabled = true;
        pauseBtn.disabled = true;
        pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        
        progressFill.style.width = '0%';
        progressPercent.textContent = '0%';
        progressText.textContent = 'Ready to start...';
        
        sessionProgressContainer.classList.add('hidden');
        sessionProgressList.innerHTML = '';
    }
    
    function startBotSessions() {
        console.log("🚀 ===== START BOT SESSIONS CALLED =====");
        
        // Get configuration
        const config = gatherConfig();
        console.log("📋 Config gathered:", JSON.stringify(config, null, 2));
        
        // Validate configuration
        const validationErrors = validateConfig(config);
        if (validationErrors.length > 0) {
            validationErrors.forEach(error => {
                console.error("❌ Validation Error:", error);
                toastr.error(error);
            });
            return;
        }
        
        // Normalize URL if needed
        if (config.target === 'website' && config.webUrl) {
            if (!config.webUrl.startsWith('http://') && !config.webUrl.startsWith('https://')) {
                config.webUrl = 'https://' + config.webUrl;
                console.log("🔗 URL normalized:", config.webUrl);
            }
        }
        
        // Update app state
        appState.isRunning = true;
        appState.totalSessionCount = config.sessionCount;
        appState.activeSessionCount = config.sessionCount;
        
        // Update UI
        startBtn.disabled = true;
        stopBtn.disabled = false;
        pauseBtn.disabled = false;
        
        // Clear previous logs
        logOutput.innerHTML = '';
        
        // Log start
        log(`Starting ${config.sessionCount} bot sessions...`, 'info');
        toastr.info(`Starting ${config.sessionCount} sessions`);
        
        // Debug socket connection
        console.log("🔌 Socket connection status:", {
            connected: socket.connected,
            id: socket.id,
            active: socket.active
        });
        
        // Send config to server
        console.log("📤 Sending config to server via socket.emit('start-bot')...");
        
        // Send with acknowledgement
        socket.emit('start-bot', config, function(ack) {
            console.log("📩 Server acknowledged start-bot event:", ack);
        });
        
        console.log("✅ Event 'start-bot' emitted");
        
        // Fallback check if no response in 3 seconds
        setTimeout(() => {
            if (appState.isRunning && appState.activeSessionCount === config.sessionCount) {
                console.warn("⚠️ No response from server after 3 seconds");
                log('Warning: Server may not be responding', 'warning');
                toastr.warning('Server may not be responding. Check server logs.');
            }
        }, 3000);
    }
    
    function validateConfig(config) {
        const errors = [];
        
        // Check target
        if (!config.target) {
            errors.push('Please select a target (YouTube or Website)');
        }
        
        // Check session count
        if (!config.sessionCount || config.sessionCount < 1 || config.sessionCount > 20) {
            errors.push('Session count must be between 1 and 20');
        }
        
        // Check website target
        if (config.target === 'website') {
            if (!config.webUrl || config.webUrl.trim() === '') {
                errors.push('Website URL is required');
            }
        }
        
        // Check YouTube target
        if (config.target === 'youtube') {
            if (!config.ytKeyword && !config.ytDirectUrl) {
                errors.push('YouTube requires either a keyword or direct URL');
            }
        }
        
        // Check login credentials if login method is selected
        if (config.loginMethod !== 'none') {
            if (!config.googleEmail || !config.googlePassword) {
                errors.push('Login credentials are required for login method');
            }
        }
        
        return errors;
    }
    
    function stopBotSessions() {
        console.log("🛑 Stopping bot sessions");
        socket.emit('stop-bot', {});
        log('Stopping all bot sessions...', 'warning');
        toastr.warning('Stopping all sessions');
        resetControls();
    }
    
    function togglePause() {
        appState.isPaused = !appState.isPaused;
        
        if (appState.isPaused) {
            pauseBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
            log('Bot sessions paused', 'warning');
            toastr.warning('Sessions paused');
        } else {
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            log('Bot sessions resumed', 'info');
            toastr.info('Sessions resumed');
        }
    }
    
    function clearCache() {
        socket.emit('clear-cache', {});
        log('Requesting cache clearance...', 'info');
    }
    
    function clearLogs() {
        logOutput.innerHTML = '';
        log('Logs cleared', 'info');
        toastr.info('Logs cleared');
    }
    
    function copyLogs() {
        const logs = Array.from(logOutput.children)
            .map(entry => entry.textContent)
            .join('\n');
        
        navigator.clipboard.writeText(logs)
            .then(() => {
                toastr.success('Logs copied to clipboard');
            })
            .catch(() => {
                toastr.error('Failed to copy logs');
            });
    }
    
    function toggleLogsPause() {
        appState.logsPaused = !appState.logsPaused;
        const icon = pauseLogsBtn.querySelector('i');
        
        if (appState.logsPaused) {
            icon.className = 'fas fa-play';
            toastr.info('Logs paused');
        } else {
            icon.className = 'fas fa-pause';
            toastr.info('Logs resumed');
        }
    }
    
    async function testProxies() {
        try {
            const response = await fetch('/api/proxy-status');
            const data = await response.json();
            
            if (data.success) {
                appState.proxyStats = {
                    loaded: data.totalProxies,
                    working: data.validProxies,
                    failed: data.totalProxies - data.validProxies
                };
                
                updateProxyStats();
                toastr.success(`Proxy test: ${data.validProxies}/${data.totalProxies} working`);
            } else {
                toastr.error('Failed to test proxies');
            }
        } catch (error) {
            toastr.error('Error testing proxies');
        }
    }
    
    async function loadProxyStats() {
        try {
            const response = await fetch('/api/proxy-status');
            const data = await response.json();
            
            if (data.success) {
                appState.proxyStats.loaded = data.totalProxies;
                updateProxyStats();
                toastr.info(`Loaded ${data.totalProxies} proxies`);
            }
        } catch (error) {
            // Silently fail - proxies.txt might not exist yet
        }
    }
    
    function updateProxyStats() {
        proxyLoadedCount.textContent = appState.proxyStats.loaded;
        proxyWorkingCount.textContent = appState.proxyStats.working;
        proxyFailedCount.textContent = appState.proxyStats.failed;
    }
    
    function exportConfig() {
        const config = gatherConfig();
        const configStr = JSON.stringify(config, null, 2);
        const blob = new Blob([configStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `traffic-bot-config-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toastr.success('Configuration exported');
    }
    
    function importConfig() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = function(e) {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = function(event) {
                try {
                    const config = JSON.parse(event.target.result);
                    loadQuickConfig(config);
                    toastr.success('Configuration imported');
                } catch (error) {
                    toastr.error('Invalid configuration file');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    function loadQuickConfig(config) {
        console.log("⚡ Loading quick config:", config);
        
        // Load target
        if (config.target) {
            const targetRadio = document.querySelector(`input[name="target"][value="${config.target}"]`);
            if (targetRadio) {
                targetRadio.checked = true;
                targetRadios.forEach(radio => radio.dispatchEvent(new Event('change')));
            }
        }
        
        // Load session count
        if (config.sessionCount) {
            document.getElementById('sessionCount').value = config.sessionCount;
        }
        
        // Load YouTube settings
        if (config.target === 'youtube') {
            if (config.ytKeyword) {
                document.querySelector('input[name="ytMethod"][value="keyword"]').checked = true;
                ytMethodRadios.forEach(radio => radio.dispatchEvent(new Event('change')));
                document.getElementById('ytKeyword').value = config.ytKeyword;
            }
            if (config.ytDirectUrl) {
                document.querySelector('input[name="ytMethod"][value="direct"]').checked = true;
                ytMethodRadios.forEach(radio => radio.dispatchEvent(new Event('change')));
                document.getElementById('ytDirectUrl').value = config.ytDirectUrl;
            }
            if (config.watchDuration) {
                document.getElementById('watchDurationRange').value = config.watchDuration;
                watchDurationValue.textContent = config.watchDuration;
            }
            if (config.ytLike !== undefined) {
                document.getElementById('ytLike').checked = config.ytLike;
            }
            if (config.ytSubscribe !== undefined) {
                document.getElementById('ytSubscribe').checked = config.ytSubscribe;
            }
            if (config.ytComment !== undefined) {
                document.getElementById('ytComment').checked = config.ytComment;
                ytComment.dispatchEvent(new Event('change'));
            }
            if (config.commentText) {
                document.getElementById('commentText').value = config.commentText;
            }
        }
        
        // Load website settings
        if (config.target === 'website') {
            if (config.webUrl) {
                document.getElementById('webUrl').value = config.webUrl;
            }
            if (config.visitDuration) {
                document.getElementById('visitDurationRange').value = config.visitDuration;
                visitDurationValue.textContent = config.visitDuration;
            }
            if (config.clickLinks !== undefined) {
                document.getElementById('clickLinks').checked = config.clickLinks;
            }
        }
        
        // Load login settings
        if (config.loginMethod) {
            document.getElementById('loginMethod').value = config.loginMethod;
            loginMethod.dispatchEvent(new Event('change'));
        }
        if (config.googleEmail) {
            document.getElementById('googleEmail').value = config.googleEmail;
        }
        if (config.googlePassword) {
            document.getElementById('googlePassword').value = config.googlePassword;
        }
        
        // Load proxy settings
        if (config.proxySource) {
            document.getElementById('proxySource').value = config.proxySource;
            proxySource.dispatchEvent(new Event('change'));
        }
        if (config.multiProxies) {
            document.getElementById('multiProxies').value = config.multiProxies;
        }
        if (config.manualProxy) {
            document.getElementById('manualProxy').value = config.manualProxy;
        }
    }
    
    function gatherConfig() {
        const target = document.querySelector('input[name="target"]:checked').value;
        const ytMethod = document.querySelector('input[name="ytMethod"]:checked')?.value;
        const searchEngine = document.querySelector('input[name="searchEngine"]:checked').value;
        
        const config = {
            // Session config
            sessionCount: parseInt(document.getElementById('sessionCount').value) || 1,
            sessionDelay: parseInt(document.getElementById('sessionDelay').value) || 5,
            differentProfiles: document.getElementById('differentProfiles').checked,
            
            // Login config
            loginMethod: document.getElementById('loginMethod').value,
            googleEmail: document.getElementById('googleEmail').value,
            googlePassword: document.getElementById('googlePassword').value,
            
            // Proxy config
            proxySource: proxySource.value,
            multiProxies: document.getElementById('multiProxies').value,
            manualProxy: document.getElementById('manualProxy').value,
            validateProxies: document.getElementById('validateProxies').checked,
            rotateProxies: document.getElementById('rotateProxies').checked,
            
            // Browser config
            rotateUA: document.getElementById('rotateUA').checked,
            checkLeaks: document.getElementById('checkLeaks').checked,
            useProxyTimezone: document.getElementById('useProxyTimezone').checked,
            headlessMode: document.getElementById('headlessMode').checked,
            browserTimeout: parseInt(document.getElementById('browserTimeout').value) || 120,
            
            // Target
            target: target,
            searchEngine: searchEngine,
            
            // YouTube config
            ytMethod: ytMethod,
            ytKeyword: document.getElementById('ytKeyword').value,
            ytDirectUrl: document.getElementById('ytDirectUrl').value,
            watchDuration: parseInt(document.getElementById('watchDurationRange').value) || 10,
            ytLike: document.getElementById('ytLike').checked,
            ytSubscribe: document.getElementById('ytSubscribe').checked,
            ytComment: document.getElementById('ytComment').checked,
            ytShare: document.getElementById('ytShare').checked,
            commentText: document.getElementById('commentText').value,
            ytPattern: document.getElementById('ytPattern').value,
            
            // Website config
            webUrl: document.getElementById('webUrl').value,
            webKeyword: document.getElementById('webKeyword').value,
            visitDuration: parseInt(document.getElementById('visitDurationRange').value) || 5,
            scrollPattern: document.getElementById('scrollPattern').value,
            clickLinks: document.getElementById('clickLinks').checked,
            fillForms: document.getElementById('fillForms').checked,
            takeScreenshots: document.getElementById('takeScreenshots').checked
        };
        
        // Clean up empty values
        Object.keys(config).forEach(key => {
            if (config[key] === '' || config[key] === null || config[key] === undefined) {
                delete config[key];
            }
        });
        
        return config;
    }
    
    function saveCredentialsToStorage() {
        if (saveCredentials.checked) {
            const credentials = {
                email: document.getElementById('googleEmail').value,
                password: document.getElementById('googlePassword').value,
                loginMethod: document.getElementById('loginMethod').value
            };
            localStorage.setItem('trafficBotCredentials', JSON.stringify(credentials));
        }
    }
    
    function loadSavedCredentials() {
        const saved = localStorage.getItem('trafficBotCredentials');
        if (saved) {
            try {
                const credentials = JSON.parse(saved);
                document.getElementById('googleEmail').value = credentials.email || '';
                document.getElementById('googlePassword').value = credentials.password || '';
                document.getElementById('loginMethod').value = credentials.loginMethod || 'none';
                document.getElementById('saveCredentials').checked = true;
                loginMethod.dispatchEvent(new Event('change'));
            } catch (error) {
                localStorage.removeItem('trafficBotCredentials');
            }
        }
    }
    
    async function checkServerHealth() {
        try {
            const response = await fetch('/health');
            const data = await response.json();
            
            if (data.status === 'OK') {
                updateServerStatus('Connected');
                log('Server health check passed', 'success');
            } else {
                updateServerStatus('Error');
                log('Server health check failed', 'error');
            }
        } catch (error) {
            updateServerStatus('Offline');
            log('Server is unreachable', 'error');
        }
    }
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Check server health every 30 seconds
    setInterval(checkServerHealth, 30000);
    
    // Initial log
    log('Dashboard initialized successfully', 'success');
    console.log("🎉 Dashboard initialization complete");
});