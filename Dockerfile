FROM node:18-alpine

# Install dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

WORKDIR /app

COPY package*.json ./
COPY postinstall.js ./

# Install dependencies
RUN npm ci --only=production

COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S botuser -u 1001 \
    && chown -R botuser:nodejs /app

USER botuser

EXPOSE 8080

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
