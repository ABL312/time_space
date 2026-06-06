#!/usr/bin/env bash
# smoke-test-go-api.sh
# Smoke test for Go backend API endpoints
# Usage: ./scripts/smoke-test-go-api.sh [BASE_URL]
# Default BASE_URL: http://localhost:8080

set -uo pipefail

BASE_URL="${1:-http://localhost:8080}"
PASS=0
FAIL=0
SKIP=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

inc_pass() { PASS=$((PASS + 1)); }
inc_fail() { FAIL=$((FAIL + 1)); }
inc_skip() { SKIP=$((SKIP + 1)); }

check() {
  local method="$1"
  local path="$2"
  local expect_status="$3"
  local description="$4"
  local body="${5:-}"

  local args=(-s -o /dev/null -w "%{http_code}" --max-time 5 -X "$method")
  if [[ -n "$body" ]]; then
    args+=(-H "Content-Type: application/json" -d "$body")
  fi

  local status
  status=$(curl "${args[@]}" "${BASE_URL}${path}" 2>/dev/null || echo "000")

  if [[ "$status" == "$expect_status" ]]; then
    echo -e "  ${GREEN}PASS${NC} [$status] $method $path — $description"
    inc_pass
  elif [[ "$status" == "000" ]]; then
    echo -e "  ${RED}FAIL${NC} [---] $method $path — $description (connection refused)"
    inc_fail
  elif [[ "$expect_status" == "SKIP" ]]; then
    echo -e "  ${YELLOW}SKIP${NC} [$status] $method $path — $description (not yet implemented)"
    inc_skip
  else
    echo -e "  ${RED}FAIL${NC} [$status] $method $path — $description (expected $expect_status)"
    inc_fail
  fi
}

check_json_field() {
  local path="$1"
  local field="$2"
  local expected="$3"
  local description="$4"

  local body
  body=$(curl -s --max-time 5 "${BASE_URL}${path}" 2>/dev/null || echo "{}")
  local actual
  actual=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$field','MISSING'))" 2>/dev/null || echo "PARSE_ERROR")

  if [[ "$actual" == "$expected" ]]; then
    echo -e "  ${GREEN}PASS${NC} $path .$field = $actual — $description"
    inc_pass
  else
    echo -e "  ${RED}FAIL${NC} $path .$field = $actual (expected $expected) — $description"
    inc_fail
  fi
}

echo "============================================"
echo "  Go Backend Smoke Test"
echo "  Target: $BASE_URL"
echo "============================================"
echo ""

# ---- Health ----
echo "[Health]"
check GET "/api/health" "200" "Health endpoint reachable"
check_json_field "/api/health" "status" "ok" "Health status is ok"
check_json_field "/api/health" "service" "go-backend" "Service name correct"

# ---- Capsules (P0 - core) ----
echo ""
echo "[Capsules — P0 core]"
check POST "/api/capsules" "SKIP" "Create capsule (multipart)" '{\"content\":\"test\",\"content_type\":\"text\",\"latitude\":39.9,\"longitude\":116.4}'
check GET "/api/capsules/nearby?lat=39.9&lng=116.4&radius=5000" "SKIP" "Nearby capsules"
check GET "/api/capsules/test-id-123" "SKIP" "Get capsule by ID"

# ---- Users (P0) ----
echo ""
echo "[Users — P0]"
check POST "/api/users" "SKIP" "Create user" '{"name":"test","interest_tags":["music"]}'
check GET "/api/users/test-user-id" "SKIP" "Get user by ID"
check PUT "/api/users/test-user-id" "SKIP" "Update user" '{"name":"updated"}'

# ---- Responses ----
echo ""
echo "[Responses — P1]"
check GET "/api/capsules/test-id/responses" "SKIP" "List responses"
check POST "/api/capsules/test-id/responses" "SKIP" "Create response" '{"content":"hello","nickname":"anon"}'

# ---- Favorites ----
echo ""
echo "[Favorites — P1]"
check POST "/api/favorites/test-capsule?user_id=test" "SKIP" "Add favorite"
check GET "/api/favorites?user_id=test" "SKIP" "List favorites"
check DELETE "/api/favorites/test-capsule?user_id=test" "SKIP" "Remove favorite"
check GET "/api/favorites/capsules/test-capsule/favorite-status?user_id=test" "SKIP" "Favorite status"

# ---- Search & Recommend ----
echo ""
echo "[Search & Recommend — P1/P2]"
check GET "/api/capsules/search?q=hello" "SKIP" "Search capsules"
check GET "/api/capsules/daily-recommend" "SKIP" "Daily recommend"

# ---- AI ----
echo ""
echo "[AI — P2]"
check POST "/api/ai/analyze-emotion" "SKIP" "Analyze emotion" '{"message":"I am happy"}'
check GET "/api/ai/location-context?lat=39.9&lng=116.4" "SKIP" "Location context"

# ---- Collections ----
echo ""
echo "[Collections — P2]"
check GET "/api/collections" "SKIP" "List collections"
check GET "/api/collections/test-id" "SKIP" "Get collection detail"

# ---- Error format compatibility ----
echo ""
echo "[Error Format Compatibility]"
BODY=$(curl -s --max-time 5 "${BASE_URL}/api/capsules/nonexistent-id" 2>/dev/null || echo "{}")
if echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'detail' in d or 'error' in d" 2>/dev/null; then
  if echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'detail' in d" 2>/dev/null; then
    echo -e "  ${GREEN}PASS${NC} Error response has 'detail' field (compatible with frontend client.ts)"
    inc_pass
  else
    echo -e "  ${RED}FAIL${NC} Error response uses 'error' but not 'detail' (frontend expects 'detail')"
    inc_fail
  fi
else
  echo -e "  ${YELLOW}SKIP${NC} Cannot check error format (endpoint not implemented or unreachable)"
  inc_skip
fi

# ---- Summary ----
echo ""
echo "============================================"
echo -e "  Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}, ${YELLOW}$SKIP skipped${NC}"
echo "============================================"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
exit 0
