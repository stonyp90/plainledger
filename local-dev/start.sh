#!/bin/bash
# ============================================
# PlainLedger - Local Development Start Script
# ============================================

set -e

echo "▢ PlainLedger - Starting local development environment..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Start infrastructure services
echo -e "${YELLOW}Starting infrastructure services...${NC}"
docker-compose up -d keycloak-db app-db redis minio

# Wait for databases to be ready
echo -e "${YELLOW}Waiting for databases...${NC}"
sleep 5

# Start Keycloak
echo -e "${YELLOW}Starting Keycloak...${NC}"
docker-compose up -d keycloak

# Wait for Keycloak to be ready
echo -e "${YELLOW}Waiting for Keycloak to initialize (this may take a minute)...${NC}"
until curl -s http://localhost:8080/health/ready > /dev/null 2>&1; do
    sleep 5
    echo "  Waiting for Keycloak..."
done

echo ""
echo -e "${GREEN}Infrastructure is ready!${NC}"
echo ""
echo "============================================"
echo "  PlainLedger Development Environment"
echo "============================================"
echo ""
echo "Services:"
echo "  - Keycloak:   http://localhost:8080 (admin/admin)"
echo "  - PostgreSQL: localhost:5432 (plainledger/plainledger_secret)"
echo "  - Redis:      localhost:6379"
echo "  - MinIO:      http://localhost:9001 (plainledger/plainledger_secret)"
echo ""
echo "Next steps:"
echo "  1. Start API:  cd apps/api && npm install && npm run start:dev"
echo "  2. Start Web:  cd apps/web && npm install && npm run dev"
echo ""
echo "Web app will be available at: http://localhost:5173"
echo "API will be available at: http://localhost:3000"
echo ""
