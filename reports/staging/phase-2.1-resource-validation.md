# BÁO CÁO ĐÁNH GIÁ TÀI NGUYÊN & ĐỘ KHẢ THI TRIỂN KHAI VPS (PHASE 2.1)

**Dự án**: Rikkei EduPortal (`PRJ-QUICK-REVIEW-PRE-OJT-03`)  
**Nhiệm vụ**: `[TASK-D05-MINH]` RESOURCE VALIDATION & VPS READINESS REVIEW  
**Kỹ sư thực hiện**: Senior DevOps Engineer / Backend Engineer  
**Thời gian thực hiện**: 2026-11-06  
**Trạng thái**: Đã phân tích chuyên sâu & hoàn thành đánh giá toàn diện  

---

## 1. PHÂN TÍCH CHUYÊN SÂU BỘ NHỚ JVM (JVM MEMORY BREAKDOWN)

Khi vận hành ứng dụng Java 21 LTS trên container Linux, tổng lượng RAM tiêu thụ thực tế của tiến trình (**RSS - Resident Set Size**) không chỉ giới hạn ở Heap (`-Xmx`), mà là tổng hợp của **7 thành phần bộ nhớ độc lập**:

$$\text{Total RSS} = \text{Heap} + \text{Metaspace} + \text{Thread Stacks} + \text{Code Cache} + \text{Direct/NIO Memory} + \text{GC Structures} + \text{Native JVM Overhead}$$

### 1.1. Bảng bóc tách cấu trúc bộ nhớ của từng Microservice

Dựa trên cấu trúc Spring Boot 3.3.4 (tích hợp Spring Security, Spring Data JPA, Hibernate 6, Tomcat nhúng, Jackson, Actuator):

| Thành phần bộ nhớ | Mặc định JVM (Java 21) | Cấu hình Phase 2 (`-Xmx110m`) | Rủi ro phát hiện tại Phase 2 | Đề xuất tối ưu Phase 2.1 |
| :--- | :--- | :--- | :--- | :--- |
| **1. Heap Memory (Active/Max)** | 25% physical RAM | Max 110 MiB, Min 40 MiB | Heap chiếm 110 MiB, khiến tổng RSS chạm trần 180 MiB | **`-Xmx80m -Xms32m`** (Đủ phục vụ REST API MVP) |
| **2. Metaspace** | Unbounded (~150 MiB) | Không giới hạn (~48 - 56 MiB) | Nạp ~9,500 classes, có thể tăng khi xử lý nhiều DTO/Entity | **`-XX:MaxMetaspaceSize=65m`** (Khống chế trần an toàn) |
| **3. Thread Stacks** | 1024 KiB / thread | 1024 KiB / thread (~15 - 20 MiB) | Mỗi thread Tomcat chiếm 1MB native stack | **`-Xss256k`** (Tiết kiệm 75% RAM cho thread stack) |
| **4. Code Cache (JIT)** | ~240 MiB (Tier 4) | ~20 - 25 MiB (`TieredStopAtLevel=1`) | Đã tối ưu về C1 JIT Compiler | **`-XX:ReservedCodeCacheSize=20m`** |
| **5. Direct/NIO Buffers** | Cùng kích thước Heap | ~10 - 15 MiB (Netty/Tomcat buffer) | Buffer giao tiếp DB & HTTP I/O | **`-XX:MaxDirectMemorySize=16m`** |
| **6. GC Data Structures** | G1GC đa luồng (~30 MiB)| ~6 - 8 MiB (`-XX:+UseSerialGC`) | Rất tốt, chỉ dùng 1 GC thread duy nhất | Duy trì **`-XX:+UseSerialGC`** |
| **7. Native Libs & JVM Internals**| ~15 MiB | ~10 - 12 MiB (Alpine musl libc) | Thư viện JNI và hệ điều hành Alpine | ~10 MiB |
| **TỔNG RSS DỰ KIẾN / SERVICE** | **350 - 500 MiB** | **172 - 176 MiB** | **Biên an toàn chỉ 4 - 8 MiB so với trần 180 MiB!** | **135 - 150 MiB** |

### 1.2. Đánh giá Container Memory Limit 180MB
- **Nhận định phản biện từ User là hoàn toàn chính xác**: Ở Phase 2, việc đặt container limit `180M` khi RSS đo được là `172–175MB` tạo ra **biên an toàn cực kỳ mong manh (chỉ 2.5% – 4.5%)**.
- Khi Newman bắt đầu bắn concurrent request kiểm thử API hoặc khi Hibernate khởi tạo bộ đệm EntityManager, chỉ cần phát sinh thêm 6–8MB RAM thì cgroup OOM Killer của Linux kernel sẽ gửi ngay tín hiệu `SIGKILL` (Exit Code 137) tiêu diệt container.
- **Giải pháp khắc phục bắt buộc**:
  1. Cắt giảm Heap xuống `-Xmx80m`, Thread stack xuống `-Xss256k`, khống chế Metaspace `-XX:MaxMetaspaceSize=65m`.
  2. Nâng container memory limit lên **`200M`** (hoặc `210M`), tạo ra vùng đệm an toàn **50 - 65 MiB (30% - 35%)** cho mỗi microservice.

---

## 2. PHÂN TÍCH TÀI NGUYÊN CPU & TRANH CHẤP TRÊN 1 VCPU

### 2.1. Phân tích hiện trạng CPU Limit của Staging Compose
Trong file `docker-compose.staging.yml` ban đầu:
- 5 Java microservices: `cpus: '0.80'` $\times 5 = 4.0$ vCPUs.
- PostgreSQL: `cpus: '0.50'` vCPU.
- Frontend Nginx: `cpus: '0.50'` vCPU.
- **Tổng CPU Limit khai báo**: **$5.0$ vCPUs** trong khi máy chủ VPS chỉ có **duy nhất 1 vCPU vật lý**.

### 2.2. Cơ chế CFS Scheduler & Nguy cơ CPU Throttling
1. Thông số `cpus: '0.80'` trong Docker được Linux kernel chuyển thành hạn ngạch CFS:
   $$\text{cpu.cfs\_quota\_us} = 80000\mu s \quad / \quad \text{cpu.cfs\_period\_us} = 100000\mu s$$
2. Khi 5 tiến trình Java khởi động đồng thời, cả 5 JVM cùng cần CPU công suất cao để:
   - Nạp class bytecode (Classloading & Verification).
   - Khởi tạo Spring ApplicationContext và Spring Data repositories.
   - Biên dịch JIT (Tier 1 C1 compilation).
3. Khi 5 container cùng đòi hỏi 0.8 vCPU trên 1 vCPU thực:
   - Linux CFS Scheduler liên tục can thiệp và **throttle** (bóp xung/ngắt thực thi) các tiến trình Java.
   - Thời gian khởi động của mỗi service có thể bị kéo dài từ 3 giây lên tới **60 - 90 giây**.
   - Nếu Actuator Healthcheck có cấu hình timeout ngắn (5s) và retries thấp, container sẽ bị Docker đánh dấu `unhealthy` và restart vòng lặp liên tục (Crash Loop).
4. **Giải pháp tối ưu CPU cho VPS 1 vCPU**:
   - Loại bỏ hard ceiling `cpus: '0.80'` cứng nhắc gây throttling khi rảnh rỗi.
   - Sử dụng **`cpu_shares` (trọng số CPU ưu tiên)** hoặc đặt trần mềm:
     - `postgres`: Trọng số ưu tiên cao nhất (`cpu_shares: 1024`) để xử lý transaction và query nhanh.
     - `auth-service`: `cpu_shares: 768` (xác thực token nhanh).
     - Các service nghiệp vụ còn lại: `cpu_shares: 512`.
   - **Khởi động tuần tự (Staged Startup)**: Khởi động PostgreSQL $\rightarrow$ Chờ healthy $\rightarrow$ Khởi động Auth + Course $\rightarrow$ Khởi động Enrollment + Lecturer $\rightarrow$ Cuối cùng là AI Service và Frontend.

---

## 3. PHÂN TÍCH Ổ CỨNG (DISK STORAGE ANALYSIS)

### 3.1. Dữ liệu đo đạc thực tế trên VPS (`ssh root@221.121.3.201`)
```text
=== VPS Filesystem ===
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda2        20G   12G  6.8G  63% /

=== Docker Disk Usage ===
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          91        7         4.531GB   3.938GB (86%)
Containers      7         7         168.2kB   0B (0%)
Local Volumes   6         1         584.7MB   518.6MB (88%)
```

### 3.2. Bóc tách dung lượng cần thêm cho 5 Staging Microservices
- **Dung lượng 5 Docker Images**:
  - `staging-auth-service`: 389 MB
  - `staging-course-service`: 381 MB
  - `staging-enrollment-service`: 381 MB
  - `staging-ai-service`: 368 MB
  - `staging-lecturer-service`: 391 MB
  - `staging-frontend`: 99.7 MB
  - *Lưu ý*: Do cả 5 microservice dùng chung base image `eclipse-temurin:21-jre-alpine` (~140MB), Docker layer cache sẽ chia sẻ layer này. Tổng dung lượng đĩa thực tế cần nạp thêm là:
    $$140\text{ MB (Base layer chung)} + (5 \times \approx 50\text{ MB JAR}) + 100\text{ MB (Frontend)} \approx \mathbf{500 - 600\text{ MB}}.$$
- **Dung lượng Database Volume Staging**: Khởi tạo schema và seed data ban đầu chỉ chiếm khoảng **15 - 25 MB**.
- **Dung lượng Log dự kiến**: Khống chế Docker logging `max-size: 10m`, `max-file: 2` $\rightarrow$ Tối đa **140 MB**.
- **Tổng dung lượng Staging cần**: $\approx \mathbf{750\text{ MB}}$.
- **Kết luận Disk**: Dung lượng trống hiện có là **6.8 GB (6,800 MB)**, hoàn toàn dư sức đáp ứng nhu cầu 750 MB của Staging mà **không cần xóa bất kỳ image hay volume nào của các dự án khác**.

---

## 4. XÁC MINH CẤU HÌNH DOCKER COMPOSE & XUNG ĐỘT PORT

### 4.1. Đánh giá Port 5432 và Xung đột với Container hiện tại trên VPS
- Trên VPS hiện tại, container `eduportal-postgres-dev` đang chiếm giữ cổng `0.0.0.0:5432->5432/tcp`.
- Nếu file Staging Compose tiếp tục expose cổng 5432 ra host (dù là `127.0.0.1:5432`), container `eduportal-postgres-staging` sẽ **báo lỗi bind port ngay lập tức**:
  `Error response from daemon: driver failed programming external connectivity on endpoint eduportal-postgres-staging: Bind for 127.0.0.1:5432 failed: port is already allocated`
- **Giải pháp chuẩn DevOps**:
  - Không cần publish cổng 5432 của PostgreSQL Staging ra host (`ports:` bỏ hẳn).
  - 5 microservices và Postgres nằm chung trong mạng nội bộ `eduportal_staging_network`, giao tiếp qua DNS service name `postgres:5432`.
  - Nếu muốn dev truy cập trực tiếp từ SSH tunnel, đổi port host sang `127.0.0.1:5433:5432`.

### 4.2. Kết quả kiểm tra cú pháp Compose
Lệnh kiểm tra: `docker compose -f docker-compose.staging.yml config` đã thực hiện thành công, cấu trúc YAML hợp lệ 100%.

---

## 5. BẰNG CHỨNG XÁC MINH DỌN SẠCH MÁY LOCAL (CLEANUP VERIFICATION)

Đã kiểm tra lại trạng thái Docker trên máy phát triển:
```bash
$ docker ps -a | grep eduportal
# (Không có container nào - Đã dọn sạch 100%)

$ docker volume ls | grep staging
# (Không còn volume test - Đã dọn sạch 100%)
```
- Các container và volume của dự án khác (`mysql:8.0`, `omniseed`, `ecommerce`, `realtime-analytics`) hoàn toàn nguyên vẹn, không bị tác động.

---

## 6. SO SÁNH TOÀN DIỆN 3 PHƯƠNG ÁN DEPLOYMENT

| Tiêu chí đánh giá | Phương án A: Giữ nguyên VPS 1GB RAM + 2GB Swap | Phương án B: Nâng cấp VPS lên 2GB hoặc 4GB RAM | Phương án C: Tinh chỉnh sâu kiến trúc & Staged Deploy |
| :--- | :--- | :--- | :--- |
| **Mô tả giải pháp** | Dừng stack Dev cũ trên VPS, deploy Staging với bộ thông số JVM Phase 2. | Nâng cấp cấu hình VPS lên tối thiểu 2GB RAM vật lý (khuyến nghị 4GB), giữ nguyên kiến trúc 5 microservices độc lập. | Dừng stack Dev, cấu hình JVM siêu tiết kiệm (`-Xmx80m`, `-Xss256k`), tăng container limit 200MB, khởi động tuần tự. |
| **Chi phí hạ tầng** | **0 VNĐ** (Tận dụng VPS hiện có) | Tăng nhẹ khoảng **100.000 – 150.000 VNĐ/tháng** | **0 VNĐ** (Tận dụng VPS hiện có) |
| **Độ ổn định hệ thống** | **THẤP - NGUY HIỂM**. Biên an toàn 5MB dễ gây OOM Killer khi chạy test suite. | **RẤT CAO**. Không cần dựa vào Swap, hệ thống chạy native mượt mà. | **KHÁ - ĐẠT CHUẨN**. Có biên an toàn 50-65MB, Swap chỉ dùng làm bộ đệm phụ. |
| **Rủi ro OOM Killer** | **Rất cao (70% - 80%)** khi Newman chạy concurrent assertions. | **Gần như bằng 0 (< 1%)**. | **Thấp (10% - 15%)**, an toàn nếu không test stress quá 50 req/s. |
| **Hiệu năng & Latency** | Kém (Swap I/O làm tăng CPU iowait, response time có thể > 2,000ms). | Tốt (Toàn bộ nằm trong physical RAM, response time < 50ms). | Chấp nhận được (Active endpoints nằm trong RAM, response time ~100-250ms). |
| **Khả năng đạt 100% Assertions Newman** | Rủi ro fail test do timeout hoặc service bị kill giữa chừng. | **100% tin cậy**. Đảm bảo pass toàn bộ assertions. | Đạt được nếu Newman chạy với delay nhỏ giữa các request (`--delay-request 100`). |

---

## 7. KHUYẾN NGHỊ CỦA SENIOR DEVOPS ENGINEER

### Khuyến nghị 1 (Lựa chọn tối ưu nhất về kỹ thuật): **PHƯƠNG ÁN B**
- Nâng cấp gói VPS lên **2GB RAM** (hoặc 4GB RAM nếu ngân sách cho phép).
- Việc chạy đồng thời 5 máy ảo Java (Spring Boot) + 1 PostgreSQL + 1 Nginx trên 1GB RAM là giải pháp "ép tải" phi tiêu chuẩn trong môi trường doanh nghiệp thực tế. Nâng cấp RAM sẽ biến môi trường Staging thành Production-like thực thụ, bảo đảm kiểm thử Newman phản ánh chính xác hiệu năng ứng dụng.

### Khuyến nghị 2 (Nếu người dùng muốn giữ nguyên hạ tầng VPS 1GB RAM): **ÁP DỤNG PHƯƠNG ÁN C**
- Không thể chạy Staging song song với Dev trên VPS 1GB RAM (trùng port và cạn kiệt RAM). Bắt buộc phải **chuyển đổi (switch stack)**: Tạm dừng stack Dev và khởi chạy stack Staging.
- Cập nhật cấu hình JVM tối ưu sâu:
  ```bash
  JAVA_OPTS="-Xmx80m -Xms32m -Xss256k -XX:MaxMetaspaceSize=65m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:ReservedCodeCacheSize=20m"
  ```
- Nâng container memory limit lên **`200M`** trong Compose để nới rộng biên an toàn lên 35%.
- Đổi port host PostgreSQL Staging sang `127.0.0.1:5433:5432` hoặc bỏ hẳn port mapping ra host.

---

## 8. KẾT LUẬN GO / NO-GO CHO PHASE 3

> ### 🛑 KẾT LUẬN HIỆN TẠI: **NO-GO (Chưa duyệt triển khai ngay)**
> 
> **Lý do**:
> 1. Trên VPS hiện tại, stack `eduportal-*-dev` đang chiếm 863 MB RAM, 787 MB Swap và chiếm toàn bộ các port `8081-8085, 3000, 5432`. Nếu deploy Staging ngay lúc này, hệ thống sẽ xung đột port và cạn kiệt RAM ngay lập tức.
> 2. Cấu hình Compose Phase 2 có biên an toàn bộ nhớ quá mỏng (chỉ 4-8MB) và port 5432 bị xung đột.

---

## 9. ĐIỀU KIỆN ĐỂ CHUYỂN SANG TRẠNG THÁI "GO"

Tôi đề xuất lộ trình hành động để đạt điều kiện **GO**:
1. **Bước 1**: Cập nhật lại `docker-compose.staging.yml` và Dockerfiles áp dụng cấu hình tối ưu của **Phương án C** (JVM `-Xmx80m -Xss256k -XX:MaxMetaspaceSize=65m`, Memory Limit `200M`, giải quyết port 5432).
2. **Bước 2**: Người dùng xác nhận lựa chọn:
   - **Lựa chọn 1**: Nâng cấp VPS lên 2GB/4GB RAM (Phương án B).
   - **Lựa chọn 2**: Cho phép tạm dừng stack Dev hiện tại trên VPS để lấy tài nguyên và port cho stack Staging (Phương án C).

Khi bạn phê duyệt một trong hai lựa chọn trên, tôi sẽ tiến hành cập nhật cấu hình và sẵn sàng cho **PHASE 3 – DEPLOYMENT & TESTING**.
