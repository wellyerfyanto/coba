# Gunakan base image yang lebih ringan
FROM node:18-alpine

# Install chromium dependencies di Alpine
RUN apk update && apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn \
    python3 \
    make \
    g++

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production \
    PORT=8080 \
    CHROMIUM_PATH=/usr/bin/chromium-browser

# Optional: Add user for security
RUN addgroup -S pptruser && adduser -S -G pptruser pptruser

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --no-audit --no-fund

# Copy app
COPY . .

# Fix permissions
RUN mkdir -p /tmp/chrome-user-data && \
    chown -R pptruser:pptruser /tmp/chrome-user-data && \
    chown -R pptruser:pptruser /app

# Switch to non-root user
USER pptruser

EXPOSE 8080

# Health check dengan timeout lebih panjang
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=5 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start dengan graceful shutdown handler
CMD ["npm", "start"]
