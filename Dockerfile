# ==================================
# EDU Backend - Production Dockerfile
# Node.js 18 + TypeScript
# Optimized for stdout/stderr log streaming in Docker & AWS CloudWatch
# ==================================

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (canvas, cairo, etc.)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

# Copy package metadata
COPY package*.json ./

# Install all dependencies (including devDependencies required for build)
RUN npm ci

# Copy full application source code
COPY . .

# Build TypeScript to JavaScript in /app/dist
RUN npm run build

# Stage 2: Production Runtime
FROM node:18-alpine

WORKDIR /app

# Install runtime C libraries and tini for process init / signal / log handling
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    tini

# Copy package metadata
COPY package*.json ./

# Install production dependencies only and clean npm cache
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled dist from builder
COPY --from=builder /app/dist ./dist

# Copy migrations directory if present
COPY --from=builder /app/migrations ./migrations

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create logs directory and assign permissions to non-root user
RUN mkdir -p logs uploads && chown -R nodejs:nodejs /app

USER nodejs

# =====================================
# Environment variables for logging & networking
# =====================================
ENV NODE_ENV=production
ENV PORT=3000
ENV FORCE_COLOR=1
ENV NODE_OPTIONS="--enable-source-maps"
ENV NPM_CONFIG_LOGLEVEL=verbose
ENV PYTHONUNBUFFERED=1
ENV NODE_NO_WARNINGS=0

# Expose backend port
EXPOSE 3000

# Health check to ensure service readiness
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use tini as PID 1 init process for process signal handling and log forwarding
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--trace-warnings", "--unhandled-rejections=strict", "dist/index.js"]
