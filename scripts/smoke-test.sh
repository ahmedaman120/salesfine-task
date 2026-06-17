#!/usr/bin/env bash
# Smoke test — verifies the running stack end-to-end.
# Usage: ./scripts/smoke-test.sh [BASE_URL]
# Default BASE_URL: http://localhost:3000

set -euo pipefail

BASE_URL="${1:-http://localhost:3001}"
PASS=0
FAIL=0

check() {
  local description="$1"
  local condition="$2"
  if [ "$condition" = "true" ]; then
    echo "  ✓ $description"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $description"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Smoke Test  →  $BASE_URL"
echo "═══════════════════════════════════════════════════"

# ── 1. Health check ──────────────────────────────────────────────────────────
echo ""
echo "1. Health check"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
check "GET /health returns 200" "$([ "$HEALTH_STATUS" = "200" ] && echo true || echo false)"

# ── 2. Products list — first request (MISS) ──────────────────────────────────
echo ""
echo "2. Products list (cache)"
PROD_RESP1=$(curl -s -D - "$BASE_URL/api/products")
PROD_STATUS1=$(echo "$PROD_RESP1" | grep -i "^HTTP" | awk '{print $2}')
CACHE_STATUS1=$(echo "$PROD_RESP1" | grep -i "^x-cache-status:" | awk '{print $2}' | tr -d '\r')
check "GET /api/products returns 200" "$([ "$PROD_STATUS1" = "200" ] && echo true || echo false)"
check "First request X-Cache-Status: MISS" "$([ "$CACHE_STATUS1" = "MISS" ] && echo true || echo false)"

# Second request should be a HIT
PROD_RESP2=$(curl -s -D - "$BASE_URL/api/products")
PROD_STATUS2=$(echo "$PROD_RESP2" | grep -i "^HTTP" | awk '{print $2}')
CACHE_STATUS2=$(echo "$PROD_RESP2" | grep -i "^x-cache-status:" | awk '{print $2}' | tr -d '\r')
check "GET /api/products returns 200 (second call)" "$([ "$PROD_STATUS2" = "200" ] && echo true || echo false)"
check "Second request X-Cache-Status: HIT" "$([ "$CACHE_STATUS2" = "HIT" ] && echo true || echo false)"

# ── 3. Create ticket (valid) ─────────────────────────────────────────────────
echo ""
echo "3. Ticket submission"
TICKET_NUM=$((RANDOM + 10000))
CREATE_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/tickets" \
  -H "Content-Type: application/json" \
  -d "{\"ticket_number\":$TICKET_NUM,\"subject\":\"Smoke test ticket\",\"description\":\"Created by smoke-test.sh\"}")
check "POST /api/tickets (valid) returns 201" "$([ "$CREATE_RESP" = "201" ] && echo true || echo false)"

# ── 4. Duplicate ticket_number → 409 ────────────────────────────────────────
DUP_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/tickets" \
  -H "Content-Type: application/json" \
  -d "{\"ticket_number\":$TICKET_NUM,\"subject\":\"Duplicate\",\"description\":\"Should be rejected\"}")
check "POST /api/tickets (duplicate) returns 409" "$([ "$DUP_RESP" = "409" ] && echo true || echo false)"

# ── 5. Missing field → 400 ───────────────────────────────────────────────────
MISSING_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/tickets" \
  -H "Content-Type: application/json" \
  -d "{\"ticket_number\":$((TICKET_NUM+1))}")
check "POST /api/tickets (missing fields) returns 400" "$([ "$MISSING_RESP" = "400" ] && echo true || echo false)"

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════════"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
