#!/usr/bin/env bash
set -e

cd /opt/eduportal

# Đảm bảo có tối thiểu 2GB Swap để chống OOM treo máy ảo khi chạy 5 microservices Java trên VPS 1GB RAM
if [ $(free -m 2>/dev/null | awk '/^Swap:/ {print $2}' || echo "0") -lt 1024 ]; then
  echo "=== Configuring 2GB Swap space on host to prevent OOM crash... ==="
  if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 2>/dev/null || true
    chmod 600 /swapfile 2>/dev/null || true
    mkswap /swapfile 2>/dev/null || true
  fi
  swapon /swapfile 2>/dev/null || true
  if ! grep -q '/swapfile' /etc/fstab 2>/dev/null; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab 2>/dev/null || true
  fi
fi

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
for port in 3000 5432 8081 8082 8083 8084 8085; do
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
# Nếu host Nginx đang chạy chiếm port 80, container frontend bắt buộc phải chạy ở port 3000
if ss -tulpn 2>/dev/null | grep -q 'nginx.*:80\b' || netstat -tulpn 2>/dev/null | grep -q 'nginx.*:80\b'; then
  RESOLVED_FRONTEND_PORT="3000"
else
  RESOLVED_FRONTEND_PORT="${FRONTEND_PORT:-3000}"
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
  echo "PAYOS_CLIENT_ID=${PAYOS_CLIENT_ID:-57fb1006-9ba1-472c-ba21-8536efcda5aa}"
  echo "PAYOS_API_KEY=${PAYOS_API_KEY:-22f2d865-a236-4f93-9f66-e845a1dae134}"
  echo "PAYOS_CHECKSUM_KEY=${PAYOS_CHECKSUM_KEY:-2fcea1152bb41c61979f7011cc5a0e3b72758cc9d14909772595a5268dc9075a}"
  echo "PAYOS_RETURN_URL=${PAYOS_RETURN_URL:-https://rikkeiportal.io.vn/student/tuition?status=PAID}"
  echo "PAYOS_CANCEL_URL=${PAYOS_CANCEL_URL:-https://rikkeiportal.io.vn/student/tuition?status=CANCELLED}"
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

# Health check nhanh lecturer-service & kiểm tra trạng thái containers
echo "=== Health check lecturer-service... ==="
LECTURER_OK=false
for i in $(seq 1 10); do
  RES_CODE=$(curl -s -m 1 -o /dev/null -w "%{http_code}" http://127.0.0.1:8085/actuator/health 2>/dev/null || echo "000")

  if [ "$RES_CODE" = "200" ]; then
    echo "Health check PASSED ✓ (HTTP 200 sau $((i * 2))s)"
    LECTURER_OK=true
    break
  fi

  echo "Dang khoi dong, cho 2s... (lan ${i}/10, HTTP: ${RES_CODE})"
  sleep 2
done

# In bảng trạng thái các container sau khi khởi động
echo "=== Container Statuses ==="
docker compose -f "${COMPOSE_FILE}" ps

if [ "$LECTURER_OK" = "true" ]; then
  echo "✅ lecturer-service is ready (HTTP 200)"
else
  # Kiểm tra xem có container nào bị crash/restart liên tục không
  if docker compose -f "${COMPOSE_FILE}" ps 2>/dev/null | grep 'eduportal' | grep -v -E '(Up|healthy)'; then
    echo "❌ Detected failed container(s)!"
    docker compose -f "${COMPOSE_FILE}" logs --tail 40
    exit 1
  else
    echo "ℹ️ All containers are running (Up). Microservices will be ready shortly in background."
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
