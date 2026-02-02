# ============================================
# PlainLedger Web - Multi-stage Dockerfile
# ============================================
# Using Debian-slim instead of Alpine for better native module compatibility
# (Rollup v4+ requires glibc-based binaries that work better with Debian)

# Stage 1: Build
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Install dependencies including optional ones for native modules (rollup, etc.)
COPY apps/web/package*.json ./
RUN npm ci --include=optional

# Copy source and build
COPY apps/web/ ./

# Build arguments for Vite environment variables
ARG VITE_API_URL=http://localhost:3000
ARG VITE_KEYCLOAK_URL=http://localhost:8080
ARG VITE_KEYCLOAK_REALM=plainledger
ARG VITE_KEYCLOAK_CLIENT_ID=plainledger-web
ARG VITE_MOCK_AUTH=false

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL
ENV VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM
ENV VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID
ENV VITE_MOCK_AUTH=$VITE_MOCK_AUTH

RUN npm run build

# Stage 2: Production (nginx)
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
