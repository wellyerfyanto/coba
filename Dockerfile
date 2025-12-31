FROM node:18-alpine

# Install Chromium only (smaller than full Debian)
RUN apk add --no-cache \
    chromium \
    ca-certificates \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    wqy-zenhei \
    ttf-freefont \
    font-noto-regular \
    ttf-liberation

# Set environment variables for Puppeteer
ENV CHROMIUM_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV RAILWAY_ENVIRONMENT=true
ENV NODE_ENV=production

# Add a new user for security
RUN addgroup -S pptruser && adduser -S -G pptruser pptruser

WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production --no-optional

# Copy app files
COPY . .

# Set correct permissions
RUN chown -R pptruser:pptruser /app

# Switch to non-root user
USER pptruser

EXPOSE 8080

CMD ["node", "server.js"]