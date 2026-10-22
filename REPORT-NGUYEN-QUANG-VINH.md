# BÁO CÁO KẾT QUẢ THỰC HIỆN CÔNG VIỆC SPRINT 7 NGÀY
## Dự án: Rikkei EduPortal - Student Information System (MVP)
### Mã dự án: PRJ-QUICK-REVIEW-PRE-OJT-03

---

### 1. THÔNG TIN THÀNH VIÊN
* **Họ và tên:** Nguyễn Quang Vinh
* **Vai trò:** Full-stack Developer 1 (Auth, User & DevOps Co-Lead)
* **Thời gian thực hiện:** Sprint 7 ngày
* **Phân hệ phụ trách:**
  * Backend: `services/auth-service`, `common-lib`, `services/api-gateway`
  * Frontend: `frontend/src/pages/Login.jsx`, `frontend/src/pages/Profile.jsx`, `frontend/src/pages/AdminUsers.jsx`, `frontend/src/components/*`
  * DevOps: `docker-compose.yml`, `docker-compose.prod.yml`, Dockerfiles

---

### 2. TỔNG QUAN CÔNG VIỆC ĐƯỢC GIAO THEO SRS (MỤC 8)
Theo tài liệu đặc tả yêu cầu kỹ thuật và phân công nhiệm vụ (SRS Mục 8), thành viên **Nguyễn Quang Vinh** đảm nhiệm:
1. **Auth & User Profile Backend:**
   * Spring Security + JWT Authentication Filter.
   * API Auth: `POST /api/v1/auth/login` – Đăng nhập, trả về accessToken, role và thông tin cơ bản.
   * API Profile: `GET /api/v1/profile/me` & `PUT /api/v1/profile/me` – Xem và cập nhật hồ sơ cá nhân, đổi mật khẩu.
   * API Admin Users: `GET`, `POST`, `PUT`, `DELETE /api/v1/admin/users` – CRUD tài khoản và hồ sơ Sinh viên & Giảng viên.
2. **Auth & User Profile Frontend:**
   * Trang Đăng nhập (`Login.jsx`).
   * Khung Layout chung (`Sidebar.jsx`, `Header.jsx`, `MainLayout.jsx`).
   * Trang Hồ sơ cá nhân (`Profile.jsx`).
   * Trang Quản lý Hồ sơ Sinh viên / Giảng viên cho Admin (`AdminUsers.jsx`).
3. **DevOps Core:**
   * Đóng gói Dockerfile cho các services.
   * Thiết lập Docker Compose đa môi trường (dev, staging, prod).

---

### 3. CHI TIẾT KẾT QUẢ TRIỂN KHAI THEO TỪNG GIAI ĐOẠN (JIRA TASKS)

#### Giai đoạn 1: DevOps Core & Multi-environment Setup (Jira: SIS-DEV-01)
* **Nội dung thực hiện:**
  * Hoàn thiện `docker-compose.yml` tích hợp mount script khởi tạo cơ sở dữ liệu `init-db/01-schema.sql` và `init-db/02-seed-data.sql` vào PostgreSQL container với cơ chế `healthcheck`.
  * Xây dựng `docker-compose.prod.yml` dành riêng cho môi trường Production (tự động restart `always`, cấu hình log driver xoay vòng 10MB tối đa 3 files, bảo toàn dữ liệu `postgres_prod_data`).
  * Đóng gói Dockerfile cho toàn bộ các service Spring Boot (Java 21) và ReactJS Nginx.

#### Giai đoạn 2: Backend Authentication & Spring Security (Jira: SIS-AUTH-01)
* **Nội dung thực hiện:**
  * Thiết lập cơ chế bảo mật với Spring Security 6 và JWT (`jjwt` 0.12.6).
  * Xây dựng `JwtTokenProvider`: Sinh token JWT kèm claims (`userId`, `username`, `email`, `role`, `fullName`), validate chữ ký và trích xuất thông tin.
  * Xây dựng `JwtAuthenticationFilter`: Đọc token từ header `Authorization: Bearer <token>`, phân quyền RBAC (`ROLE_STUDENT`, `ROLE_LECTURER`, `ROLE_ADMIN`).
  * Xây dựng `JwtAuthenticationEntryPoint`: Xử lý lỗi 401 Unauthorized trả về JSON ApiResponse chuẩn.
  * Xây dựng `AuthService` & `AuthController`:
    * API `POST /api/v1/auth/login`: Xác thực mật khẩu với BCrypt, kiểm tra trạng thái tài khoản `ACTIVE`/`LOCKED`, trả về `accessToken` và thông tin User kèm Profile tương ứng.

#### Giai đoạn 3: Backend User Profile Management (Jira: SIS-AUTH-02)
* **Nội dung thực hiện:**
  * Xây dựng `ProfileService` & `ProfileController`:
    * API `GET /api/v1/profile/me`: Lấy thông tin user đăng nhập và thông tin chi tiết hồ sơ học vụ (`StudentProfile`) hoặc giảng dạy (`LecturerProfile`).
    * API `PUT /api/v1/profile/me`: Cập nhật họ tên, email (kiểm tra không trùng lặp), avatar URL và đổi mật khẩu an toàn (xác thực `oldPassword` với BCrypt).

#### Giai đoạn 4: Backend Admin User & Profile CRUD (Jira: SIS-AUTH-03)
* **Nội dung thực hiện:**
  * Xây dựng `AdminUserService` & `AdminUserController`:
    * API `GET /api/v1/admin/users`: Tìm kiếm người dùng realtime theo từ khóa và lọc theo vai trò (STUDENT, LECTURER, ADMIN).
    * API `GET /api/v1/admin/users/{id}`: Xem chi tiết tài khoản kèm hồ sơ.
    * API `POST /api/v1/admin/users`: Tạo mới tài khoản và tự động tạo hồ sơ tương ứng (`StudentProfile` với mã SV, ngành học; hoặc `LecturerProfile` với mã GV, khoa, học vị).
    * API `PUT /api/v1/admin/users/{id}`: Cập nhật thông tin tài khoản, hồ sơ và trạng thái khóa/mở khóa (`ACTIVE`/`LOCKED`).
    * API `DELETE /api/v1/admin/users/{id}`: Xóa tài khoản và liên kết hồ sơ tương ứng.

#### Giai đoạn 5: Frontend Auth Integration & Shell Layout (Jira: SIS-FE-01)
* **Nội dung thực hiện:**
  * Xây dựng Axios client `src/services/api.js` tự động gắn `Bearer token` vào header request và xử lý auto-logout khi gặp lỗi 401.
  * Xây dựng Zustand store `src/store/authStore.js` lưu trữ phiên đăng nhập và đồng bộ `localStorage`.
  * Trang `Login.jsx`: Giao diện đăng nhập hiện đại, thông báo lỗi rõ ràng, tích hợp 3 nút chọn nhanh tài khoản test (Sinh viên, Giảng viên, Admin).
  * Khung Layout chung: `Sidebar.jsx` (điều hướng phân quyền theo role), `Header.jsx` (hiển thị avatar, tên user, badge vai trò, link sang trang cá nhân và nút đăng xuất), `MainLayout.jsx`, `ProtectedRoute.jsx`.

#### Giai đoạn 6: Frontend Profile Page (Jira: SIS-FE-02)
* **Nội dung thực hiện:**
  * Xây dựng `Profile.jsx`:
    * Hiển thị thông tin tổng quan người dùng (Avatar, Họ tên, Email, Trạng thái).
    * Khối thông tin đặc thù theo vai trò: Thẻ học vụ sinh viên (Mã SV, Ngành, Học kỳ, Tín chỉ tích lũy) hoặc Thẻ giảng viên (Mã GV, Khoa, Học vị).
    * Form chỉnh sửa thông tin liên hệ gọi API `PUT /api/v1/profile/me`.
    * Form đổi mật khẩu với validate độ dài và xác nhận mật khẩu.

#### Giai đoạn 7: Frontend Admin User Management (Jira: SIS-FE-03)
* **Nội dung thực hiện:**
  * Xây dựng `AdminUsers.jsx`:
    * Bảng danh sách người dùng đầy đủ avatar, tên, email, vai trò, mã hồ sơ, trạng thái.
    * Nút chuyển đổi nhanh trạng thái Khóa / Mở khóa tài khoản (`ACTIVE` $\leftrightarrow$ `LOCKED`).
    * Bộ lọc phân loại theo vai trò và thanh tìm kiếm realtime.
    * Modal Tạo tài khoản mới: Form động hiển thị các trường theo từng vai trò được chọn.
    * Modal Chỉnh sửa tài khoản: Cập nhật thông tin cá nhân, hồ sơ và mật khẩu.
    * Nút xóa tài khoản có xác nhận an toàn.

#### Giai đoạn 8: Testing, QA & Documentation (Jira: SIS-TEST-01)
* **Nội dung thực hiện:**
  * Viết trọn bộ Unit tests & Controller tests cho module `auth-service`:
    * `AuthServiceTest`: Kiểm tra đăng nhập thành công, đăng nhập sai mật khẩu, tài khoản bị khóa, tài khoản không tồn tại.
    * `ProfileServiceTest`: Kiểm tra lấy hồ sơ, cập nhật thông tin, đổi mật khẩu đúng/sai.
    * `AdminUserServiceTest`: Kiểm tra tìm kiếm user, tạo user SV/GV, kiểm tra trùng lặp username, cập nhật và xóa user.
    * `JwtTokenProviderTest`: Kiểm tra sinh token và xác thực chữ ký token.
    * `AuthControllerTest`, `ProfileControllerTest`, `AdminUserControllerTest`: Kiểm tra các endpoint REST API MockMvc.
  * Chạy test suite: **21/21 tests PASS 100%**.
  * Kiểm tra build Frontend: Vite build thành công không lỗi trong 2.45s.
  * Kiểm tra build Backend: Gradle multi-project build thành công toàn bộ trong 10s.

---

### 4. BẢNG TỔNG HỢP KIỂM THỬ (TEST RESULTS)

| STT | Test Case | Phân loại | Kết quả | Ghi chú |
| :---: | :--- | :--- | :---: | :--- |
| 1 | `JwtTokenProviderTest.testGenerateAndValidateToken` | Unit Test | **PASSED** | Sinh và parse token chuẩn xác |
| 2 | `JwtTokenProviderTest.testInvalidToken` | Unit Test | **PASSED** | Bắt token sai định dạng |
| 3 | `AuthServiceTest.testLoginSuccess` | Unit Test | **PASSED** | Trả về JWT token + user + profile |
| 4 | `AuthServiceTest.testLoginWrongPassword` | Unit Test | **PASSED** | Ném BadCredentialsException |
| 5 | `AuthServiceTest.testLoginLockedUser` | Unit Test | **PASSED** | Chặn đăng nhập tài khoản LOCKED |
| 6 | `AuthServiceTest.testLoginUserNotFound` | Unit Test | **PASSED** | Báo lỗi khi user không tồn tại |
| 7 | `ProfileServiceTest.testGetProfileSuccess` | Unit Test | **PASSED** | Lấy thông tin cá nhân & profile |
| 8 | `ProfileServiceTest.testUpdateProfileSuccess` | Unit Test | **PASSED** | Cập nhật fullName, email |
| 9 | `ProfileServiceTest.testUpdateProfileWithPassword` | Unit Test | **PASSED** | Đổi mật khẩu thành công |
| 10 | `ProfileServiceTest.testUpdateProfileWrongOldPassword` | Unit Test | **PASSED** | Chặn đổi khi sai mật khẩu cũ |
| 11 | `AdminUserServiceTest.testGetAllUsers` | Unit Test | **PASSED** | Lọc theo role & keyword |
| 12 | `AdminUserServiceTest.testCreateUserStudentSuccess` | Unit Test | **PASSED** | Tạo User + StudentProfile |
| 13 | `AdminUserServiceTest.testCreateUserDuplicateUsername` | Unit Test | **PASSED** | Chặn trùng username |
| 14 | `AdminUserServiceTest.testUpdateUserSuccess` | Unit Test | **PASSED** | Cập nhật user & profile |
| 15 | `AdminUserServiceTest.testDeleteUserSuccess` | Unit Test | **PASSED** | Xóa user & cascade profile |
| 16 | `AuthControllerTest.testLoginEndpoint` | MockMvc Test | **PASSED** | POST /api/v1/auth/login trả về 200 |
| 17 | `ProfileControllerTest.testGetMyProfile` | MockMvc Test | **PASSED** | GET /api/v1/profile/me trả về 200 |
| 18 | `ProfileControllerTest.testUpdateMyProfile` | MockMvc Test | **PASSED** | PUT /api/v1/profile/me trả về 200 |
| 19 | `AdminUserControllerTest.testGetUsersEndpoint` | MockMvc Test | **PASSED** | GET /api/v1/admin/users trả về 200 |
| 20 | `AdminUserControllerTest.testCreateUserEndpoint` | MockMvc Test | **PASSED** | POST /api/v1/admin/users trả về 201 |
| 21 | `AdminUserControllerTest.testDeleteUserEndpoint` | MockMvc Test | **PASSED** | DELETE /api/v1/admin/users/9 trả về 200 |

---

### 5. KẾT LUẬN & ĐỀ XUẤT
* **Mức độ hoàn thành:** **100% nhiệm vụ được giao trong SRS** cho vai trò Nguyễn Quang Vinh (Auth, User & DevOps Co-Lead).
* Hệ thống đã sẵn sàng kết nối hoàn chỉnh với phân hệ Quản lý Môn học (Member 3), Đăng ký Học phần (Member 4) và Cổng Giảng viên & Điểm số (Member 5).
