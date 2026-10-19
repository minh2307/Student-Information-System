# Rikkei EduPortal - Student Information System (MVP)

> **Mã dự án**: `PRJ-QUICK-REVIEW-PRE-OJT-03`  
> **Kiến trúc**: Microservices (Spring Boot 3 + Java 21) & ReactJS (Vite + Tailwind CSS + Zustand)  
> **Cơ sở dữ liệu**: PostgreSQL 16  
> **Thời gian phát triển**: 1 tuần (Sprint 7 ngày - 5 thành viên)  
> **Repository**: [minh2307/Student-Information-System](https://github.com/minh2307/Student-Information-System)

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
├── init-db/                    # DDL Schema (01-schema.sql) & Seed Data (02-seed-data.sql)
├── services/
│   ├── api-gateway/            # Cổng Gateway tập trung (Port 8080)
│   ├── auth-service/           # Xác thực JWT, Hồ sơ cá nhân & Quản lý User (Port 8081)
│   ├── course-service/         # Quản lý Môn học & Mở lớp học phần (Port 8082)
│   ├── enrollment-service/     # Cổng Sinh viên, Đăng ký tín chỉ & Quản lý Điểm số (Port 8083)
│   └── ai-service/             # AI Syllabus Generator & Academic Advisor Chatbot (Port 8084)
├── frontend/                   # ReactJS + Vite + Tailwind CSS + Zustand (Port 3000)
├── docker-compose.yml          # Điều phối Docker Compose (PostgreSQL, 5 Microservices, Frontend)
├── .env.example                # Mẫu biến môi trường
├── build.gradle.kts            # Root Gradle Multi-project (Spring Boot 3, Java 21)
└── settings.gradle.kts         # Root Gradle Settings khai báo các module
```

---

## 3. Phân công Công việc Chi tiết (Task Allocation - 5 Thành viên)

Dựa theo mục 8 của tài liệu SRS `PRJ-QUICK-REVIEW-PRE-OJT-03`, phân chia nhiệm vụ cụ thể cho 5 thành viên trong Sprint 7 ngày:

| Thành viên | Vai trò | Nhiệm vụ cụ thể (Backend + Frontend + DevOps) | Phân hệ phụ trách |
|---|---|---|---|
| **Nguyễn Sơn Minh** | **Team Lead / AI Integrator** | - Khởi tạo khung Project Spring Boot & ReactJS (Vite + Tailwind + Zustand).<br>- Thiết kế SQL khởi tạo DB PostgreSQL (Schema & Seed Data chuẩn).<br>- Phát triển Module **AI Integration** (BE: Spring AI Syllabus Generator & Academic Advisor Chatbot; FE: UI Chatbot Advisor & Sinh đề cương AI).<br>- Quản lý chung, review code toàn bộ nhóm & điều phối tiến độ Sprint. | `services/ai-service`, `init-db`, Root config |
| **Nguyễn Quang Vinh** | **Full-stack Dev 1 (Auth, User & DevOps Co-Lead)** | - **Auth & User Profile**:<br>  + BE: Spring Security + JWT Filter, API Auth (`/login`), API Profile (`/profile/me`), CRUD Hồ sơ Sinh viên & Giảng viên cho Admin.<br>  + FE: Trang Đăng nhập, Khung Layout chung (Header/Sidebar navigation), Trang Quản lý Hồ sơ.<br>- **DevOps Core**: Thiết lập Dockerfile từng service, Docker Compose cho môi trường dev/staging/prod. | `services/auth-service`, `frontend` (Auth & Layout), Docker |
| **Hoàng Cương Cát** | **Full-stack Dev 2 (Academic Catalog & Class Operations)** | - **Quản lý Danh mục Môn học & Lớp học phần**:<br>  + BE: API CRUD Môn học (`courses`), API Mở lớp học phần (`class_sections`), validate trùng phòng học/giảng viên & API Admin duyệt đăng ký (`PENDING` → `REGISTERED`).<br>  + FE: Trang Quản lý Danh mục Môn học & Trang Quản lý Lớp học phần/Duyệt đăng ký (Admin Portal). | `services/course-service`, `frontend` (Admin Catalog & Sections) |
| **Phạm Viết Quân** | **Full-stack Dev 3 (Student Portal & Registration)** | - **Cổng Sinh viên & Đăng ký học phần**:<br>  + BE: API `/student/dashboard`, Engine Đăng ký học phần (Logic check sĩ số, giới hạn 24 tín chỉ, trùng lịch `has_conflict`). Phối hợp tối ưu DB Locking.<br>  + FE: Giao diện Student Dashboard (4 thẻ chỉ số, tiến độ học tập) & Trang Đăng ký/Hủy học phần. | `services/enrollment-service`, `frontend` (Student Portal) |
| **Hoàng Văn Lương** | **Full-stack Dev / CI-CD & QA (Lecturer Portal & Automation)** | - **Cổng Giảng viên & Quản lý điểm**:<br>  + BE: API danh sách lớp dạy, cập nhật chuyên cần, nhập/sửa điểm & tự động tính điểm tổng kết/C-GPA.<br>  + FE: Màn hình Cổng giảng viên & Trang Xem điểm sinh viên.<br>- **CI/CD & QA Automation**: Cấu hình GitHub Actions pipeline (`ci.yml`) & viết bộ Postman/Newman Collection kiểm thử tự động API. | `services/enrollment-service` (Grades), `frontend` (Lecturer Portal), CI/CD |

---

## 4. Đặc tả Cơ sở Dữ liệu (PostgreSQL - 7 Bảng Cốt lõi)

Hệ thống quản lý dữ liệu tập trung thông qua 7 bảng liên kết chặt chẽ (được khởi tạo tự động qua `init-db/01-schema.sql` và `init-db/02-seed-data.sql`):

1. **`users`**: Tài khoản người dùng, email, mật khẩu mã hóa BCrypt, vai trò (`STUDENT`, `LECTURER`, `ADMIN`), trạng thái (`ACTIVE`, `INACTIVE`, `LOCKED`).
2. **`student_profiles`**: Hồ sơ sinh viên, mã SV (`student_code`), chuyên ngành, học kỳ hiện tại, tín chỉ tích lũy, điểm CGPA hiện tại và kỳ trước.
3. **`lecturer_profiles`**: Hồ sơ giảng viên, mã GV (`lecturer_code`), khoa/bộ môn phụ trách, học vị.
4. **`courses`**: Danh mục môn học, mã môn (`course_code`), số tín chỉ, số giờ học/tuần, môn tiên quyết, đề cương chi tiết (AI sinh).
5. **`class_sections`**: Lớp học phần mở trong kỳ, thứ, giờ bắt đầu/kết thúc, phòng học, giảng viên phụ trách, sĩ số tối đa/hiện tại, version (Optimistic Locking).
6. **`enrollments`**: Bản ghi đăng ký môn học của sinh viên, trạng thái (`REGISTERED`, `PENDING`, `CANCELLED`, `REJECTED`), cờ cảnh báo trùng lịch (`has_conflict`), tỷ lệ chuyên cần.
7. **`grades`**: Bảng điểm chi tiết thành phần (Chuyên cần 10%, Giữa kỳ 30%, Cuối kỳ 60%), điểm tổng kết hệ 10, điểm chữ quy đổi, trạng thái khóa điểm.

---

## 5. Đặc tả REST API Endpoints

Toàn bộ API trả về cấu trúc JSON chuẩn:
```json
{
  "status": 200,
  "message": "Thông điệp phản hồi",
  "data": { ... }
}
```

### 5.1. Module Auth & Profile (`auth-service` - Port 8081)
- `POST /api/v1/auth/login`: Đăng nhập, trả về JWT Token và Role.
- `GET /api/v1/profile/me`: Lấy thông tin hồ sơ của người dùng đang đăng nhập.
- `PUT /api/v1/profile/me`: Cập nhật thông tin liên hệ, đổi mật khẩu cá nhân.
- `GET / POST / PUT / DELETE /api/v1/admin/users`: CRUD tài khoản & hồ sơ Sinh viên, Giảng viên.

### 5.2. Module Academic Catalog & Operations (`course-service` - Port 8082)
- `GET / POST / PUT / DELETE /api/v1/admin/courses`: CRUD danh mục Môn học.
- `GET / POST / PUT / DELETE /api/v1/admin/class-sections`: Mở lớp học phần, xếp phòng/lịch học, kiểm tra trùng phòng/giảng viên.
- `PUT /api/v1/admin/enrollments/{id}/approve`: Duyệt yêu cầu đăng ký học phần (`PENDING` → `REGISTERED`).

### 5.3. Module Student Portal, Registration & Grades (`enrollment-service` - Port 8083)
- `GET /api/v1/student/dashboard`: Dữ liệu Student Dashboard (4 thẻ thống kê: Registered Courses, Weekly Classes, Pending Registrations, Schedule Conflicts; thanh tiến độ hoàn thành kỳ, C-GPA).
- `GET /api/v1/student/class-sections`: Tra cứu các lớp học phần đang mở trong kỳ.
- `POST /api/v1/student/enrollments`: Đăng ký học phần (kiểm tra sĩ số, giới hạn 24 tín, kiểm tra trùng lịch).
- `DELETE /api/v1/student/enrollments/{enrollmentId}`: Hủy đăng ký học phần.
- `GET /api/v1/student/grades`: Xem bảng điểm cá nhân qua các kỳ.
- `GET /api/v1/lecturer/classes`: Danh sách các lớp học phần được phân công giảng dạy.
- `GET /api/v1/lecturer/classes/{sectionId}/students`: Danh sách sinh viên và bảng điểm theo lớp.
- `PUT /api/v1/lecturer/enrollments/{enrollmentId}/attendance`: Cập nhật điểm danh chuyên cần.
- `PUT /api/v1/lecturer/grades/{enrollmentId}`: Nhập/sửa điểm và tự động tính điểm tổng kết/C-GPA.
- `POST /api/v1/lecturer/classes/{sectionId}/lock-grades`: Chốt và khóa bảng điểm của lớp.

### 5.4. Module AI Integration (`ai-service` - Port 8084)
- `POST /api/v1/ai/generate-syllabus`: (Role: ADMIN, LECTURER) Nhận tên môn học và số tín chỉ, Spring AI tự động sinh đề cương chi tiết môn học.
- `POST /api/v1/ai/academic-advisor`: (Role: STUDENT) Chatbot giải đáp quy chế tín chỉ & gợi ý lộ trình môn học không bị trùng lịch.

---

## 6. Tài khoản Thử nghiệm Mặc định (Seed Data)

Mật khẩu mặc định cho toàn bộ tài khoản thử nghiệm: **`123456`**

| Tài khoản (Username) | Role | Họ và tên | Chức danh / Mã số |
|---|---|---|---|
| `admin` | `ADMIN` | Quản trị viên Hệ thống | Quản trị viên |
| `gv001` | `LECTURER` | TS. Nguyễn Văn Hùng | GV001 - Khoa CNTT |
| `gv002` | `LECTURER` | ThS. Trần Thị Mai | GV002 - Khoa KHMT |
| `sv2024001` | `STUDENT` | Lê Hoàng Long | SV2024001 - B.Tech CS |
| `sv2024002` | `STUDENT` | Phạm Minh Tuấn | SV2024002 - B.Tech IT |

---

## 7. Hướng dẫn Cài đặt & Khởi chạy

### 7.1. Yêu cầu Tiên quyết
- **Java**: OpenJDK 21 LTS
- **Node.js**: Phiên bản 18+ & npm
- **Docker & Docker Compose**: Phiên bản mới nhất
- **PostgreSQL**: 16 (nếu chạy local không qua Docker)

### 7.2. Khởi chạy Nhanh bằng Docker Compose (Khuyến nghị)
Chỉ với 1 câu lệnh, toàn bộ hệ thống gồm PostgreSQL, 5 Microservices backend và Frontend ReactJS sẽ tự động được build và khởi chạy:
```bash
docker compose up -d
```
Sau khi khởi chạy thành công:
- **Frontend App**: `http://localhost:3000`
- **API Gateway**: `http://localhost:8080`
- **PostgreSQL Database**: `localhost:5432` (Database: `academic_db`, User/Password: `postgres`/`postgres`)

### 7.3. Khởi chạy Thủ công Từng Phân hệ (Dành cho Lập trình viên)

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

## 8. Chiến lược Phân nhánh Git & Quy trình CI/CD

- **`main`**: Nhánh chính (Production), chỉ merge khi các tính năng đã qua kiểm thử.
- **`dev`**: Nhánh tích hợp (Development), các thành viên tạo nhánh feature từ `dev` và tạo Pull Request vào `dev`.
- **GitHub Actions (`.github/workflows/ci.yml`)**: Tự động thực thi mỗi khi push hoặc tạo pull request lên nhánh `main` và `dev`:
  1. Kiểm tra biên dịch Backend qua Gradle.
  2. Kiểm tra lint và build Frontend qua Vite.
  3. Khởi chạy container PostgreSQL và chạy test kiểm thử tự động.
