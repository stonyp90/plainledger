#!/bin/bash
# ============================================
# PlainLedger - Local Development Script
# Starts infrastructure in Docker, API and Web locally
# With auto-reload and optimal dev experience
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
echo -e "${BLUE}║                  Auto-reload enabled                          ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Docker is not running. Starting Docker...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open -a Docker
    fi
    echo "Waiting for Docker to start..."
    for i in {1..30}; do
        if docker info > /dev/null 2>&1; then
            break
        fi
        sleep 1
        echo -n "."
    done
    echo ""
fi

# Start infrastructure services
echo -e "${CYAN}[1/5]${NC} ${YELLOW}Starting infrastructure services...${NC}"
docker-compose up -d keycloak-db app-db redis keycloak localstack minio 2>&1 | grep -E "(Creating|Starting)" || true

# Health check function
wait_for_service() {
    local name=$1
    local url=$2
    local max_attempts=$3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "  ${GREEN}✓${NC} $name ready"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    echo -e "  ${RED}✗${NC} $name timeout"
    return 1
}

# Wait for services
echo -e "${CYAN}[2/5]${NC} ${YELLOW}Waiting for services to be ready...${NC}"
wait_for_service "PostgreSQL" "http://localhost:5432" 30 2>/dev/null || true
wait_for_service "Redis" "http://localhost:6379" 10 2>/dev/null || true
wait_for_service "Keycloak" "http://localhost:8080/health/ready" 60

# Check if node_modules exist
echo -e "${CYAN}[3/5]${NC} ${YELLOW}Checking dependencies...${NC}"
if [ ! -d "apps/api/node_modules" ]; then
    echo "  Installing API dependencies..."
    cd apps/api && npm install --prefer-offline && cd ../..
else
    echo -e "  ${GREEN}✓${NC} API dependencies OK"
fi

if [ ! -d "apps/web/node_modules" ]; then
    echo "  Installing Web dependencies..."
    cd apps/web && npm install --prefer-offline && cd ../..
else
    echo -e "  ${GREEN}✓${NC} Web dependencies OK"
fi

# Create log directory
LOG_DIR="/tmp/plainledger-logs"
mkdir -p "$LOG_DIR"

# Clean old logs
rm -f "$LOG_DIR/api.log" "$LOG_DIR/web.log"

# Start API with watch mode
echo -e "${CYAN}[4/5]${NC} ${GREEN}Starting API server with auto-reload...${NC}"
cd apps/api
npm run start:dev > "$LOG_DIR/api.log" 2>&1 &
API_PID=$!
cd ../..

# Wait for API to start
echo "  Waiting for API to compile..."
for i in {1..30}; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} API ready on http://localhost:3000"
        break
    fi
    sleep 1
done

# Start Web with HMR
echo -e "${CYAN}[5/5]${NC} ${GREEN}Starting Web server with HMR...${NC}"
cd apps/web
npm run dev > "$LOG_DIR/web.log" 2>&1 &
WEB_PID=$!
cd ../..

# Wait for Web to start
for i in {1..15}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} Web ready on http://localhost:5173"
        break
    fi
    sleep 1
done

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}    Development environment is ready!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Applications:${NC}"
echo -e "    Web App      →  ${BLUE}http://localhost:5173${NC}"
echo -e "    API          →  ${BLUE}http://localhost:3000${NC}"
echo -e "    API Docs     →  ${BLUE}http://localhost:3000/api/docs${NC}"
echo -e "    GraphQL      →  ${BLUE}http://localhost:3000/graphql${NC}"
echo ""
echo -e "  ${CYAN}Infrastructure:${NC}"
echo -e "    Keycloak     →  ${BLUE}http://localhost:8080${NC} (admin/admin)"
echo -e "    MinIO        →  ${BLUE}http://localhost:9001${NC}"
echo -e "    PostgreSQL   →  localhost:5432"
echo -e "    Redis        →  localhost:6379"
echo ""
echo -e "  ${CYAN}Logs:${NC}"
echo -e "    API          →  tail -f $LOG_DIR/api.log"
echo -e "    Web          →  tail -f $LOG_DIR/web.log"
echo -e "    Both         →  tail -f $LOG_DIR/*.log"
echo ""
echo -e "  ${CYAN}Features:${NC}"
echo -e "    ${GREEN}✓${NC} API auto-reload on file changes"
echo -e "    ${GREEN}✓${NC} Web HMR (instant updates, no refresh needed)"
echo -e "    ${GREEN}✓${NC} TypeScript type checking"
echo -e "    ${GREEN}✓${NC} GraphQL hot reloading"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping services...${NC}"
    
    # Kill API
    if [ ! -z "$API_PID" ] && kill -0 $API_PID 2>/dev/null; then
        kill $API_PID 2>/dev/null
        echo -e "  ${GREEN}✓${NC} API stopped"
    fi
    
    # Kill Web
    if [ ! -z "$WEB_PID" ] && kill -0 $WEB_PID 2>/dev/null; then
        kill $WEB_PID 2>/dev/null
        echo -e "  ${GREEN}✓${NC} Web stopped"
    fi
    
    # Also kill any orphaned processes
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

# Tail logs with color coding
echo -e "${CYAN}═══════════════════ Live Logs ═══════════════════${NC}"
tail -f "$LOG_DIR/api.log" "$LOG_DIR/web.log" 2>/dev/null &
TAIL_PID=$!

# Wait for processes
wait $API_PID $WEB_PID 2>/dev/null || true
kill $TAIL_PID 2>/dev/null || true
