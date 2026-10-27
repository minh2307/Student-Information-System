#!/usr/bin/env bash
set -e

cd /opt/eduportal

# Ghi file .env từ biến môi trường (được truyền qua SSH AcceptEnv/SendEnv)
{
  echo "DB_PASSWORD=${DB_PASSWORD}"
  echo "JWT_SECRET=${JWT_SECRET}"
  echo "REGISTRY=${REGISTRY}"
  echo "IMAGE_TAG=${IMAGE_TAG}"
  echo "IMAGE_PREFIX=${IMAGE_PREFIX}"
  echo "AI_API_KEY=${AI_API_KEY}"
} > .env

# Pull images và restart
echo "=== Pulling images... ==="
docker compose -f "${COMPOSE_FILE}" pull

echo "=== Starting containers... ==="
docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans

# Chờ PostgreSQL sẵn sàng
echo "=== Waiting for PostgreSQL... ==="
i=0
while [ $i -lt 30 ]; do
  if docker compose -f "${COMPOSE_FILE}" exec -T postgres pg_isready -U postgres -d academic_db >/dev/null 2>&1; then
    echo "PostgreSQL ready ✓"
    break
  fi
  sleep 2
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
