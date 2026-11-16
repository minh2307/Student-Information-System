# Rikkei EduPortal — Android Multi-Role Mobile Application

Ứng dụng di động Android chính thức dành cho **Sinh viên (STUDENT)** và **Giảng viên (LECTURER)** của hệ thống quản lý đào tạo **Rikkei EduPortal** (Student Information System).

---

## 1. Công nghệ & Kiến trúc Cốt lõi

- **Kiến trúc ứng dụng**: Single Android Application (Một APK duy nhất, phân luồng giao diện theo Role dựa trên định danh backend).
- **Framework**: [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/) (SDK 58).
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode).
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) v58 (File-based Routing, Protected Route Guards, Dynamic Tabs).
- **Networking**: [Axios](https://axios-http.com/) với Interceptor Mutex Queue chống lỗi Token Reuse và tự động luân chuyển Refresh Token Rotation.
- **Server State & Caching**: [TanStack Query v5](https://tanstack.com/query/latest) kết hợp Offline Cache Persister phân lập theo Role/Tài khoản.
- **Client State**: [Zustand](https://zustand-demo.pmnd.rs/) cho Session, User Identity và Academic Profiles.
- **Bảo mật Token**: [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) (Mã hóa phần cứng Android Keystore, tuyệt đối không lưu JWT trong AsyncStorage).
- **Bộ nhớ đệm Ngoại tuyến**: [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) (Chỉ lưu cache phi nhạy cảm như danh sách môn học, thời khóa biểu).
- **Styling**: React Native `StyleSheet` kết hợp Design Tokens tập trung (`src/theme/`) đồng bộ nhận diện thương hiệu Rikkei EduPortal.

---

## 2. Phân Quyền & Luồng Điều Hướng (RBAC)

Ứng dụng thực hiện cơ chế bảo vệ phân quyền chặt chẽ trên Client và Backend:

| Vai trò (Role) | Phạm vi Mobile | Luồng điều hướng |
| :--- | :--- | :--- |
| **STUDENT** | Phát triển đầy đủ | Điều hướng vào `/(student)/dashboard`. Bảo vệ bởi `StudentGuard`. Hỗ trợ: Thời khóa biểu, Điểm số, Đăng ký môn, Học phí, Điểm danh SV, Cố vấn AI. |
| **LECTURER** | Phát triển đầy đủ | Điều hướng vào `/(lecturer)/dashboard`. Bảo vệ bởi `LecturerGuard`. Hỗ trợ: Lịch giảng dạy, Danh sách lớp, Điểm danh QR Động 15s (Anti-Proxy), Nhập điểm, Chốt điểm, Cảnh báo học vụ. |
| **ADMIN** | Không có Dashboard Mobile | Bị chặn bởi `StudentGuard` và `LecturerGuard`. Tự động điều hướng đến màn hình `/unauthorized` kèm hướng dẫn và nút mở nhanh Cổng Quản Trị Web (`https://rikkeiportal.io.vn/`). |

---

## 3. Cấu trúc Dự án

```
mobile/
├── app/                               # File-based Navigation (Expo Router)
│   ├── _layout.tsx                    # Root Layout với AppProviders & Stack Navigation
│   ├── index.tsx                      # Entry Route (Điều hướng thông minh theo Role)
│   ├── unauthorized.tsx               # Màn hình Hướng dẫn Admin Web & Chặn quyền truy cập
│   ├── (auth)/                        # Phân hệ Xác thực
│   │   ├── _layout.tsx
│   │   └── login.tsx                  # Màn hình Đăng nhập (Hỗ trợ demo cả 3 vai trò)
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
│   │   ├── student/                   # Student domain types & hooks
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
├── tests/                             # Bộ kiểm thử tự động Jest (7 Suites, 29 Tests)
│   ├── setupTests.ts                  # Native Mocks (SecureStore, AsyncStorage)
│   ├── api/
│   │   ├── client.test.ts             # Kiểm thử Base URL & Chuẩn hóa lỗi API Gateway
│   │   └── refreshMutex.test.ts       # Kiểm thử Concurrency Mutex Queue Refresh Token
│   ├── guards/
│   │   └── routeGuards.test.tsx       # Kiểm thử RBAC Route Guards & Chặn Admin/Role chéo
│   ├── providers/
│   │   └── queryClient.test.ts        # Kiểm thử Caching & Xóa đệm khi Logout
│   ├── storage/
│   │   └── tokenStorage.test.ts       # Kiểm thử mã hóa SecureStore
│   ├── stores/
│   │   └── authStore.test.ts          # Kiểm thử Student/Lecturer login, logout, cold start
│   └── utils/
│       └── jwt.test.ts                # Kiểm thử giải mã JWT & phát hiện hết hạn
│
├── .env.example                       # Mẫu cấu hình môi trường (EXPO_PUBLIC_API_BASE_URL)
├── app.json                           # Cấu hình Expo Application (com.rikkei.eduportal)
├── jest.config.js                     # Cấu hình kiểm thử Jest
├── package.json
└── tsconfig.json                      # Cấu hình TypeScript Strict Mode
```

---

## 4. Hướng dẫn Khởi chạy Ứng dụng

### 4.1. Cài đặt Môi trường
- Yêu cầu Node.js: phiên bản LTS (khuyến nghị >= 20.x hoặc 22.x).
- Di chuyển vào thư mục `mobile`:
  ```bash
  cd mobile
  ```
- Cài đặt dependencies (đã hoàn tất trong project):
  ```bash
  npm install
  ```

### 4.2. Cấu hình Biến Môi trường
Tạo file `.env` từ mẫu `.env.example`:
```bash
cp .env.example .env
```
Nội dung file `.env`:
```env
EXPO_PUBLIC_API_BASE_URL=https://rikkeiportal.io.vn
EXPO_PUBLIC_APP_ENV=production
```

### 4.3. Kiểm tra TypeScript & Chạy Test
- Kiểm tra kiểu dữ liệu tĩnh (Strict Mode):
  ```bash
  npm run typecheck
  ```
- Chạy bộ kiểm thử tự động Jest:
  ```bash
  npm test
  ```

### 4.4. Khởi động Ứng dụng trên Thiết bị / Giả lập
- Khởi động Expo Development Server:
  ```bash
  npm run start
  # hoặc chạy trực tiếp trên Android Emulator:
  npm run android
  ```
- **Tài khoản Demo có sẵn trên màn hình Login**:
  - Nhập mã bắt đầu bằng `sv` (VD: `sv2024001`) -> Đăng nhập phân hệ **Sinh viên** (`/(student)/dashboard`).
  - Nhập mã bắt đầu bằng `gv` (VD: `gv_hoangluong`) -> Đăng nhập phân hệ **Giảng viên** (`/(lecturer)/dashboard`).
  - Nhập `admin` -> Chuyển đến màn hình **Hướng dẫn Admin Web** (`/unauthorized`) với nút mở nhanh Cổng Web.

---

## 5. Kết quả Kiểm thử & Chất lượng Mã nguồn

Toàn bộ **7 Test Suites** với **29 Automated Tests** đều vượt qua 100%:
```
PASS tests/guards/routeGuards.test.tsx
PASS tests/stores/authStore.test.ts
PASS tests/api/client.test.ts
PASS tests/storage/tokenStorage.test.ts
PASS tests/utils/jwt.test.ts
PASS tests/api/refreshMutex.test.ts
PASS tests/providers/queryClient.test.ts

Test Suites: 7 passed, 7 total
Tests:       29 passed, 29 total
Snapshots:   0 total
Time:        1.019 s
```

---

## 6. Lộ trình Tiếp theo (Phase 2 & Phase 3)

- **Phase 2 (Authentication & JWT Real Integration)**: Tích hợp gọi API thật tới `POST /api/v1/auth/login`, xử lý lỗi 401/403, lưu trữ JWT thật và kết nối luân chuyển refresh token tự động với backend Production.
- **Phase 3 (Student Profile & Academic Context)**: Tích hợp `GET /api/v1/profile/me` và `GET /api/v1/student/academic-context`.
- **Phase 4 (Timetable & Exam Schedule)**: Tích hợp `GET /api/v1/student/timetable`, `GET /api/v1/student/exams`, đồng bộ ngoại tuyến.
- **Phase 5 (Lecturer Teaching Schedule & QR Attendance)**: Tích hợp `GET /api/v1/lecturer/classes` và luồng hiển thị mã QR động 15 giây qua `GET /api/v1/lecturer/classes/{id}/attendance/qr-code`.
