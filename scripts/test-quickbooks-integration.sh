#!/bin/bash
# ============================================
# QuickBooks Integration Test Script
# ============================================
# This script helps test the full QuickBooks integration flow.
#
# Usage:
#   ./scripts/test-quickbooks-integration.sh [command]
#
# Commands:
#   setup     - Start docker-compose and prepare environment
#   oauth     - Generate OAuth URL and instructions
#   callback  - Handle OAuth callback (with code and realmId)
#   sync      - Trigger a full data sync
#   test      - Run integration tests
#   ngrok     - Start ngrok tunnel for local testing
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
fi

# Default values
QUICKBOOKS_CLIENT_ID="${QUICKBOOKS_CLIENT_ID:-}"
QUICKBOOKS_CLIENT_SECRET="${QUICKBOOKS_CLIENT_SECRET:-}"
API_URL="${API_URL:-http://localhost:3000}"
QUICKBOOKS_REDIRECT_URI="${QUICKBOOKS_REDIRECT_URI:-$API_URL/api/v1/datasources/oauth/quickbooks/callback}"

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

header() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}  $1${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
}

# ============================================
# Commands
# ============================================

cmd_setup() {
    header "Setting Up PlainLedger Environment"
    
    # Check if .env exists
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        error ".env file not found!"
        echo "Please create a .env file with your QuickBooks credentials:"
        echo ""
        echo "  QUICKBOOKS_CLIENT_ID=your_client_id"
        echo "  QUICKBOOKS_CLIENT_SECRET=your_client_secret"
        exit 1
    fi
    
    # Check QuickBooks credentials
    if [ -z "$QUICKBOOKS_CLIENT_ID" ]; then
        error "QUICKBOOKS_CLIENT_ID not set in .env"
        exit 1
    fi
    
    success "QuickBooks Client ID: ${QUICKBOOKS_CLIENT_ID:0:10}...${QUICKBOOKS_CLIENT_ID: -4}"
    success "QuickBooks Client Secret: ****${QUICKBOOKS_CLIENT_SECRET: -4}"
    
    # Start docker-compose
    log "Starting Docker services..."
    cd "$PROJECT_ROOT"
    docker-compose up -d app-db redis minio
    
    # Wait for database
    log "Waiting for database to be ready..."
    sleep 5
    
    # Check if database is ready
    until docker-compose exec -T app-db pg_isready -U plainledger > /dev/null 2>&1; do
        log "Waiting for PostgreSQL..."
        sleep 2
    done
    
    success "Database is ready!"
    
    # Start Keycloak
    log "Starting Keycloak..."
    docker-compose up -d keycloak
    
    echo ""
    success "Environment is ready!"
    echo ""
    echo "Next steps:"
    echo "  1. Start the API:  cd apps/api && npm run start:dev"
    echo "  2. Start the Web:  cd apps/web && npm run dev"
    echo "  3. Run OAuth:      ./scripts/test-quickbooks-integration.sh oauth"
}

cmd_oauth() {
    header "QuickBooks OAuth Authorization"
    
    # Check credentials
    if [ -z "$QUICKBOOKS_CLIENT_ID" ]; then
        error "QUICKBOOKS_CLIENT_ID not set"
        exit 1
    fi
    
    # Generate state
    STATE="plainledger_$(date +%s)"
    
    # Build OAuth URL
    SCOPES="com.intuit.quickbooks.accounting%20openid%20profile%20email"
    OAUTH_URL="https://appcenter.intuit.com/connect/oauth2?client_id=${QUICKBOOKS_CLIENT_ID}&redirect_uri=${QUICKBOOKS_REDIRECT_URI//&/%26}&response_type=code&scope=${SCOPES}&state=${STATE}"
    
    echo ""
    log "OAuth Configuration:"
    echo "  Client ID:    ${QUICKBOOKS_CLIENT_ID:0:15}..."
    echo "  Redirect URI: $QUICKBOOKS_REDIRECT_URI"
    echo "  State:        $STATE"
    echo ""
    
    header "Authorization URL"
    echo ""
    echo -e "${CYAN}$OAUTH_URL${NC}"
    echo ""
    
    header "Instructions"
    echo ""
    echo "  ${BOLD}Step 1:${NC} Open the URL above in your browser"
    echo ""
    echo "  ${BOLD}Step 2:${NC} Log in to your QuickBooks Sandbox account"
    echo "          - Go to https://developer.intuit.com"
    echo "          - Click 'Sandbox' in the top menu"
    echo "          - Use your sandbox company credentials"
    echo ""
    echo "  ${BOLD}Step 3:${NC} Authorize the application"
    echo "          - Click 'Connect' to grant access"
    echo ""
    echo "  ${BOLD}Step 4:${NC} Copy the callback URL parameters"
    echo "          - After authorizing, you'll be redirected to:"
    echo "            ${QUICKBOOKS_REDIRECT_URI}?code=XXX&realmId=YYY&state=ZZZ"
    echo "          - Copy the 'code' and 'realmId' values"
    echo ""
    echo "  ${BOLD}Step 5:${NC} Complete the integration:"
    echo "          ./scripts/test-quickbooks-integration.sh callback CODE REALM_ID"
    echo ""
    
    # Check if redirect URI is localhost
    if [[ "$QUICKBOOKS_REDIRECT_URI" == *"localhost"* ]]; then
        warn "Your redirect URI uses localhost!"
        echo ""
        echo "  QuickBooks may not redirect to localhost properly."
        echo "  Options:"
        echo ""
        echo "  ${BOLD}Option A:${NC} Use ngrok (recommended for testing)"
        echo "    1. Install ngrok: https://ngrok.com/download"
        echo "    2. Run: ngrok http 3000"
        echo "    3. Update QUICKBOOKS_REDIRECT_URI in .env with ngrok URL"
        echo "    4. Update redirect URI in QuickBooks Developer Portal"
        echo ""
        echo "  ${BOLD}Option B:${NC} Configure QuickBooks for localhost"
        echo "    1. Go to https://developer.intuit.com"
        echo "    2. Select your app → Keys & OAuth"
        echo "    3. Add 'http://localhost:3000/api/v1/datasources/oauth/quickbooks/callback'"
        echo "       to the Redirect URIs"
        echo ""
    fi
}

cmd_callback() {
    header "Processing OAuth Callback"
    
    CODE="$1"
    REALM_ID="$2"
    
    if [ -z "$CODE" ] || [ -z "$REALM_ID" ]; then
        error "Usage: $0 callback CODE REALM_ID"
        exit 1
    fi
    
    log "Authorization Code: ${CODE:0:20}..."
    log "Realm ID: $REALM_ID"
    
    # Call the API to exchange the code for tokens
    log "Exchanging code for tokens..."
    
    RESPONSE=$(curl -s -X POST "$API_URL/api/datasources/quickbooks/oauth/callback" \
        -H "Content-Type: application/json" \
        -d "{\"code\": \"$CODE\", \"state\": \"test\", \"realmId\": \"$REALM_ID\"}")
    
    if echo "$RESPONSE" | grep -q "error"; then
        error "Failed to exchange code: $RESPONSE"
        exit 1
    fi
    
    success "Connection established!"
    echo ""
    echo "Response: $RESPONSE"
    echo ""
    
    # Extract connection ID
    CONNECTION_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -n "$CONNECTION_ID" ]; then
        success "Connection ID: $CONNECTION_ID"
        echo ""
        echo "To sync data, run:"
        echo "  ./scripts/test-quickbooks-integration.sh sync $CONNECTION_ID"
    fi
}

cmd_sync() {
    header "Syncing QuickBooks Data"
    
    CONNECTION_ID="$1"
    
    if [ -z "$CONNECTION_ID" ]; then
        error "Usage: $0 sync CONNECTION_ID"
        exit 1
    fi
    
    log "Connection ID: $CONNECTION_ID"
    log "Triggering full sync..."
    
    RESPONSE=$(curl -s -X POST "$API_URL/api/datasources/$CONNECTION_ID/full-sync" \
        -H "Content-Type: application/json")
    
    echo ""
    echo "Sync Result:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
}

cmd_test() {
    header "Running QuickBooks Integration Tests"
    
    cd "$PROJECT_ROOT/apps/api"
    
    log "Running ETL pipeline tests..."
    npm test -- --testPathPattern=etl-pipeline --verbose
    
    log "Running QuickBooks integration tests..."
    npm test -- --testPathPattern=quickbooks-integration --verbose
    
    success "All tests passed!"
}

cmd_ngrok() {
    header "Starting ngrok Tunnel"
    
    # Check if ngrok is installed
    if ! command -v ngrok &> /dev/null; then
        error "ngrok is not installed"
        echo ""
        echo "Install ngrok:"
        echo "  brew install ngrok  (macOS)"
        echo "  or download from https://ngrok.com/download"
        exit 1
    fi
    
    log "Starting ngrok tunnel for port 3000..."
    echo ""
    echo "After ngrok starts:"
    echo "  1. Copy the https://xxx.ngrok.io URL"
    echo "  2. Update .env with:"
    echo "     QUICKBOOKS_REDIRECT_URI=https://xxx.ngrok.io/api/v1/datasources/oauth/quickbooks/callback"
    echo "  3. Add this URL to QuickBooks Developer Portal redirect URIs"
    echo ""
    
    ngrok http 3000
}

cmd_status() {
    header "Integration Status"
    
    # Check Docker services
    log "Docker Services:"
    cd "$PROJECT_ROOT"
    docker-compose ps
    
    echo ""
    
    # Check API health
    log "API Health:"
    curl -s "$API_URL/api/health" 2>/dev/null || echo "API not running"
    
    echo ""
    
    # List connections
    log "Active Connections:"
    curl -s "$API_URL/api/datasources" 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "Could not fetch connections"
}

cmd_help() {
    echo ""
    echo "QuickBooks Integration Test Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  setup     Start docker-compose and prepare environment"
    echo "  oauth     Generate OAuth URL and instructions"
    echo "  callback  Handle OAuth callback (CODE REALM_ID)"
    echo "  sync      Trigger a full data sync (CONNECTION_ID)"
    echo "  test      Run integration tests"
    echo "  ngrok     Start ngrok tunnel for local testing"
    echo "  status    Check integration status"
    echo "  help      Show this help message"
    echo ""
}

# ============================================
# Main
# ============================================

case "${1:-help}" in
    setup)    cmd_setup ;;
    oauth)    cmd_oauth ;;
    callback) cmd_callback "$2" "$3" ;;
    sync)     cmd_sync "$2" ;;
    test)     cmd_test ;;
    ngrok)    cmd_ngrok ;;
    status)   cmd_status ;;
    help)     cmd_help ;;
    *)        cmd_help ;;
esac
