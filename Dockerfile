FROM node:18-bullseye-slim

# 1. INSTALL SYSTEM DEPENDENCIES (Termasuk Chromium untuk Puppeteer)
RUN apt-get update && apt-get install -y \
    chromium \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
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
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# 2. SET ENVIRONMENT VARIABLES FOR PUPPETEER
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    PORT=8080

# 3. FIX PERMISSIONS AND CREATE NECESSARY DIRS
RUN mkdir -p /tmp/chrome-user-data && chmod 777 /tmp/chrome-user-data

WORKDIR /app

# 4. COPY PACKAGE FILES
COPY package*.json ./

# 5. INSTALL DEPENDENCIES (FIXED COMMAND)
# Gunakan 'npm install' jika 'package-lock.json' tidak ada/tidak valid
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --no-audit --no-fund; \
    else \
      npm install --omit=dev --no-audit --no-fund; \
      npm cache clean --force; \
    fi

# 6. COPY APPLICATION CODE
COPY . .

# 7. CREATE NON-ROOT USER (Security best practice)
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# 8. EXPOSE PORT
EXPOSE 8080

# 9. HEALTH CHECK
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# 10. START THE APPLICATION
CMD ["node", "server.js"]
