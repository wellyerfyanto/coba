# Dockerfile - Optimized for Puppeteer on Railway
FROM node:18-bullseye-slim

# 1. INSTALL SYSTEM DEPENDENCIES FOR CHROMIUM
# These libraries are crucial for Chromium to run headless in a container
RUN apt-get update && apt-get install -y \
    chromium \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \          # Essential for newer Chromium/Chrome
    libgcc1 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \          # Network Security Services - FIXES NETWORK TIMEOUTS
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 2. SET ENVIRONMENT VARIABLES FOR PUPPETEER
# Tell Puppeteer to skip downloading Chrome and use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    PORT=8080

# 3. CREATE APP DIRECTORY AND SET PERMISSIONS
WORKDIR /app

# 4. COPY PACKAGE FILES FIRST (for better Docker layer caching)
COPY package*.json ./
COPY postinstall.js ./

# 5. INSTALL NODE DEPENDENCIES
RUN npm ci --only=production --no-audit

# 6. COPY APPLICATION CODE
COPY . .

# 7. CREATE NON-ROOT USER FOR SECURITY
RUN groupadd -r botuser && useradd -r -g botuser -G audio,video botuser \
    && chown -R botuser:botuser /app

USER botuser

# 8. EXPOSE PORT (matches Railway's default)
EXPOSE 8080

# 9. HEALTH CHECK (optional but good for Railway)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# 10. START THE APPLICATION
CMD ["npm", "start"]
