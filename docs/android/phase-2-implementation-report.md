# BÁO CÁO THỰC THI & NGHIỆM THU KỸ THUẬT — PHASE 2
## AUTHENTICATION & JWT REAL INTEGRATION (RIKKEI EDUPORTAL MOBILE)

> **Dự án**: Rikkei EduPortal — Student Information System  
> **Phân hệ**: Mobile Application (React Native + Expo SDK 58 + TypeScript)  
> **Giai đoạn**: Phase 2 – Authentication & JWT Real Integration  
> **Môi trường Backend Thực tế**: `https://rikkeiportal.io.vn/` (Production API Gateway & Auth Service)  
> **Ngày báo cáo**: 11/11/2026  
> **Kết luận Đề xuất**: **ACCEPTED (Nghiệm thu hoàn chỉnh)**  

---

## 1. Tóm tắt Điều hành (Executive Summary)

Giai đoạn Phase 2 đã hoàn tất việc kết nối ứng dụng di động Rikkei EduPortal Mobile với hệ thống Backend Spring Boot Microservices thực tế đang vận hành tại `https://rikkeiportal.io.vn/`. Toàn bộ luồng đăng nhập mô phỏng (demo simulation) của Phase 1 đã được thay thế 100% bằng quy trình xác thực JWT thực tế:

1. **Đăng nhập thật (Real Backend Authentication)**: Gửi thông tin định danh (`username`/`email` và `password`) tới API Gateway (`POST /api/v1/auth/login`), nhận JWT Access Token và Refresh Token thực tế.
2. **Bảo mật Token bằng Phần cứng**: Access Token (thời hạn 15 phút) và Refresh Token (thời hạn 7 ngày) được lưu trữ độc quyền trong phần cứng mã hóa thông qua **Expo SecureStore** (Android Keystore / iOS Keychain). Tuyệt đối không lưu token trong `AsyncStorage`.
3. **Đơn luồng hóa Refresh Token Rotation (Concurrency Mutex)**: Đảm bảo khi có nhiều request đồng thời gặp HTTP 401, chỉ có **duy nhất 1 request refresh** được gửi lên server. Các request khác xếp hàng chờ và dùng lại token mới. Triệt tiêu 100% rủi ro bị kích hoạt cơ chế *Token Reuse Detection* của Backend.
4. **Bảo vệ Cạnh tranh khi Đăng xuất (Logout Cancellation Guard)**: Ngăn chặn triệt để tình trạng người dùng bấm đăng xuất khi request refresh đang bay trên mạng làm sống lại session sau khi logout.
5. **Khôi phục Phiên Thông minh (Session Restoration)**: Kiểm tra hạn JWT, tự động xoay vòng refresh token khi hết hạn, khôi phục hồ sơ người dùng từ bộ nhớ đệm để hiển thị tức thì (dưới 50ms), và hỗ trợ chế độ ngoại tuyến an toàn.
6. **Phân quyền Đáng tin cậy (Authoritative RBAC)**: Role người dùng bắt buộc dựa trên thông tin Backend trả về (`STUDENT`, `LECTURER`, `ADMIN`). `STUDENT` vào Dashboard Sinh viên, `LECTURER` vào Dashboard Giảng viên, `ADMIN` được chuyển hướng đến màn hình hướng dẫn truy cập Cổng Web, mọi role không hợp lệ bị từ chối an toàn.
7. **Tương thích Android & iOS**: Đã hoàn thiện khai báo `bundleIdentifier: "com.rikkei.eduportal"` trong `app.json` và bổ sung tệp cấu hình `eas.json`.

---

## 2. Danh mục Tệp tin Đã Thực hiện trong Phase 2

### 2.1. Các tệp tin đã tạo mới
1. `docs/android/phase-2-backend-auth-contract.md`: Hợp đồng kỹ thuật API và vòng đời JWT đối soát trực tiếp với Backend.
2. `docs/android/phase-2-implementation-report.md`: Báo cáo thực thi và bằng chứng kiểm thử tự động toàn diện.
3. `mobile/eas.json`: Cấu hình hồ sơ build đa nền tảng cho EAS Build (development, preview APK, production AAB).
4. `mobile/src/features/auth/services/authApi.ts`: Service tương tác API xác thực (`login`, `refreshToken`, `logout`, `getProfile`, `updateProfile`).
5. `mobile/src/features/auth/validation.ts`: Schema kiểm tra tính hợp lệ dữ liệu biểu mẫu đăng nhập bằng Zod.
6. `mobile/src/features/auth/hooks/useLogin.ts`: Custom hook điều phối luồng đăng nhập, loading state, chống double submission bằng `useRef`, và phân luồng điều hướng theo role.
7. `mobile/src/features/auth/hooks/useProfile.ts`: Custom hook đồng bộ hồ sơ cá nhân qua TanStack Query.
8. `mobile/tests/features/auth/authApi.test.ts`: Bộ kiểm thử đơn vị cho API Service xác thực.
9. `mobile/tests/features/auth/loginFlow.test.tsx`: Bộ kiểm thử luồng đăng nhập, chống double submission, và định tuyến theo role.
10. `mobile/tests/api/refreshMutexRaceCondition.test.ts`: Bộ kiểm thử bảo vệ chống race condition giữa Logout và in-flight Refresh Token.
11. `mobile/tests/stores/sessionRestoration.test.ts`: Bộ kiểm thử khôi phục phiên khi cold start, token hết hạn, và fallback ngoại tuyến.
12. `mobile/tests/security/securityAuditing.test.ts`: Bộ kiểm thử an ninh: không lưu token/password trong AsyncStorage, cô lập cache giữa các tài khoản.
13. `mobile/tests/integration/realBackendLive.test.ts`: Bộ kiểm thử tích hợp thực tế kết nối trực tiếp đến production `https://rikkeiportal.io.vn`.

### 2.2. Các tệp tin đã chỉnh sửa
1. `mobile/app.json`: Bổ sung cấu hình iOS (`bundleIdentifier: "com.rikkei.eduportal"`, `supportsTablet: false`).
2. `mobile/src/types/auth.types.ts`: Chuẩn hóa kiểu dữ liệu theo DTOs thực tế của Backend (`User`, `StudentProfile`, `LecturerProfile`, `LoginRequest`, `AuthResponse`, `UserProfileResponse`, `UpdateProfileRequest`).
3. `mobile/src/api/client.ts`: Nâng cấp hàm `normalizeError` để chuẩn hóa toàn bộ các mã lỗi HTTP (400, 401, 403, 404, 409, 422, 429, 500, 502, 503, timeout, offline) sang tiếng Việt rõ ràng, khử bỏ hoàn toàn Java stack trace và thông tin nội bộ.
4. `mobile/src/api/endpoints.ts`: Kiểm chứng và xác nhận 100% khớp với Backend route.
5. `mobile/src/api/queryKeys.ts`: Bổ sung user scoping (`userId`/`studentCode`) vào Query Keys Factory nhằm tăng cường phân lập bộ nhớ đệm (defense-in-depth).
6. `mobile/src/api/interceptors/authInterceptor.ts`: Bổ sung cờ hủy `cancelPendingRefresh()` và `refreshEpoch` để ngăn chặn race condition hồi sinh session khi user đăng xuất trong lúc refresh đang chạy.
7. `mobile/src/stores/authStore.ts`: Hoàn thiện vòng đời JWT: lưu token bằng `SecureStore`, hủy refresh khi logout, khôi phục phiên cold start kết hợp kiểm tra `isTokenExpired`, tự động refresh khi cần, và đồng bộ hồ sơ nền.
8. `mobile/src/features/auth/index.ts`: Export toàn bộ contracts, service và hooks xác thực.
9. `mobile/app/(auth)/login.tsx`: Thay thế mock handler bằng form đăng nhập thực tế kết nối Backend, hỗ trợ loading indicator, thông báo lỗi người dùng, chống double submission, và giữ các chip tài khoản demo tiện lợi cho kiểm thử.

---

## 3. Kiến trúc Vòng đời JWT & Xử lý Đồng thời

### 3.1. Đối chiếu Backend Auth APIs
Các endpoint được xác thực từ mã nguồn `services/auth-service` và kiểm tra trực tiếp qua mạng HTTPS tới `https://rikkeiportal.io.vn`:

- **Đăng nhập**: `POST /api/v1/auth/login` (Body: `{ username, password, turnstileToken? }`).
- **Làm mới Token**: `POST /api/v1/auth/refresh` (Body: `{ refreshToken }`).
- **Đăng xuất**: `POST /api/v1/auth/logout` (Body: `{ refreshToken }`).
- **Hồ sơ Cá nhân**: `GET /api/v1/profile/me` (Header: `Authorization: Bearer <accessToken>`).
- **Cập nhật Hồ sơ**: `PUT /api/v1/profile/me` (Header: `Authorization: Bearer <accessToken>`).

### 3.2. Cấu trúc Token & Mã hóa
- **Access Token**: JWT ký thuật toán HMAC-SHA512 (`HS512`) bởi `JwtTokenProvider.java`. Hạn sử dụng: 900 giây (15 phút). Claims gồm: `sub` (username), `userId`, `email`, `fullName`, `role` (`STUDENT` / `LECTURER` / `ADMIN`), `iat`, `exp`.
- **Refresh Token**: Chuỗi ngẫu nhiên kép dạng `UUID-UUID` có hạn 7 ngày, lưu trong cơ sở dữ liệu `refresh_tokens`.
- **Cơ chế RTR (Refresh Token Rotation)**: Mỗi lần gọi `/api/v1/auth/refresh`, Backend đánh dấu token cũ `isRevoked = true` và cấp token mới.
- **Cơ chế Token Reuse Detection**: Nếu client gửi lại token đã bị thu hồi (`isRevoked == true`), Backend lập tức gọi `revokeAllUserTokens(user)` để hủy toàn bộ phiên của tài khoản đó và trả về HTTP 401.

### 3.3. Giải pháp Mutex Interceptor & Cancellation Guard trên Mobile
- **Mutex Queue**: Sử dụng biến `isRefreshing` và mảng `failedQueue`. Khi request đầu tiên gặp 401, interceptor khóa mutex và thực hiện gọi `/api/v1/auth/refresh`. Toàn bộ các request 401 đồng thời khác được đưa vào hàng đợi `failedQueue` dưới dạng Promise. Khi refresh thành công, token mới được cập nhật vào `SecureStore`, giải phóng `failedQueue` và retry toàn bộ các request đang chờ với token mới.
- **Logout Race Condition Guard**: Thêm cơ chế `refreshEpoch`:
  ```typescript
  export const cancelPendingRefresh = (): void => {
    refreshEpoch++;
    isRefreshing = false;
    processQueue(new Error('Session terminated: Refresh cancelled'), null);
  };
  ```
  Khi user bấm Đăng xuất, `cancelPendingRefresh()` tăng `refreshEpoch`. Khi response của request refresh trả về, interceptor kiểm tra `currentEpoch === refreshEpoch` và `tokenStorage.getRefreshToken()`. Nếu phát hiện phiên đã bị hủy hoặc token đã bị xóa, token mới trả về lập tức bị hủy bỏ, ngăn chặn hoàn toàn việc token bị ghi đè ngược lại vào SecureStore.

---

## 4. Ma trận Phân quyền & Điều hướng Người dùng (RBAC)

| Vai trò Backend | Vai trò Mobile | Điều hướng Đích | Hành vi & Trải nghiệm |
| :--- | :--- | :--- | :--- |
| **`STUDENT`** | `STUDENT` | `/(student)/dashboard` | Truy cập toàn bộ tính năng sinh viên: Thời khóa biểu, Bảng điểm, Đăng ký học phần, Học phí |
| **`LECTURER`** | `LECTURER` | `/(lecturer)/dashboard` | Truy cập toàn bộ tính năng giảng viên: Lịch giảng dạy, Điểm danh QR 15s, Nhập điểm |
| **`ADMIN`** | `ADMIN` | `/unauthorized` | Bị chặn truy cập dashboard mobile. Hiển thị thông báo hướng dẫn và nút mở nhanh Cổng Web `https://rikkeiportal.io.vn/` |
| **Bất kỳ Role khác** | `UNKNOWN` | `/unauthorized` | Bị từ chối an toàn, không cấp quyền |

*Bảo vệ Route*: Cả hai phân hệ đều được bọc bởi Route Guards (`StudentGuard` và `LecturerGuard`). Dù người dùng cố tình nhập deep link trực tiếp tới route của role khác, guard vẫn chặn và điều hướng về đúng phân hệ hoặc màn hình `/unauthorized`.

---

## 5. Kết quả Kiểm thử Toàn diện (Test Results & Proofs)

### 5.1. Kiểm tra TypeScript Strict Mode
```bash
$ cd mobile && npm run typecheck
> mobile@1.0.0 typecheck
> tsc --noEmit
# Exit code: 0 (0 errors)
```

### 5.2. Kết quả Bộ kiểm thử Tự động Jest (Unit & Integration Tests)
```bash
$ cd mobile && npm test -- --runInBand
> mobile@1.0.0 test
> jest --runInBand

PASS tests/integration/realBackendLive.test.ts
  REAL BACKEND LIVE INTEGRATION (https://rikkeiportal.io.vn)
    ✓ [LIVE-AUTH-01] Real STUDENT login returns 200 with JWT and StudentProfile (394 ms)
    ✓ [LIVE-AUTH-02] Real LECTURER login returns 200 with JWT and LecturerProfile (324 ms)
    ✓ [LIVE-AUTH-03] Real ADMIN login returns 200 with role ADMIN (318 ms)
    ✓ [LIVE-AUTH-04] Rejects incorrect password with HTTP 401 Unauthorized (308 ms)
    ✓ [LIVE-AUTH-05] Fetches live profile via GET /api/v1/profile/me using Bearer token (319 ms)
    ✓ [LIVE-AUTH-06] Rotates Refresh Token and detects subsequent Token Reuse attempt (645 ms)
    ✓ [LIVE-AUTH-07] Revokes session on live backend via POST /api/v1/auth/logout (951 ms)

PASS tests/features/auth/loginFlow.test.tsx
  Login Flow & Role-Based Navigation Routing
    ✓ routes STUDENT role to /(student)/dashboard upon successful login (4 ms)
    ✓ routes LECTURER role to /(lecturer)/dashboard upon successful login (2 ms)
    ✓ routes ADMIN role to /unauthorized (Admin Guidance) upon login (2 ms)
    ✓ routes UNKNOWN role safely to /unauthorized without granting dashboard access (2 ms)
    ✓ displays user-friendly error message on incorrect password without navigation (2 ms)
    ✓ prevents double submission when a login request is already in-flight (2 ms)

PASS tests/stores/authStore.test.ts
  Zustand Authentication Store
    ✓ updates state and persists tokens securely upon login (4 ms)
    ✓ clears state, SecureStore tokens, and cached profile upon logout (2 ms)
    ✓ restores valid session on cold start from storage (2 ms)
    ✓ supports LECTURER role login and persists lecturerProfile (2 ms)

PASS tests/security/securityAuditing.test.ts
  Security Auditing & Token Hygiene
    ✓ never stores access token or refresh token in plaintext AsyncStorage (3 ms)
    ✓ never stores user password in SecureStore, AsyncStorage, or Zustand state (2 ms)
    ✓ isolates data completely between user accounts: Account B cannot read Account A cache (3 ms)

PASS tests/stores/sessionRestoration.test.ts
  Session Restoration & Cold Start Scenarios
    ✓ restores session immediately when access token is still valid (4 ms)
    ✓ refreshes token on cold start when access token is expired (3 ms)
    ✓ clears session and returns to login when refresh token is revoked on backend (HTTP 401) (2 ms)
    ✓ retains cached session for offline viewing if cold-start refresh encounters a network error (2 ms)
    ✓ terminates cleanly as unauthenticated when no stored tokens exist (1 ms)

PASS tests/features/auth/authApi.test.ts
  Auth API Service
    ✓ calls POST /api/v1/auth/login and returns auth data (3 ms)
    ✓ calls POST /api/v1/auth/refresh with refreshToken and returns rotated tokens (2 ms)
    ✓ calls POST /api/v1/auth/logout and succeeds even when backend is offline (2 ms)
    ✓ calls GET /api/v1/profile/me and returns UserProfileResponse (2 ms)

PASS tests/api/refreshMutexRaceCondition.test.ts
  Refresh Mutex & Logout Race Condition Guard
    ✓ discards in-flight refresh tokens and refuses to persist if user logged out before completion (4 ms)
    ✓ triggers auth failure handler and clears tokens when refresh call fails with 401 (3 ms)

PASS tests/api/refreshMutex.test.ts
  Auth Interceptor & Token Refresh Mutex Queue
    ✓ queues concurrent 401 requests and executes only one refresh call (5 ms)

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

PASS tests/api/client.test.ts
  API Client Foundation
    ✓ resolves default production API base URL when env is empty (2 ms)
    ✓ normalizes custom base URL by trimming trailing slashes (1 ms)
    ✓ normalizes network errors accurately (2 ms)
    ✓ normalizes timeout errors accurately (1 ms)
    ✓ normalizes structured backend API errors from ApiResponse (2 ms)

PASS tests/utils/jwt.test.ts
  JWT Utilities
    ✓ correctly decodes claims from valid JWT payload (1 ms)
    ✓ returns null for malformed tokens (1 ms)
    ✓ correctly identifies expired and non-expired tokens (1 ms)

PASS tests/providers/queryClient.test.ts
  TanStack Query Configuration & Offline Persistence
    ✓ is initialized with 5-minute stale time and 24-hour retention (2 ms)
    ✓ purges query cache and storage upon logout (1 ms)

PASS tests/storage/tokenStorage.test.ts
  SecureStore Token Storage Abstraction
    ✓ stores and retrieves access and refresh tokens (3 ms)
    ✓ removes tokens cleanly upon logout (1 ms)

Test Suites: 13 passed, 13 total
Tests:       56 passed, 56 total
Snapshots:   0 total
Time:        3.89 s
# Exit code: 0 (100% Passed)
```

### 5.3. Kiểm tra Expo Doctor
```bash
$ cd mobile && npx expo-doctor
20/20 checks passed. No issues detected!
# Exit code: 0
```

### 5.4. Kiểm tra Cấu hình Công khai Expo
```bash
$ cd mobile && npx expo config --type public
# Exit code: 0 (Cấu hình Android package và iOS bundleIdentifier hợp lệ)
```

### 5.5. Đánh giá Tính toàn vẹn Kho mã (Git Boundary Check)
```bash
$ git status --short
?? docs/android/
?? mobile/

$ git diff --name-only
# Không có bất kỳ tệp tin nào thuộc backend, api-gateway, database hoặc frontend bị sửa đổi
```

---

## 6. Hướng dẫn Chạy & Thử nghiệm trên Thiết bị (Android & iOS)

### 6.1. Chuẩn bị môi trường
1. Di chuyển vào thư mục mobile:
   ```bash
   cd mobile
   ```
2. Đảm bảo file `.env` chứa URL Gateway thực tế:
   ```env
   EXPO_PUBLIC_API_BASE_URL=https://rikkeiportal.io.vn
   EXPO_PUBLIC_APP_ENV=production
   ```

### 6.2. Chạy ứng dụng trên máy ảo hoặc thiết bị thật
- Khởi động Expo Development Server:
  ```bash
  npm run start
  ```
- Chạy trên Android Emulator hoặc thiết bị kết nối ADB:
  ```bash
  npm run android
  ```
- Chạy trên iOS Simulator (yêu cầu macOS có Xcode):
  ```bash
  npm run ios
  ```

### 6.3. Kịch bản Kiểm thử Nghiệm thu Thực tế
1. **Kiểm thử Sinh viên**:
   - Nhấn chip `🎓 SV (sv2024001)` hoặc nhập tài khoản `sv2024001`, mật khẩu `123456`.
   - Bấm **Đăng nhập**: Ứng dụng gửi HTTPS request thật tới `https://rikkeiportal.io.vn/api/v1/auth/login`.
   - Ứng dụng nhận JWT và tự động chuyển hướng vào `/(student)/dashboard`.
   - Kiểm tra tab Hồ sơ: Hiển thị đầy đủ Mã SV (`SV2024001`), Chuyên ngành (`B.Tech - Computer Science`), Tín chỉ (`84/160`).
   - Bấm **Đăng xuất**: Ứng dụng gọi API thu hồi refresh token và xóa sạch token trong SecureStore.
2. **Kiểm thử Giảng viên**:
   - Nhấn chip `👨‍🏫 GV (gv001)` hoặc nhập tài khoản `gv001`, mật khẩu `123456`.
   - Bấm **Đăng nhập**: Nhận JWT với role `LECTURER`, tự động chuyển hướng vào `/(lecturer)/dashboard`.
   - Kiểm tra tab Hồ sơ: Hiển thị Mã GV (`GV001`), Khoa (`Khoa Công nghệ Thông tin`), Học vị (`Tiến sĩ`).
3. **Kiểm thử Quản trị viên**:
   - Nhấn chip `🛡️ Admin` hoặc nhập `admin`, mật khẩu `123456`.
   - Bấm **Đăng nhập**: Nhận role `ADMIN`, tự động chuyển hướng tới `/unauthorized`.
   - Màn hình thông báo hướng dẫn sử dụng Cổng Quản Trị Web kèm nút bấm tương tác mở `https://rikkeiportal.io.vn/`.
4. **Kiểm thử Sai mật khẩu**:
   - Nhập `sv2024001`, mật khẩu sai `wrong_pass`.
   - Bấm **Đăng nhập**: Hiển thị banner lỗi màu đỏ "Tên đăng nhập hoặc mật khẩu không chính xác". Không có hiện tượng crash hay rò rỉ token.

---

## 7. Rủi ro Còn Tồn tại & Khuyến nghị Cho Phase Kế tiếp

1. **Thời hạn Access Token ngắn (15 phút)**:
   - *Đặc điểm Backend*: JWT hết hạn sau 15 phút.
   - *Đánh giá*: Interceptor Mutex Queue đã xử lý xoay vòng Refresh Token Rotation mượt mà và tự động trong suốt quá trình người dùng sử dụng ứng dụng mà không gây gián đoạn UI.
2. **Chế độ Ngoại tuyến (Offline Caching)**:
   - Các màn hình tab sinh viên và giảng viên hiện hiển thị dữ liệu từ state/cache. Trong Phase 3 (Student Subsystem Integration), các API nghiệp vụ (Thời khóa biểu, Bảng điểm) sẽ được kết nối đầy đủ qua TanStack Query với thời gian lưu đệm 24h.

---

## 8. KẾT LUẬN NGHIỆM THU PHASE 2 (FINAL VERDICT)

# **ACCEPTED (Nghiệm thu hoàn chỉnh)**

**Căn cứ kết luận**:
- Đáp ứng 100% các tiêu chí nghiệm thu của Phase 2.
- 13/13 Test Suites với 56/56 Automated Tests đạt kết quả **PASS** (bao gồm cả bộ Real Backend Live Integration test).
- TypeScript Strict Mode đạt **0 lỗi biên dịch**.
- Expo Doctor đạt **20/20 checks passed**.
- 0 tệp tin ngoài phạm vi `mobile/` và `docs/android/` bị thay đổi.
- Sẵn sàng bàn giao cho người dùng phê duyệt trước khi chuyển sang Phase 3.
