/**
 * Proxy Loader and Manager
 */

const fs = require('fs');
const path = require('path');
const proxyValidator = require('./proxy-validator');

module.exports = function loadProxies() {
    const proxyDir = "./proxy/";
    
    return new Promise((resolve) => {
        // Create directory if doesn't exist
        if (!fs.existsSync(proxyDir)) {
            fs.mkdirSync(proxyDir, { recursive: true });
            console.log(`📁 Created proxy directory: ${proxyDir}`);
            return resolve([]);
        }

        // Read directory
        fs.readdir(proxyDir, (err, files) => {
            if (err) {
                console.error("❌ Error reading proxy directory:", err);
                return resolve([]);
            }

            // Filter text files
            const textFiles = files.filter(file => 
                file.endsWith('.txt') || 
                file.endsWith('.list') || 
                !file.includes('.')
            );

            if (textFiles.length === 0) {
                console.log("ℹ️ No proxy files found");
                return resolve([]);
            }

            console.log(`📂 Found ${textFiles.length} proxy files`);
            
            let allProxies = [];
            let filesProcessed = 0;

            textFiles.forEach((fileName) => {
                const filePath = path.join(proxyDir, fileName);
                
                fs.readFile(filePath, 'utf8', (error, data) => {
                    if (error) {
                        console.error(`❌ Error reading ${fileName}:`, error.message);
                    } else {
                        // Parse lines
                        const lines = data.split(/\r?\n/)
                            .map(line => line.trim())
                            .filter(line => {
                                return line.length > 0 && 
                                       !line.startsWith('#') && 
                                       !line.startsWith('//');
                            });

                        console.log(`📄 ${fileName}: ${lines.length} lines`);
                        
                        if (lines.length > 0) {
                            // Validate proxies
                            const results = proxyValidator.parseMultiple(lines);
                            
                            if (results.validCount > 0) {
                                allProxies.push(...results.unique);
                                console.log(`   ✅ Valid: ${results.validCount}`);
                            }
                        }
                    }

                    filesProcessed++;
                    if (filesProcessed === textFiles.length) {
                        // Remove duplicates
                        const uniqueProxies = [...new Set(allProxies)];
                        console.log(`📊 Total unique proxies: ${uniqueProxies.length}`);
                        resolve(uniqueProxies);
                    }
                });
            });
        });
    });
};

// Export additional functions
module.exports.saveProxies = function(proxies, filename = 'proxies.txt') {
    return new Promise((resolve, reject) => {
        const proxyDir = "./proxy/";
        
        if (!fs.existsSync(proxyDir)) {
            fs.mkdirSync(proxyDir, { recursive: true });
        }
        
        const filePath = path.join(proxyDir, filename);
        const proxyText = Array.isArray(proxies) ? proxies.join('\n') : proxies;
        
        fs.writeFile(filePath, proxyText, 'utf8', (err) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                    success: true,
                    filename: filename,
                    count: proxyText.split('\n').length
                });
            }
        });
    });
};