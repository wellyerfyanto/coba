FROM node:18-bullseye-slim

# Install Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Environment untuk Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    PORT=8080

WORKDIR /app

# Hanya salin package.json
COPY package.json ./

# Gunakan npm install (bukan npm ci) karena tidak ada lock file
RUN npm install --omit=dev --no-audit --no-fund

# Salin kode aplikasi
COPY . .

EXPOSE 8080
CMD ["node", "server.js"]
