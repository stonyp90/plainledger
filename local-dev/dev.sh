#!/bin/bash
# ============================================
# PlainLedger - Local Development Script
# Starts infrastructure in Docker, API and Web locally
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   PlainLedger - Local Development Setup            ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════╝${NC}"
echo ""

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker is not running. Starting Docker...${NC}"
    open -a Docker
    echo "Waiting for Docker to start..."
    sleep 10
fi

# Start infrastructure services
echo -e "${YELLOW}📦 Starting infrastructure services (Docker)...${NC}"
docker-compose up -d keycloak-db app-db redis keycloak localstack minio 2>&1 | grep -v "unchanged" || true

# Wait for databases to be ready
echo -e "${YELLOW}⏳ Waiting for databases...${NC}"
sleep 5

# Wait for Keycloak to be ready
echo -e "${YELLOW}⏳ Waiting for Keycloak to initialize...${NC}"
until curl -s http://localhost:8080/health/ready > /dev/null 2>&1; do
    sleep 2
    echo -n "."
done
echo ""

echo ""
echo -e "${GREEN}✅ Infrastructure is ready!${NC}"
echo ""
echo "============================================"
echo "  Services Running:"
echo "============================================"
echo "  - Keycloak:   http://localhost:8080"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis:      localhost:6379"
echo "  - LocalStack: http://localhost:4566"
echo "  - MinIO:      http://localhost:9001"
echo ""
echo "============================================"
echo "  Starting API and Web locally..."
echo "============================================"
echo ""

# Check if node_modules exist
if [ ! -d "apps/api/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing API dependencies...${NC}"
    cd apps/api && npm install && cd ../..
fi

if [ ! -d "apps/web/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing Web dependencies...${NC}"
    cd apps/web && npm install && cd ../..
fi

# Start API in background
echo -e "${GREEN}🚀 Starting API (http://localhost:3000)...${NC}"
cd apps/api
npm run start:dev > /tmp/plainledger-api.log 2>&1 &
API_PID=$!
cd ../..

# Start Web in background
echo -e "${GREEN}🚀 Starting Web (http://localhost:5173)...${NC}"
cd apps/web
npm run dev > /tmp/plainledger-web.log 2>&1 &
WEB_PID=$!
cd ../..

# Wait a bit for services to start
sleep 5

echo ""
echo -e "${GREEN}✅ Development servers are starting!${NC}"
echo ""
echo "============================================"
echo "  Access Points:"
echo "============================================"
echo "  - Web App:    http://localhost:5173"
echo "  - API:        http://localhost:3000"
echo "  - API Docs:   http://localhost:3000/api/docs"
echo ""
echo "============================================"
echo "  Logs:"
echo "============================================"
echo "  - API logs:   tail -f /tmp/plainledger-api.log"
echo "  - Web logs:   tail -f /tmp/plainledger-web.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping services...${NC}"
    kill $API_PID 2>/dev/null || true
    kill $WEB_PID 2>/dev/null || true
    echo -e "${GREEN}✅ Services stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for user interrupt
wait
