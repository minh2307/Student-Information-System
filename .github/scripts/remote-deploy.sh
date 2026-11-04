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
for port in 80 3000 5432 8081 8083 8085; do
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

# Dừng dịch vụ web trên host OS (nginx/apache2) nếu có
if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet nginx 2>/dev/null; then
    echo "Stopping host nginx service to free port 80..."
    systemctl stop nginx 2>/dev/null || true
  fi
  if systemctl is-active --quiet apache2 2>/dev/null; then
    echo "Stopping host apache2 service to free port 80..."
    systemctl stop apache2 2>/dev/null || true
  fi
fi

# Giải phóng socket treo trên port 80 và 3000 bằng fuser nếu có
if command -v fuser >/dev/null 2>&1; then
  fuser -k 80/tcp 2>/dev/null || true
  fuser -k 3000/tcp 2>/dev/null || true
fi

# Chờ 2 giây để Linux kernel TCP socket hoàn tất giải phóng
sleep 2

# Xác định cổng frontend: dev/staging mặc định port 3000 (tránh hoàn toàn va chạm port 80); prod dùng port 80
RESOLVED_FRONTEND_PORT="${FRONTEND_PORT}"
if [ -z "${RESOLVED_FRONTEND_PORT}" ]; then
  if [ "${ENV_NAME}" = "prod" ]; then
    RESOLVED_FRONTEND_PORT="80"
  else
    RESOLVED_FRONTEND_PORT="3000"
  fi
fi

# Fallback an toàn: nếu yêu cầu cổng 80 nhưng host vẫn đang bị chiếm dụng bởi tiến trình không hạ được, fallback về 3000
if [ "${RESOLVED_FRONTEND_PORT}" = "80" ]; then
  if command -v ss >/dev/null 2>&1 && ss -tulpn 2>/dev/null | grep -q ':80\b'; then
    echo "⚠️ Warning: Port 80 is still in use on host. Falling back FRONTEND_PORT to 3000 to prevent deploy failure!"
    RESOLVED_FRONTEND_PORT="3000"
  fi
fi

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

# Health check lecturer-service (chờ Spring Boot khởi động hoàn tất lên tới 210s trên VPS)
echo "=== Health check lecturer-service... ==="
LECTURER_OK=false
i=0
while [ $i -lt 70 ]; do
  if curl -sf http://localhost:8085/actuator/health >/dev/null 2>&1; then
    elapsed=$((i * 3))
    echo "Health check PASSED ✓ (sau ${elapsed}s)"
    LECTURER_OK=true
    break
  fi
  echo "Chua san sang, cho 3s... (lan $((i + 1))/70)"
  sleep 3
  i=$((i + 1))
done

if [ "$LECTURER_OK" != "true" ]; then
  echo "❌ Health check FAILED!"
  docker compose -f "${COMPOSE_FILE}" ps
  docker compose -f "${COMPOSE_FILE}" logs --tail 100 lecturer-service
  exit 1
fi

echo "✅ Deploy ${ENV_NAME} succeeded"
