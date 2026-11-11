#!/usr/bin/env bash
set -euo pipefail

cd /opt/eduportal

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_NAME="${ENV_NAME:-prod}"

echo "========================================================"
echo "🚀 Bắt đầu triển khai Production: ${ENV_NAME}"
echo "Compose File: ${COMPOSE_FILE}"
echo "Thời gian: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "========================================================"

# -----------------------------------------------------------
# 1. Host Swap Check (2GB) để chống OOM trên VPS 1GB RAM
# -----------------------------------------------------------
if [ $(free -m 2>/dev/null | awk '/^Swap:/ {print $2}' || echo "0") -lt 1024 ]; then
  echo "=== Cấu hình 2GB Swap space trên host chống OOM crash... ==="
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

# -----------------------------------------------------------
# 2. Xử lý file cấu hình .env (Ưu tiên nhận từ .env.incoming an toàn)
# -----------------------------------------------------------
if [ -f .env ]; then
  cp .env .env.rollback
  PREV_IMAGE_TAG=$(grep -E '^IMAGE_TAG=' .env 2>/dev/null | cut -d'=' -f2 || echo "unknown")
  echo "=== Đã lưu snapshot rollback (.env.rollback). Previous IMAGE_TAG: ${PREV_IMAGE_TAG} ==="
else
  PREV_IMAGE_TAG="none"
fi

if [ -f .env.incoming ]; then
  echo "=== Cập nhật file .env từ nguồn bảo mật .env.incoming ==="
  mv .env.incoming .env
  chmod 600 .env
fi
rm -f .env.incoming 2>/dev/null || true

# Đọc cấu hình từ .env
IMAGE_TAG=$(grep -E '^IMAGE_TAG=' .env 2>/dev/null | cut -d'=' -f2 || echo "latest")
FRONTEND_PORT=$(grep -E '^FRONTEND_PORT=' .env 2>/dev/null | cut -d'=' -f2 || echo "3000")
GHCR_TOKEN=$(grep -E '^GHCR_TOKEN=' .env 2>/dev/null | cut -d'=' -f2 || echo "")
GHCR_USER=$(grep -E '^GHCR_USER=' .env 2>/dev/null | cut -d'=' -f2 || echo "")
DB_PASSWORD=$(grep -E '^DB_PASSWORD=' .env 2>/dev/null | cut -d'=' -f2 || echo "postgres")
DB_USER=$(grep -E '^DB_USER=' .env 2>/dev/null | cut -d'=' -f2 || echo "postgres")
SKIP_BACKUP=$(grep -E '^SKIP_BACKUP=' .env 2>/dev/null | cut -d'=' -f2 || echo "${SKIP_BACKUP:-false}")

echo "Image Tag triển khai: ${IMAGE_TAG}"

# Đăng nhập GHCR nếu có thông tin xác thực
if [ -n "${GHCR_TOKEN}" ] && [ -n "${GHCR_USER}" ]; then
  echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin 2>/dev/null || true
fi

# -----------------------------------------------------------
# 3. Sao lưu & Xác minh tính toàn vẹn Database Production
#    (P0: Bật pipefail, kiểm tra gzip và header dump an toàn SIGPIPE)
# -----------------------------------------------------------
BACKUP_DIR="/opt/eduportal/backups"
mkdir -p "${BACKUP_DIR}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/pre_deploy_backup_${TIMESTAMP}.sql.gz"

if [ "${SKIP_BACKUP}" = "true" ] || [ "${SKIP_BACKUP}" = "1" ]; then
  echo "ℹ️ SKIP_BACKUP=true: Bỏ qua bước sao lưu database, chỉ tập trung chạy deploy ứng dụng."
else
  # Ưu tiên tìm container postgres của môi trường đang triển khai (eduportal-postgres-prod)
  PG_CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E "^eduportal-postgres-${ENV_NAME}$" | head -n 1 || true)
  if [ -z "${PG_CONTAINER}" ]; then
    PG_CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep 'eduportal-postgres' | head -n 1 || true)
  fi

  if [ -n "${PG_CONTAINER}" ]; then
    echo "=== [Bảo vệ dữ liệu] Đang sao lưu database từ container ${PG_CONTAINER}... ==="

    # Thực thi pg_dump và nén gzip (kèm PGPASSWORD để xác thực)
    if docker exec -e PGPASSWORD="${DB_PASSWORD}" "${PG_CONTAINER}" pg_dump -U "${DB_USER}" academic_db 2>/dev/null | gzip > "${BACKUP_FILE}"; then
      # Kiểm tra 1: Dung lượng file tối thiểu
      FILESIZE=$(stat -c%s "${BACKUP_FILE}" 2>/dev/null || stat -f%z "${BACKUP_FILE}" 2>/dev/null || echo "0")
      if [ "${FILESIZE}" -ge 1024 ] && gzip -t "${BACKUP_FILE}" 2>/dev/null; then
        # Kiểm tra 3: Xác thực nội dung có chứa chữ ký PostgreSQL Dump
        # Tắt pipefail tạm thời để tránh lỗi SIGPIPE (exit code 141) khi head đóng đường ống trước gzip
        set +o pipefail
        HEADER_MATCH=$(gzip -dc "${BACKUP_FILE}" 2>/dev/null | head -n 30 | grep -qiE "PostgreSQL database dump|PostgreSQL" && echo "yes" || echo "no")
        set -o pipefail

        if [ "${HEADER_MATCH}" = "yes" ]; then
          BACKUP_HUMAN_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
          echo "✅ Sao lưu & Xác thực thành công: ${BACKUP_FILE} (Dung lượng: ${BACKUP_HUMAN_SIZE})"
          # Xoay vòng giữ 7 bản backup gần nhất
          ls -t "${BACKUP_DIR}"/pre_deploy_backup_*.sql.gz 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null || true
        else
          echo "⚠️ [CẢNH BÁO BACKUP] Bản dump không chứa header PostgreSQL chuẩn. Giữ bản sao lưu và tiếp tục deploy."
        fi
      else
        echo "⚠️ [CẢNH BÁO BACKUP] File backup quá nhỏ (${FILESIZE} bytes) hoặc định dạng hỏng. Bỏ qua backup và tiếp tục deploy."
        rm -f "${BACKUP_FILE}"
      fi
    else
      echo "⚠️ [CẢNH BÁO BACKUP] Lệnh pg_dump không thành công từ container ${PG_CONTAINER}. Tiếp tục quy trình deploy..."
      rm -f "${BACKUP_FILE}"
    fi
  else
    echo "ℹ️ Không tìm thấy container PostgreSQL đang chạy. Bỏ qua bước sao lưu trước deploy."
  fi
fi

# -----------------------------------------------------------
# 4. Kéo images mới trước khi khởi động lại containers (Retry 3 lần chống rớt mạng)
# -----------------------------------------------------------
echo "=== Đang kéo images mới (${COMPOSE_FILE})... ==="
PULL_SUCCESS=false
for attempt in 1 2 3; do
  echo "Thử kéo images (lần ${attempt}/3)..."
  if docker compose -f "${COMPOSE_FILE}" pull; then
    PULL_SUCCESS=true
    break
  fi
  echo "⚠️ Lần thử ${attempt} gặp sự cố kết nối registry, thử lại sau 3 giây..."
  sleep 3
done

if [ "$PULL_SUCCESS" != "true" ]; then
  echo "❌ Kéo Docker images thất bại sau 3 lần thử! Giữ nguyên phiên bản hiện tại đang chạy."
  exit 1
fi

# -----------------------------------------------------------
# 5. Dọn dẹp stack cũ khác và tái khởi động stack Production
#    TUYỆT ĐỐI KHÔNG DÙNG CỜ -v ĐỂ BẢO VỆ DỮ LIỆU
# -----------------------------------------------------------
for other_compose in docker-compose.staging.yml docker-compose.dev.yml; do
  if [ -f "$other_compose" ] && [ "$other_compose" != "${COMPOSE_FILE}" ]; then
    echo "Dừng stack không thuộc Production (${other_compose})..."
    docker compose -f "$other_compose" down --remove-orphans 2>/dev/null || true
  fi
done

# Xác định Frontend port
if ss -tulpn 2>/dev/null | grep -q 'nginx.*:80\b' || netstat -tulpn 2>/dev/null | grep -q 'nginx.*:80\b'; then
  RESOLVED_FRONTEND_PORT="3000"
else
  RESOLVED_FRONTEND_PORT="${FRONTEND_PORT:-3000}"
fi

echo "=== Tái khởi động containers Production (${COMPOSE_FILE})... ==="
if ! docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans; then
  echo "⚠️ Khởi động lần đầu gặp lỗi xung đột socket, dọn dẹp port và thử lại..."
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${RESOLVED_FRONTEND_PORT}/tcp" 2>/dev/null || true
  fi
  sleep 2
  docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans
fi

# -----------------------------------------------------------
# 6. Chờ PostgreSQL sẵn sàng & Kiểm tra Schema
# -----------------------------------------------------------
echo "=== Chờ PostgreSQL sẵn sàng... ==="
PG_READY=false
for i in $(seq 1 30); do
  if docker compose -f "${COMPOSE_FILE}" exec -T postgres pg_isready -U postgres -d academic_db >/dev/null 2>&1; then
    echo "PostgreSQL sẵn sàng ✓ (sau ${i}s)"
    PG_READY=true
    break
  fi
  sleep 1
done

if [ "$PG_READY" != "true" ]; then
  echo "❌ PostgreSQL không phản hồi sau 30 giây!"
  exit 1
fi

# Nạp schema khởi tạo nếu là database mới hoàn toàn (idempotent)
docker compose -f "${COMPOSE_FILE}" exec -T postgres sh -c \
  "psql -U postgres -d academic_db -c 'SELECT 1 FROM class_sections LIMIT 1;' >/dev/null 2>&1 \
   || (psql -U postgres -d academic_db -f /docker-entrypoint-initdb.d/01-schema.sql \
       && psql -U postgres -d academic_db -f /docker-entrypoint-initdb.d/02-seed-data.sql)" || true

# -----------------------------------------------------------
# 7. Health Check toàn diện CẢ 5 MICROSERVICES VÀ FRONTEND
# -----------------------------------------------------------
echo "=== Đang thực hiện Health Check toàn diện (tối đa 150 giây)... ==="
SERVICES_READY=false

for i in $(seq 1 50); do
  ALL_OK=true

  # Quét cổng 5 Java Microservices: 8081(auth), 8082(course), 8083(enrollment), 8084(ai), 8085(lecturer)
  for port in 8081 8082 8083 8084 8085; do
    CODE=$(curl -s -m 2 -o /dev/null -w "%{http_code}" "http://127.0.0.1:${port}/actuator/health" 2>/dev/null || echo "000")
    if [ "$CODE" != "200" ]; then
      ALL_OK=false
      break
    fi
  done

  # Quét cổng Frontend
  FE_CODE=$(curl -s -m 2 -o /dev/null -w "%{http_code}" "http://127.0.0.1:${RESOLVED_FRONTEND_PORT}/" 2>/dev/null || echo "000")
  if [ "$FE_CODE" != "200" ]; then
    ALL_OK=false
  fi

  if [ "$ALL_OK" = "true" ]; then
    echo "✅ Tất cả 5 microservices backend và Frontend đã phản hồi HTTP 200 thành công (lần thử ${i}/50)!"
    SERVICES_READY=true
    break
  fi

  echo "Đang đợi microservices khởi động hoàn tất... (lần ${i}/50, FE: ${FE_CODE})"
  sleep 3
done

# In bảng trạng thái container sau khi kiểm tra
echo "=== Trạng thái containers hiện tại ==="
docker compose -f "${COMPOSE_FILE}" ps

# -----------------------------------------------------------
# 8. Xử lý Thất bại & Cơ chế Rollback Ứng dụng An toàn
# -----------------------------------------------------------
if [ "$SERVICES_READY" != "true" ]; then
  echo "❌ [DEPLOY THẤT BẠI] Microservices không vượt qua kiểm tra Health Check sau 60s!"
  echo "=== Logs chi tiết của stack ==="
  docker compose -f "${COMPOSE_FILE}" logs --tail 40

  if [ -f .env.rollback ] && [ "${PREV_IMAGE_TAG}" != "none" ]; then
    echo "========================================================"
    echo "⚠️ KÍCH HOẠT TỰ ĐỘNG ROLLBACK ỨNG DỤNG..."
    echo "Khôi phục lại phiên bản trước đó: ${PREV_IMAGE_TAG}"
    echo "========================================================"
    cp .env.rollback .env
    docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans
    echo "Đang chờ 10s để container cũ hoạt động trở lại..."
    sleep 10
    docker compose -f "${COMPOSE_FILE}" ps
    echo "⚠️ Đã hoàn tất rollback ứng dụng về phiên bản: ${PREV_IMAGE_TAG}"
    echo "ℹ️ LƯU Ý DỮ LIỆU: Database KHÔNG tự động restore để bảo vệ các bản ghi mới phát sinh."
    echo "   Nếu cần khôi phục dữ liệu từ bản sao lưu trước deploy, sử dụng file:"
    echo "   ${BACKUP_FILE}"
    echo "   Xem hướng dẫn chi tiết tại docs/deployment/disaster-recovery.md"
  fi
  exit 1
fi

# -----------------------------------------------------------
# 9. Đảm bảo Host Nginx Reverse Proxy & Xác nhận truy cập
# -----------------------------------------------------------
if command -v systemctl >/dev/null 2>&1; then
  if systemctl list-unit-files 2>/dev/null | grep -q nginx; then
    echo "=== Đảm bảo host nginx reverse proxy hoạt động... ==="
    systemctl start nginx 2>/dev/null || true
    systemctl reload nginx 2>/dev/null || true
  fi
fi

# Dọn dẹp file rollback sau khi deploy thành công
rm -f .env.rollback

echo "=== Kiểm tra truy cập cuối cùng ==="
curl -s -o /dev/null -w "Frontend local (port ${RESOLVED_FRONTEND_PORT}): %{http_code}\n" --connect-timeout 3 "http://127.0.0.1:${RESOLVED_FRONTEND_PORT}/" || true
curl -s -o /dev/null -w "Host HTTP (port 80): %{http_code}\n" --connect-timeout 3 "http://127.0.0.1:80/" || true

echo "========================================================"
echo "🎉 DEPLOY PRODUCTION THÀNH CÔNG!"
echo "Phiên bản: ${IMAGE_TAG}"
echo "Môi trường: ${ENV_NAME}"
echo "========================================================"
