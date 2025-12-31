FROM node:18-slim

# 1. Instal dependensi sistem yang diperlukan untuk Chromium (dalam Debian)
RUN apt-get update \
    && apt-get install -y wget gnupg ca-certificates \
    && apt-get install -y \
       fonts-liberation \
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
       xdg-utils \
       --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 2. Buat direktori untuk Chromium dan set non-root user
RUN mkdir -p /app && chown -R node:node /app

# 3. Set environment variable untuk Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /app

# 4. Copy file package dan install dependencies Node.js
COPY package.json package-lock.json ./
RUN npm ci --only=production

# 5. Copy sisa kode aplikasi
COPY . .

# 6. Jalankan sebagai user non-root (lebih aman)
USER node

EXPOSE 8080
CMD ["node", "server.js"]
