FROM node:18-alpine

# Install basic utilities
RUN apk add --no-cache \
    bash \
    curl \
    wget \
    git

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (skip optional ones if they fail)
RUN npm install --omit=dev --ignore-scripts || \
    (echo "Installing core dependencies..." && \
     npm install express cors body-parser fs-extra dotenv axios --save)

# Copy application
COPY . .

# Create directories
RUN mkdir -p proxy logs temp public

# Create placeholder HTML if missing
RUN if [ ! -f "public/index.html" ]; then \
    echo '<!DOCTYPE html><html><head><title>SEO Bot</title></head><body><h1>SEO Bot</h1><p>Loading...</p></body></html>' > public/index.html; \
    fi

# Set permissions
RUN chmod -R 755 /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["npm", "start"]