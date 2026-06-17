#!/usr/bin/env bash
# Concurrency test for POST /api/tickets.
# Fires N parallel curl requests for the same ticket_number and asserts
# exactly one 201 (created) and N-1 409 (rejected).
#
# Usage: ./scripts/concurrency-test.sh [BASE_URL] [CONCURRENCY]
# Defaults: http://localhost:3001  10

set -euo pipefail

BASE_URL="${1:-http://localhost:3001}"
CONCURRENCY="${2:-10}"
TICKET_NUMBER=$((RANDOM + 50000))   # unique each run
ENDPOINT="$BASE_URL/api/tickets"

BODY=$(printf \
  '{"ticket_number":%d,"subject":"Concurrency test","description":"Lock integrity check"}' \
  "$TICKET_NUMBER")

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Concurrency Test — POST $ENDPOINT"
echo "  ticket_number : $TICKET_NUMBER"
echo "  parallel reqs : $CONCURRENCY"
echo "═══════════════════════════════════════════════════════"

# Collect HTTP status codes from all parallel curl processes
TMPDIR_RESULTS=$(mktemp -d)
trap 'rm -rf "$TMPDIR_RESULTS"' EXIT

for i in $(seq 1 "$CONCURRENCY"); do
  curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "$BODY" > "$TMPDIR_RESULTS/$i" &
done
wait   # block until every background curl finishes

# Tally results
COUNT_201=0
COUNT_409=0
COUNT_OTHER=0

echo ""
echo "  Results per request:"
for i in $(seq 1 "$CONCURRENCY"); do
  CODE=$(cat "$TMPDIR_RESULTS/$i")
  printf "    request %-2s → %s\n" "$i" "$CODE"
  case "$CODE" in
    201) COUNT_201=$((COUNT_201 + 1)) ;;
    409) COUNT_409=$((COUNT_409 + 1)) ;;
    *)   COUNT_OTHER=$((COUNT_OTHER + 1)) ;;
  esac
done

echo ""
echo "  Summary:"
printf "    201 Created  : %d  (expected: 1)\n" "$COUNT_201"
printf "    409 Conflict : %d  (expected: %d)\n" "$COUNT_409" "$((CONCURRENCY - 1))"
[ "$COUNT_OTHER" -gt 0 ] && printf "    Other        : %d  ← unexpected!\n" "$COUNT_OTHER"

echo ""

# Assert invariants
PASS=true
if [ "$COUNT_201" -ne 1 ]; then
  echo "  ✗ FAIL — expected exactly 1 × 201, got $COUNT_201"
  PASS=false
fi
if [ "$COUNT_409" -ne $((CONCURRENCY - 1)) ]; then
  echo "  ✗ FAIL — expected $((CONCURRENCY - 1)) × 409, got $COUNT_409"
  PASS=false
fi
if [ "$COUNT_OTHER" -gt 0 ]; then
  echo "  ✗ FAIL — $COUNT_OTHER unexpected status codes (500 = lock error leaked?)"
  PASS=false
fi

if [ "$PASS" = "true" ]; then
  echo "  ✓ PASS — lock held correctly, exactly one ticket created"
fi

echo "═══════════════════════════════════════════════════════"
echo ""

[ "$PASS" = "true" ]
