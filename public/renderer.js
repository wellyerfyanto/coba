// Frontend JavaScript
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
    
    // State
    let logs = [];
    let isBotRunning = false;
    let proxyCount = 0;
    
    // Initialize
    loadSystemInfo();
    loadProxyInfo();
    setInterval(updateBotStatus, 2000);
    
    // Functions
    function addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            bot: '🤖'
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
        
        // Auto-scroll
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
                } else {
                    statusBadgeEl.textContent = 'Idle';
                    statusBadgeEl.className = 'badge bg-secondary';
                }
            }
        } catch (error) {
            console.error('Failed to load system info:', error);
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
    
    async function updateBotStatus() {
        try {
            const response = await fetch('/api/bot-status');
            const data = await response.json();
            
            if (data.success) {
                const status = data.status || data;
                
                totalVisitorsEl.textContent = status.totalVisitors || 0;
                completedVisitorsEl.textContent = status.completedVisitors || 0;
                
                if (status.totalVisitors > 0) {
                    const percent = Math.round((status.completedVisitors / status.totalVisitors) * 100);
                    progressPercentEl.textContent = `${percent}%`;
                    progressBarEl.style.width = `${percent}%`;
                }
                
                isBotRunning = status.isRunning || false;
                
                if (isBotRunning) {
                    startBtn.disabled = true;
                    stopBtn.disabled = false;
                    botInfoEl.innerHTML = `<i class="fas fa-sync fa-spin"></i> Running...`;
                    statusBadgeEl.textContent = 'Running';
                    statusBadgeEl.className = 'badge bg-success';
                } else {
                    startBtn.disabled = false;
                    stopBtn.disabled = true;
                    botInfoEl.innerHTML = `<i class="fas fa-check"></i> Ready`;
                    statusBadgeEl.textContent = 'Idle';
                    statusBadgeEl.className = 'badge bg-secondary';
                }
            }
        } catch (error) {
            console.error('Failed to update bot status:', error);
        }
    }
    
    // Event Listeners
    startBtn.addEventListener('click', async function() {
        const url = document.getElementById('urlInput').value.trim();
        const keywords = document.getElementById('keywordsInput').value.trim();
        const count = parseInt(document.getElementById('countInput').value);
        const method = document.getElementById('methodSelect').value;
        const useProxies = document.getElementById('proxySelect').value === 'true';
        
        // Validation
        if (!url) {
            showAlert('Please enter a target URL', 'danger');
            return;
        }
        
        if (method === 'google' && !keywords) {
            showAlert('Please enter search keywords for Google method', 'warning');
            return;
        }
        
        if (count < 1 || count > 100) {
            showAlert('Visitor count must be between 1 and 100', 'warning');
            return;
        }
        
        if (useProxies && proxyCount === 0) {
            showAlert('No proxies available. Please upload proxies first.', 'warning');
            return;
        }
        
        try {
            const response = await fetch('/api/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url,
                    keyboard: keywords,
                    count,
                    option: method,
                    useProxies
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showAlert('Bot started successfully!', 'success');
                addLog(`Bot started: ${method} method for ${url}`, 'bot');
                addLog(`Target: ${count} visitors`, 'info');
                
                if (useProxies) {
                    addLog(`Proxy rotation: ${proxyCount} proxies`, 'info');
                }
            } else {
                showAlert(`Error: ${data.error}`, 'danger');
                addLog(`Start failed: ${data.error}`, 'error');
            }
        } catch (error) {
            showAlert('Failed to start bot: ' + error.message, 'danger');
            addLog(`Network error: ${error.message}`, 'error');
        }
    });
    
    stopBtn.addEventListener('click', async function() {
        try {
            const response = await fetch('/api/stop', {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                showAlert('Bot stopped', 'info');
                addLog('Bot stopped by user', 'warning');
            }
        } catch (error) {
            showAlert('Failed to stop bot', 'danger');
            addLog(`Stop error: ${error.message}`, 'error');
        }
    });
    
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
                addLog(`Proxy validation: ${data.valid} valid out of ${data.total}`, 'success');
                
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
                addLog(`Saved ${data.saved} proxies to file`, 'success');
                
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
    
    clearLogsBtn.addEventListener('click', function() {
        logContainer.innerHTML = '<div class="text-center text-muted py-4"><i class="fas fa-check"></i> Logs cleared</div>';
        logs = [];
        logCountEl.textContent = '0';
        addLog('Logs cleared', 'info');
    });
    
    // Initialize logs
    addLog('System initialized', 'success');
    addLog('Ready to start traffic generation', 'info');
    loadSystemInfo();
});
