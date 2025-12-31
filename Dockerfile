# Gunakan image Node.js versi LTS berbasis Debian
FROM node:18-bullseye-slim

# 1. INSTAL DEPENDENSI SISTEM UNTUK CHROMIUM
# --------------------------------------------------------
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    ca-certificates \
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
    fonts-liberation \
    fonts-freefont-ttf \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# 2. INSTAL GOOGLE CHROME STABLE (untuk Puppeteer)
# --------------------------------------------------------
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 3. SET VARIABEL ENVIRONMENT UNTUK PUPPETEER
# --------------------------------------------------------
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV CHROME_PATH=/usr/bin/google-chrome-stable
ENV CHROMIUM_PATH=/usr/bin/google-chrome-stable
ENV CHROMIUM_FLAGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu --disable-software-rasterizer"
# Atur NODE_ENV ke production untuk performa
ENV NODE_ENV=production

# 4. SETUP APLIKASI DAN USER
# --------------------------------------------------------
RUN mkdir -p /home/node/app && chown -R node:node /home/node

WORKDIR /home/node/app

USER node

# 5. COPY DAN INSTAL DEPENDENSI NODE.JS
# --------------------------------------------------------
# Hanya copy package.json terlebih dahulu
COPY --chown=node:node package.json ./

# GUNAKAN npm install (bukan npm ci)
RUN npm install --production

# 6. COPY SISA KODE APLIKASI
# --------------------------------------------------------
COPY --chown=node:node . .

# 7. JALANKAN APLIKASI
# --------------------------------------------------------
EXPOSE 8080

CMD ["node", "server.js"]
