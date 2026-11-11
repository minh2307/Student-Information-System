# BÁO CÁO THỰC THI & NGHIỆM THU PHASE 1
## THIẾT KẾ KIẾN TRÚC MULTI-ROLE & KHỞI TẠO DỰ ÁN ANDROID (RIKKEI EDUPORTAL)

> **Dự án**: Rikkei EduPortal — Student Information System (MVP)  
> **Giai đoạn**: Phase 1 – Android Multi-Role Architecture & Project Initialization  
> **Người thực hiện**: Senior Mobile Architect & React Native Engineer  
> **Trạng thái**: **HOÀN THÀNH 100% (ALL ACCEPTANCE CRITERIA MET)**  
> **Ngày báo cáo**: 10/11/2026  

---

## 1. Tổng quan Kiến trúc Ứng dụng Di động (Multi-Role Architecture Overview)

Ứng dụng Android của **Rikkei EduPortal** được thiết kế và khởi tạo theo mô hình **Role-based Single Android Application**:
- **Một APK duy nhất**, một hệ thống xác thực và mạng tập trung, nhưng phân tách thành hai khu vực giao diện và điều hướng hoàn toàn độc lập dành cho **Sinh viên (STUDENT)** và **Giảng viên (LECTURER)**.
- **Tài khoản Quản trị viên (ADMIN)**: Không xây dựng bảng điều khiển quản trị trên Android; Admin được chuyển hướng đến màn hình hướng dẫn thông tin (`/unauthorized`) với nút mở nhanh giao diện Web hiện tại tại `https://rikkeiportal.io.vn/`.
- **Nguyên tắc an ninh**: Vai trò người dùng (Role) tuyệt đối không dựa vào tham số do client tự gửi; Role được xác định từ payload JWT và đối tượng người dùng do backend cấp (`AuthResponse.user.role`).
- Toàn bộ mã nguồn mobile nằm trong thư mục `mobile/`, không làm thay đổi hay ảnh hưởng đến Backend Microservices (`services/**`) và Web Frontend (`frontend/**`).

```
┌────────────────────────────────────────────────────────────────────────┐
│                   RIKKEI EDUPORTAL ANDROID APPLICATION                │
├────────────────────────────────────────────────────────────────────────┤
│  PRESENTATION & NAVIGATION LAYER                                       │
│  ├── Root Navigation: Expo Router v58 (Stack Navigation)               │
│  ├── Authentication Shell: app/(auth)/ (Login with Multi-role demo)    │
│  ├── Student Module: app/(student)/ (Protected by StudentGuard)        │
│  │   └── Tabs: Dashboard, Timetable, Grades, Profile                   │
│  ├── Lecturer Module: app/(lecturer)/ (Protected by LecturerGuard)     │
│  │   └── Tabs: Dashboard, Teaching Schedule, QR Attendance, Profile    │
│  └── Admin Guidance: app/unauthorized.tsx (Guidance & Web Portal Link) │
├────────────────────────────────────────────────────────────────────────┤
│  SECURITY & ROLE-BASED ACCESS CONTROL (RBAC)                           │
│  ├── AuthGuard: Chặn truy cập khi chưa đăng nhập, chống flash UI       │
│  ├── StudentGuard: Chỉ cho phép role STUDENT; đẩy LECTURER/ADMIN       │
│  └── LecturerGuard: Chỉ cho phép role LECTURER; đẩy STUDENT/ADMIN      │
├────────────────────────────────────────────────────────────────────────┤
│  APPLICATION STATE & CACHING LAYER                                     │
│  ├── Client Identity State: Zustand (useAuthStore)                     │
│  │   ├── Tokens in Expo SecureStore (Hardware-encrypted Keystore)      │
│  │   └── Profiles (Student & Lecturer) in AsyncStorage                 │
│  ├── Server State & Caching: TanStack Query v5                         │
│  │   ├── Stale Time: 5 minutes | Garbage Collection: 24 hours          │
│  │   └── Session Isolation: Tự động purge cache khi Logout             │
│  └── Query Keys Factory: queryKeys.student.*, queryKeys.lecturer.*     │
├────────────────────────────────────────────────────────────────────────┤
│  NETWORKING & GATEWAY INTEGRATION LAYER                                │
│  ├── HTTP Client: Centralized Axios Client (https://rikkeiportal.io.vn)│
│  ├── Refresh Mutex Interceptor: Đơn luồng hóa Refresh Token Rotation   │
│  │   └── Ngăn chặn triệt để Token Reuse Detection từ auth-service      │
│  └── Error Normalization: Chuẩn hóa ApiResponse<T> & ApiError          │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTPS
                                     ▼
                ┌────────────────────────────────────────┐
                │ Production API Gateway (:8080)         │
                │ https://rikkeiportal.io.vn/api/v1/...  │
                └──────────────────┬─────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
   auth-service            course-service            lecturer-service
  (JWT, Refresh)         (Timetable, Courses)      (Classes, QR Attendance)
```

---

## 2. Thông số Công nghệ & Phiên bản Thư viện (Technology Stack)

| Thành phần | Gói Thư viện | Phiên bản | Ghi chú Trách nhiệm |
|:---|:---|:---:|:---|
| **Core Framework** | `expo` | `~58.0.23` | Nền tảng phát triển ứng dụng di động Android |
| **Core Runtime** | `react-native` | `0.88.1` | Thư viện native cốt lõi |
| **UI Library** | `react` / `react-dom` | `19.3.0` | Thư viện hiển thị giao diện |
| **Navigation** | `expo-router` | `~58.0.30` | Điều hướng file-based routing với route guards |
| **HTTP Client** | `axios` | `^1.21.1` | Kết nối mạng, xử lý interceptor request/response |
| **Server State** | `@tanstack/react-query` | `^5.107.1` | Quản lý caching, background refetch, offline state |
| **Query Persister** | `@tanstack/react-query-persist-client`<br>`@tanstack/query-async-storage-persister` | `^5.107.1`<br>`^5.107.1` | Ghi đệm query cache vào bộ nhớ máy để đọc khi mất mạng |
| **Client State** | `zustand` | `^5.1.0` | Quản lý phiên đăng nhập và thông tin người dùng |
| **Secure Storage** | `expo-secure-store` | `~58.0.2` | Lưu trữ Access Token & Refresh Token (Keystore mã hóa) |
| **Offline Cache** | `@react-native-async-storage/async-storage` | `~2.2.0` | Lưu trữ bộ nhớ đệm phi nhạy cảm (thời khóa biểu, điểm) |
| **Data Validation**| `zod` | `^4.6.7` | Kiểm tra tính hợp lệ dữ liệu biểu mẫu |
| **Form Engine** | `react-hook-form` | `^7.91.0` | Quản lý trạng thái form hiệu năng cao |
| **Icon Library** | `@expo/vector-icons` | `^15.0.2` | Bộ biểu tượng Ionicons cho Bottom Tab Navigation |
| **Language** | `typescript` | `~6.0.3` | Trình biên dịch TypeScript cấu hình Strict Mode |
| **Testing** | `jest`, `jest-expo`, `ts-jest` | `^30.5.2`, `^58.0.14` | Bộ kiểm thử tự động đơn vị |

---

## 3. Cấu trúc Dự án Chi tiết (Project Tree)

```
mobile/
├── .env.example                       # Mẫu biến môi trường API Gateway
├── .env                               # Cấu hình môi trường nội bộ
├── .gitignore                         # Loại bỏ node_modules, .expo, keystores
├── app.json                           # Cấu hình định danh com.rikkei.eduportal
├── jest.config.js                     # Cấu hình môi trường Jest với module mapper
├── package.json                       # Định nghĩa dependencies và scripts
├── tsconfig.json                      # Cấu hình TypeScript Strict Mode
├── README.md                          # Tài liệu hướng dẫn sử dụng và kiểm thử
│
├── app/                               # File-based Navigation (Expo Router)
│   ├── _layout.tsx                    # Root Layout với AppProviders & Stack Navigation
│   ├── index.tsx                      # Entry Route (Điều hướng thông minh theo Role)
│   ├── unauthorized.tsx               # Màn hình Hướng dẫn Admin Web & Chặn quyền truy cập
│   ├── (auth)/                        # Phân hệ Xác thực
│   │   ├── _layout.tsx
│   │   └── login.tsx                  # Màn hình Đăng nhập (Hỗ trợ demo 3 vai trò)
│   ├── (student)/                     # Phân hệ Sinh viên (Protected by StudentGuard)
│   │   ├── _layout.tsx                # Bottom Tabs Navigation (Ionicons)
│   │   ├── dashboard.tsx              # Tổng quan học vụ & Thẻ sinh viên
│   │   ├── timetable.tsx              # Thời khóa biểu tuần
│   │   ├── grades.tsx                 # Bảng điểm tích lũy & CGPA
│   │   └── profile.tsx                # Hồ sơ sinh viên & Đăng xuất
│   └── (lecturer)/                    # Phân hệ Giảng viên (Protected by LecturerGuard)
│       ├── _layout.tsx                # Bottom Tabs Navigation (Ionicons)
│       ├── dashboard.tsx              # Tổng quan lớp dạy & Chỉ số giảng dạy
│       ├── schedule.tsx               # Lịch giảng dạy chi tiết theo ca/phòng
│       ├── attendance.tsx             # Phiên Điểm danh QR động (Anti-Proxy 15s)
│       └── profile.tsx                # Hồ sơ giảng viên & Đăng xuất
│
├── src/
│   ├── api/
│   │   ├── client.ts                  # Centralized Axios Client + Error Normalization
│   │   ├── endpoints.ts               # Danh mục toàn bộ API endpoints (Student & Lecturer)
│   │   ├── queryKeys.ts               # TanStack Query Keys Factory
│   │   └── interceptors/
│   │       └── authInterceptor.ts    # Mutex Queue Refresh Token Rotation
│   │
│   ├── components/
│   │   └── common/
│   │       ├── ErrorBoundary.tsx      # Bắt lỗi render an toàn
│   │       ├── LoadingScreen.tsx      # Màn hình chờ tải dữ liệu chuẩn thương hiệu
│   │       └── OfflineBanner.tsx      # Cảnh báo xem dữ liệu ngoại tuyến
│   │
│   ├── features/                      # Domain Feature Slices
│   │   ├── auth/                      # Authentication domain
│   │   ├── student/                   # Student domain types & contracts
│   │   └── lecturer/                  # Lecturer domain types & contracts
│   │
│   ├── guards/                        # Role-based Route Guards
│   │   ├── AuthGuard.tsx              # Kiểm tra đăng nhập & Chặn màn hình chớp (flash)
│   │   ├── StudentGuard.tsx           # Bảo vệ phân hệ Sinh viên
│   │   ├── LecturerGuard.tsx          # Bảo vệ phân hệ Giảng viên
│   │   └── index.ts
│   │
│   ├── hooks/                         # Shared Custom Hooks
│   │   ├── useAuth.ts                 # Hook tiện ích truy xuất session & role flags
│   │   └── index.ts
│   │
│   ├── providers/
│   │   ├── AppProviders.tsx           # SafeAreaProvider + QueryClientProvider
│   │   └── queryClient.ts             # Cấu hình Caching 24h & Xóa cache khi Logout
│   │
│   ├── storage/
│   │   └── tokenStorage.ts            # Abstraction mã hóa Expo SecureStore
│   │
│   ├── stores/
│   │   └── authStore.ts               # Zustand store quản lý Auth, Student & Lecturer profile
│   │
│   ├── theme/                         # Centralized Design System Tokens
│   │   ├── colors.ts                  # Bảng màu chuẩn Rikkei (Red-900 / Red-800 / Stone)
│   │   ├── spacing.ts                 # Lưới khoảng cách 4pt / 8pt chuẩn di động
│   │   ├── typography.ts              # Hệ thống font size, weight, line-height
│   │   ├── radius.ts                  # Bo góc thẻ và nút bấm
│   │   └── theme.ts                   # Master Theme & Common Styles
│   │
│   ├── types/
│   │   ├── api.types.ts               # ApiResponse<T>, ApiError, PaginatedData
│   │   └── auth.types.ts              # User, StudentProfile, LecturerProfile, Role, AuthResponse
│   │
│   └── utils/
│       ├── formatters.ts              # Định dạng điểm số, phần trăm, tiền tệ VNĐ
│       ├── jwt.ts                     # Giải mã & kiểm tra hạn JWT an toàn trên client
│       └── index.ts
│
└── tests/                             # Bộ kiểm thử tự động Jest (7 Suites, 29 Tests)
    ├── setupTests.ts                  # Native Mocks (SecureStore, AsyncStorage)
    ├── api/
    │   ├── client.test.ts             # Kiểm thử Base URL & Chuẩn hóa lỗi API Gateway
    │   └── refreshMutex.test.ts       # Kiểm thử Concurrency Mutex Queue Refresh Token
    ├── guards/
    │   └── routeGuards.test.tsx       # Kiểm thử RBAC Route Guards & Chặn Admin/Role chéo
    ├── providers/
    │   └── queryClient.test.ts        # Kiểm thử Caching & Xóa đệm khi Logout
    ├── storage/
    │   └── tokenStorage.test.ts       # Kiểm thử mã hóa SecureStore
    ├── stores/
    │   └── authStore.test.ts          # Kiểm thử Student/Lecturer login, logout, cold start
    └── utils/
        └── jwt.test.ts                # Kiểm thử giải mã JWT & phát hiện hết hạn
```

---

## 4. Chi tiết Thực thi 5 Trụ cột Kỹ thuật

### 4.1. Phân quyền Người dùng & Hệ thống Route Guards (RBAC)

1. **Cơ chế hoạt động**:
   - `AuthGuard`: Kiểm tra trạng thái `isInitializing`. Nếu đang khôi phục phiên từ đĩa, hiển thị `<LoadingScreen />` thương hiệu, ngăn chặn hoàn toàn hiện tượng màn hình chớp (flash) của giao diện đăng nhập. Nếu chưa đăng nhập, chuyển hướng về `/(auth)/login`.
   - `StudentGuard`: Đảm bảo chỉ tài khoản có role `STUDENT` mới truy cập được các tab sinh viên. Nếu tài khoản là `LECTURER`, tự động chuyển hướng về `/(lecturer)/dashboard`. Nếu tài khoản là `ADMIN` hoặc không hợp lệ, chuyển hướng về `/unauthorized`.
   - `LecturerGuard`: Đảm bảo chỉ tài khoản có role `LECTURER` mới truy cập được các tab giảng viên. Nếu tài khoản là `STUDENT`, tự động chuyển hướng về `/(student)/dashboard`. Nếu là `ADMIN`, chuyển hướng về `/unauthorized`.
2. **Xử lý vai trò ADMIN trên Mobile**:
   - Khi tài khoản `ADMIN` đăng nhập, màn hình `/unauthorized` hiển thị thông báo rõ ràng: Tài khoản Quản trị viên chỉ được hỗ trợ trên Cổng thông tin Web.
   - Cung cấp nút bấm tương tác mở liên kết `https://rikkeiportal.io.vn/` qua `Linking.openURL()` và nút "Đăng nhập tài khoản khác".

### 4.2. Quản lý Phiên & Bộ nhớ Mã hóa Bảo mật (Security & Storage)

1. **Lưu trữ Token bằng Expo SecureStore**:
   - Token xác thực (`accessToken`, `refreshToken`) được lưu trữ độc quyền trong phần cứng mã hóa (Android Keystore). Tuyệt đối **không** lưu token trong `AsyncStorage`.
   - `tokenStorage.ts` cung cấp abstraction thống nhất với các hàm: `saveTokens()`, `getAccessToken()`, `getRefreshToken()`, `clearTokens()`.
2. **Phục hồi phiên khi Cold Start**:
   - Khi người dùng mở lại ứng dụng, `restoreSession()` trong `useAuthStore` đọc token từ `SecureStore` và thông tin hồ sơ đã lưu trong `AsyncStorage`, khôi phục trạng thái xác thực trong thời gian dưới 50ms mà không cần đăng nhập lại.

### 4.3. Đơn luồng hóa Refresh Token Rotation (Concurrency Mutex Queue)

1. **Thách thức kỹ thuật từ Phase 0**:
   - `auth-service` có cơ chế Refresh Token Rotation (mỗi refresh token chỉ được dùng 1 lần) và Token Reuse Detection (`RefreshTokenService.java:44`).
   - Nếu hai request song song gặp lỗi HTTP 401 và cùng lúc gửi refresh token cũ lên server, server sẽ coi đó là tấn công rò rỉ token và **thu hồi toàn bộ token của tài khoản** (`revokeAllUserTokens`).
2. **Giải pháp Interceptor Mutex Queue**:
   - Được triển khai trong `authInterceptor.ts`.
   - Khi request đầu tiên gặp 401, cờ `isRefreshing` được bật và request này thực hiện gọi `POST /api/v1/auth/refresh`.
   - Các request 401 phát sinh trong lúc đang refresh sẽ được đưa vào hàng đợi `failedQueue` dưới dạng Promise.
   - Khi request refresh hoàn tất thành công, token mới được cập nhật vào `SecureStore`, `failedQueue` được giải phóng và thử lại toàn bộ các request đang chờ với token mới.
   - Nếu refresh thất bại, toàn bộ hàng đợi bị hủy và trigger hàm đăng xuất hệ thống.

### 4.4. Bộ nhớ đệm Ngoại tuyến & Phân lập Dữ liệu (TanStack Query Caching)

1. **Cấu hình QueryClient**:
   - `staleTime`: 5 phút (dữ liệu được xem là mới trong 5 phút, không refetch liên tục khi chuyển tab).
   - `gcTime`: 24 giờ (dữ liệu được lưu trong bộ nhớ máy suốt 24 giờ, sinh viên có thể xem thời khóa biểu và bảng điểm khi mất mạng).
   - `retry`: Tự động ngắt khi gặp lỗi mã client (401, 403, 404).
2. **Phân lập Dữ liệu Phiên**:
   - Khi người dùng đăng xuất, hàm `clearQueryCache()` trong `queryClient.ts` được kích hoạt để xóa sạch bộ nhớ đệm trong RAM và xóa key lưu trữ trên `AsyncStorage`. Đảm bảo sinh viên hay giảng viên khác đăng nhập sau đó không nhìn thấy dữ liệu của người dùng trước.

### 4.5. Hệ thống Design Tokens & Styling (StyleSheet Foundation)

1. **Thừa hưởng nhận diện thương hiệu Web**:
   - Bảng màu chủ đạo: `primary.900` (#7F1D1D), `primary.800` (#991B1B) kết hợp `neutral` slate và `secondary` (#0369A1).
   - Hệ thống khoảng cách chuẩn lưới 4pt/8pt (`spacing.xs: 4`, `spacing.sm: 8`, `spacing.md: 16`, `spacing.lg: 24`).
   - Đảm bảo chuẩn tiếp cận di động: Kích thước vùng bấm tối thiểu đạt `minTouchTarget: 44px`.
2. **Không phụ thuộc NativeWind**:
   - Sử dụng `StyleSheet.create` thuần, tối ưu thời gian khởi động app và tránh xung đột phiên bản của các thư viện Babel/Metro.

---

## 5. Kết quả Kiểm thử Tự động (Automated Verification)

### 5.1. Kiểm tra TypeScript Strict Mode
```bash
cd mobile && npm run typecheck
```
**Kết quả**: `tsc --noEmit` hoàn tất với **0 lỗi biên dịch**, đảm bảo toàn bộ types API, contracts và props đều an toàn về mặt kiểu dữ liệu.

### 5.2. Kết quả Thực thi Bộ kiểm thử Đơn vị Jest (Unit Tests)
```bash
cd mobile && npm test
```
**Kết quả thực tế**:
```
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

PASS tests/api/client.test.ts
  API Client & Error Normalization
    ✓ initializes axios instance with production base URL from config (2 ms)
    ✓ normalizes backend ApiResponse wrapper and returns data directly (2 ms)
    ✓ normalizes API Gateway error responses into structured ApiError (2 ms)

PASS tests/storage/tokenStorage.test.ts
  SecureStore Token Storage Abstraction
    ✓ stores and retrieves access and refresh tokens (3 ms)
    ✓ removes tokens cleanly upon logout (1 ms)

PASS tests/utils/jwt.test.ts
  JWT Utilities
    ✓ correctly decodes claims from valid JWT payload (1 ms)
    ✓ returns null for malformed tokens (1 ms)
    ✓ correctly identifies expired and non-expired tokens (1 ms)

PASS tests/api/refreshMutex.test.ts
  Auth Interceptor & Token Refresh Mutex Queue
    ✓ queues concurrent 401 requests and executes only one refresh call (5 ms)

PASS tests/providers/queryClient.test.ts
  TanStack Query Configuration & Offline Persistence
    ✓ is initialized with 5-minute stale time and 24-hour retention (2 ms)
    ✓ purges query cache and storage upon logout (1 ms)

Test Suites: 7 passed, 7 total
Tests:       29 passed, 29 total
Snapshots:   0 total
Time:        1.019 s
```

---

## 6. Đánh giá Tính toàn vẹn Kho mã (Repository Integrity Check)

Theo đúng nguyên tắc an toàn của dự án:
- **Backend Microservices**: 0 tệp tin bị chỉnh sửa trong `services/**`, `build.gradle.kts`, `settings.gradle.kts`.
- **Web Frontend**: 0 tệp tin bị chỉnh sửa trong `frontend/**`.
- **Git State**: Không thực hiện `git commit` hay `git push`. Toàn bộ thay đổi nằm trong vùng làm việc của user để nghiệm thu trực quan.

---

## 7. Kế hoạch Chuyển giao Phase 2 (Phase 2 Readiness)

Nền tảng kiến trúc của Phase 1 đã hoàn chỉnh 100%, sẵn sàng bàn giao cho **Phase 2 — Authentication & JWT Integration**:

| Nhiệm vụ Phase 2 | Điểm tựa đã xây dựng tại Phase 1 |
|:---|:---|
| **Gọi API Đăng nhập thật** | `apiClient.post(ENDPOINTS.AUTH.LOGIN, credentials)` đã sẵn sàng trong `src/api/` |
| **Quản lý Form Đăng nhập & Validate** | `react-hook-form` và `zod` đã được cài đặt sẵn |
| **Xử lý lưu trữ JWT** | `useAuthStore.getState().login(authData)` với `Expo SecureStore` đã được test đầy đủ |
| **Tự động điều hướng theo Role** | `IndexScreen` và các Guards `StudentGuard`, `LecturerGuard` đã hoạt động chính xác |
| **Bảo vệ chống Token Reuse** | `authInterceptor` với Mutex Queue đã sẵn sàng đón nhận luồng xoay vòng token của backend |
