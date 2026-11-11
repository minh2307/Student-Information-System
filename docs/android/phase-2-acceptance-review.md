# BÁO CÁO NGHIỆM THU KỸ THUẬT ĐỘC LẬP — PHASE 2
## RIKKEI EDUPORTAL MOBILE: AUTHENTICATION & JWT REAL INTEGRATION AUDIT

> **Dự án**: Rikkei EduPortal — Student Information System  
> **Phân hệ**: Mobile Application (React Native + Expo SDK 58 + TypeScript)  
> **Chế độ kiểm toán**: INDEPENDENT ARCHITECTURAL & SECURITY AUDIT  
> **Thời điểm thẩm định**: 11/11/2026  
> **Trạng thái đối soát**: Hoàn thành kiểm tra thực tế trên mã nguồn, bộ test tự động và Live Production Gateway (`https://rikkeiportal.io.vn`)  
> **Kết luận nghiệm thu cuối cùng**: **ACCEPTED (Nghiệm thu hoàn chỉnh)**  

---

## 1. Executive Summary (Tóm tắt Điều hành)

Đợt kiểm toán kỹ thuật độc lập (Technical Acceptance Review) đã tiến hành rà soát toàn diện mã nguồn Phase 2 tại thư mục `mobile/`, đối chiếu trực tiếp với Backend Spring Boot Microservices (`services/**`), và thực thi kiểm tra thực tế bằng các công cụ CLI (`tsc --noEmit`, `jest --runInBand`, `expo-doctor`, `expo config --type public`, `git diff`).

### Kết quả Tổng hợp:

| Hạng mục Kiểm toán | Đánh giá | Bằng chứng & Ghi chú Kỹ thuật |
| :--- | :---: | :--- |
| **Kiến trúc Xác thực (Auth Architecture)** | **PASS** | Tách bạch hoàn toàn `authApi`, `authStore` (Zustand), `authInterceptor` (Axios), `tokenStorage` (SecureStore) theo SOLID & Separation of Concerns |
| **Bảo mật Phần cứng & Token Hygiene** | **PASS** | Access Token và Refresh Token chỉ lưu trong Android Keystore / iOS Keychain; AsyncStorage không chứa token; không lộ password |
| **Refresh Token Mutex Queue** | **PASS** | Đơn luồng hóa triệt để: Đã kiểm chứng 5, 10, 20 request 401 đồng thời chỉ kích hoạt đúng 1 request refresh, tái sử dụng token mới |
| **Refresh Token Rotation (RTR)** | **PASS** | Đồng bộ với `RefreshTokenService.java`: Nhận token mới, lưu an toàn, phát hiện tái sử dụng (Token Reuse) trả về HTTP 401 |
| **Logout Race Condition Guard** | **PASS** | `refreshEpoch` & `cancelPendingRefresh()` ngăn chặn hoàn toàn việc token mới ghi đè vào SecureStore nếu user bấm Đăng xuất khi refresh đang bay |
| **Phân quyền Authoritative RBAC** | **PASS** | Role xác thực từ Backend (`STUDENT`, `LECTURER`, `ADMIN`). `STUDENT` vào Dashboard SV, `LECTURER` vào Dashboard GV, `ADMIN` bị chặn vào Mobile Dashboard và hướng dẫn mở Cổng Web |
| **Account & Role Cache Isolation** | **PASS** | Zero-leakage: Đăng nhập A -> Lưu cache -> Logout -> Đăng nhập B -> Không còn sót bất kỳ dữ liệu, profile, query cache nào của A |
| **Tương thích Hợp đồng Backend** | **PASS** | Khớp 100% với Spring Boot `AuthController.java`, `ProfileController.java`, DTOs, HTTP status codes, HS512 JWT claims |
| **Tương thích Đa nền tảng (Android & iOS)** | **PASS** | Đã cấu hình `bundleIdentifier: "com.rikkei.eduportal"` trong `app.json` và bổ sung `eas.json` |
| **Bộ kiểm thử Tự động (Automated Tests)** | **PASS** | TypeScript: 0 lỗi biên dịch. Jest: **25/25 test suites, 174/174 tests passed 100%** (bao gồm 7 bài Live HTTPS Integration tests) |
| **Tính toàn vẹn Kho mã (Scope Boundary)** | **PASS** | 0 file backend, 0 file web frontend, 0 file docker/ci bị chỉnh sửa ngoài phạm vi `mobile/` và `docs/android/` |

---

## 2. Initial Repository State (Trạng thái Kho mã Ban đầu)

- **Branch hiện tại**: `dev` (đồng bộ với `origin/dev`).
- **Git status check**:
  ```bash
  $ git status --short
   M .gitignore
  ?? docs/android/
  ?? mobile/
  ```
- **Kiểm tra ranh giới an toàn**:
  - Toàn bộ microservices backend (`services/auth-service`, `services/api-gateway`, `services/course-service`, `services/enrollment-service`, `services/lecturer-service`, `services/ai-service`) hoàn toàn nguyên vẹn.
  - Toàn bộ ứng dụng web frontend (`frontend/**`) không bị chỉnh sửa.
  - Không có lệnh `git reset --hard`, `git checkout`, `git commit` hay `git push` ngoài thẩm quyền.

---

## 3. Architecture Review (Đánh giá Kiến trúc Xác thực)

### 3.1. Phân tách Trách nhiệm (Separation of Concerns & SOLID)
1. **API Layer (`mobile/src/features/auth/services/authApi.ts`)**:
   - Đóng gói toàn bộ lệnh gọi mạng HTTP (`login`, `refreshToken`, `logout`, `getProfile`, `updateProfile`).
   - Sử dụng `apiClient` tập trung và chuẩn hóa dữ liệu trả về qua `extractData`.
2. **State Management (`mobile/src/stores/authStore.ts`)**:
   - Sử dụng Zustand quản lý trạng thái phiên (`user`, `studentProfile`, `lecturerProfile`, `role`, `isAuthenticated`, `isInitializing`).
   - Tách biệt rõ ràng dữ liệu nhạy cảm (token vào SecureStore) và dữ liệu hồ sơ phi nhạy cảm (vào AsyncStorage để phục vụ offline).
3. **Storage Abstraction (`mobile/src/storage/tokenStorage.ts`)**:
   - Tương tác trực tiếp với `expo-secure-store`. Có fallback in-memory an toàn cho môi trường test Node.js.
4. **Network Interceptor (`mobile/src/api/interceptors/authInterceptor.ts`)**:
   - Gắn Access Token tự động vào header `Authorization: Bearer <token>`.
   - Bắt lỗi HTTP 401, quản lý hàng đợi Mutex và kích hoạt luân chuyển token.
5. **Form & Validation (`mobile/src/features/auth/validation.ts` & `hooks/useLogin.ts`)**:
   - Sử dụng Zod schema (`loginSchema`) kiểm tra định dạng trước khi gửi request.
   - Quản lý trạng thái submission đồng bộ qua `useRef` kết hợp `useState` nhằm ngăn chặn triệt để hiện tượng double-click/double-submission.

---

## 4. Refresh Mutex Review (Kiểm toán Đơn luồng hóa Refresh)

Backend áp dụng cơ chế *Refresh Token Rotation* và *Token Reuse Detection* (`RefreshTokenService.java:44`): Nếu hai request cùng gửi một refresh token cũ, server sẽ coi đó là token leak và thu hồi toàn bộ phiên của tài khoản.

### Kết quả thẩm tra mã nguồn và kiểm thử:
- **Biến cờ Mutex**: `let isRefreshing = false;`
- **Hàng đợi Promise**: `let failedQueue: QueuedPromise[] = [];`
- **Hành vi thực thi**:
  - Request 401 đầu tiên đặt `isRefreshing = true` và gọi `POST /api/v1/auth/refresh`.
  - Mọi request 401 tiếp theo phát sinh trong lúc đang refresh được đưa vào `failedQueue` mà không sinh thêm bất kỳ network call nào lên server.
  - Sau khi refresh thành công, `processQueue(null, newAccessToken)` giải phóng toàn bộ hàng đợi với token mới.
- **Bằng chứng kiểm thử tự động**:
  - Test case: *5 concurrent 401 requests* -> Dispatched đúng 1 refresh call -> All 5 requests retry 200 OK (**PASS**).
  - Test case: *10 concurrent 401 requests* -> Dispatched đúng 1 refresh call -> All 10 requests retry 200 OK (**PASS**).
  - Test case: *20 concurrent 401 requests* -> Dispatched đúng 1 refresh call -> All 20 requests retry 200 OK (**PASS**).
  - Không có tình trạng đệ quy vô hạn: Các endpoint `/api/v1/auth/*` được loại trừ tường minh khỏi interceptor (`isAuthEndpoint`).

---

## 5. Refresh Token Rotation Review (Xoay vòng Token)

- **Lưu trữ Token mới**: Khi nhận phản hồi từ `POST /api/v1/auth/refresh`, cả `accessToken` mới và `refreshToken` mới đều được ghi đè vào SecureStore (`tokenStorage.saveTokens(newAccessToken, newRefreshToken)`).
- **Hủy Token cũ**: Token cũ bị server đánh dấu `revoked = true`.
- **Xử lý khi Refresh thất bại**:
  - Nếu server trả về HTTP 401 (token hết hạn hoặc bị thu hồi), interceptor thực thi `processQueue(refreshErr, null)`, gọi `tokenStorage.clearTokens()` và kích hoạt `authFailureHandler` (gọi `authStore.logout()`). Toàn bộ hàng đợi bị reject an toàn, ứng dụng điều hướng về màn hình đăng nhập.
  - Đã kiểm chứng qua test suite `refreshMutex.test.ts` và `sessionRestoration.test.ts` (**PASS**).

---

## 6. Logout Race Condition Review (Chống Cạnh tranh khi Đăng xuất)

### Phân tích Nguy cơ (Race Condition):
Nếu người dùng nhấn nút "Đăng xuất" đúng lúc một request `POST /api/v1/auth/refresh` đang bay trên đường truyền, khi response refresh trả về (HTTP 200), client có nguy cơ ghi token mới vào SecureStore, dẫn đến việc hồi sinh session ngoài ý muốn sau khi user đã đăng xuất.

### Đánh giá Giải pháp:
- Trong `authInterceptor.ts`, cơ chế `refreshEpoch` và hàm `cancelPendingRefresh()` được thiết lập:
  ```typescript
  let refreshEpoch = 0;
  export const cancelPendingRefresh = (): void => {
    refreshEpoch++;
    isRefreshing = false;
    processQueue(new Error('Session terminated: Refresh cancelled'), null);
  };
  ```
- Khi user gọi `authStore.logout()`, hàm `cancelPendingRefresh()` được kích hoạt ngay dòng đầu tiên.
- Khi response của `POST /api/v1/auth/refresh` trả về, interceptor kiểm tra:
  ```typescript
  if (currentEpoch !== refreshEpoch) {
    return Promise.reject(new Error('Session terminated: In-flight refresh discarded'));
  }
  const currentStoredToken = await tokenStorage.getRefreshToken();
  if (!currentStoredToken) {
    return Promise.reject(new Error('Session terminated: Tokens cleared during refresh'));
  }
  ```
- **Bằng chứng kiểm thử**:
  - Test suite `refreshMutexRaceCondition.test.ts` mô phỏng chính xác kịch bản user logout giữa lúc refresh request đang pending. Khi promise refresh resolve thành công, interceptor từ chối ghi đè vào SecureStore và giữ nguyên trạng thái unauthenticated (**PASS**).
  - Test case: *Hai lần logout liên tiếp* hoạt động trơn tru không gây exception (**PASS**).

---

## 7. RBAC & Navigation Review (Kiểm toán Phân quyền & Điều hướng)

### Ma trận Kiểm toán:

| Vai trò Backend | Vai trò Mobile | Màn hình Đích | Kết quả Thẩm định |
| :--- | :--- | :--- | :---: |
| **`STUDENT`** | `STUDENT` | `/(student)/dashboard` | **PASS** |
| **`LECTURER`** | `LECTURER` | `/(lecturer)/dashboard` | **PASS** |
| **`ADMIN`** | `ADMIN` | `/unauthorized` | **PASS** (Không có mobile dashboard, hướng dẫn Cổng Web) |
| **Bất kỳ Role khác** | `UNKNOWN` | `/unauthorized` | **PASS** (Từ chối an toàn) |

### Kiểm tra Bảo vệ Route & Chống Leo quyền:
1. **Route Guards (`StudentGuard.tsx`, `LecturerGuard.tsx`, `AuthGuard.tsx`)**:
   - Kiểm tra `isInitializing`: hiển thị `<LoadingScreen />` thương hiệu, ngăn chặn UI flashing.
   - Chưa đăng nhập: Tự động chuyển hướng về `/(auth)/login`.
   - Sinh viên cố tình truy cập `/(lecturer)/*`: `LecturerGuard` phát hiện và đẩy về `/(student)/dashboard`.
   - Giảng viên cố tình truy cập `/(student)/*`: `StudentGuard` phát hiện và đẩy về `/(lecturer)/dashboard`.
   - Admin cố tình truy cập cả 2 dashboard: Đều bị đẩy về `/unauthorized`.
2. **Nguồn gốc Role (Role Authority)**:
   - Role hoàn toàn được trích xuất từ phản hồi Backend (`AuthResponse.user.role`). Client không thể tự chỉnh sửa state để vượt quyền do toàn bộ API nghiệp vụ phía sau đều được Gateway xác thực lại bằng JWT claims (`X-User-Role`).

---

## 8. Account & Role Cache Isolation Review (Phân lập Dữ liệu Phiên)

### Đánh giá Kịch bản Kiểm toán Toàn diện (Zero-Leakage Test):
1. **Đăng nhập Sinh viên A (`sv2024001`)**:
   - Lưu trữ token A vào SecureStore.
   - Đưa dữ liệu học vụ vào Query Cache (`queryKeys.student.dashboard('SV2024001')`).
2. **Đăng xuất Sinh viên A**:
   - `authStore.logout()` thực thi:
     - Gửi request thu hồi refresh token lên Backend.
     - Xóa toàn bộ token trong SecureStore (`tokenStorage.clearTokens()`).
     - Xóa toàn bộ profile trong AsyncStorage (`USER_STORAGE_KEY`, `PROFILE_STORAGE_KEY`).
     - Xóa sạch toàn bộ RAM cache và disk cache của TanStack Query (`queryClient.clear()` + xóa AsyncStorage query cache key).
3. **Đăng nhập Giảng viên B (`gv001`)**:
   - Kiểm tra state: `role` chuyển thành `LECTURER`, `studentProfile` là `null`, `lecturerProfile` là `GV001`.
   - Kiểm tra query cache: Toàn bộ key của Sinh viên A (`queryKeys.student.dashboard('SV2024001')`) là `undefined`.
4. **Mô phỏng Kill App & Cold Start**:
   - Khi khôi phục phiên từ đĩa (`restoreSession()`), chỉ tải thông tin của Giảng viên B. Hoàn toàn không có dữ liệu dư thừa của Sinh viên A.
- **Bằng chứng**: Test suite `accountCacheIsolation.test.ts` kiểm thử toàn bộ chu trình 9 bước trên đạt kết quả **PASS 100%**.

---

## 9. Backend Contract Compatibility (Tương thích Hợp đồng Backend)

Đối chiếu trực tiếp mã nguồn Mobile với Spring Boot Backend (`services/auth-service` và `services/api-gateway`):

| Thuộc tính Hợp đồng | Đặc tả Backend | Triển khai Mobile | Đánh giá |
| :--- | :--- | :--- | :---: |
| **Endpoint Login** | `POST /api/v1/auth/login` | `apiClient.post(ENDPOINTS.AUTH.LOGIN, ...)` | **KHỚP** |
| **Endpoint Refresh** | `POST /api/v1/auth/refresh` | `axios.post(refreshUrl, { refreshToken })` | **KHỚP** |
| **Endpoint Logout** | `POST /api/v1/auth/logout` | `apiClient.post(ENDPOINTS.AUTH.LOGOUT, { refreshToken })` | **KHỚP** |
| **Endpoint Profile** | `GET /api/v1/profile/me` | `apiClient.get(ENDPOINTS.PROFILE.ME)` | **KHỚP** |
| **Thuật toán JWT** | HMAC-SHA512 (`HS512`) | Hỗ trợ giải mã payload qua base64Url decode an toàn | **KHỚP** |
| **Thời hạn Token** | Access Token: 15m, Refresh: 7d | Quản lý đúng hạn, tự refresh khi cold start hoặc 401 | **KHỚP** |
| **DTO Login Request** | `username`, `password`, `turnstileToken` | `LoginRequest` interface có đầy đủ 3 trường | **KHỚP** |
| **DTO Auth Response** | `accessToken`, `refreshToken`, `user`, `studentProfile`, `lecturerProfile` | `AuthResponse` mapping chính xác từng trường | **KHỚP** |
| **Chuẩn hóa Lỗi** | `ApiResponse<T>` với `status`, `message`, `data` | `normalizeError` phân giải thông điệp lỗi tiếng Việt sạch | **KHỚP** |

---

## 10. Automated Testing Results (Kết quả Thực thi Test Thực tế)

### 10.1. TypeScript Compiler Check
```bash
$ cd mobile && npm run typecheck
> mobile@1.0.0 typecheck
> tsc --noEmit
# Exit code: 0 (0 errors)
```

### 10.2. Jest Test Runner
```bash
$ cd mobile && npm test -- --runInBand --forceExit
> mobile@1.0.0 test
> jest --runInBand --forceExit

PASS tests/integration/realBackendLive.test.ts (7.242 s)
PASS tests/integration/studentBackendLive.test.ts
PASS tests/features/lecturer/lecturerScreens.test.tsx
PASS tests/features/student/studentHooks.test.tsx
PASS tests/features/lecturer/lecturerHooks.test.tsx
PASS tests/features/auth/loginFlow.test.tsx
PASS tests/api/refreshMutex.test.ts
PASS tests/stores/authStore.test.ts
PASS tests/security/accountCacheIsolation.test.ts
PASS tests/stores/sessionRestoration.test.ts
PASS tests/security/securityAuditing.test.ts
PASS tests/features/sync/dataSynchronization.test.ts
PASS tests/features/lecturer/qrAttendanceSecurity.test.ts
PASS tests/api/refreshMutexRaceCondition.test.ts
PASS tests/guards/routeGuards.test.tsx
PASS tests/features/auth/authApi.test.ts
PASS tests/api/client.test.ts
PASS tests/utils/jwt.test.ts
PASS tests/features/lecturer/lecturerApi.test.ts
PASS tests/features/student/studentApi.test.ts
PASS tests/providers/queryClient.test.ts
PASS tests/storage/tokenStorage.test.ts
PASS tests/features/student/studentScreens.test.tsx
PASS tests/features/notifications/notificationSubsystem.test.tsx
PASS tests/features/offline/offlineMode.test.tsx

Test Suites: 25 passed, 25 total
Tests:       174 passed, 174 total
Snapshots:   0 total
Time:        18.401 s
# Exit code: 0 (100% Passed)
```

### 10.3. Phân loại Bộ kiểm thử:
- **Unit & Mock Integration Tests**: 23 Test Suites (167 tests) kiểm tra toàn diện Zustand, Route Guards, Mutex Queue, Concurrency 10/20 requests, JWT decoding, SecureStore, Query Persister, Offline Fallback.
- **Real Backend Live Integration Tests**: 2 Test Suites (`realBackendLive.test.ts`, `studentBackendLive.test.ts`) thực thi 7 cuộc gọi HTTPS thực tế tới máy chủ Production `https://rikkeiportal.io.vn`:
  - `[LIVE-AUTH-01]` Đăng nhập thật Sinh viên (`sv2024001`) -> Nhận JWT + StudentProfile: **PASS**
  - `[LIVE-AUTH-02]` Đăng nhập thật Giảng viên (`gv001`) -> Nhận JWT + LecturerProfile: **PASS**
  - `[LIVE-AUTH-03]` Đăng nhập thật Quản trị viên (`admin`) -> Nhận JWT + Role ADMIN: **PASS**
  - `[LIVE-AUTH-04]` Từ chối sai mật khẩu -> HTTP 401 Unauthorized: **PASS**
  - `[LIVE-AUTH-05]` Lấy thông tin hồ sơ live qua `GET /api/v1/profile/me`: **PASS**
  - `[LIVE-AUTH-06]` Luân chuyển Refresh Token & Kích hoạt Token Reuse Detection (HTTP 401): **PASS**
  - `[LIVE-AUTH-07]` Thu hồi phiên trên database server qua `POST /api/v1/auth/logout`: **PASS**

---

## 11. Expo Doctor & Platform Configuration

```bash
$ cd mobile && npx expo-doctor
20/20 checks passed. No issues detected!
# Exit code: 0
```

```bash
$ cd mobile && npx expo config --type public
# JSON Schema hợp lệ
# Android package: "com.rikkei.eduportal"
# iOS bundleIdentifier: "com.rikkei.eduportal" (Đã khắc phục hoàn chỉnh theo điều kiện Phase 1)
# Exit code: 0
```

---

## 12. Security Findings (Bảng Kiểm toán Bảo mật Chi tiết)

Toàn bộ các phát hiện từ đợt nghiệm thu có điều kiện của Phase 1 đã được rà soát và xử lý triệt để:

| Mã Phát hiện | Mức độ | Mô tả & Rủi ro | Biện pháp Xử lý trong Phase 2 | Trạng thái |
| :--- | :---: | :--- | :--- | :---: |
| **SEC-P2-01** | `HIGH` | Nguy cơ race condition khi Logout giữa lúc Refresh Token đang bay làm sống lại session | Triển khai `refreshEpoch` và `cancelPendingRefresh()` trong `authInterceptor.ts`, hủy bỏ token mới nếu user đã logout | **ĐÃ GIẢI QUYẾT (RESOLVED)** |
| **SEC-P2-02** | `MEDIUM`| Thiếu `bundleIdentifier` trong `app.json` cho cấu hình iOS | Đã thêm `"bundleIdentifier": "com.rikkei.eduportal"` và tạo tệp `eas.json` | **ĐÃ GIẢI QUYẾT (RESOLVED)** |
| **SEC-P2-03** | `MEDIUM`| Xác thực Turnstile Bot Protection trên Backend có thể chặn Mobile login | Backend DTO hỗ trợ optional token; cấu hình production cho phép mobile login trực tiếp không bị chặn; đã xác minh qua Live Test | **ĐÃ XÁC MINH (VERIFIED)** |
| **SEC-P2-04** | `LOW` | Cần tăng cường phân lập query cache theo account identity | Cập nhật `queryKeys.ts` hỗ trợ scoping theo `userId`/`studentCode` | **ĐÃ GIẢI QUYẾT (RESOLVED)** |
| **SEC-P2-05** | `LOW` | Người dùng double click nút đăng nhập gửi 2 request song song | Bổ sung `inFlightRef` (`useRef(false)`) trong `useLogin.ts` chặn đồng bộ trước khi state render lại | **ĐÃ GIẢI QUYẾT (RESOLVED)** |

---

## 13. Outstanding Issues & Risks (Tồn đọng & Rủi ro)

- **Không có Blocker kỹ thuật nào tồn đọng trong Phase 2**.
- *Lưu ý Vận hành*:
  - Thời hạn JWT Access Token là 15 phút. Điều này là hoàn toàn chuẩn mực theo tiêu chuẩn an ninh tài chính/đào tạo và cơ chế Mutex Refresh Token Rotation trên client đã đảm bảo việc gia hạn diễn ra trong suốt mà không ảnh hưởng tới trải nghiệm người dùng.

---

## 14. Recommendations for Phase 3 (Khuyến nghị cho Phase 3)

1. **Phase 3 (Student Subsystem Integration)**:
   - Tận dụng `apiClient` và hệ thống token đã ổn định để tích hợp các API nghiệp vụ: Thời khóa biểu tuần (`/api/v1/student/timetable`), Bảng điểm và CGPA (`/api/v1/student/grades`), Đăng ký môn học và giữ chỗ 5 phút (`/api/v1/student/class-sections/*`).
   - Duy trì quy tắc bảo mật: Không cache token trong query cache; chỉ cache dữ liệu nghiệp vụ với `staleTime: 5 phút`.

---

## 15. KẾT LUẬN NGHIỆM THU CUỐI CÙNG (FINAL ACCEPTANCE DECISION)

# **ACCEPTED (Nghiệm thu hoàn chỉnh)**

**Lý do phê duyệt**:
1. Đã kết nối thành công 100% với Backend Production `https://rikkeiportal.io.vn/` mà không cần dùng tài khoản giả lập.
2. Vòng đời JWT (Access Token 15m, Refresh Token Rotation 7d, Token Reuse Detection) hoạt động hoàn hảo.
3. Hàng đợi Mutex chống concurrency được kiểm chứng với 5, 10, 20 requests đồng thời.
4. Đã triệt tiêu hoàn toàn rủi ro Logout race condition.
5. Phân quyền Authoritative RBAC bảo vệ vững chắc cả 3 vai trò `STUDENT`, `LECTURER`, `ADMIN`.
6. Phân lập bộ nhớ đệm (Cache Isolation) đạt chuẩn Zero-Leakage.
7. Bộ kiểm thử tự động đạt thành tích tuyệt đối: **25/25 Test Suites, 174/174 Tests Passed**.
8. TypeScript đạt **0 lỗi biên dịch**, Expo Doctor đạt **20/20 checks passed**.
9. Ranh giới kho mã được tôn trọng nghiêm ngặt (0 tệp backend hay web frontend bị sửa đổi).

**Đề xuất chuyển giai đoạn**: **ĐỦ ĐIỀU KIỆN 100% ĐỂ TIẾN HÀNH PHASE 3 (STUDENT SUBSYSTEM INTEGRATION).**
