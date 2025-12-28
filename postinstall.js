// postinstall.js - Handle Puppeteer installation on Railway
const fs = require('fs');
const path = require('path');

console.log('🚀 Running postinstall script for Railway...');
console.log('📦 Node version:', process.version);
console.log('🏠 Platform:', process.platform);
console.log('📁 Current directory:', process.cwd());

// Skip Puppeteer download on Railway (use system Chromium)
if (process.env.RAILWAY_ENVIRONMENT) {
  console.log('✅ Railway environment detected');
  console.log('📋 Skipping Puppeteer Chrome download');
  
  // Create a dummy executable path for Puppeteer
  const puppeteerPath = path.join(__dirname, 'node_modules', 'puppeteer');
  const installJS = path.join(puppeteerPath, 'install.js');
  
  if (fs.existsSync(installJS)) {
    console.log('📝 Modifying Puppeteer install.js...');
    const content = `module.exports = async function() {
  console.log('⚠️ Skipping Chrome download on Railway - using system Chromium');
  return {
    executablePath: '/usr/bin/chromium',
    revision: 'system'
  };
};`;
    
    fs.writeFileSync(installJS, content);
    console.log('✅ Puppeteer install.js modified');
  }
} else {
  console.log('🌍 Local environment - letting Puppeteer install normally');
}

console.log('✅ Postinstall script completed');