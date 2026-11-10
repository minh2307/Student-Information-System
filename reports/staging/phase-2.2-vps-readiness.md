# BÁO CÁO ĐÁNH GIÁ SẴN SÀNG TRIỂN KHAI VPS (PHASE 2.2: VPS READINESS REVIEW)

**Dự án**: Rikkei EduPortal (`PRJ-QUICK-REVIEW-PRE-OJT-03`)  
**Nhiệm vụ**: `[TASK-D05-MINH]` VPS UPGRADE & STAGING DEPLOYMENT PREPARATION  
**Kỹ sư thực hiện**: Senior DevOps Engineer / Backend Engineer  
**Thời gian thực hiện**: 2026-11-06  
**Trạng thái**: Đã khảo sát tài nguyên thực tế VPS & lập kế hoạch triển khai song song  

---

## 1. KẾT QUẢ KHẢO SÁT THỰC TẾ TÀI NGUYÊN VPS (PRE-DEPLOYMENT AUDIT)

Lệnh kiểm tra được thực hiện trực tiếp trên VPS (`ssh root@221.121.3.201`) theo đúng nguyên tắc **"Không giả định việc nâng cấp đã hoàn thành"**:

```text
=== LIVE VPS RESOURCE AUDIT (2026-11-06) ===
- IP: 221.121.3.201 | Domain: https://rikkeiportal.io.vn
- OS: Ubuntu 24.10 (x86_64) | Kernel: Linux 6.11.0-9-generic
- CPU: 1 vCPU (Intel Xeon Platinum 8269CY @ 2.50GHz, 1 core, 1 thread)
- RAM vật lý: 954 MiB (Used: 832 MiB, Free: 75 MiB, Available: 121 MiB)
- Swap Space: 2.0 GiB (Đang sử dụng: 835 MiB - 41%)
- Disk (/dev/sda2): 20 GB (Used: 12 GB - 63%, Available: 6.8 GB)
- Docker Version: 28.4.0 (Server Version)
- Running Containers: 7 containers thuộc stack Development (eduportal-*-dev)
- Cổng đang bị chiếm dụng trên VPS:
    + 80/tcp, 443/tcp: Host Nginx reverse proxy
    + 3000/tcp: eduportal-frontend-dev
    + 8081/tcp: eduportal-auth-dev
    + 8082/tcp: eduportal-course-dev
    + 8083/tcp: eduportal-enrollment-dev
    + 8084/tcp: eduportal-ai-dev
    + 8085/tcp: eduportal-lecturer-dev
    + 5432/tcp: eduportal-postgres-dev
```

> [!CRITICAL]
> **XÁC MINH NÂNG CẤP PHẦN CỨNG**:
> Máy chủ VPS hiện tại **VẪN ĐANG Ở CẤU HÌNH CŨ (1 vCPU, 954 MiB RAM)**. Việc nâng cấp gói phần cứng lên 2GB hoặc 4GB RAM trên dashboard nhà cung cấp VPS **chưa được áp dụng (hoặc VPS chưa được reboot để nhận RAM mới)**.

---

## 2. THIẾT KẾ KIẾN TRÚC TRIỂN KHAI SONG SONG (DEV & STAGING CO-EXISTENCE)

Khi người dùng hoàn tất nâng cấp VPS lên **4GB RAM**, hệ thống EduPortal sẽ vận hành theo mô hình kiến trúc song song độc lập hoàn toàn (**Zero-Interference Architecture**):

```
                                  [ INTERNET / USER / NEWMAN ]
                                               │
                                 ┌─────────────┴─────────────┐
                                 │    Host UFW & Nginx SSL   │
                                 └─────────────┬─────────────┘
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       │                                               │
            Port 80 / 443 / 3000                                   Port 8080
                       │                                               │
         ▼─────────────────────────────▼                ▼─────────────────────────────▼
         STACK 1: DEVELOPMENT (HIỆN CÓ)                 STACK 2: STAGING (TASK-D05)
         Network: eduportal_default                     Network: eduportal_staging_network
         Volume: eduportal_postgres_data_dev            Volume: eduportal_postgres_data_staging
         ─────────────────────────────                  ─────────────────────────────
         - eduportal-frontend-dev    (:3000)            - eduportal-frontend-staging   (:8080)
         - eduportal-auth-dev        (:8081)            - eduportal-auth-staging       (internal / :18081)
         - eduportal-course-dev      (:8082)            - eduportal-course-staging     (internal / :18082)
         - eduportal-enrollment-dev  (:8083)            - eduportal-enrollment-staging (internal / :18083)
         - eduportal-ai-dev          (:8084)            - eduportal-ai-staging         (internal / :18084)
         - eduportal-lecturer-dev    (:8085)            - eduportal-lecturer-staging   (internal / :18085)
         - eduportal-postgres-dev    (:5432)            - eduportal-postgres-staging   (internal / :15432)
```

---

## 3. MA TRẬN PHÂN BỔ CỔNG (PORT MAPPING MATRIX)

Để bảo đảm **100% không xung đột port** giữa hai môi trường:

| Dịch vụ | Port Development (Đang chạy) | Port Staging Đề xuất (TASK-D05) | Firewall UFW | Ghi chú an toàn |
| :--- | :--- | :--- | :--- | :--- |
| **API Gateway / Frontend** | `3000` (Host Nginx proxy từ 80/443) | **`8080`** | `8080 ALLOW Anywhere` (Đã mở sẵn) | Newman & Tester gọi thẳng `http://221.121.3.201:8080/` |
| **PostgreSQL Database** | `5432` (`0.0.0.0:5432`) | **Internal DNS (`postgres:5432`)** hoặc `127.0.0.1:15432` | Chặn WAN (Nội bộ) | Tuyệt đối không mở ra ngoài, cô lập 100% |
| **`auth-service`** | `8081` | `18081:8081` (hoặc internal) | Chặn WAN | Gateway định tuyến `/api/v1/auth` |
| **`course-service`** | `8082` | `18082:8082` (hoặc internal) | Chặn WAN | Gateway định tuyến `/api/v1/courses` |
| **`enrollment-service`** | `8083` | `18083:8083` (hoặc internal) | Chặn WAN | Gateway định tuyến `/api/v1/student` |
| **`ai-service`** | `8084` | `18084:8084` (hoặc internal) | Chặn WAN | Gateway định tuyến `/api/v1/ai` |
| **`lecturer-service`** | `8085` | `18085:8085` (hoặc internal) | Chặn WAN | Gateway định tuyến `/api/v1/lecturer` |

---

## 4. BẢNG TÍNH TOÁN NGÂN SÁCH BỘ NHỚ (MEMORY BUDGET CALCULATION)

### 4.1. Phân bổ chi tiết khi nâng cấp lên 4GB RAM (Khuyến nghị số 1)
- **Tổng RAM vật lý**: $4,096\text{ MB}$
- **Swap dự phòng**: $2,048\text{ MB}$
- **Hệ điều hành Ubuntu 24.10 + Daemons (SSHD, Nginx, Dockerd)**: $350\text{ MB}$
- **Stack Development (7 containers hiện tại)**: $\approx 950\text{ MB}$
- **Stack Staging (7 containers với JVM Tuning)**:
  - 5 microservices Java ($\approx 140\text{ MB} \times 5$): $700\text{ MB}$
  - PostgreSQL 16 Staging: $120\text{ MB}$
  - Frontend Nginx Staging: $20\text{ MB}$
  - Tổng Staging: $\approx 840\text{ MB}$
- **Tổng RAM tiêu thụ cả hệ thống**: $350 + 950 + 840 \approx \mathbf{2,140\text{ MB}}$
- **Dung lượng RAM thực còn dư (Headroom)**: **$1,956\text{ MB}$ (~47% trần bộ nhớ)**!
- **Đánh giá**: Mức an toàn tuyệt đối. Cả Development và Staging cùng chạy mượt mà, không kích hoạt Swap, đáp ứng hoàn hảo cho việc chạy Newman test song song.

### 4.2. Phân bổ khi nâng cấp lên 2GB RAM
- **Tổng RAM vật lý**: $2,048\text{ MB}$
- **Tổng nhu cầu hệ thống**: $\approx 2,140\text{ MB}$
- **Đánh giá**: Khi chạy cả Dev + Staging, hệ thống sẽ phải đưa khoảng 100 - 200 MB vào Swap. Có thể chạy được nhưng độ trễ tăng nhẹ khi Newman bắn concurrent requests. Nếu dùng gói 2GB, khuyến nghị tạm dừng Dev để Staging độc chiếm 2GB RAM.

---

## 5. BẢO VỆ DỮ LIỆU & CÔ LẬP CƠ SỞ DỮ LIỆU (DATABASE ISOLATION)

Để đảm bảo an toàn dữ liệu 100%:
1. **Named Volume riêng biệt**:
   - Development sử dụng: `eduportal_postgres_data_dev`
   - Staging sử dụng: `eduportal_postgres_data_staging`
   - Database name: `academic_staging_db` (hoặc `academic_db` trên instance postgres staging riêng biệt).
2. **Quy tắc bất khả xâm phạm**:
   - Tuyệt đối không chạm vào các volume của các kỳ thi / dự án khác trên VPS (`devops-final-de001`, `ptit_cntt1_...`).
   - Tuyệt đối không xóa dữ liệu hay can thiệp vào container `eduportal-postgres-dev`.

---

## 6. QUY TRÌNH TRIỂN KHAI TUẦN TỰ (STAGED DEPLOYMENT SEQUENCE)

Để tránh hiện tượng CPU Throttling và nghẽn tài nguyên trên VPS:

```
[BƯỚC 1: Pre-Audit] ──► Kiểm tra RAM (free -h), CPU (lscpu) sau khi VPS reboot
         │
[BƯỚC 2: Transfer]  ──► Nạp 5 Docker Images Staging vào VPS (hoặc build nhanh qua Docker context)
         │
[BƯỚC 3: DB Setup]  ──► Khởi chạy eduportal-postgres-staging ──► Chờ Healthy (pg_isready)
         │
[BƯỚC 4: Staged App]──► Khởi chạy Auth-service & Course-service ──► Chờ HTTP 200 Actuator
         │           ──► Khởi chạy Enrollment-service & Lecturer-service ──► Chờ HTTP 200
         │           ──► Khởi chạy AI-service & Frontend (Port 8080) ──► Chờ HTTP 200
         │
[BƯỚC 5: Verify]    ──► Kiểm tra liên thông giữa các service qua Gateway Port 8080
         │
[BƯỚC 6: Newman]    ──► Thực thi bộ Newman Automated API Test Suite trực tiếp trên VPS
```

---

## 7. KẾ HOẠCH PHỤC HỒI RỦI RO (ROLLBACK PLAN)

Nếu có sự cố phát sinh trong quá trình triển khai Staging:
1. **Lệnh Rollback ngay lập tức**:
   ```bash
   docker compose -f docker-compose.staging.yml down
   ```
2. **Kiểm tra phục hồi**:
   - Kiểm tra stack Development: `docker compose -f docker-compose.dev.yml ps`
   - Kiểm tra web chính thức: `curl -s -I https://rikkeiportal.io.vn` (vẫn hoạt động bình thường qua port 3000).
   - Dữ liệu Development và các dự án khác được bảo toàn nguyên vẹn 100%.

---

## 8. KẾT LUẬN & QUYẾT ĐỊNH GO / NO-GO

> ### 🛑 QUYẾT ĐỊNH HIỆN TẠI: **NO-GO (DỪNG LẠI CHỜ NÂNG CẤP VPS)**
> 
> **Căn cứ kỹ thuật**:
> 1. Kết quả lệnh `free -h` và `docker info` trên máy chủ `221.121.3.201` chứng minh **VPS hiện vẫn đang ở mức 954 MiB RAM và 1 vCPU**.
> 2. Stack Development đang chạy và chiếm dụng 832 MB RAM cùng toàn bộ cổng mặc định.
> 3. Tuân thủ Điều kiện dừng Mục 7: *"Nếu VPS chưa được nâng cấp hoặc không đủ tài nguyên: Không deploy, Không restart stack hiện tại, Không tự ý dừng Development, Báo cáo NO-GO."*

---

## 9. BƯỚC TIẾP THEO

Tôi đã chuẩn bị sẵn sàng toàn bộ:
- Cấu hình Compose Staging nắn cổng về **`8080`** (Frontend) và mạng cô lập.
- Bộ thông số JVM tối ưu sâu (`-Xmx80m -Xss256k -XX:MaxMetaspaceSize=65m`).
- Kế hoạch chạy Newman qua container `postman/newman:alpine`.

**Xin bạn vui lòng thực hiện thao tác nâng cấp VPS trên bảng điều khiển hosting provider (chọn gói 2GB hoặc 4GB RAM) và khởi động lại VPS.**  
Khi bạn thông báo nâng cấp đã hoàn tất, tôi sẽ chạy lại kiểm tra tài nguyên và lập tức chuyển sang **GO** để triển khai **PHASE 3 – STAGING DEPLOYMENT & NEWMAN TESTING**!
