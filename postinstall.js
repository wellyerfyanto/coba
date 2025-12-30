// postinstall.js - Handle Puppeteer installation on Railway
const fs = require('fs');
const path = require('path');

console.log('🚀 Running postinstall script...');
console.log('📦 Node version:', process.version);
console.log('🏠 Platform:', process.platform);
console.log('📁 Current directory:', process.cwd());
console.log('📂 Files in current directory:', fs.readdirSync('.'));
console.log('🌐 Railway Environment:', process.env.RAILWAY_ENVIRONMENT);

// Check if running on Railway
const isRailway = process.env.RAILWAY_ENVIRONMENT === 'true' || 
                  process.env.RAILWAY_ENVIRONMENT === '1' ||
                  process.env.RAILWAY_ENVIRONMENT;

if (isRailway) {
  console.log('✅ Railway environment detected');
  console.log('📋 Skipping Puppeteer Chrome download - using system Chromium');
  
  try {
    // Skip Chrome download untuk menghemat waktu dan space
    const puppeteerPath = path.join(__dirname, 'node_modules', 'puppeteer');
    
    // Check if puppeteer directory exists
    if (fs.existsSync(puppeteerPath)) {
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
      } else {
        console.log('⚠️ Puppeteer install.js not found, checking for .cache/puppeteer');
        
        // Check for puppeteer cache directory
        const cacheDir = path.join(__dirname, 'node_modules', '.cache', 'puppeteer');
        if (fs.existsSync(cacheDir)) {
          console.log('📁 Puppeteer cache directory exists, skipping download');
        }
      }
    } else {
      console.log('⚠️ Puppeteer module not found yet, installation may still be in progress');
    }
  } catch (error) {
    console.log('⚠️ Could not modify Puppeteer installation:', error.message);
    console.log('⚠️ Continuing without modification...');
  }
} else {
  console.log('🌍 Local environment - Puppeteer will install Chrome normally');
  
  // Untuk local, pastikan kita punya directory yang diperlukan
  const sessionsDir = path.join(__dirname, 'sessions');
  if (!fs.existsSync(sessionsDir)) {
    try {
      fs.mkdirSync(sessionsDir, { recursive: true });
      console.log('✅ Created sessions directory');
    } catch (mkdirError) {
      console.log('⚠️ Could not create sessions directory:', mkdirError.message);
    }
  }
}

console.log('✅ Postinstall script completed');
