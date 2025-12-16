// config.js - Updated for Railway with Advanced Features
module.exports = {
    IS_RAILWAY: process.env.RAILWAY_ENVIRONMENT === 'production' || 
               process.env.NODE_ENV === 'production' ||
               process.env.DISABLE_CHROME === 'true',
    
    USE_CHROME: !(process.env.RAILWAY_ENVIRONMENT === 'production' || 
                 process.env.NODE_ENV === 'production' ||
                 process.env.DISABLE_CHROME === 'true') && 
                 process.env.DISABLE_CHROME !== 'true',
    
    // FIX: Enable Advanced Features untuk Railway
    ADVANCED_FEATURES_ENABLED: true, // Selalu aktif karena kita sudah punya behavior-engine
};
