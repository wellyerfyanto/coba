/**
 * Proxy loader with auto-detection
 */

const fs = require('fs');
const path = require('path');
const proxyValidator = require('./proxy-validator');

module.exports = function () {
    const proxyDir = "./proxy/";
    
    return new Promise(function (resolve, reject) {
        // Create proxy directory if it doesn't exist
        if (!fs.existsSync(proxyDir)) {
            fs.mkdirSync(proxyDir, { recursive: true });
            console.log(`📁 Created proxy directory: ${proxyDir}`);
            return resolve([]);
        }

        fs.readdir(proxyDir, (err, files) => {
            if (err) {
                console.error("❌ Error reading proxy directory:", err);
                return resolve([]);
            }

            // Filter only text files
            const textFiles = files.filter(file => 
                file.match(/\.(txt|list|proxy|conf|csv)$/i) || 
                !file.includes('.')
            );

            if (textFiles.length === 0) {
                console.log("ℹ️ No proxy files found in", proxyDir);
                return resolve([]);
            }

            console.log(`📂 Found ${textFiles.length} proxy file(s)`);
            
            let allProxies = [];
            let filesProcessed = 0;
            let totalProxies = 0;

            textFiles.forEach((fileName) => {
                const filePath = path.join(proxyDir, fileName);
                
                fs.readFile(filePath, 'utf8', (error, data) => {
                    if (error) {
                        console.error(`❌ Error reading file ${fileName}:`, error.message);
                    } else {
                        // Split by newlines and filter
                        const lines = data.split(/\r?\n/)
                            .map(line => line.trim())
                            .filter(line => {
                                // Filter out empty lines and comments
                                return line.length > 0 && 
                                       !line.startsWith('#') && 
                                       !line.startsWith('//') &&
                                       !line.startsWith(';');
                            });

                        console.log(`📄 ${fileName}: ${lines.length} lines found`);
                        
                        if (lines.length > 0) {
                            // Parse all proxies
                            const results = proxyValidator.parseMultiple(lines);
                            
                            if (results.validCount > 0) {
                                allProxies.push(...results.unique);
                                totalProxies += results.unique.length;
                                
                                console.log(`   ✅ Valid: ${results.validCount}`);
                                if (results.invalidCount > 0) {
                                    console.log(`   ❌ Invalid: ${results.invalidCount}`);
                                }
                                if (results.duplicateCount > 0) {
                                    console.log(`   🔄 Duplicates removed: ${results.duplicateCount}`);
                                }
                                
                                // Log first few invalid proxies for debugging
                                if (results.invalidCount > 0 && results.invalidCount <= 5) {
                                    results.invalid.forEach((invalid, idx) => {
                                        console.log(`      ${idx + 1}. "${invalid.raw}" - ${invalid.error}`);
                                    });
                                }
                            } else {
                                console.log(`   ⚠️ No valid proxies found in ${fileName}`);
                            }
                        } else {
                            console.log(`   ⚠️ Empty file or no valid lines: ${fileName}`);
                        }
                    }

                    filesProcessed++;
                    if (filesProcessed === textFiles.length) {
                        // Remove duplicates across all files
                        const uniqueProxies = [...new Set(allProxies)];
                        const stats = {
                            totalFiles: textFiles.length,
                            totalLines: totalProxies,
                            uniqueProxies: uniqueProxies.length,
                            duplicateCount: allProxies.length - uniqueProxies.length
                        };
                        
                        console.log(`📊 Proxy loading complete:`);
                        console.log(`   Total files: ${stats.totalFiles}`);
                        console.log(`   Total proxies: ${stats.totalLines}`);
                        console.log(`   Unique proxies: ${stats.uniqueProxies}`);
                        console.log(`   Duplicates removed: ${stats.duplicateCount}`);
                        
                        if (uniqueProxies.length > 0) {
                            console.log(`   Sample proxies (first 5):`);
                            uniqueProxies.slice(0, 5).forEach((proxy, i) => {
                                console.log(`     ${i + 1}. ${proxy}`);
                            });
                        }
                        
                        resolve(uniqueProxies);
                    }
                });
            });
        });
    });
};

// Helper function to save proxies
module.exports.saveProxies = function(proxies, filename = 'proxies.txt') {
    return new Promise((resolve, reject) => {
        const proxyDir = "./proxy/";
        
        if (!fs.existsSync(proxyDir)) {
            fs.mkdirSync(proxyDir, { recursive: true });
        }
        
        const filePath = path.join(proxyDir, filename);
        const proxyText = proxies.join('\n');
        
        fs.writeFile(filePath, proxyText, 'utf8', (err) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                    success: true,
                    filename: filename,
                    count: proxies.length,
                    filePath: filePath
                });
            }
        });
    });
};

// Helper function to clear all proxies
module.exports.clearProxies = function() {
    return new Promise((resolve, reject) => {
        const proxyDir = "./proxy/";
        
        if (!fs.existsSync(proxyDir)) {
            return resolve({ success: true, message: "Proxy directory doesn't exist" });
        }
        
        fs.readdir(proxyDir, (err, files) => {
            if (err) {
                return reject(err);
            }
            
            let filesDeleted = 0;
            const deletePromises = files.map(file => {
                return new Promise((resolveDelete, rejectDelete) => {
                    fs.unlink(path.join(proxyDir, file), (err) => {
                        if (err) {
                            console.error(`Failed to delete ${file}:`, err.message);
                            resolveDelete(false);
                        } else {
                            filesDeleted++;
                            resolveDelete(true);
                        }
                    });
                });
            });
            
            Promise.all(deletePromises).then(() => {
                resolve({
                    success: true,
                    filesDeleted: filesDeleted,
                    totalFiles: files.length
                });
            }).catch(reject);
        });
    });
};