# Quy trình Chuẩn hóa Phát triển & Triển khai (Git Workflow & CI/CD)

Tài liệu này quy định chuẩn hóa quy trình làm việc từ phát triển tính năng, tích hợp mã nguồn đến triển khai tự động lên hệ thống Production của dự án **Rikkei EduPortal**.

---

## 1. Sơ đồ luồng tổng quan

```
feature/* (hoặc BE-*, FE-*)
    │
    ▼
   dev
    │
    │ (Tự động chạy CI: Build BE/FE + Newman API Test)
    │ (KHÔNG tự động deploy VPS)
    ▼
   main
    │
    │ (Tự động chạy CI/CD: Test + Build Docker + Deploy VPS)
    ▼
Production (VPS duy nhất)
```

---

## 2. Quy tắc phân nhánh Git

### 2.1. Nhánh `feature/*` (hoặc các nhánh vai trò: `BE-*`, `FE-*`, `QA-*`)
- **Phát triển tại máy Local (máy của lập trình viên)**:
  - Tạo nhánh từ `dev` mới nhất:
    ```bash
    git checkout dev
    git pull origin dev
    git checkout -b feature/ten-tinh-nang
    ```
  - Chạy thử nghiệm và kiểm thử trên máy local bằng cách chạy trực tiếp các service hoặc dùng `docker compose -f docker-compose.dev.yml up`.
  - Database local sử dụng volume riêng `postgres_data_dev`, tuyệt đối không kết nối trực tiếp vào database Production.
  - Khi hoàn thiện và tự kiểm thử đạt yêu cầu, tạo **Pull Request (PR)** vào nhánh `dev`.

### 2.2. Nhánh `dev` (Tích hợp & Kiểm thử toàn diện)
- Là nhánh nhận code từ các nhánh tính năng để tích hợp.
- **Cơ chế CI trên GitHub Actions**:
  - Tự động chạy khi có Push hoặc PR vào `dev`:
    1. `build-backend`: Compile Java 21, chạy Unit test với PostgreSQL test database, tạo file JAR.
    2. `build-frontend`: Cài đặt thư viện npm và chạy Vite build.
    3. `api-test`: Khởi chạy các service trong container CI và chạy trọn bộ kiểm thử tự động API bằng Postman/Newman.
  - **Quy tắc quan trọng:** Nhánh `dev` **KHÔNG TỰ ĐỘNG DEPLOY LÊN VPS** để bảo toàn tài nguyên cho máy chủ Production.

### 2.3. Nhánh `main` (Phát hành Production)
- Nhánh `main` là nhánh duy nhất đại diện cho phiên bản Production và là nhánh duy nhất được phép triển khai lên VPS Production.
- **Quy tắc merge:**
  - `main` chỉ nhận code từ `dev` thông qua Pull Request sau khi toàn bộ sprint/milestone đã pass đầy đủ các bài test và được xác nhận sẵn sàng phát hành.
  - Nghiêm cấm push code trực tiếp vào `main`.
- **Cơ chế CI/CD trên GitHub Actions**:
  - Khi PR được merge vào `main` (hoặc kích hoạt `workflow_dispatch` có kiểm soát):
    1. Chạy toàn bộ bộ kiểm thử CI (Backend, Frontend, Newman API).
    2. Build Docker images cho 5 microservices backend và frontend.
    3. Gắn tag định danh bất biến (immutable tag: `main-<sha>` và `prod`) và push lên GHCR.
    4. Kích hoạt SSH Remote Deploy tự động lên VPS Production.
  - **Khóa bảo mật `workflow_dispatch`:** Chỉ cho phép thực thi khi ref_name là `main`. Không thể vô tình deploy nhánh `dev` hay feature lên Production qua giao diện GitHub Actions.

---

## 3. Tối ưu VPS (1GB RAM / 1 vCPU)

Do tài nguyên VPS hạn chế:
- **Nguyên tắc duy nhất một stack:** Trên VPS chỉ duy trì một stack duy nhất là **Production** (`docker-compose.prod.yml`). Không chạy song song hai môi trường Dev và Production.
- **Bộ nhớ đệm (Swap):** Hệ thống máy chủ cấu hình **2GB-3GB Swap** để hấp thụ các đỉnh tải bộ nhớ, ngăn ngừa việc Linux OOM Killer dừng tiến trình.
- **Tối ưu JVM:** Mọi service Java Spring Boot đều được cấu hình tham số:
  ```yaml
  JAVA_TOOL_OPTIONS: "-Xmx120m -Xms40m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Djava.security.egd=file:/dev/./urandom"
  ```
  - `SerialGC`: Tiết kiệm CPU tối đa cho môi trường 1 vCPU.
  - `TieredStopAtLevel=1`: Giảm tiêu thụ RAM của bộ biên dịch JIT C2.
  - Cgroup memory limits được đặt ở mức 220MB cho mỗi Java container.

---

## 4. Bảo vệ dữ liệu & Cơ chế Rollback

1. **Cô lập Volume:**
   - Production sử dụng volume: `postgres_prod_data`.
   - Dev local sử dụng volume: `postgres_data_dev`.
   - Hoàn toàn độc lập, không dùng chung volume hay thông tin xác thực.
2. **Tuyệt đối không xóa Volume:**
   - **Cấm sử dụng `docker compose down -v`** trong toàn bộ quy trình deploy và vận hành máy chủ.
3. **Tự động sao lưu trước Deploy (Pre-Migration Backup):**
   - Mỗi lần CI/CD kích hoạt triển khai lên VPS, script `.github/scripts/remote-deploy.sh` kích hoạt `set -euo pipefail` tự động thực thi `pg_dump` nén gzip.
   - **Xác thực 3 lớp:** Kiểm tra dung lượng (> 1KB), kiểm tra tính toàn vẹn gzip (`gzip -t`), và kiểm tra chữ ký PostgreSQL header trước khi cho phép deploy tiếp. Nếu backup lỗi, script lập tức hủy deploy (`exit 1`).
   - Tự động xoay vòng lưu trữ 7 bản backup gần nhất.
4. **Kiểm tra Health Check toàn diện:**
   - Quét liên tục trong 60 giây cả 5 microservices (8081, 8082, 8083, 8084, 8085) và Frontend (port 3000 qua IPv4 `127.0.0.1`).
   - Bắt buộc tất cả dịch vụ phải phản hồi HTTP 200 mới đánh dấu deploy thành công.
5. **Cơ chế Rollback Ứng dụng & Kiểm soát Dữ liệu:**
   - Khi Health Check thất bại: Tự động rollback các container về phiên bản trước thông qua `.env.rollback`.
   - **Nguyên tắc dữ liệu:** Không tự động restore database khi rollback ứng dụng để tránh mất mát các giao dịch mới phát sinh.
   - Trường hợp schema migration bị xung đột không tương thích ngược: Thực hiện quy trình phục hồi thủ công theo tài liệu [Disaster Recovery Guide](./disaster-recovery.md).
