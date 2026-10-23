# Rikkei EduPortal - Student Information System (MVP)

> **Mã dự án**: `PRJ-QUICK-REVIEW-PRE-OJT-03`  
> **Kiến trúc**: Microservices (Spring Boot 3 + Java 21) & ReactJS (Vite + Tailwind CSS + Zustand)  
> **Cơ sở dữ liệu**: PostgreSQL 16  
> **Thời gian phát triển**: Sprint 3 ngày (5 thành viên)  
> **Repository**: [minh2307/Student-Information-System](https://github.com/minh2307/Student-Information-System)  
> 🌐 **Live Production Demo (VPS)**: [http://221.121.3.201](http://221.121.3.201)

---

## 1. Tổng quan Dự án (Project Overview)

**Rikkei EduPortal** là hệ thống quản lý đào tạo và đăng ký học phần (Student Information System - MVP) dành cho trường đại học/học viện. Hệ thống phục vụ 3 nhóm đối tượng người dùng chính: **Sinh viên (Student)**, **Giảng viên (Lecturer)**, và **Quản trị viên (Admin)**, kết hợp tính năng **Trợ lý AI (Spring AI)** hỗ trợ sinh viên tư vấn học tập và giảng viên/admin tạo đề cương chi tiết môn học tự động.

---

## 2. Cấu trúc Dự án (Microservices Architecture)

Hệ thống được thiết kế theo kiến trúc Microservices phân tách theo miền nghiệp vụ (Domain-Driven Design), định tuyến tập trung qua API Gateway và chia sẻ các thư viện chung qua `common-lib`:

```
.
├── .github/
│   └── workflows/
│       └── ci.yml              # Pipeline CI/CD kiểm thử và build tự động
├── common-lib/                 # Thư viện dùng chung (ApiResponse, Enums: Role, UserStatus)
├── init-db/                    # DDL Schema (01-schema.sql) & Seed Data (02-seed-data.sql, 03-massive-seed.sql)
├── postman/                    # Bộ Newman/Postman Collection & CI Environment test tự động
├── services/
│   ├── api-gateway/            # Cổng Gateway tập trung (Port 8080)
│   ├── auth-service/           # Xác thực JWT, Hồ sơ cá nhân & Quản lý User (Port 8081)
│   ├── course-service/         # Quản lý Môn học & Mở lớp học phần (Port 8082)
│   ├── enrollment-service/     # Cổng Sinh viên, Đăng ký tín chỉ & Lịch học (Port 8083)
│   ├── ai-service/             # AI Syllabus Generator & Academic Advisor Chatbot (Port 8084)
│   └── lecturer-service/       # Cổng Giảng viên, Quản lý lớp & Nhập/Khóa bảng điểm (Port 8085)
├── frontend/                   # ReactJS + Vite + Tailwind CSS + Zustand (Port 80 / 3000)
├── docker-compose.yml          # Điều phối Docker Compose (PostgreSQL, 6 Microservices, Frontend)
├── .env.example                # Mẫu biến môi trường
├── build.gradle.kts            # Root Gradle Multi-project (Spring Boot 3, Java 21)
└── settings.gradle.kts         # Root Gradle Settings khai báo các module
```

---

## 3. Môi trường Triển khai Production Thực tế (VPS Server)

Dự án đã được triển khai live trên máy chủ VPS đám mây độc lập với cấu hình tối ưu hóa tài nguyên phần cứng:

### 3.1. Thông số Máy chủ VPS
- **Địa chỉ truy cập Web**: [http://221.121.3.201](http://221.121.3.201) (hoặc [http://221.121.3.201:3000](http://221.121.3.201:3000))
- **Hệ điều hành**: Ubuntu 24.04 LTS (x86_64)
- **Cấu hình phần cứng**:
  - **CPU**: 1 vCPU
  - **RAM vật lý**: 1.0 GB
  - **Bộ nhớ ảo (Swap file)**: 2.0 GB (`/swapfile`)
  - **Ổ cứng SSD**: 20 GB (Trống ~11 GB)

### 3.2. Kiến trúc Tối ưu hóa Triển khai (Resource-Optimized Architecture)
Để chạy đồng thời **6 dịch vụ Java Spring Boot 3**, **1 Web server Nginx** và **1 PostgreSQL Database** trên máy chủ 1 GB RAM mà không bị tràn bộ nhớ (Out-Of-Memory):
1. **Chia tách Build & Runtime**: Toàn bộ JAR microservice và React Frontend được build production trước (Gradle bootJar & Vite build), sau đó đóng gói và nạp vào VPS dưới dạng lightweight JRE Alpine containers (`eclipse-temurin:21-jre-alpine` và `nginx:1.27-alpine`).
2. **JVM Memory Tuning**: Áp dụng cờ JVM tiết kiệm RAM cho cả 6 service:
   ```bash
   -Xmx110m -Xms40m -XX:+UseSerialGC -XX:TieredStopAtLevel=1
   ```
   - Giới hạn Heap memory tối đa mỗi service ở mức 100MB - 110MB.
   - `-XX:+UseSerialGC`: Giảm thiểu tối đa số luồng bộ gom rác chạy nền.
   - `-XX:TieredStopAtLevel=1`: Dừng quá trình JIT compilation ở C1 compiler, tiết kiệm hàng trăm MB Code Cache và Metaspace.
3. **Nginx Reverse Proxy**:
   - Lắng nghe tại port `80` và `3000`.
   - Phục vụ trực tiếp bản build Single Page Application (SPA).
   - Tự động chuyển tiếp (proxy pass) mọi request có tiền tố `/api/` về `api-gateway:8080`.

### 3.3. Danh sách Container & Cổng Dịch vụ trên VPS

Toàn bộ dịch vụ được quản lý tập trung tại thư mục `/opt/eduportal/`:

| Container Name | Dịch vụ đảm nhiệm | Cổng Container | Port Public VPS |
| :--- | :--- | :--- | :--- |
| **`eduportal-frontend`** | Nginx Web Server & React SPA | `80` | `80`, `3000` |
| **`eduportal-gateway`** | Spring Cloud API Gateway tập trung | `8080` | `8080` |
| **`eduportal-auth`** | Auth Service (JWT & User Profiles) | `8081` | `8081` |
| **`eduportal-course`** | Course Service (Môn học & Lớp học phần) | `8082` | `8082` |
| **`eduportal-enrollment`** | Enrollment Service (Đăng ký tín chỉ & Dashboard) | `8083` | `8083` |
| **`eduportal-ai`** | AI Service (Spring AI Syllabus & Advisor) | `8084` | `8084` |
| **`eduportal-lecturer`** | Lecturer Service (Quản lý lớp & Nhập điểm) | `8085` | `8085` |
| **`eduportal-postgres`** | PostgreSQL 16 Alpine Database | `5432` | `5432` |

### 3.4. Các lệnh Quản trị & Vận hành VPS Thường dùng

```bash
# 1. Đăng nhập vào VPS qua SSH
ssh root@221.121.3.201

# 2. Di chuyển vào thư mục quản lý dự án
cd /opt/eduportal

# 3. Kiểm tra trạng thái hoạt động của toàn bộ 8 containers
docker compose ps

# 4. Kiểm tra mức tiêu thụ tài nguyên (RAM, Swap, CPU)
free -m
top -b -n 1 | head -n 20

# 5. Xem log thời gian thực của từng dịch vụ
docker compose logs -f api-gateway
docker compose logs -f auth-service
docker compose logs -f lecturer-service

# 6. Khởi động lại một dịch vụ cụ thể
docker compose restart <tên-service>
```

---

## 4. Phân công Công việc Chi tiết (Task Allocation - 5 Thành viên)

Dựa theo mục 8 của tài liệu SRS `PRJ-QUICK-REVIEW-PRE-OJT-03`, phân chia nhiệm vụ cụ thể cho 5 thành viên trong Sprint 3 ngày:

| Thành viên | Vai trò | Nhiệm vụ cụ thể (Backend + Frontend + DevOps) | Phân hệ phụ trách |
|---|---|---|---|
| **Nguyễn Sơn Minh** | **Team Lead / AI Integrator** | - Khởi tạo khung Project Spring Boot & ReactJS (Vite + Tailwind + Zustand).<br>- Thiết kế SQL khởi tạo DB PostgreSQL (Schema & Seed Data chuẩn).<br>- Phát triển Module **AI Integration** (BE: Spring AI Syllabus Generator & Academic Advisor Chatbot; FE: UI Chatbot Advisor & Sinh đề cương AI).<br>- Thiết kế kiến trúc triển khai VPS, JVM Tuning & điều phối tiến độ Sprint. | `services/ai-service`, `init-db`, Root config, VPS Deploy |
| **Nguyễn Quang Vinh** | **Full-stack Dev 1 (Auth, User & DevOps Co-Lead)** | - **Auth & User Profile**:<br>  + BE: Spring Security + JWT Filter, API Auth (`/login`), API Profile (`/profile/me`), CRUD Hồ sơ Sinh viên & Giảng viên cho Admin.<br>  + FE: Trang Đăng nhập, Khung Layout chung (Header/Sidebar navigation), Trang Quản lý Hồ sơ.<br>- **DevOps Core**: Thiết lập Dockerfile từng service, Docker Compose cho môi trường dev/staging/prod. | `services/auth-service`, `frontend` (Auth & Layout), Docker |
| **Hoàng Cương Cát** | **Full-stack Dev 2 (Academic Catalog & Class Operations)** | - **Quản lý Danh mục Môn học & Lớp học phần**:<br>  + BE: API CRUD Môn học (`courses`), API Mở lớp học phần (`class_sections`), validate trùng phòng học/giảng viên & API Admin duyệt đăng ký (`PENDING` → `REGISTERED`).<br>  + FE: Trang Quản lý Danh mục Môn học & Trang Quản lý Lớp học phần/Duyệt đăng ký (Admin Portal). | `services/course-service`, `frontend` (Admin Catalog & Sections) |
| **Phạm Viết Quân** | **Full-stack Dev 3 (Student Portal & Registration)** | - **Cổng Sinh viên & Đăng ký học phần**:<br>  + BE: API `/student/dashboard`, Engine Đăng ký học phần (Logic check sĩ số, giới hạn 24 tín chỉ, trùng lịch `has_conflict`). Phối hợp tối ưu DB Locking.<br>  + FE: Giao diện Student Dashboard (4 thẻ chỉ số, tiến độ học tập) & Trang Đăng ký/Hủy học phần. | `services/enrollment-service`, `frontend` (Student Portal) |
| **Hoàng Văn Lương** | **Full-stack Dev / CI-CD & QA (Lecturer Portal & Automation)** | - **Cổng Giảng viên & Quản lý điểm**:<br>  + BE: Tách và hoàn thiện `lecturer-service`, API danh sách lớp dạy, cập nhật chuyên cần, nhập/sửa điểm & tự động tính điểm tổng kết/C-GPA.<br>  + FE: Màn hình Cổng giảng viên & Trang Xem điểm sinh viên.<br>- **CI/CD & QA Automation**: Cấu hình GitHub Actions pipeline (`ci.yml`) & viết bộ Postman/Newman Collection kiểm thử tự động API. | `services/lecturer-service`, `frontend` (Lecturer Portal), CI/CD |

---

## 5. Đặc tả Cơ sở Dữ liệu (PostgreSQL - 7 Bảng Cốt lõi)

Hệ thống quản lý dữ liệu tập trung thông qua 7 bảng liên kết chặt chẽ (được khởi tạo tự động qua `init-db/01-schema.sql` và nạp dữ liệu qua `02-seed-data.sql`, `03-massive-seed.sql`):

1. **`users`**: Tài khoản người dùng, email, mật khẩu mã hóa BCrypt, vai trò (`STUDENT`, `LECTURER`, `ADMIN`), trạng thái (`ACTIVE`, `INACTIVE`, `LOCKED`).
2. **`student_profiles`**: Hồ sơ sinh viên, mã SV (`student_code`), chuyên ngành, học kỳ hiện tại, tín chỉ tích lũy, điểm CGPA hiện tại và kỳ trước.
3. **`lecturer_profiles`**: Hồ sơ giảng viên, mã GV (`lecturer_code`), khoa/bộ môn phụ trách, học vị.
4. **`courses`**: Danh mục môn học, mã môn (`course_code`), số tín chỉ, số giờ học/tuần, môn tiên quyết, đề cương chi tiết (AI sinh).
5. **`class_sections`**: Lớp học phần mở trong kỳ, thứ, giờ bắt đầu/kết thúc, phòng học, giảng viên phụ trách, sĩ số tối đa/hiện tại, version (Optimistic Locking).
6. **`enrollments`**: Bản ghi đăng ký môn học của sinh viên, trạng thái (`REGISTERED`, `PENDING`, `CANCELLED`, `REJECTED`), cờ cảnh báo trùng lịch (`has_conflict`), tỷ lệ chuyên cần.
7. **`grades`**: Bảng điểm chi tiết thành phần (Chuyên cần 10%, Giữa kỳ 30%, Cuối kỳ 60%), điểm tổng kết hệ 10, điểm chữ quy đổi, trạng thái khóa điểm.

---

## 6. Đặc tả REST API Endpoints

Toàn bộ API trả về cấu trúc JSON chuẩn:
```json
{
  "status": 200,
  "message": "Thông điệp phản hồi",
  "data": { ... }
}
```

### 6.1. Module Auth & Profile (`auth-service` - Port 8081)
- `POST /api/v1/auth/login`: Đăng nhập, trả về JWT Token và Role.
- `GET /api/v1/profile/me`: Lấy thông tin hồ sơ của người dùng đang đăng nhập.
- `PUT /api/v1/profile/me`: Cập nhật thông tin liên hệ, đổi mật khẩu cá nhân.
- `GET / POST / PUT / DELETE /api/v1/admin/users`: CRUD tài khoản & hồ sơ Sinh viên, Giảng viên.

### 6.2. Module Academic Catalog & Operations (`course-service` - Port 8082)
- `GET / POST / PUT / DELETE /api/v1/admin/courses`: CRUD danh mục Môn học.
- `GET / POST / PUT / DELETE /api/v1/admin/class-sections`: Mở lớp học phần, xếp phòng/lịch học, kiểm tra trùng phòng/giảng viên.
- `PUT /api/v1/admin/enrollments/{id}/approve`: Duyệt yêu cầu đăng ký học phần (`PENDING` → `REGISTERED`).

### 6.3. Module Student Portal & Registration (`enrollment-service` - Port 8083)
- `GET /api/v1/student/dashboard`: Dữ liệu Student Dashboard (4 thẻ thống kê: Registered Courses, Weekly Classes, Pending Registrations, Schedule Conflicts; thanh tiến độ hoàn thành kỳ, C-GPA).
- `GET /api/v1/student/class-sections`: Tra cứu các lớp học phần đang mở trong kỳ.
- `POST /api/v1/student/enrollments`: Đăng ký học phần (kiểm tra sĩ số, giới hạn 24 tín, kiểm tra trùng lịch).
- `DELETE /api/v1/student/enrollments/{enrollmentId}`: Hủy đăng ký học phần.
- `GET /api/v1/student/grades`: Xem bảng điểm cá nhân qua các kỳ.

### 6.4. Module Lecturer Portal & Grading (`lecturer-service` - Port 8085)
- `GET /api/v1/lecturer/classes`: Danh sách các lớp học phần được phân công giảng dạy.
- `GET /api/v1/lecturer/classes/{sectionId}/students`: Danh sách sinh viên và bảng điểm theo lớp (kiểm tra phân công giảng viên).
- `PUT /api/v1/lecturer/enrollments/{enrollmentId}/attendance`: Cập nhật điểm danh chuyên cần.
- `PUT /api/v1/lecturer/grades/{enrollmentId}`: Nhập/sửa điểm và tự động tính điểm tổng kết/C-GPA.
- `POST /api/v1/lecturer/classes/{sectionId}/lock-grades`: Chốt và khóa bảng điểm của lớp.

### 6.5. Module AI Integration (`ai-service` - Port 8084)
- `POST /api/v1/ai/generate-syllabus`: (Role: ADMIN, LECTURER) Nhận tên môn học và số tín chỉ, Spring AI tự động sinh đề cương chi tiết môn học.
- `POST /api/v1/ai/academic-advisor`: (Role: STUDENT) Chatbot giải đáp quy chế tín chỉ & gợi ý lộ trình môn học không bị trùng lịch.

---

## 7. Tài khoản Thử nghiệm Mặc định (Seed Data)

Mật khẩu mặc định cho toàn bộ tài khoản thử nghiệm: **`123456`**

| Tài khoản (Username) | Role | Họ và tên | Chức danh / Mã số | Ghi chú tài khoản |
|---|---|---|---|---|
| `admin` | `ADMIN` | Quản trị viên Hệ thống | Quản trị viên | Toàn quyền quản trị hệ thống |
| `gv001` | `LECTURER` | TS. Nguyễn Văn A | GV001 - CNTT | Giảng dạy lớp học phần 1, 3 |
| `gv002` | `LECTURER` | ThS. Trần Thị B | GV002 - CNTT | Giảng dạy lớp học phần 2, 4 |
| `sv2024001` | `STUDENT` | Nguyễn Văn C | SV2024001 - B.Tech CS | Đã đăng ký môn học và có bảng điểm |
| `sv2024002` | `STUDENT` | Lê Thị D | SV2024002 - B.Tech CS | Tài khoản sinh viên thử nghiệm |

---

## 8. Hướng dẫn Cài đặt & Khởi chạy Cục bộ (Local Development)

### 8.1. Yêu cầu Tiên quyết
- **Java**: OpenJDK 21 LTS
- **Node.js**: Phiên bản 18+ & npm
- **Docker & Docker Compose**: Phiên bản mới nhất
- **PostgreSQL**: 16 (nếu chạy local không qua Docker)

### 8.2. Khởi chạy Nhanh bằng Docker Compose
```bash
docker compose up -d
```
Sau khi khởi chạy thành công:
- **Frontend App**: `http://localhost:3000`
- **API Gateway**: `http://localhost:8080`
- **PostgreSQL Database**: `localhost:5432` (Database: `academic_db`, User/Password: `postgres`/`postgres`)

### 8.3. Khởi chạy Thủ công Từng Phân hệ

#### Bước 1: Build Backend Multi-Project
```bash
./gradlew build -x test
```

#### Bước 2: Chạy Frontend ReactJS
```bash
cd frontend
npm install
npm run dev
```
Giao diện frontend dev server hiển thị tại: `http://localhost:5173`

---

## 9. Kiểm thử Tự động & CI/CD Pipeline

- **GitHub Actions (`.github/workflows/ci.yml`)**: Tự động thực thi mỗi khi push hoặc tạo PR lên nhánh `main` và `dev`:
  1. Biên dịch và kiểm thử tự động toàn bộ 6 microservices backend qua Gradle.
  2. Kiểm tra lint và build Frontend qua Vite.
  3. Khởi tạo container PostgreSQL trên runner để chạy integration test.
- **Newman / Postman Automated Test Suite**:
  Bộ test tự động trong thư mục `postman/` kiểm tra toàn bộ luồng Auth, RBAC, Đăng ký học phần, Nhập điểm giảng viên và Concurrency:
  ```bash
  newman run postman/eduportal.postman_collection.json -e postman/ci.postman_environment.json
  ```
