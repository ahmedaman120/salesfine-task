#!/usr/bin/env bash
# Apache Benchmark concurrency test for POST /api/tickets.
#
# Fires TOTAL requests at CONCURRENCY-level parallelism, all targeting the
# same ticket_number, then asserts the lock invariant:
#   • exactly 1 request succeeds (HTTP 201)
#   • all others are rejected (HTTP 409)
#
# Usage:
#   ./scripts/concurrency-ab.sh [BASE_URL] [TOTAL] [CONCURRENCY]
#
# Defaults:
#   BASE_URL    = http://localhost:3001
#   TOTAL       = 20   (total requests sent)
#   CONCURRENCY = 20   (concurrent connections — max pressure when == TOTAL)
#
# Install ab:
#   macOS  : brew install httpd
#   Debian : apt install apache2-utils

set -euo pipefail

BASE_URL="${1:-http://localhost:3001}"
TOTAL="${2:-20}"
CONCURRENCY="${3:-20}"
ENDPOINT="$BASE_URL/api/tickets"

# ── Pre-flight ────────────────────────────────────────────────────────────────
if ! command -v ab &>/dev/null; then
  echo ""
  echo "  ✗ Apache Benchmark (ab) not found."
  echo "    macOS  : brew install httpd"
  echo "    Debian : apt install apache2-utils"
  echo ""
  exit 1
fi

if [ "$CONCURRENCY" -gt "$TOTAL" ]; then
  echo "  ✗ CONCURRENCY ($CONCURRENCY) cannot exceed TOTAL ($TOTAL)"
  exit 1
fi

TICKET_NUMBER=$((RANDOM + 70000))

# ab requires the POST body in a file
BODY_FILE=$(mktemp /tmp/ab-body-XXXX.json)
trap 'rm -f "$BODY_FILE"' EXIT

printf '{"ticket_number":%d,"subject":"AB concurrency test","description":"Distributed lock integrity check"}' \
  "$TICKET_NUMBER" > "$BODY_FILE"

# ── Run ab ────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Apache Benchmark — Distributed Lock Concurrency Test"
echo "  endpoint      : POST $ENDPOINT"
echo "  ticket_number : $TICKET_NUMBER"
echo "  total reqs    : $TOTAL"
echo "  concurrency   : $CONCURRENCY"
echo "═══════════════════════════════════════════════════════════════"
echo ""

AB_OUTPUT=$(ab \
  -n "$TOTAL" \
  -c "$CONCURRENCY" \
  -p "$BODY_FILE" \
  -T "application/json" \
  "$ENDPOINT" 2>&1)

echo "$AB_OUTPUT"
echo ""

# ── Parse ab output ───────────────────────────────────────────────────────────
#
# ab's "Failed requests" does NOT mean connection failures.
# It means "responses whose status/size differed from the first response."
# When request #1 returns 201 and all others return 409, ab counts those
# 409s as "failed" because they differ from the baseline — completely
# expected behaviour for this test.
#
# True connection drops = TOTAL - COMPLETE (requests that got no response at all).
#
# Correct derivation:
#   SUCCESS      = COMPLETE - NON2XX        (responses that were 2xx)
#   CONN_DROPS   = TOTAL    - COMPLETE      (requests that never completed)
#   NON2XX defaults to 0 when the line is absent (all responses were 2xx).

COMPLETE=$(echo "$AB_OUTPUT" | awk '/^Complete requests:/{print $3}')
NON2XX=$(echo "$AB_OUTPUT"   | awk '/^Non-2xx responses:/{print $3}')
RPS=$(echo "$AB_OUTPUT"      | awk '/^Requests per second:/{print $4}')

# Leading-whitespace-aware match for the percentile table
P50=$(echo "$AB_OUTPUT" | awk '/^[[:space:]]+50%/{print $2}')
P99=$(echo "$AB_OUTPUT" | awk '/^[[:space:]]+99%/{print $2}')

NON2XX="${NON2XX:-0}"
SUCCESS=$((COMPLETE - NON2XX))
CONN_DROPS=$((TOTAL - COMPLETE))
EXPECTED_REJECT=$((TOTAL - 1))

# ── Results table ─────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════"
echo "  Lock Invariant Check"
echo "───────────────────────────────────────────────────────────────"
printf "  Requests sent        : %s\n"   "$TOTAL"
printf "  Complete             : %s\n"   "$COMPLETE"
printf "  Connection drops     : %s\n"   "$CONN_DROPS"
printf "  2xx — created (201)  : %-4s  expected: 1\n"              "$SUCCESS"
printf "  4xx — rejected (409) : %-4s  expected: %s\n"             "$NON2XX" "$EXPECTED_REJECT"
echo "───────────────────────────────────────────────────────────────"
printf "  Throughput           : %s req/s\n"        "${RPS:--}"
printf "  Latency p50 / p99    : %s ms / %s ms\n"  "${P50:--}" "${P99:--}"
echo "───────────────────────────────────────────────────────────────"

# ── Assertions ────────────────────────────────────────────────────────────────
PASS=true

if [ "$SUCCESS" -ne 1 ]; then
  printf "  ✗ FAIL — expected 1 × 201, got %s\n" "$SUCCESS"
  [ "$SUCCESS" -gt 1 ] && echo "         (> 1 means the lock is broken — duplicate tickets were created)"
  PASS=false
fi

if [ "$NON2XX" -ne "$EXPECTED_REJECT" ]; then
  printf "  ✗ FAIL — expected %s × 409, got %s\n" "$EXPECTED_REJECT" "$NON2XX"
  PASS=false
fi

if [ "$CONN_DROPS" -gt 0 ]; then
  printf "  ✗ FAIL — %s request(s) got no response (server overloaded?)\n" "$CONN_DROPS"
  PASS=false
fi

if [ "$PASS" = "true" ]; then
  echo "  ✓ PASS — lock held: exactly one ticket created, all others rejected"
fi

echo "═══════════════════════════════════════════════════════════════"
echo ""

[ "$PASS" = "true" ]
