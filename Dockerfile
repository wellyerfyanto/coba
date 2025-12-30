FROM node:18-bullseye-slim

# Install Chromium hanya dengan dependencies essential
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

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --omit=dev --no-audit --no-fund

# Copy app code
COPY . .

EXPOSE 8080

# Run application
CMD ["node", "server.js"]
