# ============================================
# PlainLedger API - Multi-stage Dockerfile
# ============================================

# Stage 1: Dependencies (production only)
FROM node:22-alpine AS deps
WORKDIR /app
COPY apps/api/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
# CACHE_BUST ensures fresh npm ci and build when code changes
ARG CACHE_BUST
RUN echo "Build ID: ${CACHE_BUST:-no-cache-bust}"
COPY apps/api/package*.json ./
RUN npm ci
COPY apps/api ./
RUN npm run build

# Stage 3: Production
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy built application
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/scripts ./scripts

# Copy email templates (not compiled by TypeScript)
COPY --from=builder /app/src/templates ./dist/templates

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/ready || exit 1

CMD ["node", "dist/main"]
