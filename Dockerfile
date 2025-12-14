FROM node:18-alpine

# Install Chrome dependencies and basic utilities
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji \
    bash \
    curl \
    wget \
    git \
    nano \
    tree

# Set Chrome path
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (skip chrome/selenium if they fail)
RUN npm install --omit=dev --ignore-scripts || \
    (echo "Some optional dependencies failed, installing core..." && \
     npm install express cors body-parser fs-extra dotenv --save)

# Copy app source
COPY . .

# Create required directories
RUN mkdir -p proxy temp logs public libs

# Create placeholder files if missing
RUN if [ ! -f "public/index.html" ]; then \
    echo '<!DOCTYPE html><html><head><title>SEO Bot</title></head><body><h1>SEO Bot</h1><p>Placeholder</p></body></html>' > public/index.html; \
    fi

# Set permissions
RUN chmod -R 755 /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]