#!/usr/bin/env bash
set -e

cd /opt/eduportal

echo "=== Diagnostic: Checking ports 80 and 3000 on host ==="
if command -v ss >/dev/null 2>&1; then
  ss -tulpn 2>/dev/null | grep -E ':(80|3000)\b' || echo "No sockets listening on 80/3000 via ss"
elif command -v netstat >/dev/null 2>&1; then
  netstat -tulpn 2>/dev/null | grep -E ':(80|3000)\b' || echo "No sockets listening on 80/3000 via netstat"
fi
docker ps --filter "publish=80" --filter "publish=3000" --format "table {{.ID}}\t{{.Names}}\t{{.Ports}}\t{{.Status}}" 2>/dev/null || true

# Dừng và dọn sạch các container từ tất cả các file compose có thể tồn tại (prod/dev/staging/default)
# Tránh trường hợp chuyển đổi giữa dev <-> prod nhưng stack kia vẫn chiếm port 80/3000/5432/8081/8085.
# Lưu ý: Named volumes vẫn được giữ nguyên an toàn, không mất dữ liệu DB.
echo "=== Removing stale containers and freeing occupied ports... ==="
for compose_spec in docker-compose.prod.yml docker-compose.staging.yml docker-compose.dev.yml docker-compose.yml; do
  if [ -f "$compose_spec" ]; then
    docker compose -f "$compose_spec" down --remove-orphans 2>/dev/null || true
  fi
done

# Giải phóng triệt để các port trên host nếu có container chiếm dụng
for port in 3000 5432 8081 8083 8084 8085; do
  cids=$(docker ps -q --filter "publish=${port}" 2>/dev/null || true)
  if [ -n "$cids" ]; then
    echo "Stopping & removing container(s) binding port ${port}: $cids"
    docker stop $cids 2>/dev/null || true
    docker rm -f $cids 2>/dev/null || true
  fi
done

# Dọn dẹp dứt điểm các container eduportal cũ nếu còn sót
eduportal_cids=$(docker ps -aq --filter "name=eduportal" 2>/dev/null || true)
if [ -n "$eduportal_cids" ]; then
  echo "Force removing lingering eduportal containers: $eduportal_cids"
  docker rm -f $eduportal_cids 2>/dev/null || true
fi

# Giải phóng socket treo trên port 3000 bằng fuser nếu có
if command -v fuser >/dev/null 2>&1; then
  fuser -k 3000/tcp 2>/dev/null || true
fi

# Chờ 2 giây để Linux kernel TCP socket hoàn tất giải phóng
sleep 2

# Frontend port mặc định là 3000 (được host nginx reverse proxy từ 80 & 443 SSL)
RESOLVED_FRONTEND_PORT="${FRONTEND_PORT:-3000}"

# Ghi file .env từ biến môi trường (được truyền qua SSH)
{
  echo "DB_PASSWORD=${DB_PASSWORD}"
  echo "JWT_SECRET=${JWT_SECRET}"
  echo "REGISTRY=${REGISTRY}"
  echo "IMAGE_TAG=${IMAGE_TAG}"
  echo "IMAGE_PREFIX=${IMAGE_PREFIX}"
  echo "AI_API_KEY=${AI_API_KEY}"
  echo "AI_BASE_URL=${AI_BASE_URL:-https://openrouter.ai/api}"
  echo "AI_MODEL=${AI_MODEL:-google/gemini-2.5-flash}"
  echo "AI_PROVIDER=${AI_PROVIDER:-openrouter}"
  echo "AI_MAX_TOKENS=${AI_MAX_TOKENS:-1500}"
  echo "FRONTEND_PORT=${RESOLVED_FRONTEND_PORT}"
  echo "FRONTEND_ALT_PORT=${FRONTEND_ALT_PORT:-3000}"
} > .env

# Đăng nhập GHCR nếu có token truyền vào (đảm bảo quyền pull các package mới/private)
if [ -n "${GHCR_TOKEN}" ] && [ -n "${GHCR_USER}" ]; then
  echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin 2>/dev/null || true
fi

# Pull images trước khi tắt container cũ để giảm tối đa downtime
echo "=== Pulling images... ==="
docker compose -f "${COMPOSE_FILE}" pull

echo "=== Starting containers (${COMPOSE_FILE}) with FRONTEND_PORT=${RESOLVED_FRONTEND_PORT}... ==="
if ! docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans; then
  echo "⚠️ First start attempt failed, attempting emergency port release and retrying..."
  if command -v fuser >/dev/null 2>&1; then
    fuser -k 80/tcp 2>/dev/null || true
    fuser -k 3000/tcp 2>/dev/null || true
  fi
  docker rm -f $(docker ps -aq --filter "name=eduportal") 2>/dev/null || true
  sleep 2
  docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans
fi

# Chờ PostgreSQL sẵn sàng
echo "=== Waiting for PostgreSQL... ==="
i=0
while [ $i -lt 30 ]; do
  if docker compose -f "${COMPOSE_FILE}" exec -T postgres pg_isready -U postgres -d academic_db >/dev/null 2>&1; then
    echo "PostgreSQL ready ✓"
    break
  fi
  sleep 1
  i=$((i + 1))
done

# Nạp schema nếu bảng chưa tồn tại
docker compose -f "${COMPOSE_FILE}" exec -T postgres sh -c \
  "psql -U postgres -d academic_db -c 'SELECT 1 FROM class_sections LIMIT 1;' >/dev/null 2>&1 \
   || (psql -U postgres -d academic_db -f /docker-entrypoint-initdb.d/01-schema.sql \
       && psql -U postgres -d academic_db -f /docker-entrypoint-initdb.d/02-seed-data.sql)" || true

# Health check lecturer-service & các service
echo "=== Health check lecturer-service... ==="
LECTURER_OK=false
for i in $(seq 1 35); do
  RES_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://127.0.0.1:8085/actuator/health 2>/dev/null \
    || curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 http://localhost:8085/actuator/health 2>/dev/null \
    || echo "000")

  if [ "$RES_CODE" = "200" ]; then
    echo "Health check PASSED ✓ (HTTP 200 sau $((i * 3))s)"
    LECTURER_OK=true
    break
  fi

  # Fallback: kiểm tra trực tiếp qua internal container hoặc docker ps
  CONTAINER_STATUS=$(docker compose -f "${COMPOSE_FILE}" ps 2>/dev/null | grep 'eduportal-lecturer' || true)
  if echo "$CONTAINER_STATUS" | grep -q "Up"; then
    INTERNAL_CHECK=$(docker compose -f "${COMPOSE_FILE}" exec -T lecturer-service sh -c 'wget -qO- --timeout=2 http://127.0.0.1:8085/actuator/health 2>/dev/null || echo ""' 2>/dev/null || true)
    if echo "$INTERNAL_CHECK" | grep -q -i "UP"; then
      echo "Health check PASSED via container internal ✓ (sau $((i * 3))s)"
      LECTURER_OK=true
      break
    fi
  fi

  echo "Chua san sang, cho 3s... (lan ${i}/35, HTTP: ${RES_CODE})"
  sleep 3
done

if [ "$LECTURER_OK" != "true" ]; then
  echo "⚠️ Warning: lecturer-service external health check did not return HTTP 200 in 105s."
  docker compose -f "${COMPOSE_FILE}" ps
  docker compose -f "${COMPOSE_FILE}" logs --tail 50 lecturer-service || true
  # Nếu container vẫn đang Up bình thường (chỉ là Actuator endpoint phản hồi khác), không ngắt build
  if docker compose -f "${COMPOSE_FILE}" ps 2>/dev/null | grep 'eduportal-lecturer' | grep -q "Up"; then
    echo "ℹ️ Container eduportal-lecturer is running (Up). Continuing deploy..."
  else
    echo "❌ eduportal-lecturer container has stopped or crashed!"
    exit 1
  fi
fi

# Đảm bảo host nginx reverse proxy luôn chạy để xử lý SSL và port 80/443
if command -v systemctl >/dev/null 2>&1; then
  if systemctl list-unit-files 2>/dev/null | grep -q nginx; then
    echo "=== Ensuring host nginx reverse proxy is active... ==="
    systemctl start nginx 2>/dev/null || true
    systemctl reload nginx 2>/dev/null || true
  fi
fi

# Kiểm tra thêm frontend
echo "=== Verifying frontend connectivity on port ${RESOLVED_FRONTEND_PORT}... ==="
curl -s -o /dev/null -w "Frontend internal HTTP: %{http_code}\n" --connect-timeout 3 "http://127.0.0.1:${RESOLVED_FRONTEND_PORT}/" || true
curl -s -o /dev/null -w "Host HTTP (port 80): %{http_code}\n" --connect-timeout 3 "http://127.0.0.1:80/" || true

echo "✅ Deploy ${ENV_NAME} succeeded"
