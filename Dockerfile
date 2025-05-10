# ==========================================
# Base Stage - Common dependencies and configurations
# ==========================================
FROM node:20-alpine AS base

WORKDIR /app

# Install system dependencies and create necessary directories in one layer
RUN apk add --no-cache openssl openssl-dev curl dumb-init && \
    mkdir -p /app/storage /app/tmp /app/uploads /app/certs && \
    chown -R node:node /app && \
    npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-factor 2 && \
    npm config set fetch-retry-mintimeout 10000 && \
    npm config set fetch-retry-maxtimeout 60000

# ==========================================
# Dependencies Stage - Install dependencies
# ==========================================
FROM base AS dependencies

# Copy package files first to leverage Docker cache
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies
RUN npm ci --fetch-retries=5

# ==========================================
# Builder Stage - Compile TypeScript to JavaScript
# ==========================================
FROM dependencies AS builder

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY --chown=node:node . .

# Build application
RUN npm run build && mkdir -p dist/modules/email/templates && node copy-templates.js

# Run security audit (non-blocking)
RUN npm audit --production --audit-level=high || echo "Security vulnerabilities found. Review the audit output."

# ==========================================
# Development Stage - Hot reload and debugging
# ==========================================
FROM dependencies AS development

# Copy source for development
COPY --chown=node:node . .

# Set default environment variables
ENV NODE_ENV=development \
    PORT=3001 \
    NODE_OPTIONS="--max-old-space-size=512"

# Generate Prisma client
RUN npx prisma generate

# Copy templates for development
RUN mkdir -p dist/modules/email/templates && node copy-templates.js

EXPOSE 3001

USER node

CMD ["npm", "run", "start:dev"]

# ==========================================
# Production Stage - Minimal production image
# ==========================================
FROM base AS production

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --omit=dev --fetch-retries=5 && \
    npx prisma generate && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_OPTIONS="--max-old-space-size=512"

# Ensure proper permissions for storage directories
RUN mkdir -p /app/storage /app/tmp /app/uploads && \
    chown -R node:node /app/storage /app/tmp /app/uploads

# Switch to non-root user
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Use dumb-init as PID 1 to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npm", "run", "start:prod"] 