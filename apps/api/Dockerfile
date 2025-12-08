FROM node:20-alpine

WORKDIR /app

# Use npm mirror for reliability
RUN npm config set registry https://registry.npmmirror.com

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev || npm install --omit=dev

# Copy source code
COPY . .

# Expose API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the API
CMD ["node", "src/index.js"]
