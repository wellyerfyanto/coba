$(document).ready(async function() {
    let logCount = 0;
    let validProxies = [];
    
    // Initialize
    addLog("System initialized. Ready to validate proxies.");
    await loadProxyInfo();
    
    // Log function
    function addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const typeIcon = {
            'info': '🔵',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌',
            'bot': '🤖'
        }[type] || '📝';
        
        $('#logs').prepend(
            `<div class="log-entry" data-type="${type}">
                <span class="text-muted">[${timestamp}]</span>
                ${typeIcon} ${message}
            </div>`
        );
        
        logCount++;
        $('#logCount').text(`${logCount} logs`);
        
        // Auto-scroll
        $('#logs').scrollTop(0);
    }
    
    // Alert function
    function showAlert(message, type = 'info', duration = 5000) {
        const alert = $('#alert');
        alert.removeClass('alert-info alert-success alert-warning alert-danger');
        alert.addClass(`alert-${type} show`);
        alert.html(`<i class="fas fa-info-circle"></i> ${message}`);
        
        setTimeout(() => {
            alert.removeClass('show');
        }, duration);
    }
    
    // Load proxy information
    async function loadProxyInfo() {
        try {
            const response = await fetch('/api/proxy-info');
            const data = await response.json();
            
            if (data.totalProxies > 0) {
                $('#proxyStatus').html(`<span class="text-success">Proxies: ${data.totalProxies} loaded</span>`);
                
                let html = `<h6>📁 Files (${data.count}):</h6>`;
                data.files.forEach(file => {
                    html += `
                        <div class="border-bottom pb-2 mb-2">
                            <strong>${file.name}</strong>
                            <br>
                            <small class="text-muted">
                                📊 Total: ${file.lines} | 
                                ✅ Valid: ${file.valid} | 
                                ❌ Invalid: ${file.invalid} | 
                                ✨ Unique: ${file.unique}
                            </small>
                        </div>
                    `;
                });
                html += `<p class="mt-2"><strong>✨ Total unique proxies: ${data.totalProxies}</strong></p>`;
                $('#proxyInfo').html(html);
                
                addLog(`Loaded ${data.totalProxies} proxies from ${data.count} files`, 'success');
            } else {
                $('#proxyStatus').html('<span class="text-danger">No proxies loaded</span>');
                $('#proxyInfo').html('<p class="text-center text-muted">No proxy files found. Please upload some.</p>');
            }
        } catch (error) {
            console.error('Error loading proxy info:', error);
            $('#proxyStatus').html('<span class="text-danger">Error loading proxies</span>');
        }
    }
    
    // Validate proxies
    $('#validateProxies').click(async function() {
        const proxies = $('#proxyInput').val().trim();
        if (!proxies) {
            showAlert('Please enter some proxies to validate', 'warning');
            return;
        }
        
        const btn = $(this);
        btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Validating...');
        
        try {
            const response = await fetch('/api/validate-proxies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proxies: proxies })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Update stats
                $('#validCount').text(data.stats.valid);
                $('#invalidCount').text(data.stats.invalid);
                $('#duplicateCount').text(data.stats.duplicates);
                $('#uniqueCount').text(data.stats.unique);
                $('#validationStats').removeClass('d-none');
                
                // Show sample
                if (data.sample && data.sample.length > 0) {
                    $('#proxySample').html(
                        data.sample.map(p => 
                            `<div class="proxy-example valid-proxy">${p}</div>`
                        ).join('')
                    );
                    $('#proxyPreview').show();
                }
                
                // Store valid proxies
                validProxies = data.validProxies || [];
                
                // Show results
                showAlert(
                    `Validated: ${data.stats.valid} valid, ${data.stats.invalid} invalid, ${data.stats.duplicates} duplicates`,
                    'success'
                );
                
                addLog(
                    `Proxy validation: ${data.stats.valid} valid, ${data.stats.invalid} invalid, ${data.stats.unique} unique`,
                    'success'
                );
                
                // Show invalid proxies if any
                if (data.invalidProxies && data.invalidProxies.length > 0) {
                    addLog(`Invalid proxies found: ${data.invalidProxies.length}`, 'warning');
                    
                    if (data.invalidProxies.length <= 5) {
                        data.invalidProxies.forEach(invalid => {
                            addLog(`Invalid: ${invalid.raw} - ${invalid.error}`, 'error');
                        });
                    }
                }
            } else {
                showAlert(data.error || 'Validation failed', 'danger');
            }
        } catch (error) {
            console.error('Validation error:', error);
            showAlert('Error validating proxies', 'danger');
        } finally {
            btn.prop('disabled', false).html('<i class="fas fa-check-circle"></i> Validate');
        }
    });
    
    // Save proxies
    $('#saveProxies').click(async function() {
        if (validProxies.length === 0) {
            showAlert('Please validate proxies first', 'warning');
            return;
        }
        
        const proxiesText = validProxies.map(p => p.string).join('\n');
        const filename = `proxies_${Date.now()}.txt`;
        
        const btn = $(this);
        btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Saving...');
        
        try {
            const response = await fetch('/api/save-proxies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    proxies: proxiesText,
                    filename: filename 
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showAlert(data.message, 'success');
                addLog(`Saved ${data.stats.saved} proxies to ${data.filename}`, 'success');
                
                // Update proxy info
                await loadProxyInfo();
                
                // Clear input
                $('#proxyInput').val('');
                $('#validationStats').addClass('d-none');
                $('#proxyPreview').hide();
                validProxies = [];
            } else {
                showAlert(data.error || 'Save failed', 'danger');
            }
        } catch (error) {
            console.error('Save error:', error);
            showAlert('Error saving proxies', 'danger');
        } finally {
            btn.prop('disabled', false).html('<i class="fas fa-save"></i> Save Valid Proxies');
        }
    });
    
    // Load/refresh proxies
    $('#loadProxies').click(async function() {
        const btn = $(this);
        btn.html('<i class="fas fa-spinner fa-spin"></i>');
        await loadProxyInfo();
        btn.html('<i class="fas fa-sync"></i> Refresh List');
    });
    
    // Start bot
    $('#start').click(async function() {
        const url = $('#url').val().trim();
        const keyboard = $('#keyboard').val().trim() || "";
        const count = $('#count').val();
        const option = $('#option').val();
        const useProxies = $('#useProxies').is(':checked');
        
        // Validation
        if (!url || url.length < 8) {
            showAlert('Please enter a valid URL', 'danger');
            return;
        }
        
        if (option === "Google" && !keyboard) {
            showAlert('Please enter search keywords for Google Search method', 'danger');
            return;
        }
        
        if (!count || parseInt(count) <= 0) {
            showAlert('Please enter a valid visitor count', 'danger');
            return;
        }
        
        // Check proxies if enabled
        if (useProxies) {
            const proxyInfo = await (await fetch('/api/proxy-info')).json();
            if (proxyInfo.totalProxies === 0) {
                showAlert('No proxies loaded. Please upload proxies first.', 'warning');
                return;
            }
            
            if (parseInt(count) > proxyInfo.totalProxies) {
                showAlert(`Requested ${count} visitors but only ${proxyInfo.totalProxies} proxies available`, 'warning');
            }
        }
        
        try {
            const response = await fetch('/api/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: url,
                    keyboard: keyboard,
                    count: parseInt(count),
                    option: option,
                    useProxies: useProxies
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showAlert('Bot started successfully', 'success');
                addLog(`🤖 Bot started: ${option} method for ${url}`, 'bot');
                addLog(`🎯 Target: ${count} visitors`, 'bot');
                addLog(`🔄 Proxies: ${useProxies ? 'Enabled' : 'Disabled'}`, 'bot');
            } else {
                showAlert(data.error || 'Error starting bot', 'danger');
                addLog(`Error: ${data.error || 'Failed to start bot'}`, 'error');
            }
        } catch (error) {
            console.error('Start error:', error);
            showAlert('Error starting bot', 'danger');
            addLog(`Connection error: ${error.message}`, 'error');
        }
    });
    
    // Stop bot
    $('#stop').click(async function() {
        try {
            const response = await fetch('/api/stop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            if (response.ok) {
                showAlert('Bot stopped', 'info');
                addLog('Bot stopped by user', 'warning');
            }
        } catch (error) {
            console.error('Stop error:', error);
            addLog(`Stop error: ${error.message}`, 'error');
        }
    });
    
    // Clear logs
    $('#clearLogs').click(function() {
        $('#logs').html('<div class="text-muted">Logs cleared...</div>');
        logCount = 0;
        $('#logCount').text('0 logs');
        addLog('Logs cleared', 'info');
    });
    
    // Show proxy examples
    $('#showExamples').click(function() {
        $('#proxyExamplesModal').modal('show');
    });
    
    // Toggle keyboard input
    $('#option').change(function() {
        if (this.value === "Google") {
            $('#keyboardSection').show(300);
        } else {
            $('#keyboardSection').hide(300);
        }
    });
    
    // Auto-detect format on input
    $('#proxyInput').on('input', function() {
        if ($(this).val().length > 0) {
            $('#validationStats').addClass('d-none');
            $('#proxyPreview').hide();
        }
    });
    
    // Initial load
    addLog('Proxy auto-detector initialized', 'success');
    addLog('Enter proxies in any format - system will auto-detect', 'info');
});