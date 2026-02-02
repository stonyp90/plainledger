#!/bin/bash
# ============================================
# Chart Edge Cases Test Script
# ============================================
# Tests charts with various edge cases:
# - Low data (empty, single point)
# - High data volume
# - Extreme thresholds
# - Negative values
# - Zero values

set -e

echo "🧪 Testing Chart Edge Cases"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

cd "$(dirname "$0")/.."

echo -e "${YELLOW}Running unit tests for chart edge cases...${NC}"
cd apps/web
npm run test:run -- src/components/charts/__tests__/edge-cases.test.tsx src/components/charts/ibcs/__tests__/

echo ""
echo -e "${GREEN}✅ Unit tests completed${NC}"
echo ""

cd ../..

echo -e "${YELLOW}Running E2E tests for chart edge cases...${NC}"
npm run test:e2e -- e2e/chart-edge-cases.spec.ts

echo ""
echo -e "${GREEN}✅ All edge case tests completed${NC}"
