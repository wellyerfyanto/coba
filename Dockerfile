FROM node:18-bullseye-slim

# Install hanya dependensi ESSENTIAL untuk Chromium di Debian
RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Set environment untuk Puppeteer gunakan Chromium sistem
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    PORT=8080

WORKDIR /app

# 1. Salin package.json saja dulu
COPY package.json ./

# 2. Install dependencies (gunakan --omit=dev)
RUN npm install --omit=dev --no-audit --no-fund

# 3. Salin semua kode aplikasi
COPY . .

EXPOSE 8080

CMD ["node", "server.js"]
