FROM node:18-bullseye-slim

# 1. INSTALL SYSTEM DEPENDENCIES FOR CHROMIUM
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
    libgbm1 \
    libgcc1 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
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
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# 2. SET ENVIRONMENT VARIABLES FOR PUPPETEER
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    PORT=8080

# 3. FIX FOR CRASHPAD ERROR: Set writable directories for Chrome
ENV XDG_RUNTIME_DIR=/tmp/.chromium \
    XDG_CONFIG_HOME=/tmp/.chromium \
    HOME=/tmp/.chromium

WORKDIR /app

# 4. COPY PACKAGE FILES AND INSTALL DEPENDENCIES
COPY package*.json ./
RUN npm install --only=production --no-audit

# 5. COPY APPLICATION CODE
COPY . .

# 6. CREATE DIRECTORIES FOR CHROME WITH PROPER PERMISSIONS
# This is CRITICAL for fixing the crashpad error
RUN mkdir -p /tmp/chrome-user-data /tmp/.chromium && \
    chmod -R 777 /tmp && \
    chown -R node:node /tmp

# 7. CREATE NON-ROOT USER FOR SECURITY
RUN groupadd -r botuser && useradd -r -g botuser -G audio,video botuser && \
    chown -R botuser:botuser /app /tmp/chrome-user-data /tmp/.chromium

USER botuser

# 8. EXPOSE PORT
EXPOSE 8080

# 9. HEALTH CHECK (optional but recommended)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# 10. START THE APPLICATION
CMD ["npm", "start"]
