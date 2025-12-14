# Optimized Dockerfile for Railway (No Chrome/Selenium)
FROM node:18-alpine

# Install system dependencies (minimal)
RUN apk add --no-cache \
    curl \
    wget \
    git \
    bash \
    tzdata

# Set timezone
ENV TZ=UTC

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (skip optional ones)
RUN npm install --omit=dev --ignore-scripts

# Copy application
COPY . .

# Create necessary directories
RUN mkdir -p proxy temp logs public

# Create a simple index.html if missing
RUN if [ ! -f "public/index.html" ]; then \
    echo '<!DOCTYPE html><html><head><title>SEO Traffic Bot</title></head><body><h1>SEO Traffic Bot - Railway</h1><p>HTTP Traffic Simulator</p></body></html>' > public/index.html; \
    fi

# Set permissions
RUN chmod -R 755 /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]