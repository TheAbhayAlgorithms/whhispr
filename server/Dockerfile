# ============================================================
# Whispr Server — Production Multi-Stage Dockerfile
# ============================================================

# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and documentation
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript and copy documentation
RUN npm run build

# Prune devDependencies to keep image lean
RUN npm prune --production

# ============================================================
# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Install dumb-init for proper signal handling and zombie reaping
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=4000

# Create uploads directory with non-root permissions
RUN mkdir -p /app/uploads && chown -R node:node /app

# Copy production dependencies and compiled artifacts
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist

# Run as non-root user for security hardening
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/index.js"]
