FROM node:18-alpine

# Install basic utilities for debugging
RUN apk add --no-cache \
    bash \
    curl \
    wget \
    git \
    nano \
    tree

WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies (skip optional if they fail)
RUN npm install --omit=dev --ignore-scripts || \
    (echo "Some dependencies failed, continuing..." && npm install express cors body-parser fs-extra dotenv --omit=dev)

# Copy app source
COPY . .

# Create required directories
RUN mkdir -p proxy temp logs public libs

# Create placeholder files if missing
RUN if [ ! -f "public/index.html" ]; then \
    echo '<!DOCTYPE html><html><head><title>SEO Bot</title></head><body><h1>SEO Bot</h1><p>Placeholder</p></body></html>' > public/index.html; \
    fi

RUN if [ ! -f "libs/index.js" ]; then \
    echo 'module.exports = { main: () => console.log("Bot placeholder"), stop: () => console.log("Stop placeholder") }' > libs/index.js; \
    fi

# Set permissions
RUN chmod -R 755 /app

# Health check with curl
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Start with debug output
CMD ["npm", "start"]