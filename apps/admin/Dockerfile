# ==============================================================================
# PlainLedger Admin Console - Production Dockerfile
# Multi-stage build for Next.js 14 App Router
# ==============================================================================

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies needed for node-gyp
RUN apk add --no-cache libc6-compat

# Copy package files (context is apps/admin)
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDependencies for build tools like tailwindcss)
RUN npm ci

# Copy source files
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build arguments for Next.js public env vars (baked at build time)
ARG NEXT_PUBLIC_API_URL=https://plainledger.ca
ARG NEXT_PUBLIC_KEYCLOAK_URL=https://auth.plainledger.ca
ARG NEXT_PUBLIC_KEYCLOAK_REALM=plainledger
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=plainledger-admin

# Set them as ENV so Next.js can use them during build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_KEYCLOAK_URL=$NEXT_PUBLIC_KEYCLOAK_URL
ENV NEXT_PUBLIC_KEYCLOAK_REALM=$NEXT_PUBLIC_KEYCLOAK_REALM
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=$NEXT_PUBLIC_KEYCLOAK_CLIENT_ID

# Build the application
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1

CMD ["node", "server.js"]
