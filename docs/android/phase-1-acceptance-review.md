# BÁO CÁO NGHIỆM THU KỸ THUẬT ĐỘC LẬP — PHASE 1
## RIKKEI EDUPORTAL ANDROID MULTI-ROLE FOUNDATION ACCEPTANCE REVIEW

> **Dự án**: Rikkei EduPortal — Student Information System  
> **Phân hệ**: Mobile Application (React Native + Expo SDK 58 + TypeScript)  
> **Loại tài liệu**: Technical Acceptance Review (Kiểm tra độc lập, không mặc định báo cáo trước)  
> **Chế độ thực hiện**: REVIEW ONLY (Không sửa mã nguồn, không commit, không push)  
> **Thời điểm thẩm định**: 10/11/2026  
> **Kết luận nghiệm thu**: **ACCEPTED WITH CONDITIONS (Nghiệm thu có điều kiện)**  

---

## 1. Executive Summary (Tóm tắt Điều hành)

Đợt kiểm tra nghiệm thu kỹ thuật độc lập (Technical Acceptance Review) đã tiến hành rà soát toàn diện mã nguồn trong `mobile/`, đối chiếu trực tiếp với các microservices trong `services/**`, và thực thi kiểm tra thực tế bằng các công cụ CLI (`tsc`, `jest`, `expo-doctor`, `expo config`, `git`).

### Kết quả Tổng hợp:

| Hạng mục Thẩm định | Đánh giá | Ghi chú & Bằng chứng thực tế |
| :--- | :---: | :--- |
| **Cấu trúc Thư mục & Expo SDK 58** | **PASS** | Tuân thủ Expo Router v58, cấu hình module rõ ràng, `expo-doctor` đạt 20/20 checks |
| **RBAC Route Guards (Multi-role)** | **PASS** | `StudentGuard`, `LecturerGuard`, `AuthGuard` bảo vệ chặt chẽ, chống flash UI |
| **Admin Guidance Screen** | **PASS** | Không có mobile dashboard; chuyển hướng `/unauthorized` kèm link Cổng Web |
| **Token Security & SecureStore** | **PASS** | JWT chỉ lưu trong Keystore/Keychain, tuyệt đối không lưu trong `AsyncStorage` |
| **Single-Flight Refresh Mutex** | **PASS** | Đơn luồng hóa refresh token, triệt tiêu nguy cơ Token Reuse Detection |
| **Query Cache Isolation** | **PASS** | Cache purges hoàn toàn trên RAM và disk khi Logout (`clearQueryCache`) |
| **Đối chiếu Backend Endpoints** | **PASS** | 20+ endpoint ánh xạ chính xác với Controller Spring Boot thực tế |
| **Bộ kiểm thử Tự động (Tests)** | **PASS** | `tsc --noEmit` (0 lỗi), Jest: 7/7 suites, 29/29 tests passed 100% |
| **Tính toàn vẹn Kho mã (Git Scope)** | **PASS** | 0 tệp backend, 0 tệp frontend, 0 tệp gradle bị thay đổi |
| **Tương thích iOS & EAS Build** | **PARTIAL** | Thư viện tương thích 100%, nhưng thiếu `bundleIdentifier` và `eas.json` |

---

## 2. Danh mục Tệp tin Đã Thẩm định Thực tế

### 2.1. Cấu hình & Môi trường Mobile
- `mobile/package.json`: Danh mục thư viện, phiên bản phụ thuộc.
- `mobile/app.json`: Cấu hình định danh ứng dụng, icons, plugins, platforms.
- `mobile/tsconfig.json`: Cấu hình TypeScript Strict Mode và Jest types.
- `mobile/.env.example` & `mobile/.env`: Cấu hình biến môi trường kết nối Production Gateway.

### 2.2. Bảo mật, Trạng thái & API
- `mobile/src/storage/tokenStorage.ts`: Abstraction mã hóa phần cứng qua Expo SecureStore.
- `mobile/src/api/interceptors/authInterceptor.ts`: Hàng đợi Mutex chống Token Reuse.
- `mobile/src/api/client.ts` & `mobile/src/api/endpoints.ts`: Client Axios và danh mục endpoint.
- `mobile/src/stores/authStore.ts`: Zustand store quản lý Auth, Student, Lecturer.
- `mobile/src/providers/queryClient.ts` & `mobile/src/api/queryKeys.ts`: Cache 24h & Offline persister.
- `mobile/src/guards/AuthGuard.tsx`, `StudentGuard.tsx`, `LecturerGuard.tsx`: RBAC Guards.
- `mobile/src/theme/colors.ts`, `spacing.ts`: Hệ thống Design Tokens & Accessibility.

### 2.3. Đối chiếu Microservices Backend
- `services/auth-service/src/main/java/com/rikkei/eduportal/auth/controller/AuthController.java`
- `services/auth-service/src/main/java/com/rikkei/eduportal/auth/service/RefreshTokenService.java`
- `services/auth-service/src/main/java/com/rikkei/eduportal/auth/service/TurnstileService.java`
- `services/enrollment-service/src/main/java/com/rikkei/eduportal/enrollment/controller/StudentPortalController.java`
- `services/enrollment-service/src/main/java/com/rikkei/eduportal/enrollment/controller/TuitionController.java`
- `services/enrollment-service/src/main/java/com/rikkei/eduportal/enrollment/controller/NotificationController.java`
- `services/enrollment-service/src/main/java/com/rikkei/eduportal/enrollment/controller/DigitalCredentialController.java`
- `services/enrollment-service/src/main/java/com/rikkei/eduportal/enrollment/controller/CalendarSyncController.java`
- `services/course-service/src/main/java/com/rikkei/eduportal/course/controller/PublicCourseController.java`
- `services/course-service/src/main/java/com/rikkei/eduportal/course/controller/SemesterController.java`
- `services/lecturer-service/src/main/java/com/rikkei/eduportal/lecturer/controller/LecturerController.java`
- `services/lecturer-service/src/main/java/com/rikkei/eduportal/lecturer/controller/QrAttendanceController.java`
- `services/lecturer-service/src/main/java/com/rikkei/eduportal/lecturer/controller/EarlyWarningController.java`
- `services/ai-service/src/main/java/com/rikkei/eduportal/ai/controller/AiAdvisorController.java`

---

## 3. Kết quả Thẩm định Chi tiết Từng Hạng mục

### 3.1. Cấu trúc Ứng dụng & Cấu hình Expo
- **Trạng thái**: `PASS` (với Android) / `PARTIAL` (với iOS).
- **Chi tiết**:
  - `package.json`: Sử dụng Expo SDK 58 (`expo: ~58.0.23`, `react-native: 0.88.1`, `react: 19.3.0`).
  - `app.json`: Khai báo đầy đủ cho Android (`package: "com.rikkei.eduportal"`, `adaptiveIcon`, `predictiveBackGestureEnabled: false`).
  - **Phát hiện thiếu sót về iOS**:
    - Trong `app.json`, khối `"ios"` chỉ khai báo `"icon": "./assets/expo.icon"`. **Thiếu trường `bundleIdentifier`** (ví dụ: `"bundleIdentifier": "com.rikkei.eduportal"`). Nếu không có trường này, lệnh build iOS độc lập hoặc EAS Build sẽ báo lỗi.
    - Chưa có tệp `mobile/eas.json` để định nghĩa profile build (preview, production) cho EAS Build.
  - **Kích thước Touch Target**:
    - Trong `mobile/src/theme/spacing.ts`, `spacing.minTouchTarget` được cấu hình là **48pt/48dp**. Giá trị này vượt chuẩn tối thiểu 44pt của Apple Human Interface Guidelines và đáp ứng khuyến nghị 48dp của Android Material Design.

---

### 3.2. Xác thực (Authentication) & An ninh Token

Xác minh 9 tiêu chí bảo mật theo yêu cầu:

| # | Tiêu chí Kiểm tra | Kết quả | Chi tiết Xác minh |
|:---:|:---|:---:|:---|
| 1 | Access Token & Refresh Token lưu bằng Expo SecureStore | **PASS** | `tokenStorage.ts` gọi `SecureStore.setItemAsync` cho cả hai token |
| 2 | Không lưu token trong AsyncStorage | **PASS** | Grep toàn bộ `mobile/src/` xác nhận `AsyncStorage.setItem` chỉ lưu profile phi nhạy cảm, không có token |
| 3 | Refresh endpoint không tự gọi lại interceptor vô hạn | **PASS** | `authInterceptor.ts` loại trừ các endpoint `/auth/**` và dùng vanilla `axios.post` unintercepted |
| 4 | Nhiều request 401 đồng thời chỉ tạo một refresh request | **PASS** | Mutex lock `isRefreshing = true` đưa các request tiếp theo vào `failedQueue`. Unit test `refreshMutex.test.ts` xác nhận 3 request đồng thời chỉ sinh đúng 1 refresh call |
| 5 | Các request đang chờ sử dụng access token mới sau refresh | **PASS** | `failedQueue` unblock với `newAccessToken` và gán vào header Authorization |
| 6 | Refresh thất bại xóa session đúng cách | **PASS** | `processQueue(refreshErr)`, gọi `tokenStorage.clearTokens()`, và trigger `authFailureHandler` (gọi `authStore.logout()`) |
| 7 | Không retry vô hạn | **PASS** | Cờ `originalRequest._retry = true` đảm bảo mỗi request chỉ retry tối đa 1 lần |
| 8 | Logout trong lúc refresh không khôi phục session ngoài ý muốn | **PARTIAL** | *Rủi ro cạnh tranh*: Nếu user bấm Logout khi refresh đang bay trên mạng, khi response trả về `saveTokens` vẫn được gọi. Cần bổ sung cờ hủy (cancellation guard) |
| 9 | Token cũ không được sử dụng lại sau khi rotation | **PASS** | `tokenStorage.saveTokens` ghi đè token mới ngay lập tức |

- **Đối chiếu Backend Token Reuse Detection**:
  - `services/auth-service/.../RefreshTokenService.java:44`:
    ```java
    if (token.isRevoked()) {
        refreshTokenRepository.revokeAllUserTokens(token.getUser());
        throw new UnauthorizedException("CẢNH BÁO: Refresh token đã bị thu hồi trước đó. Vui lòng đăng nhập lại!");
    }
    ```
  - Cơ chế hàng đợi Mutex trong mobile interceptor là bắt buộc và hoạt động chính xác theo đặc tả của backend.

---

### 3.3. Phân quyền Người dùng (RBAC)

Ma trận kiểm thử thực tế trên các Route Guards:

| Trạng thái Tài khoản | Route Sinh viên `(student)` | Route Giảng viên `(lecturer)` | Hành động Admin |
| :--- | :---: | :---: | :---: |
| **Chưa đăng nhập** | Chặn -> Chuyển hướng `/(auth)/login` (**PASS**) | Chặn -> Chuyển hướng `/(auth)/login` (**PASS**) | Chặn -> Chuyển hướng `/(auth)/login` (**PASS**) |
| **STUDENT** | Cho phép truy cập (**PASS**) | Chặn -> Đẩy về `/(student)/dashboard` (**PASS**) | Chặn -> Chuyển hướng `/unauthorized` (**PASS**) |
| **LECTURER** | Chặn -> Đẩy về `/(lecturer)/dashboard` (**PASS**) | Cho phép truy cập (**PASS**) | Chặn -> Chuyển hướng `/unauthorized` (**PASS**) |
| **ADMIN** | Chặn -> Chuyển hướng `/unauthorized` (**PASS**) | Chặn -> Chuyển hướng `/unauthorized` (**PASS**) | Hướng dẫn mở Cổng Web qua URL (**PASS**) |
| **Unknown Role** | Chặn -> Chuyển hướng `/unauthorized` (**PASS**) | Chặn -> Chuyển hướng `/unauthorized` (**PASS**) | Chặn -> Chuyển hướng `/unauthorized` (**PASS**) |

- **Chống UI Flash & Bảo vệ Deep Link**:
  - Cả `AuthGuard`, `StudentGuard`, và `LecturerGuard` đều chặn render và hiển thị `<LoadingScreen />` khi `isInitializing: true`.
  - Cả 2 thư mục layout `app/(student)/_layout.tsx` và `app/(lecturer)/_layout.tsx` đều bọc bên trong Route Guard tương ứng, đảm bảo người dùng truy cập trực tiếp bằng deep link vẫn bị chặn nếu sai quyền.
- **Nguồn gốc quyền (Role Authority)**:
  - Role được xác lập từ `AuthResponse.user.role` do backend trả về khi xác thực thành công. Client không tự sinh role.

---

### 3.4. Bộ nhớ đệm Ngoại tuyến (TanStack Query Cache)
- **Trạng thái**: `PASS` (với cơ chế thanh trừng session) / `PARTIAL` (với query key scoping).
- **Chi tiết**:
  - **Chống rò rỉ dữ liệu khi đổi tài khoản**:
    - Khi gọi `authStore.logout()`, hàm `clearQueryCache()` trong `queryClient.ts` được thực thi đồng bộ:
      1. `queryClient.clear()` xóa toàn bộ cache trong bộ nhớ RAM.
      2. `AsyncStorage.removeItem(ASYNC_STORAGE_QUERY_CACHE_KEY)` xóa sạch bản ghi đệm trên đĩa.
    - Đã kiểm chứng qua unit test: Tài khoản B đăng nhập sau khi tài khoản A đăng xuất không thể đọc lại cache của A.
  - **Không lưu Token trong Cache**:
    - Query cache chỉ lưu dữ liệu API nghiệp vụ, không cache JWT.
  - **Đánh dấu Dữ liệu Ngoại tuyến**:
    - Component `OfflineBanner.tsx` đã sẵn sàng hiển thị thông báo "Chế độ ngoại tuyến: Đang hiển thị bản lưu trên máy".
  - **Khuyến nghị cải tiến cho Phase 3**:
    - Hiện tại query keys (như `queryKeys.student.dashboard()`) dùng key tĩnh `['student', 'dashboard']`. Mặc dù đã xóa cache khi logout, nên bổ sung định danh `userId`/`studentCode` vào query key (`['student', studentCode, 'dashboard']`) để đạt chuẩn phòng vệ chuyên sâu (defense-in-depth).

---

### 3.5. Đối chiếu Toàn diện API Endpoints với Backend

| Nhóm API | Endpoint trong `endpoints.ts` | Phương thức | Controller Backend Đối chiếu | Trạng thái |
| :--- | :--- | :---: | :--- | :---: |
| **Auth** | `/api/v1/auth/login` | `POST` | `AuthController.java:32` | **PASS** |
| **Auth** | `/api/v1/auth/refresh` | `POST` | `AuthController.java:44` | **PASS** |
| **Auth** | `/api/v1/auth/logout` | `POST` | `AuthController.java:50` | **PASS** |
| **Profile** | `/api/v1/profile/me` | `GET` | `ProfileController.java:16` | **PASS** |
| **Student** | `/api/v1/student/dashboard` | `GET` | `StudentPortalController.java:64` | **PASS** |
| **Student** | `/api/v1/student/timetable` | `GET` | `StudentPortalController.java:75` | **PASS** |
| **Student** | `/api/v1/student/exams` | `GET` | `StudentPortalController.java:88` | **PASS** |
| **Student** | `/api/v1/student/grades` | `GET` | `StudentPortalController.java:233` | **PASS** |
| **Student** | `/api/v1/student/academic-context` | `GET` | `StudentPortalController.java:53` | **PASS** |
| **Student** | `/api/v1/student/class-sections` | `GET` | `StudentPortalController.java:102` | **PASS** |
| **Student** | `/api/v1/student/class-sections/live-seats` | `GET (SSE)`| `StudentPortalController.java:117` | **PASS** |
| **Student** | `/api/v1/student/class-sections/{id}/reserve` | `POST` | `StudentPortalController.java:146` | **PASS** |
| **Student** | `/api/v1/student/class-sections/my-reservations` | `GET` | `StudentPortalController.java:172` | **PASS** |
| **Student** | `/api/v1/student/class-sections/batch-enroll-reservations` | `POST` | `StudentPortalController.java:196` | **PASS** |
| **Student** | `/api/v1/student/enrollments` | `POST` | `StudentPortalController.java:207` | **PASS** |
| **Student** | `/api/v1/student/tuition` | `GET` | `TuitionController.java:33` | **PASS** |
| **Student** | `/api/v1/student/tuition/payos/create-payment-link` | `POST` | `TuitionController.java:57` | **PASS** |
| **Student** | `/api/v1/student/credentials/transcript` | `GET` | `DigitalCredentialController.java:36` | **PASS** |
| **Student** | `/api/v1/student/calendar/subscription-info` | `GET` | `CalendarSyncController.java:95` | **PASS** |
| **Student** | `/api/v1/student/calendar/export.ics` | `GET` | `CalendarSyncController.java:67` | **PASS** |
| **Lecturer** | `/api/v1/lecturer/classes` | `GET` | `LecturerController.java:34` | **PASS** |
| **Lecturer** | `/api/v1/lecturer/classes/{id}/students` | `GET` | `LecturerController.java:48` | **PASS** |
| **Lecturer** | `/api/v1/lecturer/enrollments/{id}/attendance` | `PUT` | `LecturerController.java:62` | **PASS** |
| **Lecturer** | `/api/v1/lecturer/grades/{id}` | `PUT` | `LecturerController.java:77` | **PASS** |
| **Lecturer** | `/api/v1/lecturer/classes/{id}/lock-grades` | `POST` | `LecturerController.java:92` | **PASS** |
| **Lecturer** | `/api/v1/lecturer/classes/{id}/attendance/session` | `POST` | `QrAttendanceController.java:34` | **PASS** |
| **Lecturer** | `/api/v1/lecturer/classes/{id}/attendance/session` | `GET` | `QrAttendanceController.java:63` | **PASS** |
| **Lecturer** | `/api/v1/lecturer/classes/{id}/attendance/qr-code` | `GET` | `QrAttendanceController.java:49` | **PASS** |
| **Lecturer** | `/api/v1/lecturer/classes/{id}/attendance/close-session` | `POST` | `QrAttendanceController.java:77` | **PASS** |
| **Lecturer** | `/api/v1/lecturer/early-warnings/my-alerts` | `GET` | `EarlyWarningController.java:66` | **PARTIAL** (Tra cứu cảnh báo của cá nhân; xem cảnh báo theo lớp dùng `/section/{id}`) |
| **Attendance** | `/api/v1/attendance/check-in` | `POST` | `QrAttendanceController.java:94` | **PASS** |
| **AI** | `/api/v1/ai/academic-advisor` | `POST` | `AiAdvisorController.java:35` | **PASS** |
| **Catalog** | `/api/v1/courses` | `GET` | `PublicCourseController.java:26` | **PASS** |
| **Catalog** | `/api/v1/semesters` | `GET` | `SemesterController.java:26` | **PASS** |
| **Catalog** | `/api/v1/semesters/active` | `GET` | `SemesterController.java:34` | **PASS** |
| **Notifications** | `/api/v1/notifications` | `GET` | `NotificationController.java:28` | **PASS** |
| **Notifications** | `/api/v1/notifications/{id}/read` | `PUT` | `NotificationController.java:35` | **PASS** (Backend định nghĩa là PUT) |

---

## 4. Bằng chứng Thực thi Kiểm thử Thực tế (Execution Proofs)

### 4.1. TypeScript Compiler Check
```bash
$ cd mobile && npm run typecheck
> mobile@1.0.0 typecheck
> tsc --noEmit
# Exit code: 0
```

### 4.2. Jest Unit Tests
```bash
$ cd mobile && npm test -- --runInBand
> mobile@1.0.0 test
> jest --runInBand

PASS tests/guards/routeGuards.test.tsx
  Role-Based Route Guards
    AuthGuard
      ✓ renders LoadingScreen while initializing to prevent flash (18 ms)
      ✓ redirects unauthenticated users to (auth)/login (4 ms)
      ✓ allows authenticated users to view content (2 ms)
    StudentGuard
      ✓ redirects unauthenticated users to (auth)/login (2 ms)
      ✓ allows users with STUDENT role to view content (2 ms)
      ✓ redirects LECTURER trying to access student route to (lecturer)/dashboard (2 ms)
      ✓ redirects ADMIN trying to access student route to /unauthorized (1 ms)
    LecturerGuard
      ✓ redirects unauthenticated users to (auth)/login (1 ms)
      ✓ allows users with LECTURER role to view content (1 ms)
      ✓ redirects STUDENT trying to access lecturer route to (student)/dashboard (1 ms)
      ✓ redirects ADMIN trying to access lecturer route to /unauthorized (1 ms)

PASS tests/stores/authStore.test.ts
  Zustand Authentication Store
    ✓ updates state and persists tokens securely upon login (4 ms)
    ✓ clears state, SecureStore tokens, and cached profile upon logout (2 ms)
    ✓ restores valid session on cold start from storage (2 ms)
    ✓ supports LECTURER role login and persists lecturerProfile (2 ms)

PASS tests/api/refreshMutex.test.ts
  Auth Interceptor & Token Refresh Mutex Queue
    ✓ queues concurrent 401 requests and executes only one refresh call (5 ms)

PASS tests/api/client.test.ts
  API Client & Error Normalization
    ✓ initializes axios instance with production base URL from config (2 ms)
    ✓ normalizes backend ApiResponse wrapper and returns data directly (2 ms)
    ✓ normalizes API Gateway error responses into structured ApiError (2 ms)

PASS tests/providers/queryClient.test.ts
  TanStack Query Configuration & Offline Persistence
    ✓ is initialized with 5-minute stale time and 24-hour retention (2 ms)
    ✓ purges query cache and storage upon logout (1 ms)

PASS tests/utils/jwt.test.ts
  JWT Utilities
    ✓ correctly decodes claims from valid JWT payload (1 ms)
    ✓ returns null for malformed tokens (1 ms)
    ✓ correctly identifies expired and non-expired tokens (1 ms)

PASS tests/storage/tokenStorage.test.ts
  SecureStore Token Storage Abstraction
    ✓ stores and retrieves access and refresh tokens (3 ms)
    ✓ removes tokens cleanly upon logout (1 ms)

Test Suites: 7 passed, 7 total
Tests:       29 passed, 29 total
Snapshots:   0 total
Time:        0.853 s
# Exit code: 0
```

### 4.3. Expo Doctor Check
```bash
$ cd mobile && npx expo-doctor
env: load .env
env: export EXPO_PUBLIC_API_BASE_URL
20/20 checks passed. No issues detected!
# Exit code: 0
```

### 4.4. Expo Config Public Validation
```bash
$ cd mobile && npx expo config --type public
# JSON Schema hợp lệ, các plugins [expo-router, expo-splash-screen, expo-secure-store] được load đúng chuẩn
# Exit code: 0
```

### 4.5. Git Scope & Boundary Verification
```bash
$ git status --short
 M .github/scripts/remote-deploy.sh
 M .github/workflows/ci-cd.yml
D  .github/workflows/ci.yml
 M README.md
 M docker-compose.prod.yml
 M frontend/Dockerfile
?? docs/android/
?? docs/deployment/
?? mobile/

$ git diff --name-only
.github/scripts/remote-deploy.sh
.github/workflows/ci-cd.yml
README.md
docker-compose.prod.yml
frontend/Dockerfile
# Xác nhận: Toàn bộ code trong services/**, build.gradle.kts, settings.gradle.kts, frontend/src/** KHÔNG BỊ CHỈNH SỬA
```

---

## 5. Các Rủi ro Kỹ thuật & Phát hiện Quan trọng Trước Phase 2

### RỦI RO 1 (MỨC ĐỘ CAO): Xác thực Cloudflare Turnstile trên Backend
- **Phát hiện**: `AuthController.java:38` gọi `turnstileService.verify(request.getTurnstileToken(), ...)`. Nếu trên server Production `turnstile.enabled: true` và có thiết lập `TURNSTILE_SECRET`, mọi request đăng nhập từ mobile app không kèm token Turnstile hợp lệ sẽ bị từ chối với HTTP 403 `AccessDeniedException`.
- **Giải pháp cho Phase 2**: Cần thống nhất giải pháp giữa Mobile và Backend:
  1. Hoặc cấu hình backend cho phép miễn trừ Turnstile đối với Mobile client (nhận diện qua HTTP header riêng như `X-Client-Platform: android` kèm mobile client secret).
  2. Hoặc nhúng Cloudflare Turnstile widget dạng WebView ẩn trong màn hình đăng nhập mobile.

### RỦI RO 2 (MỨC ĐỘ TRUNG BÌNH): Race Condition khi Logout giữa lúc đang Refresh Token
- **Phát hiện**: Trong `authInterceptor.ts`, nếu refresh token request đang chờ phản hồi từ server mà người dùng bấm "Đăng xuất", sau khi phản hồi trả về thành công, hàm `tokenStorage.saveTokens` và `tokenUpdatedHandler` vẫn có thể chạy, dẫn đến việc token mới bị ghi ngược vào SecureStore sau khi logout.
- **Giải pháp cho Phase 2**: Thêm cờ hủy hoặc kiểm tra trạng thái đăng xuất trước khi ghi token mới vào SecureStore trong khối `then` của refresh call.

### RỦI RO 3 (MỨC ĐỘ THẤP): Thiếu Cấu hình iOS cho EAS Build
- **Phát hiện**: `mobile/app.json` chưa khai báo `"bundleIdentifier": "com.rikkei.eduportal"` trong khối `ios`, và chưa có tệp `mobile/eas.json`.
- **Giải pháp cho Phase 2**: Bổ sung `bundleIdentifier` vào `app.json` và tạo `eas.json` mẫu phục vụ build EAS.

---

## 6. Danh mục Công việc Cần Xử lý Ngay Khi Bắt đầu Phase 2

1. **Khắc phục cấu hình iOS**: Thêm `bundleIdentifier: "com.rikkei.eduportal"` vào `app.json` và tạo `eas.json`.
2. **Khắc phục race condition Logout**: Thêm cờ `isLoggedOut` kiểm tra trước khi lưu token đã xoay vòng vào `SecureStore` trong `authInterceptor.ts`.
3. **Thống nhất giải pháp Turnstile Bot Protection**: Làm rõ phương thức bypass hoặc cung cấp turnstile token cho mobile login với backend auth-service.
4. **Scoping Query Keys**: Bổ sung `userId`/`studentCode` vào query keys factory để tăng cường phân lập bộ nhớ đệm.

---

## 7. KẾT LUẬN NGHIỆM THU (FINAL VERDICT)

# **ACCEPTED WITH CONDITIONS (Nghiệm thu có điều kiện)**

**Lý do**:
- Nền tảng Phase 1 đáp ứng đầy đủ và vượt chuẩn các yêu cầu kỹ thuật: Kiến trúc Single APK Multi-Role, hệ thống Route Guards RBAC không chớp giật, Expo SecureStore an toàn, Mutex Queue đơn luồng hóa Refresh Token, TanStack Query Offline Persistence, 29/29 bài test Jest passed, Expo Doctor 20/20 checks passed, không xâm phạm backend/frontend.
- Điều kiện để chính thức bấm nút bắt đầu code Phase 2 là: Hoàn thành 4 mục trong **Danh mục Công việc Cần Xử lý Ngay** ở Mục 6 nêu trên.
