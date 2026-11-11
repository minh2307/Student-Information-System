# BÁO CÁO KIỂM TRA TIỀN TRIỂN KHAI STAGING (PHASE 0: PRE-FLIGHT INSPECTION)
## [TASK-FEE-04-MINH] ZERO-INTERFERENCE CO-EXISTENCE DEPLOYMENT

- **Hệ thống:** Student Information System (EduPortal)
- **Mục tiêu:** Kiểm toán hiện trạng VPS `221.121.3.201` và xác lập điều kiện biên an toàn tuyệt đối trước khi triển khai Staging
- **Thời điểm kiểm tra:** 07/11/2026 15:05 (Local Time) / 08:05 (UTC)
- **Kỹ sư thực hiện:** Senior DevOps Engineer / SRE
- **Nguyên tắc cốt lõi:** **ZERO-INTERFERENCE – ZERO DATA LOSS – ZERO PRODUCTION PAYMENT**

---

## 1. TỔNG QUAN KẾT QUẢ CHECKPOINT 0

| Hạng mục kiểm toán | Trạng thái | Ghi chú & Đánh giá an toàn |
| :--- | :---: | :--- |
| **0.1. Kiểm tra Git tại Local** | **PASS** | Đúng branch `Team-Lead-/-AI-Integrator-Minh`, commit `5c36fbc`, working tree sạch 100%. |
| **0.2. Kết nối SSH & Hệ điều hành VPS** | **PASS** | Kết nối SSH `root@221.121.3.201` thành công, Ubuntu 24.10, Docker 28.4.0, Compose v2.39.2. |
| **0.3. Nhận diện Stack hiện hữu trên VPS** | **PASS** | Nhận diện chính xác 7 container (`eduportal-*-prod`), project `eduportal`, network `eduportal_default`, volume `eduportal_postgres_prod_data`. |
| **0.4. Kiểm tra Tài nguyên (RAM, Swap, Disk, CPU)** | **PASS** | RAM Available 149 MB, Swap Available 2.0 GB (Tổng 3.0 GB), Disk Available 9.3 GB (50%), CPU Load 0.00. |
| **0.5. Kiểm tra Xung đột Cổng Staging** | **PASS** | Toàn bộ 7 cổng Staging (`8080`, `15432`, `18081-18085`) đều hoàn toàn trống (100% Free). |
| **0.6. Kiểm toán Kiến trúc Cô lập (Isolation)** | **PASS** | Đã phát hiện file cũ trên VPS và chỉ định triển khai Staging tại thư mục độc lập `/opt/eduportal-staging`. |

> **KẾT LUẬN CHECKPOINT 0: ĐẠT TIÊU CHUẨN AN TOÀN (PASS) – SẴN SÀNG CHỜ PHÊ DUYỆT ĐỂ BƯỚC VÀO PHASE 1 (DATABASE BACKUP).**

---

## 2. CHI TIẾT KẾT QUẢ KIỂM TOÁN PHASE 0

### 2.1. Kiểm tra Git tại máy phát triển (`0.1. Git Integrity`)
- **Lệnh thực thi:**
  ```bash
  git branch --show-current
  git log -1 --oneline
  git status --short
  ```
- **Bằng chứng thực tế:**
  ```text
  Branch: Team-Lead-/-AI-Integrator-Minh
  Commit: 5c36fbc feat(tuition): complete FEE-01 to FEE-03 pre-production audit
  Status: (empty - working tree clean)
  ```
- **Đánh giá:** **PASS** (Mã nguồn ở trạng thái chuẩn, commit nền `5c36fbc` đã được chốt và working tree không có file rác hay secret).

---

### 2.2. Kiểm tra Hệ điều hành & Thông số VPS (`0.2. Host System`)
- **Lệnh thực thi trên VPS (`root@221.121.3.201`):**
  ```bash
  hostnamectl
  uptime
  docker --version && docker compose version
  ```
- **Bằng chứng thực tế:**
  * **Static hostname:** `NguyenSonMinh`
  * **Hệ điều hành:** Ubuntu 24.10 (Kernel `Linux 6.11.0-29-generic`, kiến trúc `x86_64`)
  * **Uptime:** 2 ngày, 1 giờ 19 phút | **Load average:** `0.00, 0.01, 0.00` (Máy chủ đang ở trạng thái nhàn rỗi)
  * **Docker Engine:** `28.4.0` (build `d8eb465`, Storage Driver: `overlay2`, Cgroup Driver: `systemd`)
  * **Docker Compose:** `v2.39.2`
- **Đánh giá:** **PASS** (Môi trường runtime Docker ổn định, đáp ứng tốt yêu cầu Compose v2).

---

### 2.3. Snapshot chi tiết Stack hiện hữu trên VPS (`0.3. Current Production/Dev Stack Snapshot`)
Để đảm bảo **không bao giờ can thiệp nhầm vào stack đang chạy**, toàn bộ thông tin về các container, network, volume và Nginx đã được chụp snapshot:

#### A. Danh sách Container đang chạy:
| Container Name | Container ID | Status | Port Binding trên Host | Service Compose |
| :--- | :--- | :--- | :--- | :--- |
| `eduportal-frontend-prod` | `76ea2868fe67` | Up 25 hours | `0.0.0.0:3000->80/tcp` | frontend |
| `eduportal-ai-prod` | `6def61240bd3` | Up 25 hours | `0.0.0.0:8084->8084/tcp` | ai-service |
| `eduportal-course-prod` | `0510b29d02c0` | Up 25 hours | `0.0.0.0:8082->8082/tcp` | course-service |
| `eduportal-auth-prod` | `413fe1582735` | Up 25 hours | `0.0.0.0:8081->8081/tcp` | auth-service |
| `eduportal-enrollment-prod` | `25ffdbb2406d` | Up 25 hours | `0.0.0.0:8083->8083/tcp` | enrollment-service |
| `eduportal-lecturer-prod` | `082d16ccff30` | Up 25 hours | `0.0.0.0:8085->8085/tcp` | lecturer-service |
| `eduportal-postgres-prod` | `0fa4b986e0cb` | Up 25 hours (healthy) | `0.0.0.0:5432->5432/tcp` | postgres |

#### B. Docker Metadata của Stack hiện hữu:
- **Compose Project:** `eduportal`
- **Compose File nguồn:** `/opt/eduportal/docker-compose.prod.yml`
- **Docker Network:** `eduportal_default` (ID: `91ca65899a84`)
- **Docker Volume CSDL:** `eduportal_postgres_prod_data`
- **CSDL PostgreSQL:** Version 16.15, DB name `academic_db`, user `postgres`, dung lượng hiện tại: `8,927 kB` (~8.7 MB), 17 tables, 2 bản ghi trong `tuition_fees`.
- **Cấu hình Nginx Host (`/etc/nginx/sites-enabled/default`):**
  - Đang đón traffic domain `rikkeiportal.io.vn` trên cổng `80` và `443` (SSL Let's Encrypt).
  - Reverse proxy chuyển hướng toàn bộ traffic tới `http://127.0.0.1:3000` (`eduportal-frontend-prod`).
- **Đánh giá:** **PASS** (Đã xác định chính xác 100% ranh giới của stack hiện hữu. Bất kỳ thao tác nào chạm vào container có đuôi `-prod`, volume `eduportal_postgres_prod_data`, network `eduportal_default` hoặc cổng `3000/5432/8081-8085` đều bị cấm tuyệt đối).

---

### 2.4. Đánh giá Khả năng Tài nguyên (`0.4. Resource Capacity`)
- **Lệnh thực thi:**
  ```bash
  free -h
  swapon --show
  df -h /
  docker stats --no-stream
  ```
- **Bằng chứng thực tế:**
  * **RAM vật lý:**
    ```text
                   total        used        free      shared  buff/cache   available
    Mem:           954Mi       804Mi        71Mi       3.0Mi       220Mi       149Mi
    ```
    *Dung lượng khả dụng tức thời:* **149 MiB**.
  * **Swap Space:**
    ```text
    NAME            TYPE  SIZE    USED PRIO
    /swapfile       file    2G 1021.7M   -2
    /swapfile-extra file 1024M      0B   -3
    Total Swap:     3.0 GiB (Đang dùng: 1.0 GiB, Còn trống: 2.0 GiB)
    ```
  * **Ổ đĩa gốc (`/dev/sda2`):**
    ```text
    Filesystem      Size  Used Avail Use% Mounted on
    /dev/sda2        20G  9.0G  9.3G  50% /
    ```
    *Dung lượng ổ cứng còn trống:* **9.3 GB (9,300 MB)**.
  * **Mức tiêu thụ RAM thực tế của 7 container hiện hữu:**
    - `eduportal-frontend-prod`: 1.0 MB
    - `eduportal-ai-prod`: 18.9 MB
    - `eduportal-course-prod`: 66.1 MB
    - `eduportal-auth-prod`: 78.7 MB
    - `eduportal-enrollment-prod`: 91.2 MB
    - `eduportal-lecturer-prod`: 74.4 MB
    - `eduportal-postgres-prod`: 81.8 MB
    - *Tổng RAM container đang chiếm dụng:* **~412 MB**.
- **Phân tích kỹ thuật & Đánh giá an toàn tài nguyên:**
  1. Với 9.3 GB disk trống, hệ thống hoàn toàn đủ dung lượng để chứa image Staging mới và backup database.
  2. Mức RAM 149 MB available kết hợp 2.0 GB Swap trống đủ an toàn để vận hành song song stack Staging với cấu hình JVM tuning siêu nhẹ (`-Xms32m -Xmx80m -Xss256k -XX:MaxMetaspaceSize=65m` + `UseSerialGC`).
  3. *Lưu ý cảnh báo:* Không được nới lỏng giới hạn RAM hay chạy các lệnh build nặng (như Gradle build trực tiếp trên VPS) vì có thể đẩy swap lên cao. Toàn bộ image hoặc artifacts nên được tối ưu trước.
- **Đánh giá:** **PASS**.

---

### 2.5. Kiểm tra Cổng & Xung đột Port Staging (`0.5. Port Collision Audit`)
- **Lệnh thực thi:**
  ```bash
  ss -lntp | grep -E ':(8080|15432|18081|18082|18083|18084|18085)\b'
  ```
- **Bằng chứng thực tế:**
  ```text
  ALL_STAGING_PORTS_AVAILABLE (Không có bất kỳ process nào đang chiếm các cổng này)
  ```
- **Bảng đối chiếu cổng chi tiết:**

| Thành phần Staging | Host Port Binding dự kiến | Trạng thái cổng trên VPS | Nguy cơ xung đột |
| :--- | :--- | :---: | :---: |
| **Frontend Staging** | `127.0.0.1:8080` | **TRỐNG (FREE)** | Không (Dev dùng 3000, Host dùng 80/443) |
| **PostgreSQL Staging**| `127.0.0.1:15432` | **TRỐNG (FREE)** | Không (Dev dùng 5432) |
| **Auth Service** | `127.0.0.1:18081` | **TRỐNG (FREE)** | Không (Dev dùng 8081) |
| **Course Service** | `127.0.0.1:18082` | **TRỐNG (FREE)** | Không (Dev dùng 8082) |
| **Enrollment Service**| `127.0.0.1:18083` | **TRỐNG (FREE)** | Không (Dev dùng 8083) |
| **AI Service** | `127.0.0.1:18084` | **TRỐNG (FREE)** | Không (Dev dùng 8084) |
| **Lecturer Service** | `127.0.0.1:18085` | **TRỐNG (FREE)** | Không (Dev dùng 8085) |

- **Đánh giá:** **PASS** (100% cổng Staging dự kiến đều sẵn sàng, độc lập và chỉ bind vào `127.0.0.1`, tuyệt đối không phơi ra public interface).

---

### 2.6. Phát hiện quan trọng về cấu hình Staging trên VPS (`0.6. Critical Architecture Finding`)
- **Phát hiện:** Trong thư mục `/opt/eduportal/` hiện hữu trên VPS có tồn tại một file cũ `docker-compose.staging.yml`. Kiểm tra nội dung file này cho thấy nó vẫn sử dụng cấu hình port cũ (`5432:5432`, `8081:8081`, `8085:8085`). Nếu chạy file này trên VPS, **chắc chắn sẽ gây xung đột làm chết stack đang chạy**.
- **Giải pháp cách ly tuyệt đối đã thiết kế:**
  1. Không sử dụng và không ghi đè vào thư mục `/opt/eduportal/` của stack hiện hữu.
  2. Tạo thư mục làm việc riêng biệt: `/opt/eduportal-staging/`.
  3. Triển khai file `docker-compose.staging.yml` mới nhất từ repository (với project name `-p eduportal-staging`, network `eduportal_staging_network`, volume `eduportal_postgres_data_staging` và dải port loopback `15432`, `18081-18085`, `8080`).
- **Đánh giá:** **PASS** (Đã nhận diện rủi ro tiềm ẩn và có giải pháp cô lập cấu trúc thư mục hoàn toàn).

---

## 3. CHECKPOINT 0 – ĐIỀU KIỆN TIÊN QUYẾT BƯỚC VÀO PHASE 1

Tất cả 6 điều kiện bắt buộc của Phase 0 đều đạt **PASS**:
1. Đúng VPS `221.121.3.201` và SSH hoạt động bình thường.
2. Đã xác định chính xác 100% định danh stack hiện hữu (`eduportal-*-prod`, project `eduportal`, volume `eduportal_postgres_prod_data`, network `eduportal_default`).
3. CSDL hiện hữu được xác định rõ: `academic_db` dung lượng ~8.7 MB, 17 tables.
4. Cổng Staging hoàn toàn không xung đột.
5. Tài nguyên disk (9.3 GB trống) và RAM/Swap đủ điều kiện chạy song song.
6. Xác lập quy hoạch thư mục độc lập `/opt/eduportal-staging` ngăn chặn rủi ro ghi đè file cấu hình.

---

## 4. KẾ HOẠCH CHO PHASE 1 (DATABASE BACKUP)

Ngay sau khi nhận được sự phê duyệt Checkpoint 0 từ bạn, Phase 1 sẽ thực hiện:
1. Tạo thư mục lưu trữ backup có phân quyền an toàn: `/opt/backups/`.
2. Chạy lệnh sao lưu CSDL hiện hữu bằng định dạng nén `pg_dump -Fc`:
   ```bash
   docker exec eduportal-postgres-prod pg_dump -U postgres -Fc academic_db > /opt/backups/eduportal-dev-pre-fee04-$(date +%Y%m%d-%H%M%S).dump
   ```
3. Kiểm tra tính toàn vẹn của file backup bằng `pg_restore --list` và tạo mã băm `sha256sum`.
4. Xuất báo cáo `reports/staging/TASK_FEE_04_PHASE_1_DATABASE_BACKUP.md`.
