#!/bin/bash
# ============================================
# Run All Tests - Unit + E2E
# ============================================

set -e

echo "🧪 Running All Tests"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cd "$(dirname "$0")/.."

# 1. Unit Tests
echo -e "${YELLOW}1. Running Unit Tests...${NC}"
cd apps/web
npm run test:run -- src/components/charts/ibcs/__tests__/ || {
  echo -e "${RED}❌ Unit tests failed${NC}"
  exit 1
}
echo -e "${GREEN}✅ Unit tests passed${NC}"
echo ""

cd ../..

# 2. Check if dev server is running
echo -e "${YELLOW}2. Checking dev server...${NC}"
if ! lsof -ti:5173 > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Dev server not running on port 5173${NC}"
  echo -e "${YELLOW}   Start it with: cd apps/web && npm run dev${NC}"
  echo -e "${YELLOW}   Then run E2E tests separately${NC}"
  exit 0
fi
echo -e "${GREEN}✅ Dev server running${NC}"
echo ""

# 3. E2E Tests (if server is running)
echo -e "${YELLOW}3. Running E2E Tests...${NC}"
echo -e "${YELLOW}   Note: E2E tests require authentication setup${NC}"
echo -e "${YELLOW}   Run manually: npm run test:e2e -- e2e/chart-edge-cases.spec.ts${NC}"
echo ""

echo -e "${GREEN}✅ Test script complete${NC}"
echo ""
echo "To run E2E tests manually:"
echo "  npm run test:e2e -- e2e/chart-edge-cases.spec.ts"
echo "  npm run test:e2e -- e2e/ibcs-compliance.spec.ts"
