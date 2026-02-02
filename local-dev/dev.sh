#!/bin/bash
# ============================================
# PlainLedger - Local Development Script
# One-command setup: ./local-dev/dev.sh
# ============================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

clear
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        PlainLedger - Local Development Environment            ║${NC}"
echo -e "${BLUE}║            One-command setup with demo data                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Parse arguments
SEED_DATA=true
SKIP_DOCKER=false
for arg in "$@"; do
    case $arg in
        --no-seed)
            SEED_DATA=false
            shift
            ;;
        --skip-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --help)
            echo "Usage: ./local-dev/dev.sh [options]"
            echo ""
            echo "Options:"
            echo "  --no-seed      Skip seeding demo data"
            echo "  --skip-docker  Skip starting Docker services (assumes already running)"
            echo "  --help         Show this help message"
            exit 0
            ;;
    esac
done

# Check if docker is running
if [ "$SKIP_DOCKER" = false ]; then
    if ! docker info > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Docker is not running. Starting Docker...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open -a Docker
        fi
        echo "Waiting for Docker to start..."
        for i in {1..60}; do
            if docker info > /dev/null 2>&1; then
                echo -e "${GREEN}✓ Docker is ready${NC}"
                break
            fi
            sleep 1
            echo -n "."
        done
        echo ""
    fi
fi

# Health check function
wait_for_service() {
    local name=$1
    local check_cmd=$2
    local max_attempts=${3:-30}
    local attempt=1
    
    printf "  Waiting for %-12s " "$name..."
    while [ $attempt -le $max_attempts ]; do
        if eval "$check_cmd" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC}"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    echo -e "${RED}✗ timeout${NC}"
    return 1
}

# Start Docker services if not skipped
if [ "$SKIP_DOCKER" = false ]; then
    echo -e "${CYAN}[1/6]${NC} ${YELLOW}Starting Docker infrastructure...${NC}"
    
    # Start all infrastructure services (exclude api/web containers - we run those locally)
    docker-compose up -d \
        keycloak-db \
        app-db \
        redis \
        mongodb \
        localstack \
        minio \
        keycloak \
        mailhog \
        2>&1 | grep -E "(Creating|Starting|Started)" || true
    
    echo ""
    echo -e "${CYAN}[2/6]${NC} ${YELLOW}Waiting for services to be healthy...${NC}"
    
    # Wait for critical services
    wait_for_service "PostgreSQL" "docker exec plainledger-app-db pg_isready -U plainledger" 30
    wait_for_service "Redis" "docker exec plainledger-redis redis-cli ping" 15
    wait_for_service "MongoDB" "docker exec plainledger-mongodb mongosh --eval 'db.adminCommand(\"ping\")' --quiet" 20
    wait_for_service "LocalStack" "curl -s http://localhost:4566/_localstack/health" 30
    wait_for_service "Keycloak" "curl -s http://localhost:8080/health/ready" 90
    
    echo ""
else
    echo -e "${CYAN}[1/6]${NC} ${YELLOW}Skipping Docker (--skip-docker flag)${NC}"
    echo -e "${CYAN}[2/6]${NC} ${YELLOW}Skipping health checks${NC}"
    echo ""
fi

# Check and install dependencies
echo -e "${CYAN}[3/6]${NC} ${YELLOW}Checking dependencies...${NC}"
DEPS_INSTALLED=false

if [ ! -d "apps/api/node_modules" ]; then
    echo "  Installing API dependencies..."
    (cd apps/api && npm install --prefer-offline --silent)
    DEPS_INSTALLED=true
else
    echo -e "  ${GREEN}✓${NC} API dependencies OK"
fi

if [ ! -d "apps/web/node_modules" ]; then
    echo "  Installing Web dependencies..."
    (cd apps/web && npm install --prefer-offline --silent)
    DEPS_INSTALLED=true
else
    echo -e "  ${GREEN}✓${NC} Web dependencies OK"
fi
echo ""

# Seed demo data if requested
if [ "$SEED_DATA" = true ]; then
    echo -e "${CYAN}[4/6]${NC} ${YELLOW}Seeding demo data to S3...${NC}"
    
    # Check if data already exists
    EXISTING_DATA=$(aws --endpoint-url http://localhost:4566 s3 ls s3://plainledger-gold/dim_account/demo-org/ 2>/dev/null || echo "")
    
    if [ -z "$EXISTING_DATA" ]; then
        S3_ENDPOINT=http://localhost:4566 \
        AWS_ACCESS_KEY_ID=test \
        AWS_SECRET_ACCESS_KEY=test \
        npx tsx scripts/datalake/seed-gold.ts 2>&1 | grep -E "(✅|📊|🎉|Uploaded|Generated)" || true
        echo -e "  ${GREEN}✓${NC} Demo data seeded successfully"
    else
        echo -e "  ${GREEN}✓${NC} Demo data already exists (use --no-seed to skip check)"
    fi
    echo ""
else
    echo -e "${CYAN}[4/6]${NC} ${YELLOW}Skipping demo data seed (--no-seed flag)${NC}"
    echo ""
fi

# Create log directory
LOG_DIR="/tmp/plainledger-logs"
mkdir -p "$LOG_DIR"
rm -f "$LOG_DIR/api.log" "$LOG_DIR/web.log"

# Start API with SKIP_AUTH for local development
echo -e "${CYAN}[5/6]${NC} ${GREEN}Starting API server (SKIP_AUTH=true)...${NC}"
cd apps/api
SKIP_AUTH=true \
NODE_ENV=development \
DB_HOST=localhost \
DB_PORT=5432 \
DB_NAME=plainledger \
DB_USERNAME=plainledger \
DB_PASSWORD=plainledger_secret \
REDIS_HOST=localhost \
REDIS_PORT=6379 \
S3_ENDPOINT=http://localhost:4566 \
S3_REGION=us-east-1 \
AWS_ACCESS_KEY_ID=test \
AWS_SECRET_ACCESS_KEY=test \
MONGODB_URI="mongodb://plainledger:plainledger_secret@localhost:27017/plainledger_analytics?authSource=admin" \
KEYCLOAK_URL=http://localhost:8080 \
KEYCLOAK_REALM=plainledger \
npm run start:dev > "$LOG_DIR/api.log" 2>&1 &
API_PID=$!
cd ../..

# Wait for API
printf "  Waiting for API to compile..."
for i in {1..60}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    sleep 1
    printf "."
done
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e " ${RED}✗ API failed to start${NC}"
    echo "  Check logs: tail -f $LOG_DIR/api.log"
fi
echo ""

# Start Web
echo -e "${CYAN}[6/6]${NC} ${GREEN}Starting Web server (HMR enabled)...${NC}"
cd apps/web
VITE_API_URL=http://localhost:3000 \
VITE_GRAPHQL_URL=http://localhost:3000/graphql \
VITE_KEYCLOAK_URL=http://localhost:8080 \
VITE_KEYCLOAK_REALM=plainledger \
VITE_KEYCLOAK_CLIENT_ID=plainledger-web \
VITE_TEST_REAL_DATA=true \
npm run dev > "$LOG_DIR/web.log" 2>&1 &
WEB_PID=$!
cd ../..

# Wait for Web
printf "  Waiting for Web to start..."
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    sleep 1
    printf "."
done
echo ""

# Print success banner
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}    PlainLedger is ready! 🚀${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Applications:${NC}"
echo -e "    Web App      →  ${BLUE}http://localhost:5173${NC}"
echo -e "    API          →  ${BLUE}http://localhost:3000${NC}"
echo -e "    API Docs     →  ${BLUE}http://localhost:3000/api/docs${NC}"
echo -e "    GraphQL      →  ${BLUE}http://localhost:3000/graphql${NC}"
echo ""
echo -e "  ${CYAN}Demo Login:${NC}"
echo -e "    Email        →  ${YELLOW}demo@plainledger.ca${NC}"
echo -e "    Password     →  ${YELLOW}DemoPass123!@#${NC}"
echo ""
echo -e "  ${CYAN}Infrastructure:${NC}"
echo -e "    Keycloak     →  ${BLUE}http://localhost:8080${NC} (admin/admin)"
echo -e "    MinIO        →  ${BLUE}http://localhost:9001${NC}"
echo -e "    Mailhog      →  ${BLUE}http://localhost:8025${NC}"
echo -e "    PostgreSQL   →  localhost:5432"
echo -e "    Redis        →  localhost:6379"
echo -e "    MongoDB      →  localhost:27017"
echo -e "    LocalStack   →  localhost:4566"
echo ""
echo -e "  ${CYAN}Logs:${NC}"
echo -e "    API          →  tail -f $LOG_DIR/api.log"
echo -e "    Web          →  tail -f $LOG_DIR/web.log"
echo ""
echo -e "  ${CYAN}Features:${NC}"
echo -e "    ${GREEN}✓${NC} Auth bypass enabled (SKIP_AUTH=true)"
echo -e "    ${GREEN}✓${NC} Demo data pre-seeded"
echo -e "    ${GREEN}✓${NC} API auto-reload on file changes"
echo -e "    ${GREEN}✓${NC} Web HMR (instant updates)"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping services...${NC}"
    
    # Kill API
    if [ ! -z "$API_PID" ] && kill -0 $API_PID 2>/dev/null; then
        kill $API_PID 2>/dev/null || true
        echo -e "  ${GREEN}✓${NC} API stopped"
    fi
    
    # Kill Web
    if [ ! -z "$WEB_PID" ] && kill -0 $WEB_PID 2>/dev/null; then
        kill $WEB_PID 2>/dev/null || true
        echo -e "  ${GREEN}✓${NC} Web stopped"
    fi
    
    # Kill orphaned processes
    pkill -f "nest start" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    
    echo ""
    echo -e "${GREEN}Development servers stopped.${NC}"
    echo -e "${CYAN}Docker services are still running.${NC}"
    echo -e "Run ${YELLOW}docker-compose down${NC} to stop infrastructure."
    echo ""
    exit 0
}

trap cleanup SIGINT SIGTERM

# Tail logs
echo -e "${CYAN}═══════════════════ Live Logs ═══════════════════${NC}"
tail -f "$LOG_DIR/api.log" "$LOG_DIR/web.log" 2>/dev/null &
TAIL_PID=$!

# Wait for processes
wait $API_PID $WEB_PID 2>/dev/null || true
kill $TAIL_PID 2>/dev/null || true
