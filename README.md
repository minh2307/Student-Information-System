# Rikkei EduPortal - Student Information System (MVP)
> Mã dự án: **PRJ-QUICK-REVIEW-PRE-OJT-03**  
> Kiến trúc: **Microservices (Spring Boot 3 + Java 21) & ReactJS (Vite + Tailwind CSS)**  
> Thời gian phát triển: **1 tuần (Sprint 7 ngày - 6 thành viên)**

---

## 1. Cấu trúc Dự án (Microservices Skeleton)

```
.
├── common-lib/                 # Thư viện dùng chung (ApiResponse, Enums: Role, Status)
├── services/
│   ├── api-gateway/            # Cổng Gateway (Port 8080)
│   ├── auth-service/           # Xác thực & Quản lý User/Profile (Port 8081)
│   ├── course-service/         # Quản lý Môn học & Mở lớp học phần (Port 8082)
│   ├── enrollment-service/     # Đăng ký tín chỉ & Quản lý Điểm số (Port 8083)
│   └── ai-service/             # AI Syllabus Generator & Advisor Chatbot (Port 8084)
├── frontend/                   # ReactJS + Vite + Tailwind CSS + Zustand
├── docker-compose.yml          # Docker Compose đa service (PostgreSQL + Services + Frontend)
├── .env.example                # Mẫu biến môi trường
├── build.gradle.kts            # Root Gradle Multi-project
└── settings.gradle.kts         # Root Gradle Settings
```

---

## 2. Phân chia công việc theo vai trò (Sprint 7 ngày)

| Thành viên | Phân hệ phụ trách | Thư mục làm việc |
|---|---|---|
| **Member 1** | Team Lead / AI Integrator | `services/ai-service`, `docker-compose.yml`, Quản trị Gateway |
| **Member 2** | Full-stack Dev 1 (Auth & User) | `services/auth-service`, `frontend/src/pages/Login.jsx`, User Admin |
| **Member 3** | Full-stack Dev 2 (Course & Section) | `services/course-service`, `frontend` (Admin Courses & Classes) |
| **Member 4** | Full-stack Dev 3 (Registration Engine) | `services/enrollment-service`, `frontend` (Student Dashboard & Register) |
| **Member 5** | Full-stack Dev 4 (Lecturer & Grading) | `services/enrollment-service` (Grades), `frontend` (Lecturer Portal) |
| **Member 6** | QA / DevOps | CI/CD GitHub Actions, Dockerfile từng service, Postman collection |

---

## 3. Hướng dẫn chạy thử nghiệm

### 3.1. Build toàn bộ Backend Microservices
```bash
./gradlew build -x test
```

### 3.2. Chạy Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3.3. Khởi chạy toàn bộ hệ thống bằng Docker Compose
```bash
docker compose up -d
```
