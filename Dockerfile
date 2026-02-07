# ==================================
# EDU Backend - Production Dockerfile
# Node.js 18 + TypeScript
# Optimized for proper logging in Docker/VM
# ==================================

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (canvas, etc.)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

# Copy package files
COPY package*.json ./

# Install dependencies (including dev for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Install runtime dependencies + tini for proper init process
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    tini

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Copy migrations directory
COPY --from=builder /app/migrations ./migrations

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create logs directory and set ownership
RUN mkdir -p logs && chown -R nodejs:nodejs logs /app

USER nodejs

# =====================================
# Environment variables for PROPER LOGGING
# =====================================
ENV NODE_ENV=production
# Force colors in output
ENV FORCE_COLOR=1
# Disable output buffering for console.log
ENV NODE_OPTIONS="--enable-source-maps"
# Force npm to use unbuffered output
ENV NPM_CONFIG_LOGLEVEL=verbose
# Python unbuffered (if any python scripts run)
ENV PYTHONUNBUFFERED=1
# Disable Node.js warning about DEP0111
ENV NODE_NO_WARNINGS=0

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use tini as init process for proper signal handling and log forwarding
# --trace-warnings shows where warnings come from
# 2>&1 ensures stderr goes to stdout for unified logging
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--trace-warnings", "--unhandled-rejections=strict", "dist/index.js"]
