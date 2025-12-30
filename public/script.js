document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Traffic Bot Dashboard v3.1 (Auto-Proxy) initialized");

    // Initialize Toastr for notifications
    toastr.options = {
        positionClass: 'toast-top-right',
        progressBar: true,
        timeOut: 4000,
        extendedTimeOut: 2000,
        newestOnTop: true
    };

    // Initialize Socket.IO
    console.log("📡 Initializing Socket.IO connection...");
    const socket = io({
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 30000,
        transports: ['websocket', 'polling']
    });

    // ======================== DOM ELEMENTS ========================
    const proxySource = document.getElementById('proxySource');
    const autoFetchOptions = document.getElementById('autoFetchOptions');
    const fetchProxiesBtn = document.getElementById('fetchProxiesBtn');
    const refreshProxiesBtn = document.getElementById('refreshProxiesBtn');
    const fetchProgress = document.getElementById('fetchProgress');
    const fetchProgressFill = document.getElementById('fetchProgressFill');
    const fetchProgressText = document.getElementById('fetchProgressText');
    const fetchProgressPercent = document.getElementById('fetchProgressPercent');
    const fetchedCount = document.getElementById('fetchedCount');
    const workingCount = document.getElementById('workingCount');
    const failedCount = document.getElementById('failedCount');
    const successRate = document.getElementById('successRate');
    const singleProxyTest = document.getElementById('singleProxyTest');
    const testSingleProxyBtn = document.getElementById('testSingleProxyBtn');
    const singleProxyInputTest = document.getElementById('singleProxyInputTest');
    const testProxyBtn = document.getElementById('testProxyBtn');
    const proxyTestResult = document.getElementById('proxyTestResult');
    const multiProxyInput = document.getElementById('multiProxyInput');
    const singleProxyInputManual = document.getElementById('singleProxyInputManual');
    const proxyOptions = document.getElementById('proxyOptions');
    const proxyStatus = document.getElementById('proxyStatus');
    const viewProxiesBtn = document.getElementById('viewProxiesBtn');
    const proxyViewModal = document.getElementById('proxyViewModal');
    const modalClose = document.querySelector('.modal-close');
    const proxySearch = document.getElementById('proxySearch');
    const copyProxiesBtn = document.getElementById('copyProxiesBtn');
    const proxyListContent = document.getElementById('proxyListContent');
    const proxyListCount = document.getElementById('proxyListCount');
    const proxyListUpdated = document.getElementById('proxyListUpdated');
    const availableProxies = document.getElementById('availableProxies');
    const lastProxyUpdate = document.getElementById('lastProxyUpdate');
    const proxySuccessRateSmall = document.getElementById('proxySuccessRateSmall');
    const quickFetchBtn = document.getElementById('quickFetchBtn');
    const proxyStatusBadge = document.getElementById('proxyStatusBadge');
    const proxyStatusText = document.getElementById('proxyStatusText');
    const uptimeStatus = document.getElementById('uptimeStatus');
    const concurrentSessions = document.getElementById('concurrentSessions');
    const concurrentValue = document.getElementById('concurrentValue');
    
    // Existing elements
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
    const logOutput = document.getElementById('logOutput');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const progressPercent = document.getElementById('progressPercent');
    const connectionStatus = document.getElementById('connectionStatus');
    const activeSessionsSpan = document.getElementById('activeSessions');
    const serverStatus = document.getElementById('serverStatus');
    const sessionProgressContainer = document.getElementById('sessionProgressContainer');
    const sessionProgressList = document.getElementById('sessionProgressList');
    const totalSessions = document.getElementById('totalSessions');
    const completedSessions = document.getElementById('completedSessions');
    const failedSessions = document.getElementById('failedSessions');
    const avgDuration = document.getElementById('avgDuration');
    const proxyLoadedCount = document.getElementById('proxyLoadedCount');
    const proxyWorkingCount = document.getElementById('proxyWorkingCount');
    const proxyFailedCount = document.getElementById('proxyFailedCount');
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
            failed: 0,
            successRate: 0,
            lastUpdated: null
        },
        isFetchingProxies: false,
        proxyList: []
    };
    
    // ======================== INITIALIZATION ========================
    
    loadSavedCredentials();
    initializeEventListeners();
    initializeSliders();
    initializeSocketEvents();
    checkServerHealth();
    
    // Auto-check proxies on load
    setTimeout(() => {
        loadProxyStats();
        checkSystemStatus();
    }, 2000);
    
    // Auto-fetch proxies if none available
    setTimeout(() => {
        if (appState.proxyStats.working === 0 && proxySource.value === 'auto_fetch') {
            log('No proxies available. Click "Fetch & Test Free Proxies" to get started.', 'warning');
            toastr.warning('No proxies available. Click the fetch button to get free proxies.');
        }
    }, 5000);
    
    // ======================== EVENT LISTENERS ========================
    
    function initializeEventListeners() {
        console.log("🔧 Initializing event listeners...");
        
        // Concurrent sessions slider
        concurrentSessions.addEventListener('input', function() {
            concurrentValue.textContent = this.value;
        });
        
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
            singleProxyInputManual.classList.toggle('hidden', value !== 'manual');
            proxyOptions.classList.toggle('hidden', value === 'none');
            proxyStatus.classList.toggle('hidden', value === 'none');
            autoFetchOptions.classList.toggle('hidden', value !== 'auto_fetch');
            singleProxyTest.classList.add('hidden');
            
            if (value === 'file' || value === 'auto_fetch') {
                loadProxyStats();
            }
        });
        
        // Test single proxy button
        testSingleProxyBtn.addEventListener('click', function() {
            singleProxyTest.classList.toggle('hidden');
        });
        
        // Test proxy button
        testProxyBtn.addEventListener('click', testSingleProxy);
        singleProxyInputTest.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') testSingleProxy();
        });
        
        // Fetch proxies button
        fetchProxiesBtn.addEventListener('click', fetchProxies);
        
        // Refresh proxies button
        refreshProxiesBtn.addEventListener('click', refreshProxies);
        
        // Quick fetch button
        quickFetchBtn.addEventListener('click', quickFetchProxies);
        
        // View proxies button
        viewProxiesBtn.addEventListener('click', showProxyList);
        
        // Modal close
        modalClose.addEventListener('click', function() {
            proxyViewModal.classList.add('hidden');
        });
        
        // Proxy search
        proxySearch.addEventListener('input', function() {
            filterProxyList(this.value);
        });
        
        // Copy proxies button
        copyProxiesBtn.addEventListener('click', copyProxyList);
        
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
        
        // Close modal on ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && !proxyViewModal.classList.contains('hidden')) {
                proxyViewModal.classList.add('hidden');
            }
        });
        
        // Close modal on outside click
        proxyViewModal.addEventListener('click', function(e) {
            if (e.target === proxyViewModal) {
                proxyViewModal.classList.add('hidden');
            }
        });
        
        console.log("✅ Event listeners initialized");
    }
    
    function initializeSliders() {
        watchDurationRange.addEventListener('input', function() {
            watchDurationValue.textContent = this.value;
        });
        
        visitDurationRange.addEventListener('input', function() {
            visitDurationValue.textContent = this.value;
        });
    }
    
    // ======================== SOCKET.IO EVENTS ========================
    
    function initializeSocketEvents() {
        console.log("🔌 Initializing Socket.IO events...");
        
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
        });
        
        socket.on('error', (error) => {
            console.error("❌ Socket.IO Error:", error);
            log(`Socket error: ${error.message}`, 'error');
        });
        
        socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`🔄 Socket reconnection attempt: ${attemptNumber}`);
            log(`Reconnecting... (attempt ${attemptNumber})`, 'warning');
        });
        
        // Custom events from server
        socket.on('connected', function(data) {
            console.log("🖥️ Server connected event:", data);
            log(`Server connected: ${data.message}`, 'info');
            updateServerStatus('Connected');
            
            if (data.features && data.features.autoProxyFetch) {
                log('Auto-Proxy feature enabled on server', 'success');
            }
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
        
        // Proxy refresh events
        socket.on('proxy-refresh-start', function(data) {
            console.log("🔄 Proxy refresh started:", data);
            log('Proxy refresh started in background', 'info');
        });
        
        socket.on('proxy-refresh-complete', function(data) {
            console.log("✅ Proxy refresh complete:", data);
            log(`Proxy refresh completed: ${data.working}/${data.total} working proxies`, 'success');
            
            if (data.success) {
                loadProxyStats();
                toastr.info(`Proxy refresh: ${data.working} working proxies available`);
            }
        });
        
        console.log("✅ Socket.IO events initialized");
    }
    
    // ======================== PROXY MANAGEMENT FUNCTIONS ========================
    
    async function fetchProxies() {
        if (appState.isFetchingProxies) {
            toastr.warning('Already fetching proxies. Please wait...');
            return;
        }
        
        console.log('🚀 Starting auto proxy fetch...');
        appState.isFetchingProxies = true;
        
        // Disable button and show progress
        fetchProxiesBtn.disabled = true;
        fetchProxiesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching...';
        fetchProgress.classList.remove('hidden');
        
        // Reset progress
        updateFetchProgress(0, 0, 0, 'Starting proxy fetch from 10+ sources...');
        
        try {
            const response = await fetch('/api/fetch-proxies');
            const data = await response.json();
            
            if (data.success) {
                toastr.success(`Found ${data.working} working proxies!`);
                
                // Update UI with results
                updateFetchProgress(
                    data.totalTested || 0,
                    data.working || 0,
                    (data.totalTested || 1) - (data.working || 0),
                    'Fetch completed!'
                );
                
                // Update proxy stats
                appState.proxyStats = {
                    loaded: data.totalTested || 0,
                    working: data.working || 0,
                    failed: (data.totalTested || 0) - (data.working || 0),
                    successRate: data.stats?.successRate || 0,
                    lastUpdated: new Date().toISOString()
                };
                
                updateProxyUI();
                
                // Auto-switch to file mode
                if (data.working > 0) {
                    setTimeout(() => {
                        proxySource.value = 'file';
                        proxySource.dispatchEvent(new Event('change'));
                        toastr.info(`Auto-switched to use ${data.working} working proxies`);
                    }, 2000);
                }
                
                log(`Proxy fetch completed: ${data.working} working proxies found`, 'success');
                
            } else {
                toastr.error('Failed to fetch proxies: ' + (data.error || 'Unknown error'));
                log(`Proxy fetch failed: ${data.error}`, 'error');
            }
        } catch (error) {
            toastr.error('Error fetching proxies: ' + error.message);
            console.error('Proxy fetch error:', error);
            log(`Proxy fetch error: ${error.message}`, 'error');
        } finally {
            appState.isFetchingProxies = false;
            fetchProxiesBtn.disabled = false;
            fetchProxiesBtn.innerHTML = '<i class="fas fa-bolt"></i> Fetch & Test Free Proxies';
            
            // Hide progress after 8 seconds
            setTimeout(() => {
                fetchProgress.classList.add('hidden');
            }, 8000);
        }
    }
    
    async function refreshProxies() {
        console.log('🔄 Refreshing proxy list in background...');
        
        refreshProxiesBtn.disabled = true;
        refreshProxiesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        
        try {
            const response = await fetch('/api/refresh-proxies', { method: 'POST' });
            const data = await response.json();
            
            if (data.success) {
                toastr.info('Proxy refresh started in background');
                log('Proxy refresh started in background', 'info');
                
                // Poll for completion every 15 seconds
                let pollCount = 0;
                const maxPolls = 20; // 5 minutes max
                
                const pollInterval = setInterval(async () => {
                    pollCount++;
                    
                    if (pollCount >= maxPolls) {
                        clearInterval(pollInterval);
                        toastr.info('Proxy refresh may take longer. Check logs for details.');
                        return;
                    }
                    
                    try {
                        const statsResponse = await fetch('/api/proxy-stats');
                        const stats = await statsResponse.json();
                        
                        if (stats.success && stats.validProxies > 0) {
                            clearInterval(pollInterval);
                            loadProxyStats();
                            toastr.success(`Background refresh completed: ${stats.validProxies} proxies available`);
                            log(`Background proxy refresh completed: ${stats.validProxies} proxies`, 'success');
                        }
                    } catch (e) {
                        // Ignore polling errors
                    }
                }, 15000);
                
            } else {
                toastr.error('Failed to refresh: ' + data.error);
            }
        } catch (error) {
            toastr.error('Refresh error: ' + error.message);
        } finally {
            refreshProxiesBtn.disabled = false;
            refreshProxiesBtn.innerHTML = '<i class="fas fa-sync"></i> Refresh Proxy List';
        }
    }
    
    async function quickFetchProxies() {
        console.log('⚡ Quick fetching proxies...');
        
        quickFetchBtn.disabled = true;
        quickFetchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        try {
            const response = await fetch('/api/fetch-proxies');
            const data = await response.json();
            
            if (data.success) {
                toastr.success(`Quick fetch: ${data.working} working proxies`);
                loadProxyStats();
            } else {
                toastr.warning('Quick fetch failed: ' + (data.error || 'Try full fetch instead'));
            }
        } catch (error) {
            toastr.error('Quick fetch error: ' + error.message);
        } finally {
            setTimeout(() => {
                quickFetchBtn.disabled = false;
                quickFetchBtn.innerHTML = '<i class="fas fa-redo"></i> Quick Fetch';
            }, 3000);
        }
    }
    
    async function testSingleProxy() {
        const proxyStr = singleProxyInputTest.value.trim();
        
        if (!proxyStr) {
            toastr.warning('Please enter a proxy to test');
            return;
        }
        
        console.log(`🔍 Testing proxy: ${proxyStr}`);
        
        testProxyBtn.disabled = true;
        testProxyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
        
        try {
            const response = await fetch('/api/test-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proxy: proxyStr })
            });
            
            const data = await response.json();
            
            proxyTestResult.classList.remove('hidden');
            const resultDiv = proxyTestResult.querySelector('.proxy-test-result');
            
            if (data.success && data.working) {
                resultDiv.innerHTML = `
                    <div style="color: #10b981; font-weight: bold;">
                        <i class="fas fa-check-circle"></i> Proxy is WORKING!
                    </div>
                    <div style="margin-top: 8px;">
                        <strong>Proxy:</strong> ${data.proxy}<br>
                        <strong>IP:</strong> ${data.ip || 'Unknown'}<br>
                        <strong>Latency:</strong> ${data.latency || 'N/A'}ms<br>
                        <strong>Source:</strong> ${data.source || 'Unknown'}
                    </div>
                `;
                toastr.success('Proxy is working!');
                
                // Add to multi proxy list if working
                if (proxySource.value === 'multi_manual') {
                    const textarea = document.getElementById('multiProxies');
                    if (textarea.value && !textarea.value.includes(proxyStr)) {
                        textarea.value += '\n' + proxyStr;
                    } else if (!textarea.value) {
                        textarea.value = proxyStr;
                    }
                }
                
            } else {
                resultDiv.innerHTML = `
                    <div style="color: #ef4444; font-weight: bold;">
                        <i class="fas fa-times-circle"></i> Proxy FAILED
                    </div>
                    <div style="margin-top: 8px;">
                        <strong>Proxy:</strong> ${data.proxy}<br>
                        <strong>Error:</strong> ${data.error || 'Unknown error'}<br>
                        <strong>Message:</strong> ${data.message || 'Test failed'}
                    </div>
                `;
                toastr.error('Proxy failed: ' + (data.error || 'Unknown'));
            }
            
        } catch (error) {
            proxyTestResult.classList.remove('hidden');
            const resultDiv = proxyTestResult.querySelector('.proxy-test-result');
            resultDiv.innerHTML = `
                <div style="color: #ef4444; font-weight: bold;">
                    <i class="fas fa-exclamation-triangle"></i> Test Error
                </div>
                <div style="margin-top: 8px;">
                    <strong>Error:</strong> ${error.message}
                </div>
            `;
            toastr.error('Test error: ' + error.message);
        } finally {
            testProxyBtn.disabled = false;
            testProxyBtn.innerHTML = '<i class="fas fa-play"></i> Test';
        }
    }
    
    async function loadProxyStats() {
        try {
            const response = await fetch('/api/proxy-stats');
            const data = await response.json();
            
            if (data.success) {
                appState.proxyStats = {
                    loaded: data.totalProxies || 0,
                    working: data.validProxies || 0,
                    failed: (data.totalProxies || 0) - (data.validProxies || 0),
                    successRate: data.successRate || 0,
                    lastUpdated: new Date().toISOString()
                };
                
                updateProxyUI();
                
                // Update badge
                updateProxyStatusBadge();
                
                if (data.validProxies > 0) {
                    log(`Proxy stats loaded: ${data.validProxies}/${data.totalProxies} working`, 'info');
                }
            } else {
                console.log('No proxy stats available');
            }
        } catch (error) {
            console.error('Error loading proxy stats:', error);
        }
    }
    
    async function testProxies() {
        try {
            const response = await fetch('/api/proxy-status');
            const data = await response.json();
            
            if (data.success) {
                toastr.success(`Proxy test: ${data.validProxies}/${data.totalProxies} working`);
                loadProxyStats();
            } else {
                toastr.error('Failed to test proxies');
            }
        } catch (error) {
            toastr.error('Error testing proxies');
        }
    }
    
    function updateProxyUI() {
        proxyLoadedCount.textContent = appState.proxyStats.loaded;
        proxyWorkingCount.textContent = appState.proxyStats.working;
        proxyFailedCount.textContent = appState.proxyStats.failed;
        
        const successRateElement = document.getElementById('proxySuccessRate');
        if (successRateElement) {
            successRateElement.textContent = `${appState.proxyStats.successRate}%`;
        }
        
        // Update quick stats
        availableProxies.textContent = appState.proxyStats.working;
        proxySuccessRateSmall.textContent = `${appState.proxyStats.successRate}%`;
        
        if (appState.proxyStats.lastUpdated) {
            const date = new Date(appState.proxyStats.lastUpdated);
            lastProxyUpdate.textContent = date.toLocaleTimeString();
        }
        
        // Update status text
        if (appState.proxyStats.working > 0) {
            proxyStatusText.textContent = `Proxies: ${appState.proxyStats.working} available`;
        } else {
            proxyStatusText.textContent = 'Proxies: None available';
        }
    }
    
    function updateProxyStatusBadge() {
        if (!proxyStatusBadge) return;
        
        const working = appState.proxyStats.working;
        
        if (working > 50) {
            proxyStatusBadge.className = 'proxy-status-badge badge-success';
            proxyStatusBadge.textContent = `Proxies: ${working}`;
        } else if (working > 10) {
            proxyStatusBadge.className = 'proxy-status-badge badge-warning';
            proxyStatusBadge.textContent = `Proxies: ${working}`;
        } else if (working > 0) {
            proxyStatusBadge.className = 'proxy-status-badge badge-danger';
            proxyStatusBadge.textContent = `Proxies: ${working} (Low)`;
        } else {
            proxyStatusBadge.className = 'proxy-status-badge badge-danger';
            proxyStatusBadge.textContent = 'Proxies: 0';
        }
    }
    
    async function showProxyList() {
        try {
            // Load proxy file content
            const response = await fetch('/api/proxy-stats');
            const data = await response.json();
            
            if (!data.success || !data.fileExists) {
                proxyListContent.innerHTML = '<p style="color: #ef4444;">No proxy file found. Fetch proxies first.</p>';
                return;
            }
            
            // Try to load the actual proxy file
            const proxyResponse = await fetch('/proxies.txt');
            if (!proxyResponse.ok) {
                proxyListContent.innerHTML = '<p style="color: #ef4444;">Could not load proxy file.</p>';
                return;
            }
            
            const proxyText = await proxyResponse.text();
            const proxies = proxyText.split('\n').filter(line => 
                line.trim() && !line.trim().startsWith('#')
            );
            
            appState.proxyList = proxies;
            
            // Update modal content
            proxyListCount.textContent = proxies.length;
            proxyListUpdated.textContent = new Date().toLocaleString();
            
            let html = '<div class="proxy-list">';
            proxies.forEach((proxy, index) => {
                const isAuth = proxy.includes(':') && proxy.split(':').length >= 4;
                const typeClass = isAuth ? 'proxy-auth' : 'proxy-noauth';
                
                html += `
                    <div class="proxy-item ${typeClass}">
                        <span class="proxy-index">${index + 1}.</span>
                        <span class="proxy-value">${proxy}</span>
                        <span class="proxy-type">${isAuth ? 'Auth' : 'No Auth'}</span>
                    </div>
                `;
            });
            html += '</div>';
            
            proxyListContent.innerHTML = html;
            
            // Show modal
            proxyViewModal.classList.remove('hidden');
            
        } catch (error) {
            console.error('Error loading proxy list:', error);
            proxyListContent.innerHTML = `<p style="color: #ef4444;">Error loading proxies: ${error.message}</p>`;
            proxyViewModal.classList.remove('hidden');
        }
    }
    
    function filterProxyList(searchTerm) {
        if (!appState.proxyList.length) return;
        
        const filtered = appState.proxyList.filter(proxy => 
            proxy.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        let html = '<div class="proxy-list">';
        filtered.forEach((proxy, index) => {
            const isAuth = proxy.includes(':') && proxy.split(':').length >= 4;
            const typeClass = isAuth ? 'proxy-auth' : 'proxy-noauth';
            
            html += `
                <div class="proxy-item ${typeClass}">
                    <span class="proxy-index">${index + 1}.</span>
                    <span class="proxy-value">${proxy}</span>
                    <span class="proxy-type">${isAuth ? 'Auth' : 'No Auth'}</span>
                </div>
            `;
        });
        html += '</div>';
        
        proxyListContent.innerHTML = html;
        proxyListCount.textContent = filtered.length;
    }
    
    async function copyProxyList() {
        if (!appState.proxyList.length) return;
        
        const proxyText = appState.proxyList.join('\n');
        
        try {
            await navigator.clipboard.writeText(proxyText);
            toastr.success('Proxy list copied to clipboard!');
        } catch (error) {
            toastr.error('Failed to copy proxy list');
        }
    }
    
    function updateFetchProgress(fetched, working, failed, message) {
        fetchedCount.textContent = fetched;
        workingCount.textContent = working;
        failedCount.textContent = failed;
        
        const total = fetched || 1;
        const progress = Math.min(Math.round((working / total) * 100), 100);
        const successRateValue = fetched > 0 ? Math.round((working / fetched) * 100) : 0;
        
        fetchProgressFill.style.width = `${progress}%`;
        fetchProgressPercent.textContent = `${progress}%`;
        fetchProgressText.textContent = message;
        successRate.textContent = `${successRateValue}%`;
    }
    
    // ======================== EXISTING FUNCTIONS (UPDATED) ========================
    
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
        logOutput.scrollTop = logOutput.scrollHeight;
        
        if (logOutput.children.length > 100) {
            logOutput.removeChild(logOutput.firstChild);
        }
    }
    
    // [ALL OTHER EXISTING FUNCTIONS REMAIN THE SAME WITH MINOR UPDATES FOR PROXY INTEGRATION]
    // updateSessionProgress, handleBotComplete, handleBotError, updateStats, resetControls,
    // startBotSessions, validateConfig, stopBotSessions, togglePause, clearCache, clearLogs,
    // copyLogs, toggleLogsPause, exportConfig, importConfig, loadQuickConfig, gatherConfig,
    // saveCredentialsToStorage, loadSavedCredentials, checkServerHealth, debounce
    
    // Updated gatherConfig to include concurrent sessions
    function gatherConfig() {
        const target = document.querySelector('input[name="target"]:checked').value;
        const ytMethod = document.querySelector('input[name="ytMethod"]:checked')?.value;
        const searchEngine = document.querySelector('input[name="searchEngine"]:checked').value;
        
        const config = {
            // Session config
            sessionCount: parseInt(document.getElementById('sessionCount').value) || 3,
            sessionDelay: parseInt(document.getElementById('sessionDelay').value) || 3,
            differentProfiles: document.getElementById('differentProfiles').checked,
            concurrentSessions: parseInt(document.getElementById('concurrentSessions').value) || 3,
            
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
            proxyTestTimeout: parseInt(document.getElementById('proxyTestTimeout').value) || 10,
            
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
    
    async function checkSystemStatus() {
        try {
            const response = await fetch('/health');
            const data = await response.json();
            
            if (data.status === 'OK') {
                updateServerStatus('Connected');
                uptimeStatus.textContent = `Uptime: ${Math.floor(data.uptime)}s`;
                
                // Auto-update uptime every minute
                setInterval(() => {
                    if (data.timestamp) {
                        const uptime = Math.floor((Date.now() - new Date(data.timestamp).getTime()) / 1000) + data.uptime;
                        uptimeStatus.textContent = `Uptime: ${Math.floor(uptime)}s`;
                    }
                }, 60000);
            }
        } catch (error) {
            updateServerStatus('Offline');
        }
    }
    
    // Auto-check proxy status every 2 minutes
    setInterval(loadProxyStats, 120000);
    
    // Check server health every 30 seconds
    setInterval(checkServerHealth, 30000);
    
    // Initial log
    log('Auto-Proxy Traffic Bot Dashboard initialized successfully', 'success');
    log('Ready to fetch and use free proxies automatically', 'info');
    console.log("🎉 Dashboard initialization complete");
    
    // Add some CSS for proxy modal
    const style = document.createElement('style');
    style.textContent = `
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        .modal.hidden {
            display: none;
        }
        .modal-content {
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 800px;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .modal-header {
            padding: 20px;
            background: #667eea;
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .modal-header h3 {
            margin: 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .modal-close {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .modal-body {
            padding: 20px;
            max-height: 60vh;
            overflow-y: auto;
        }
        .proxy-list-controls {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        .search-input {
            flex: 1;
            padding: 10px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
        }
        .btn-small {
            padding: 8px 15px;
            font-size: 14px;
        }
        .proxy-list {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        .proxy-item {
            padding: 10px 15px;
            background: #f9fafb;
            border-radius: 6px;
            display: flex;
            align-items: center;
            gap: 15px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
        }
        .proxy-index {
            color: #6b7280;
            min-width: 30px;
        }
        .proxy-value {
            flex: 1;
            word-break: break-all;
        }
        .proxy-type {
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }
        .proxy-auth {
            background: #10b98110;
            border-left: 3px solid #10b981;
        }
        .proxy-auth .proxy-type {
            background: #10b98120;
            color: #10b981;
        }
        .proxy-noauth {
            background: #3b82f610;
            border-left: 3px solid #3b82f6;
        }
        .proxy-noauth .proxy-type {
            background: #3b82f620;
            color: #3b82f6;
        }
        .proxy-test-result {
            padding: 15px;
            background: #f9fafb;
            border-radius: 8px;
            margin-top: 10px;
            border-left: 4px solid #e5e7eb;
        }
        .quick-stats {
            margin-top: 25px;
            padding: 20px;
            background: #f9fafb;
            border-radius: 10px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .stat-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background: white;
            border-radius: 8px;
        }
        .stat-label-small {
            color: #6b7280;
            font-size: 12px;
        }
        .stat-value-small {
            font-weight: 600;
            color: #1f2937;
        }
        .input-group {
            display: flex;
            gap: 10px;
        }
    `;
    document.head.appendChild(style);
});