FROM node:18-bullseye-slim

# 1. Install Chromium dan dependensi sistem yang diperlukan Puppeteer
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
    wget \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# 2. Set environment variabel agar Puppeteer menggunakan Chromium sistem
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    PORT=8080

# 3. Setup direktori kerja dan non-root user untuk keamanan
WORKDIR /app
RUN groupadd -r appuser && useradd -r -g appuser -s /bin/bash appuser
RUN chown -R appuser:appuser /app
USER appuser

# 4. Salin file dependensi dan install
COPY --chown=appuser:appuser package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund --ignore-scripts

# 5. Salin sisa kode aplikasi
COPY --chown=appuser:appuser . .

# 6. Expose port dan jalankan aplikasi
EXPOSE 8080
CMD ["node", "server.js"]
