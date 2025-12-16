// ======================
// FRONTEND CONTROLLER - FULL FIXED VERSION
// ======================

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const validateBtn = document.getElementById('validateBtn');
    const saveBtn = document.getElementById('saveBtn');
    const clearLogsBtn = document.getElementById('clearLogsBtn');
    const logContainer = document.getElementById('logContainer');
    
    // Status elements
    const totalVisitorsEl = document.getElementById('totalVisitors');
    const completedVisitorsEl = document.getElementById('completedVisitors');
    const progressPercentEl = document.getElementById('progressPercent');
    const progressBarEl = document.getElementById('progressBar');
    const botInfoEl = document.getElementById('botInfo');
    const platformBadgeEl = document.getElementById('platformBadge');
    const modeBadgeEl = document.getElementById('modeBadge');
    const statusBadgeEl = document.getElementById('statusBadge');
    const proxyStatsEl = document.getElementById('proxyStats');
    const logCountEl = document.getElementById('logCount');
    
    // Advanced elements
    const advancedToggle = document.getElementById('advancedToggle');
    const advancedPanel = document.getElementById('advancedPanel');
    const behaviorSelect = document.getElementById('behaviorSelect');
    const targetImpressions = document.getElementById('targetImpressions');
    const targetActiveView = document.getElementById('targetActiveView');
    
    // State
    let logs = [];
    let isBotRunning = false;
    let proxyCount = 0;
    let statusInterval;
    
    // ======================
    // INITIALIZATION
    // ======================
    
    // Initialize
    loadSystemInfo();
    loadProxyInfo();
    startStatusUpdates();
    
    // ======================
    // HELPER FUNCTIONS
    // ======================
    
    function addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            bot: '🤖',
            advanced: '🚀'
        };
        
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="text-muted">[${timestamp}]</span>
            ${icons[type] || '📝'} ${message}
        `;
        
        logContainer.prepend(logEntry);
        logs.unshift({ message, type, timestamp });
        logCountEl.textContent = logs.length;
        
        // Auto-scroll to top
        logContainer.scrollTop = 0;
    }
    
    function showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.getElementById('alertContainer');
        container.innerHTML = '';
        container.appendChild(alertDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.classList.remove('show');
                setTimeout(() => alertDiv.remove(), 150);
            }
        }, 5000);
    }
    
    async function loadSystemInfo() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            
            if (data.success) {
                platformBadgeEl.textContent = data.server.platform;
                modeBadgeEl.textContent = data.server.mode;
                
                if (data.bot.isRunning) {
                    statusBadgeEl.textContent = 'Running';
                    statusBadgeEl.className = 'badge bg-success';
                    isBotRunning = true;
                } else {
                    statusBadgeEl.textContent = 'Idle';
                    statusBadgeEl.className = 'badge bg-secondary';
                    isBotRunning = false;
                }
                
                // Show advanced availability
                if (data.bot.advancedAvailable) {
                    modeBadgeEl.className = 'badge bg-success';
                    botInfoEl.innerHTML = `<i class="fas fa-rocket"></i> Advanced Mode Available`;
                } else {
                    modeBadgeEl.className = 'badge bg-warning';
                    botInfoEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Basic Mode Only`;
                }
            }
        } catch (error) {
            console.error('Failed to load system info:', error);
            botInfoEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> Connection Error`;
        }
    }
    
    async function loadProxyInfo() {
        try {
            const response = await fetch('/api/proxy-info');
            const data = await response.json();
            
            if (data.success) {
                proxyCount = data.totalProxies || 0;
                
                let statsHtml = '';
                if (proxyCount > 0) {
                    statsHtml = `
                        <div class="alert alert-success py-2">
                            <i class="fas fa-database"></i> 
                            ${proxyCount} proxies loaded from ${data.files.length} file(s)
                        </div>
                    `;
                } else {
                    statsHtml = `
                        <div class="alert alert-warning py-2">
                            <i class="fas fa-exclamation-triangle"></i> 
                            No proxies found. Upload some to use proxy rotation.
                        </div>
                    `;
                }
                
                proxyStatsEl.innerHTML = statsHtml;
            }
        } catch (error) {
            console.error('Failed to load proxy info:', error);
        }
    }
    
    function startStatusUpdates() {
        // Clear any existing interval
        if (statusInterval) clearInterval(statusInterval);
        
        // Update immediately
        updateBotStatus();
        
        // Set up regular updates
        statusInterval = setInterval(updateBotStatus, 2000);
    }
    
    async function updateBotStatus() {
        try {
            const response = await fetch('/api/bot-status');
            const data = await response.json();
            
            if (data.success) {
                const status = data.status || data;
                
                // Update counters
                totalVisitorsEl.textContent = status.totalVisitors || 0;
                completedVisitorsEl.textContent = status.completedVisitors || 0;
                
                // Update progress bar
                if (status.totalVisitors > 0) {
                    const percent = Math.round((status.completedVisitors / status.totalVisitors) * 100);
                    progressPercentEl.textContent = `${percent}%`;
                    progressBarEl.style.width = `${percent}%`;
                    
                    if (percent === 100) {
                        progressBarEl.className = 'progress-bar bg-success';
                    } else {
                        progressBarEl.className = 'progress-bar progress-bar-striped progress-bar-animated';
                    }
                } else {
                    progressPercentEl.textContent = '0%';
                    progressBarEl.style.width = '0%';
                }
                
                // Update running state
                isBotRunning = status.isRunning || false;
                
                // Update UI based on state
                if (isBotRunning) {
                    startBtn.disabled = true;
                    stopBtn.disabled = false;
                    
                    if (status.currentSession && status.currentSession.mode === 'advanced') {
                        botInfoEl.innerHTML = `<i class="fas fa-rocket fa-spin"></i> Advanced Mode Running`;
                        statusBadgeEl.textContent = 'Advanced';
                        statusBadgeEl.className = 'badge bg-success';
                    } else {
                        botInfoEl.innerHTML = `<i class="fas fa-sync fa-spin"></i> Basic Mode Running`;
                        statusBadgeEl.textContent = 'Running';
                        statusBadgeEl.className = 'badge bg-primary';
                    }
                } else {
                    startBtn.disabled = false;
                    stopBtn.disabled = true;
                    
                    if (status.advancedAvailable) {
                        botInfoEl.innerHTML = `<i class="fas fa-rocket"></i> Advanced Mode Ready`;
                        statusBadgeEl.textContent = 'Ready';
                        statusBadgeEl.className = 'badge bg-success';
                    } else {
                        botInfoEl.innerHTML = `<i class="fas fa-check"></i> Basic Mode Ready`;
                        statusBadgeEl.textContent = 'Idle';
                        statusBadgeEl.className = 'badge bg-secondary';
                    }
                }
                
                // Update mode badge
                if (status.advancedAvailable) {
                    modeBadgeEl.textContent = 'Advanced Available';
                    modeBadgeEl.className = 'badge bg-success';
                } else {
                    modeBadgeEl.textContent = 'Basic Only';
                    modeBadgeEl.className = 'badge bg-warning';
                }
            }
        } catch (error) {
            console.error('Failed to update bot status:', error);
        }
    }
    
    // ======================
    // ADVANCED CONTROLS
    // ======================
    
    // Initialize advanced panel
    if (advancedToggle && advancedPanel) {
        // Set initial state
        advancedPanel.style.display = 'none';
        
        // Load behavior profiles
        loadBehaviorProfiles();
        
        // Toggle advanced panel
        advancedToggle.addEventListener('change', function() {
            if (this.checked) {
                advancedPanel.style.display = 'block';
                addLog('Advanced options enabled', 'info');
            } else {
                advancedPanel.style.display = 'none';
                addLog('Advanced options disabled', 'info');
            }
        });
    }
    
    function loadBehaviorProfiles() {
        if (!behaviorSelect) return;
        
        fetch('/api/behavior-profiles')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.profiles && data.profiles.length > 0) {
                    // Clear existing options
                    behaviorSelect.innerHTML = '';
                    
                    // Add default options
                    const defaultOptions = [
                        { value: 'auto', text: 'Auto (Recommended)' },
                        { value: 'random', text: 'Completely Random' }
                    ];
                    
                    defaultOptions.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt.value;
                        option.textContent = opt.text;
                        behaviorSelect.appendChild(option);
                    });
                    
                    // Add profile options
                    data.profiles.forEach(profile => {
                        const option = document.createElement('option');
                        option.value = profile.type;
                        option.textContent = `${profile.type} (${profile.description})`;
                        behaviorSelect.appendChild(option);
                    });
                    
                    addLog(`Loaded ${data.profiles.length} behavior profiles`, 'success');
                } else {
                    // Fallback options if API fails
                    const fallbackProfiles = [
                        { value: 'auto', text: 'Auto (Recommended)' },
                        { value: 'explorer', text: 'Explorer - High engagement, many clicks' },
                        { value: 'reader', text: 'Reader - Slow reading, high time on page' },
                        { value: 'scroller', text: 'Scroller - Focus on scrolling & impressions' },
                        { value: 'bouncer', text: 'Bouncer - Quick visit, high bounce rate' },
                        { value: 'buyer', text: 'Buyer - High conversion intent' }
                    ];
                    
                    fallbackProfiles.forEach(profile => {
                        const option = document.createElement('option');
                        option.value = profile.value;
                        option.textContent = profile.text;
                        behaviorSelect.appendChild(option);
                    });
                    
                    addLog('Using fallback behavior profiles', 'warning');
                }
            })
            .catch(error => {
                console.error('Failed to load behavior profiles:', error);
                addLog('Failed to load behavior profiles', 'error');
            });
    }
    
    // ======================
    // MAIN EVENT HANDLERS
    // ======================
    
    // START BUTTON - FIXED TO ALWAYS USE ADVANCED MODE
    startBtn.addEventListener('click', async function() {
        const url = document.getElementById('urlInput').value.trim();
        const keywords = document.getElementById('keywordsInput').value.trim();
        const count = parseInt(document.getElementById('countInput').value);
        const method = document.getElementById('methodSelect').value;
        const useProxies = document.getElementById('proxySelect').value === 'true';
        
        // ===== ALWAYS USE ADVANCED OPTIONS =====
        const advancedOptions = {
            behaviorMode: 'auto',
            targetImpressions: 25,
            targetActiveView: 15000,
            maxDuration: 60000,
            useAdvanced: true // FORCE ADVANCED MODE
        };
        
        // Override with UI values if available
        if (behaviorSelect) {
            advancedOptions.behaviorMode = behaviorSelect.value;
        }
        
        if (targetImpressions && targetImpressions.value) {
            advancedOptions.targetImpressions = parseInt(targetImpressions.value);
        }
        
        if (targetActiveView && targetActiveView.value) {
            advancedOptions.targetActiveView = parseInt(targetActiveView.value);
        }
        
        // Validation
        if (!url) {
            showAlert('Please enter a target URL', 'danger');
            return;
        }
        
        if (method === 'google' && !keywords) {
            showAlert('Please enter search keywords for Google method', 'warning');
            return;
        }
        
        if (isNaN(count) || count < 1 || count > 100) {
            showAlert('Visitor count must be between 1 and 100', 'warning');
            return;
        }
        
        if (useProxies && proxyCount === 0) {
            showAlert('No proxies available. Please upload proxies first.', 'warning');
            return;
        }
        
        try {
            // Disable start button
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
            
            // Log what we're sending
            addLog(`Starting bot with advanced options:`, 'advanced');
            addLog(`URL: ${url}, Method: ${method}, Visitors: ${count}`, 'info');
            addLog(`Behavior: ${advancedOptions.behaviorMode}, Advanced: ${advancedOptions.useAdvanced}`, 'info');
            
            const response = await fetch('/api/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: url,
                    keyboard: keywords,
                    count: count,
                    option: method,
                    useProxies: useProxies,
                    advancedOptions: advancedOptions // Always send advanced options
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showAlert('Bot started successfully with Advanced Mode!', 'success');
                addLog(`✅ Bot started: ${method} method for ${url}`, 'success');
                addLog(`🎯 Target: ${count} visitors with ${advancedOptions.behaviorMode} profile`, 'info');
                
                if (useProxies) {
                    addLog(`🔄 Proxy rotation: ${proxyCount} proxies`, 'info');
                }
                
                // Log advanced mode status
                if (data.advanced) {
                    addLog('🚀 Running in ADVANCED mode with behavior simulation', 'advanced');
                } else {
                    addLog('⚠️ Running in BASIC mode (advanced features unavailable)', 'warning');
                }
            } else {
                showAlert(`Error: ${data.error || 'Unknown error'}`, 'danger');
                addLog(`❌ Start failed: ${data.error}`, 'error');
                
                // Provide helpful suggestions for common errors
                if (data.error && data.error.includes('ADVANCED')) {
                    addLog('💡 Tip: Check if behavior-engine.js exists in /libs/ folder', 'warning');
                } else if (data.error && data.error.includes('proxy')) {
                    addLog('💡 Tip: Check your proxy format (IP:PORT or protocol://IP:PORT)', 'warning');
                }
            }
        } catch (error) {
            showAlert('Failed to start bot: ' + error.message, 'danger');
            addLog(`❌ Network error: ${error.message}`, 'error');
        } finally {
            // Re-enable start button
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fas fa-play"></i> Start Bot';
        }
    });
    
    // STOP BUTTON
    stopBtn.addEventListener('click', async function() {
        try {
            stopBtn.disabled = true;
            stopBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Stopping...';
            
            const response = await fetch('/api/stop', {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                showAlert('Bot stopped successfully', 'info');
                addLog('🛑 Bot stopped by user', 'warning');
            } else {
                showAlert('Failed to stop bot', 'danger');
                addLog(`❌ Stop error: ${data.error}`, 'error');
            }
        } catch (error) {
            showAlert('Failed to stop bot: ' + error.message, 'danger');
            addLog(`❌ Network error: ${error.message}`, 'error');
        } finally {
            stopBtn.disabled = false;
            stopBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Bot';
        }
    });
    
    // VALIDATE PROXIES BUTTON
    validateBtn.addEventListener('click', async function() {
        const proxyText = document.getElementById('proxyTextarea').value.trim();
        
        if (!proxyText) {
            showAlert('Please enter proxies to validate', 'warning');
            return;
        }
        
        try {
            validateBtn.disabled = true;
            validateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validating...';
            
            const response = await fetch('/api/validate-proxies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    proxies: proxyText
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showAlert(`Validated: ${data.valid} valid, ${data.invalid} invalid`, 'success');
                addLog(`🔍 Proxy validation: ${data.valid} valid out of ${data.total}`, 'success');
                
                if (data.sample && data.sample.length > 0) {
                    addLog('Sample valid proxies:', 'info');
                    data.sample.forEach(proxy => {
                        addLog(`  ${proxy}`, 'info');
                    });
                }
            } else {
                showAlert(`Validation failed: ${data.error}`, 'danger');
            }
        } catch (error) {
            showAlert('Validation error: ' + error.message, 'danger');
        } finally {
            validateBtn.disabled = false;
            validateBtn.innerHTML = '<i class="fas fa-check"></i> Validate';
        }
    });
    
    // SAVE PROXIES BUTTON
    saveBtn.addEventListener('click', async function() {
        const proxyText = document.getElementById('proxyTextarea').value.trim();
        
        if (!proxyText) {
            showAlert('Please enter proxies to save', 'warning');
            return;
        }
        
        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            const response = await fetch('/api/save-proxies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    proxies: proxyText
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showAlert(`Saved ${data.saved} proxies successfully`, 'success');
                addLog(`💾 Saved ${data.saved} proxies to file`, 'success');
                
                // Clear textarea
                document.getElementById('proxyTextarea').value = '';
                
                // Reload proxy info
                loadProxyInfo();
            } else {
                showAlert(`Save failed: ${data.error}`, 'danger');
            }
        } catch (error) {
            showAlert('Save error: ' + error.message, 'danger');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
        }
    });
    
    // CLEAR LOGS BUTTON
    clearLogsBtn.addEventListener('click', function() {
        logContainer.innerHTML = '<div class="text-center text-muted py-4"><i class="fas fa-check"></i> Logs cleared</div>';
        logs = [];
        logCountEl.textContent = '0';
        addLog('Logs cleared', 'info');
    });
    
    // ======================
    // INITIAL LOGS
    // ======================
    
    addLog('System initialized', 'success');
    addLog('Ready to start traffic generation', 'info');
    addLog('Advanced mode will be used when available', 'advanced');
});