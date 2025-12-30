FROM node:18-bullseye-slim

# Install dependencies untuk Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    lsb-release \
    wget \
    xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    PORT=8080

WORKDIR /app

# Copy package files DAN postinstall.js terlebih dahulu
COPY package*.json postinstall.js ./

# Install dependencies
RUN npm install --omit=dev --no-audit --no-fund

# Copy app source
COPY . .

# Create necessary directories
RUN mkdir -p sessions public/uploads

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/health').catch(() => process.exit(1))"

CMD ["node", "server.js"]
