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
    && rm -rf /var/cache/apk/*

# Set environment variables for Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs \
    && adduser -S botuser -u 1001 \
    && chown -R botuser:nodejs /app

USER botuser

EXPOSE 3000

CMD ["npm", "start"]
