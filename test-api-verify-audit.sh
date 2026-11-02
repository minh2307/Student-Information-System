#!/usr/bin/env bash
# ==============================================================================
# Rikkei EduPortal - Automated API Test Suite
# Feature: Public Verify Credential & Audit Log JSON Delta Contract
# ==============================================================================
set -e

BASE_URL="http://localhost:8080"
PASSED_TESTS=0
FAILED_TESTS=0

COLOR_GREEN="\033[0;32m"
COLOR_RED="\033[0;31m"
COLOR_CYAN="\033[0;36m"
COLOR_YELLOW="\033[1;33m"
COLOR_RESET="\033[0m"

log_info() {
    echo -e "${COLOR_CYAN}[INFO]${COLOR_RESET} $1"
}

log_pass() {
    echo -e "${COLOR_GREEN}[PASS]${COLOR_RESET} $1"
    PASSED_TESTS=$((PASSED_TESTS + 1))
}

log_fail() {
    echo -e "${COLOR_RED}[FAIL]${COLOR_RESET} $1"
    FAILED_TESTS=$((FAILED_TESTS + 1))
}

echo "=============================================================================="
echo -e "${COLOR_YELLOW} Rikkei EduPortal - Verification & Audit Log API Test Suite ${COLOR_RESET}"
echo " Base URL: $BASE_URL"
echo " Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================================================="

# ------------------------------------------------------------------------------
# 1. AUTHENTICATION SETUP
# ------------------------------------------------------------------------------
log_info "Step 1: Authenticating Admin & Student users..."

ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"123456"}' | jq -r '.data.accessToken // empty')

if [ -z "$ADMIN_TOKEN" ]; then
    log_fail "Failed to authenticate Admin (admin/123456)"
    exit 1
fi
log_pass "Admin token acquired successfully"

STUDENT_TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"sv2024001","password":"password"}' | jq -r '.data.accessToken // empty')

if [ -z "$STUDENT_TOKEN" ]; then
    STUDENT_TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"sv2024001","password":"123456"}' | jq -r '.data.accessToken // empty')
fi

if [ -z "$STUDENT_TOKEN" ]; then
    log_fail "Failed to authenticate Student (sv2024001)"
    exit 1
fi
log_pass "Student token acquired successfully"

# ------------------------------------------------------------------------------
# 2. TEST CASES: PUBLIC VERIFICATION ENDPOINTS
# ------------------------------------------------------------------------------
log_info "Step 2: Testing Public Verification Endpoints (No JWT)..."

# TC-01: Public Verify API without parameters
RES_TC01=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/public/credentials/verify")
CODE_TC01=$(echo "$RES_TC01" | tail -n 1)
BODY_TC01=$(echo "$RES_TC01" | head -n -1)
VALID_TC01=$(echo "$BODY_TC01" | jq -r '.data.valid')

if [ "$CODE_TC01" -eq 200 ] && [ "$VALID_TC01" = "false" ]; then
    log_pass "TC-01: GET /api/v1/public/credentials/verify (No params) -> HTTP 200 & valid=false"
else
    log_fail "TC-01: Expected HTTP 200 & valid=false, got HTTP $CODE_TC01, body: $BODY_TC01"
fi

# TC-02: Public Verify API with unknown serial
RES_TC02=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/public/credentials/verify?serial=UNKNOWN-99999&sig=dummy_sig")
CODE_TC02=$(echo "$RES_TC02" | tail -n 1)
BODY_TC02=$(echo "$RES_TC02" | head -n -1)
VALID_TC02=$(echo "$BODY_TC02" | jq -r '.data.valid')

if [ "$CODE_TC02" -eq 200 ] && [ "$VALID_TC02" = "false" ]; then
    log_pass "TC-02: GET /api/v1/public/credentials/verify (Unknown serial) -> HTTP 200 & valid=false"
else
    log_fail "TC-02: Expected HTTP 200 & valid=false, got HTTP $CODE_TC02, body: $BODY_TC02"
fi

# TC-03: Alias Route /api/v1/public/verify/transcript
RES_TC03=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/public/verify/transcript")
CODE_TC03=$(echo "$RES_TC03" | tail -n 1)
BODY_TC03=$(echo "$RES_TC03" | head -n -1)
VALID_TC03=$(echo "$BODY_TC03" | jq -r '.data.valid')

if [ "$CODE_TC03" -eq 200 ] && [ "$VALID_TC03" = "false" ]; then
    log_pass "TC-03: GET /api/v1/public/verify/transcript (Alias Route) -> HTTP 200 & valid=false"
else
    log_fail "TC-03: Expected HTTP 200 on alias route, got HTTP $CODE_TC03"
fi

# TC-04: Student Transcript Credential Generation
RES_TC04=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/student/credentials/transcript" \
    -H "Authorization: Bearer $STUDENT_TOKEN")
CODE_TC04=$(echo "$RES_TC04" | tail -n 1)
BODY_TC04=$(echo "$RES_TC04" | head -n -1)
GEN_SERIAL=$(echo "$BODY_TC04" | jq -r '.data.serial // empty')
GEN_SIG=$(echo "$BODY_TC04" | jq -r '.data.signature // empty')

if [ "$CODE_TC04" -eq 200 ] && [ -n "$GEN_SERIAL" ] && [ -n "$GEN_SIG" ]; then
    log_pass "TC-04: Student generated digital credential: Serial=$GEN_SERIAL, Sig=${GEN_SIG:0:16}..."
else
    log_fail "TC-04: Failed to generate digital credential. Code: $CODE_TC04, Body: $BODY_TC04"
fi

# TC-05: Public Verify API with genuine serial & signature
RES_TC05=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/public/credentials/verify?serial=$GEN_SERIAL&sig=$GEN_SIG")
CODE_TC05=$(echo "$RES_TC05" | tail -n 1)
BODY_TC05=$(echo "$RES_TC05" | head -n -1)
VALID_TC05=$(echo "$BODY_TC05" | jq -r '.data.valid')
STU_NAME=$(echo "$BODY_TC05" | jq -r '.data.credential.fullName')

if [ "$CODE_TC05" -eq 200 ] && [ "$VALID_TC05" = "true" ] && [ "$STU_NAME" != "null" ]; then
    log_pass "TC-05: GET /api/v1/public/credentials/verify (Genuine Credential) -> HTTP 200 & valid=true ($STU_NAME)"
else
    log_fail "TC-05: Verification failed for genuine credential. Code: $CODE_TC05, Body: $BODY_TC05"
fi

# TC-06: Public Verify API with tampered signature
TAMPERED_SIG="${GEN_SIG:0:-4}ffff"
RES_TC06=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/public/credentials/verify?serial=$GEN_SERIAL&sig=$TAMPERED_SIG")
CODE_TC06=$(echo "$RES_TC06" | tail -n 1)
BODY_TC06=$(echo "$RES_TC06" | head -n -1)
VALID_TC06=$(echo "$BODY_TC06" | jq -r '.data.valid')

if [ "$CODE_TC06" -eq 200 ] && [ "$VALID_TC06" = "false" ]; then
    log_pass "TC-06: GET /api/v1/public/credentials/verify (Tampered Sig) -> HTTP 200 & valid=false (Integrity preserved)"
else
    log_fail "TC-06: Expected valid=false for tampered signature, got: $BODY_TC06"
fi

# ------------------------------------------------------------------------------
# 3. TEST CASES: AUDIT LOG JSON DELTA RECORDING & RETRIEVAL
# ------------------------------------------------------------------------------
log_info "Step 3: Testing Audit Log JSON Delta Service Contract..."

RANDOM_ID=$((RANDOM % 9000 + 1000))
DELTA_PAYLOAD=$(cat <<EOF
{
  "action": "GRADE_ADJUSTMENT",
  "targetEntity": "StudentGrade",
  "targetId": $RANDOM_ID,
  "summary": "Điều chỉnh điểm thi phúc khảo tự động qua API Test Suite",
  "delta": {
    "entity": "StudentGrade",
    "entityId": "$RANDOM_ID",
    "changedFields": ["midtermScore", "letterGrade"],
    "diff": {
      "midtermScore": {"from": 6.0, "to": 9.0},
      "letterGrade": {"from": "B", "to": "A"}
    },
    "metadata": {
      "reason": "Phúc khảo bài thi cuối kỳ môn Lập trình Web",
      "testRun": "TC-API-VERIFY-AUDIT"
    }
  }
}
EOF
)

# TC-07: POST /api/v1/admin/audit-logs with JSON Delta
RES_TC07=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/admin/audit-logs" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$DELTA_PAYLOAD")
CODE_TC07=$(echo "$RES_TC07" | tail -n 1)
BODY_TC07=$(echo "$RES_TC07" | head -n -1)
CREATED_LOG_ID=$(echo "$BODY_TC07" | jq -r '.data.id // empty')
SAVED_DELTA=$(echo "$BODY_TC07" | jq -r '.data.newValue // empty')

if { [ "$CODE_TC07" -eq 200 ] || [ "$CODE_TC07" -eq 201 ]; } && [ -n "$CREATED_LOG_ID" ] && [ -n "$SAVED_DELTA" ]; then
    log_pass "TC-07: POST /api/v1/admin/audit-logs (JSON Delta) -> HTTP $CODE_TC07, Log ID=$CREATED_LOG_ID"
else
    log_fail "TC-07: Failed to record audit log. Code: $CODE_TC07, Body: $BODY_TC07"
fi

# TC-08: GET /api/v1/admin/audit-logs filter by action
RES_TC08=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/admin/audit-logs?action=GRADE_ADJUSTMENT" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
CODE_TC08=$(echo "$RES_TC08" | tail -n 1)
BODY_TC08=$(echo "$RES_TC08" | head -n -1)
MATCHING_COUNT=$(echo "$BODY_TC08" | jq -r '.data | length')

if [ "$CODE_TC08" -eq 200 ] && [ "$MATCHING_COUNT" -gt 0 ]; then
    log_pass "TC-08: GET /api/v1/admin/audit-logs?action=GRADE_ADJUSTMENT -> HTTP 200 with $MATCHING_COUNT records"
else
    log_fail "TC-08: Expected audit logs for GRADE_ADJUSTMENT, got Code: $CODE_TC08"
fi

# TC-09: GET /api/v1/admin/audit-logs/entity/{targetEntity}/{targetId}
RES_TC09=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/admin/audit-logs/entity/StudentGrade/$RANDOM_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
CODE_TC09=$(echo "$RES_TC09" | tail -n 1)
BODY_TC09=$(echo "$RES_TC09" | head -n -1)
ENTITY_LOG_ID=$(echo "$BODY_TC09" | jq -r '.data[0].id // empty')
DIFF_MIDTERM=$(echo "$BODY_TC09" | jq -r '.data[0].newValue' | jq -r '.diff.midtermScore.to // empty')

if [ "$CODE_TC09" -eq 200 ] && [ "$ENTITY_LOG_ID" = "$CREATED_LOG_ID" ] && { [ "$DIFF_MIDTERM" = "9" ] || [ "$DIFF_MIDTERM" = "9.0" ]; }; then
    log_pass "TC-09: GET /api/v1/admin/audit-logs/entity/StudentGrade/$RANDOM_ID -> HTTP 200, verified diff.midtermScore.to=$DIFF_MIDTERM"
else
    log_fail "TC-09: Entity audit history failed. Code: $CODE_TC09, Diff: $DIFF_MIDTERM, Body: $BODY_TC09"
fi

# TC-10: Unauthorized access to admin audit log (Without Token)
RES_TC10=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/admin/audit-logs")
CODE_TC10=$(echo "$RES_TC10" | tail -n 1)

if [ "$CODE_TC10" -eq 401 ] || [ "$CODE_TC10" -eq 403 ]; then
    log_pass "TC-10: GET /api/v1/admin/audit-logs (No token) -> HTTP $CODE_TC10 (Access denied as required)"
else
    log_fail "TC-10: Expected HTTP 401/403 for unauthenticated admin access, got $CODE_TC10"
fi

echo "=============================================================================="
echo -e "${COLOR_YELLOW} TEST SUMMARY: ${COLOR_GREEN}$PASSED_TESTS PASSED${COLOR_RESET}, ${COLOR_RED}$FAILED_TESTS FAILED${COLOR_RESET} / Total: $((PASSED_TESTS + FAILED_TESTS))"
echo "=============================================================================="

if [ "$FAILED_TESTS" -eq 0 ]; then
    echo -e "${COLOR_GREEN}>>> ALL API CONTRACT AND AUDIT DELTA TESTS PASSED PERFECTLY! <<<${COLOR_RESET}"
    exit 0
else
    echo -e "${COLOR_RED}>>> SOME TESTS FAILED! CHECK OUTPUT ABOVE. <<<${COLOR_RESET}"
    exit 1
fi
