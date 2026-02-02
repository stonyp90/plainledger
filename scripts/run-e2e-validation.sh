#!/bin/bash

# Enterprise-Grade E2E Validation Script
# Runs complete E2E validation with QuickBooks sandbox integration

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   PlainLedger E2E Validation                              ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker is running"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed.${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node --version)"

# Check Playwright
if ! command -v npx &> /dev/null || ! npx playwright --version &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} Playwright not found, installing..."
    npm install --save-dev @playwright/test
    npx playwright install
fi
echo -e "${GREEN}✓${NC} Playwright installed"

# Step 1: Start Docker services
echo ""
echo "🚀 Step 1: Starting Docker services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC} API not ready yet, waiting..."
    sleep 10
fi

if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} API is healthy"
else
    echo -e "${RED}❌ API is not responding${NC}"
    docker logs plainledger-api --tail 20
    exit 1
fi

# Step 2: Check QuickBooks credentials
echo ""
echo "🔐 Step 2: Checking QuickBooks credentials..."

if [ -f .env.local ]; then
    source .env.local
fi

if [ -z "$QUICKBOOKS_REFRESH_TOKEN" ] || [ -z "$QUICKBOOKS_REALM_ID" ]; then
    echo -e "${YELLOW}⚠${NC} QuickBooks credentials not found"
    echo "   Run: npx tsx scripts/providers/quickbooks/get-token.ts"
    echo ""
    read -p "Do you want to get QuickBooks tokens now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npx tsx scripts/providers/quickbooks/get-token.ts
        source .env.local
    else
        echo -e "${YELLOW}⚠${NC} Skipping QuickBooks real data tests"
        SKIP_QUICKBOOKS=true
    fi
else
    echo -e "${GREEN}✓${NC} QuickBooks credentials found"
fi

# Step 3: Sync QuickBooks data (if credentials available)
if [ -z "$SKIP_QUICKBOOKS" ]; then
    echo ""
    echo "🔄 Step 3: Syncing QuickBooks sandbox data..."
    QUICKBOOKS_REFRESH_TOKEN="$QUICKBOOKS_REFRESH_TOKEN" \
    QUICKBOOKS_REALM_ID="$QUICKBOOKS_REALM_ID" \
    npx tsx scripts/providers/quickbooks/sync-to-gold.ts || {
        echo -e "${YELLOW}⚠${NC} QuickBooks sync failed, continuing with existing data"
    }
fi

# Step 4: Run E2E tests
echo ""
echo "🧪 Step 4: Running E2E tests..."

# Run tests based on what's available
if [ -z "$SKIP_QUICKBOOKS" ]; then
    echo "   Running all test suites..."
    npx playwright test
else
    echo "   Running tests (excluding QuickBooks real data)..."
    npx playwright test --grep-invert "QuickBooks Real Data"
fi

# Step 5: Generate report
echo ""
echo "📊 Step 5: Generating test report..."
npx playwright show-report || echo -e "${YELLOW}⚠${NC} Report generation skipped"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   ✓ E2E Validation Complete!                             ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  - View test report: npm run test:e2e:report"
echo "  - Check screenshots: test-results/"
echo "  - Review logs: docker logs plainledger-api"
