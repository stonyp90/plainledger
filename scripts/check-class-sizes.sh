#!/bin/bash
# Check for classes exceeding 1000 lines
# This helps enforce modularity and clean architecture

set -e

echo "🔍 Checking class sizes (max 1000 lines)..."
echo ""

THRESHOLD=1000
VIOLATIONS=0

# Check API classes
echo "📊 API Classes:"
find apps/api/src -name "*.ts" -type f -not -path "*/node_modules/*" -not -path "*/__fixtures__/*" -not -path "*/test/*" -not -path "*/__tests__/*" | while read file; do
  lines=$(wc -l < "$file" | tr -d ' ')
  if [ "$lines" -gt "$THRESHOLD" ]; then
    echo "  ❌ $file: $lines lines (exceeds $THRESHOLD)"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

# Check Web classes
echo ""
echo "📊 Web Classes:"
find apps/web/src -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v "__tests__" | while read file; do
  lines=$(wc -l < "$file" | tr -d ' ')
  if [ "$lines" -gt "$THRESHOLD" ]; then
    echo "  ❌ $file: $lines lines (exceeds $THRESHOLD)"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

echo ""
if [ "$VIOLATIONS" -eq 0 ]; then
  echo "✅ All classes are under $THRESHOLD lines"
  exit 0
else
  echo "⚠️  Found $VIOLATIONS classes exceeding $THRESHOLD lines"
  echo ""
  echo "💡 Refactoring suggestions:"
  echo "  1. Extract related functionality into separate services"
  echo "  2. Use composition over inheritance"
  echo "  3. Apply Single Responsibility Principle"
  echo "  4. Split by domain boundaries (DDD)"
  echo ""
  echo "See: apps/api/agent.md - Architecture Enforcement Rules"
  exit 1
fi
