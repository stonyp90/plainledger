#!/bin/bash

# Clarifi - Stop Script
# ======================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "🛑 Stopping Clarifi services..."
docker compose down

echo "✅ All services stopped."
echo ""
echo "To remove volumes (delete all data):"
echo "   docker compose down -v"
