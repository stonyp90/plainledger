#!/bin/bash

# Restart servers for real data testing

echo "🔄 Restarting servers for real data testing..."
echo ""

# Find and kill existing backend processes
echo "📦 Stopping backend processes..."
pkill -f "nest start --watch" 2>/dev/null
sleep 2

# Find and kill existing frontend processes  
echo "🌐 Stopping frontend processes..."
pkill -f "vite" 2>/dev/null
sleep 2

echo "✅ Stopped existing processes"
echo ""
echo "📋 To start servers with real data:"
echo ""
echo "   Terminal 1 (Backend):"
echo "   cd apps/api && npm run start:dev"
echo ""
echo "   Terminal 2 (Frontend):"
echo "   cd apps/web && npm run dev"
echo ""
echo "   Then open: http://localhost:5173"
echo ""
echo "   Check browser console for:"
echo "   '[useFinancialData] Mock auth enabled but TEST_REAL_DATA=true'"
echo ""
