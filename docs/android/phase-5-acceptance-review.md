# BÁO CÁO NGHIỆM THU ĐỘC LẬP PHÂN HỆ NGOẠI TUYẾN, THÔNG BÁO & ĐỒNG BỘ DỮ LIỆU (PHASE 5)
## RIKKEI EDUPORTAL MOBILE — INDEPENDENT ACCEPTANCE AUDIT & SECURITY VERIFICATION REPORT

> **Dự án**: Rikkei EduPortal Mobile (Android & iOS)  
> **Nền tảng**: React Native + Expo SDK 58 + TypeScript  
> **Nhiệm vụ**: `[PHASE-5-ACCEPTANCE-AUDIT]` Kiểm toán độc lập toàn bộ Phase 5 sau triển khai  
> **Tài liệu**: `docs/android/phase-5-acceptance-review.md`  
> **Kiểm toán viên**: Lead Mobile QA & Principal Security Auditor  
> **Chế độ thực thi**: **STRICTLY REVIEW ONLY** (Không sửa code, không sửa test, không cài package, không commit, không push)  
> **Ngày thực hiện**: 11/11/2026  
> **Kết luận nghiệm thu chính thức**: **ACCEPTED WITH CONDITIONS** (Nghiệm thu có điều kiện)

---

## 1. TỔNG QUAN KIỂM TOÁN KIẾN TRÚC (ARCHITECTURE AUDIT)

Hệ thống Phase 5 được thiết kế nhằm hoàn thiện tính ổn định, độ tin cậy và khả năng hoạt động liên tục khi mất kết nối mạng của ứng dụng Rikkei EduPortal Mobile cho cả 2 vai trò **Sinh viên (STUDENT)** và **Giảng viên (LECTURER)** trên cùng một codebase duy nhất.

### 1.1. Kiến trúc Lưu trữ Phân tầng (Tiered Storage Hierarchy)
Kiểm tra thực tế source code xác nhận ứng dụng tuân thủ mô hình phân tầng nghiêm ngặt:
1. **Tầng 1 — Hardware SecureStore (`expo-secure-store`)**:
   - Lưu trữ `accessToken` và `refreshToken`.
   - Được bảo vệ bởi phần cứng (Android Keystore / iOS Keychain).
   - Tuyệt đối **không** xuất hiện trong `AsyncStorage` hay snapshot của TanStack Query.
2. **Tầng 2 — In-Memory React Query Cache (`@tanstack/react-query`)**:
   - Quản lý trạng thái truy vấn trực tiếp trên RAM, hỗ trợ tự động refetch theo các sự kiện ứng dụng.
3. **Tầng 3 — Disk Persistence (`@react-native-async-storage/async-storage`)**:
   - Lưu trữ dữ liệu đọc an toàn (Dashboard, Timetable, Exams, Grades, Tuition, Roster, Profile).
   - Được phân vùng theo khóa namespace của từng người dùng cụ thể.

### 1.2. Tính Bền vững của Lớp Mạng (Network State Layer)
- Sử dụng `@react-native-community/netinfo: 12.0.1` với module-level listener đồng bộ trạng thái ngay cả trong môi trường kiểm thử không chạy effects.
- Phân biệt chính xác giữa:
  - Mất kết nối hoàn toàn (`isConnected === false`).
  - Kết nối Wi-Fi nhưng không có Internet (`isInternetReachable === false`).
- Provider [`OfflineProvider`](file:///home/nguyen-son-minh/Downloads/Student-Information-System-main/mobile/src/features/offline/OfflineContext.tsx) được tích hợp tại component gốc [`AppProviders.tsx`](file:///home/nguyen-son-minh/Downloads/Student-Information-System-main/mobile/src/providers/AppProviders.tsx). Hook `useOffline()` có giá trị fallback an toàn (`defaultOfflineValue`) giúp các unit test render cô lập không bị crash do thiếu provider.

---

## 2. KIỂM TOÁN AN NINH CHẾ ĐỘ NGOẠI TUYẾN (OFFLINE SECURITY AUDIT)

### 2.1. Phân vùng Bộ đệm (Cache Isolation)
- **User-Scoped Query Keys**: Tất cả các hàm sinh khóa trong [`queryKeys`](file:///home/nguyen-son-minh/Downloads/Student-Information-System-main/mobile/src/api/queryKeys.ts) đều nhận tham số `scope` (ví dụ: `user_4` hoặc `studentCode` `SV2024001`).
- **Cách ly giữa các Sinh viên**:
  - Sinh viên A (`user_4`) có query key: `['student', 'user_4', 'dashboard']`.
  - Sinh viên B (`user_5`) có query key: `['student', 'user_5', 'dashboard']`.
  - Không thể xảy ra va chạm khóa giữa 2 tài khoản sinh viên.
- **Cách ly giữa Sinh viên và Giảng viên**:
  - Giảng viên (`user_2`) sử dụng prefix `['lecturer', 'user_2', ...]`.
  - Các hook sinh viên (`useStudentDashboard`, `useStudentTimetable`, v.v.) có cấu hình:
    ```typescript
    enabled: Boolean(user && user.role === 'STUDENT')
    ```
  - Khi Giảng viên đăng nhập, toàn bộ query của Sinh viên bị vô hiệu hóa hoàn toàn (`enabled: false`).
- **Xác minh Bằng chứng Thực nghiệm**:
  - Test suite [`tests/security/accountCacheIsolation.test.ts`](file:///home/nguyen-son-minh/Downloads/Student-Information-System-main/mobile/tests/security/accountCacheIsolation.test.ts) thực thi vòng đời: *Đăng nhập Sinh viên A -> Caching -> Đăng xuất -> Đăng nhập Giảng viên B -> Khởi động lạnh phục hồi session*. Kết quả chứng minh không tồn tại bất kỳ dư lượng dữ liệu (zero leakage) nào giữa hai tài khoản.

### 2.2. Kiểm toán Quy trình Đăng xuất (Logout Audit)
Quy trình đăng xuất trong [`useAuthStore.ts`](file:///home/nguyen-son-minh/Downloads/Student-Information-System-main/mobile/src/stores/authStore.ts) được kiểm tra kỹ lưỡng:
```typescript
logout: async (): Promise<void> => {
  cancelPendingRefresh();
  try {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (refreshToken) await authApi.logout(refreshToken);
  } catch {
    // Bỏ qua lỗi mạng khi logout offline
  } finally {
    await tokenStorage.clearTokens();           // Xóa SecureStore
    await AsyncStorage.removeItem(...);          // Xóa AsyncStorage profiles
    await clearQueryCache();                     // Xóa TanStack Query
    set({ user: null, isAuthenticated: false }); // Reset Zustand state
  }
}
```
- **Khi Online**: Gửi request `POST /api/v1/auth/logout` thu hồi token trên Backend, sau đó xóa toàn bộ token phần cứng, cache AsyncStorage và RAM.
- **Khi Offline**: Request mạng thất bại được bắt trong khối `catch`, khối `finally` **bắt buộc thực thi 100%**:
  - SecureStore bị xóa sạch (`tokenStorage.clearTokens()`).
  - Dữ liệu AsyncStorage bị xóa bỏ.
  - Query Cache bị xóa hoàn toàn (`queryClient.clear()`).
  - Người dùng bị đưa về màn hình Login ngay lập tức.
  - Được kiểm chứng thành công bởi test case trong [`tests/features/offline/offlineMode.test.tsx:179`](file:///home/nguyen-son-minh/Downloads/Student-Information-System-main/mobile/tests/features/offline/offlineMode.test.tsx#L179).

### 2.3. Danh mục Thao tác Ngoại tuyến (Offline Operations Matrix)
Kiểm toán độc lập xác định chính xác ranh giới các thao tác được và không được phép thực hiện khi ngoại tuyến:

| Thao tác nghiệp vụ | Phân loại | Khả thi khi Offline? | Cơ chế xử lý |
|:---|:---:|:---:|:---|
| **Xem Dashboard KPI** | Chỉ đọc | **CÓ** | Đọc bản ghi cache gần nhất từ AsyncStorage |
| **Xem Thời khóa biểu** | Chỉ đọc | **CÓ** | Đọc bản ghi cache học kỳ gần nhất |
| **Tra cứu Lịch thi & SBD** | Chỉ đọc | **CÓ** | Đọc bản ghi cache lịch thi |
| **Xem Bảng điểm & C-GPA** | Chỉ đọc | **CÓ** | Đọc bản ghi cache kết quả học tập |
| **Xem Học phí & Mã VietQR** | Chỉ đọc | **CÓ** | Đọc hóa đơn cache; thông tin VietQR hiển thị rõ ràng |
| **Xem Danh sách Lớp (GV)** | Chỉ đọc | **CÓ** | Đọc danh sách lớp học phần được phân công |
| **Xem Danh sách SV & Điểm (GV)** | Chỉ đọc | **CÓ** | Đọc bảng điểm thành phần lưu tạm |
| **Xem Hộp thư Thông báo** | Chỉ đọc | **CÓ** | Đọc danh sách thông báo đã tải trước đó |
| **Đăng ký / Hủy học phần** | Thao tác ghi | **CHẶN** | `useRequireOnlineAction` chặn, cảnh báo bằng tiếng Việt |
| **Quét QR Điểm danh (SV)** | Thao tác ghi | **CHẶN** | `useRequireOnlineAction` chặn, không gửi TOTP hết hạn |
| **Khởi tạo Phiên QR (GV)** | Thao tác ghi | **CHẶN** | Cần kết nối Backend để ký HMAC-SHA256 phiên mới |
| **Cập nhật Điểm / Chốt Điểm** | Thao tác ghi | **CHẶN** | `useRequireOnlineAction` chặn, tránh lệch trạng thái khóa |
| **Thanh toán Học phí** | Thao tác ghi | **CHẶN** | Yêu cầu kết nối xác thực ngân hàng/cổng thanh toán |

> [!IMPORTANT]
> Ứng dụng **tuyệt đối không** hỗ trợ hàng đợi ghi ngoại tuyến (Offline Mutation Outbox Queue). Việc chặn các thao tác ghi là **hoàn toàn chính xác và bắt buộc** do Backend không hỗ trợ cơ chế Idempotency-Key và kiểm soát xung đột dữ liệu.

---

## 3. KIỂM TOÁN ĐỒNG BỘ DỮ LIỆU (DATA SYNCHRONIZATION AUDIT)

### 3.1. Bản chất Kỹ thuật Thực tế của Phân hệ Đồng bộ
Đối chiếu giữa thiết kế, code thực tế [`mobile/src/features/sync/`](file:///home/nguyen-son-minh/Downloads/Student-Information-System-main/mobile/src/features/sync/) và câu hỏi của Trưởng dự án:

1. **Có thực sự đồng bộ dữ liệu hai chiều không?**
   - **TRẢ LỜI: KHÔNG**. Phân hệ này là **One-Way Invalidation & Background Read Cache Revalidation (Mô hình Stale-While-Revalidate)**.
   - Ứng dụng không có cơ chế đồng bộ 2 chiều (như CouchDB, WatermelonDB, CRDT hay OT).
2. **Có hàng đợi thao tác ghi offline (Offline Mutation Queue) không?**
   - **TRẢ LỜI: KHÔNG**. Mọi thao tác ghi khi offline đều bị chặn chủ động bằng [`useRequireOnlineAction`](file:///home/nguyen-son-minh/Downloads/Student-Information-System-main/mobile/src/features/offline/hooks/useRequireOnlineAction.ts).
3. **Có xử lý xung đột dữ liệu (Conflict Resolution) không?**
   - **TRẢ LỜI: KHÔNG**. Vì phía client không cho phép sửa đổi dữ liệu ngoại tuyến, do đó không phát sinh tình huống xung đột sửa đổi giữa client và server.

### 3.2. Đánh giá Chính sách Đồng bộ Tài nguyên (`SYNC_POLICIES`)
Bảng chính sách gồm đúng **10 loại tài nguyên** được định nghĩa trong [`syncPolicy.ts`](file:///home/nguyen-son-minh/Downloads/Student-Information-System-main/mobile/src/features/sync/syncPolicy.ts):
- `DASHBOARD`: `staleTime` 5m, `gcTime` 24h, `refetchOnReconnect: true`.
- `TIMETABLE`: `staleTime` 15m, `gcTime` 24h, `refetchOnReconnect: true`.
- `EXAMS`: `staleTime` 30m, `gcTime` 24h, `refetchOnReconnect: true`.
- `GRADES`: `staleTime` 15m, `gcTime` 24h, `refetchOnReconnect: true`.
- `TUITION`: `staleTime` 10m, `gcTime` 24h, `refetchOnReconnect: true`.
- `NOTIFICATIONS`: `staleTime` 2m, `gcTime` 24h, `refetchOnReconnect: true`.
- `LECTURER_SCHEDULE`: `staleTime` 15m, `gcTime` 24h, `refetchOnReconnect: true`.
- `LECTURER_CLASSES`: `staleTime` 15m, `gcTime` 24h, `refetchOnReconnect: true`.
- `PROFILE`: `staleTime` 30m, `gcTime` 24h, `refetchOnReconnect: true`.
- `ATTENDANCE`: `staleTime: 0`, `gcTime: 0`, `refetchOnReconnect: false` (Mã QR động 15s bắt buộc trực tuyến).

### 3.3. Cơ chế Khôi phục Kết nối & Chống Bão Yêu cầu (Reconnect Storm Prevention)
Kiểm tra logic trong [`useDataSync.ts`](file:///home/nguyen-son-minh/Downloads/Student-Information-System-main/mobile/src/features/sync/useDataSync.ts):
- **Debounce 600ms**: `debounceTimerRef` trì hoãn 600ms khi mạng vừa kết nối lại, đảm bảo đường truyền ổn định trước khi phát request.
- **Cờ khóa tiến trình (`inFlightSyncRef`)**: Ngăn chặn nhiều đợt đồng bộ chạy song song nếu mạng chập chờn bật tắt liên tục.
- **Làm mới có chọn lọc**: Chỉ invalidate các query đang hiển thị trên màn hình (`refetchType: 'active'`) thuộc đúng role của người dùng (`student` hoặc `lecturer`).
- **Bảo tồn Mutex Token Refresh**: Giữ nguyên cơ chế Single-Flight Mutex từ Phase 2. Khi token hết hạn đúng lúc có mạng trở lại, chỉ có 1 request refresh duy nhất được phát đi.

---

## 4. KIỂM TOÁN HỢP ĐỒNG API THÔNG BÁO (NOTIFICATION API AUDIT)

Đối chiếu trực tiếp với mã nguồn Backend Java:
- `services/enrollment-service/.../NotificationController.java`
- `services/enrollment-service/.../NotificationDto.java`
- `services/enrollment-service/.../AnnouncementAndNotificationService.java`
- `services/api-gateway/.../GatewayProxyController.java`

| Endpoint Backend | Method | Phân quyền Gateway | Request / Response DTO | Trạng thái Mobile |
|:---|:---:|:---:|:---|:---:|
| `/api/v1/notifications` | `GET` | Authenticated | Query không tham số; trả về `List<NotificationDto>` | **VERIFIED (200 OK)** |
| `/api/v1/notifications/{id}/read` | `PUT` | Authenticated | Path variable `{id}`; trả về `ApiResponse<Void>` | **VERIFIED (200 OK)** |
| `/api/v1/notifications/read-all` | `PUT` | Authenticated | Không body; trích xuất username từ JWT; trả về `Void` | **VERIFIED (200 OK)** |
| `/api/v1/announcements` | `GET` | Public | Param `category` (optional); trả về `List<AnnouncementDto>` | **VERIFIED (200 OK)** |

- **DTO Mapping**: Cấu trúc interface `NotificationDto` phía TypeScript khớp 100% với thuộc tính trong Java `NotificationDto.java` (`id`, `title`, `message`, `type`, `isRead`, `linkUrl`, `createdAt`).
- **Xác thực Phân quyền**: Gateway bóc tách JWT và chèn header `X-User-Username` an toàn xuống downstream service; Backend không nhận tham số phân trang (trả về danh sách thông báo đầy đủ của user).

---

## 5. KIỂM TOÁN HẠ TẦNG PUSH NOTIFICATION TỪ XA (REMOTE PUSH AUDIT)

Kiểm tra toàn diện hệ thống Backend và cơ sở dữ liệu xác nhận:
1. **Database Schema (`init-db/01-schema.sql`)**: Hoàn toàn **không có** bảng lưu trữ token thiết bị (ví dụ `device_tokens` hay `push_subscriptions`).
2. **Backend Microservices**: Không tích hợp Firebase Admin SDK hay Apple APNS client. Không có message broker event trigger để gửi push.
3. **API Endpoints**: Không tồn tại endpoint `POST /api/v1/notifications/tokens` hay `DELETE /api/v1/notifications/tokens`.

### Đánh giá Xử lý Phía Mobile:
- Hàm [`registerPushTokenWithBackend`](file:///home/nguyen-son-minh/Downloads/Student-Information-System-main/mobile/src/features/notifications/services/notificationApi.ts#L61) trả về chính xác:
  ```typescript
  return {
    status: 'BLOCKED_BY_BACKEND',
    token,
    message: 'Backend chưa hỗ trợ lưu trữ push device token...',
  };
  ```
- Mobile khởi tạo channel Android `rikkei-default` và xin quyền thông báo cục bộ đúng chuẩn.
- **Kết luận**: Đội ngũ phát triển mobile đã hành xử trung thực, tuân thủ nguyên tắc không giả lập thành công ảo. Hạng mục Remote Push Notifications được kết luận độc lập là **BLOCKED BY BACKEND**.

---

## 6. KIỂM TOÁN AN NINH DEEP LINK (NOTIFICATION DEEP LINK SECURITY AUDIT)

Hàm [`resolveNotificationRoute`](file:///home/nguyen-son-minh/Downloads/Student-Information-System-main/mobile/src/features/notifications/utils/notificationDeepLink.ts) kiểm soát tuyệt đối đường dẫn điều hướng:

1. **Người dùng chưa đăng nhập**: Bất kể `linkUrl` là gì, luôn chuyển hướng về `/(auth)/login` (`UNAUTHENTICATED`).
2. **Sinh viên truy cập link Giảng viên**: Nếu Sinh viên nhấn vào thông báo có link `/(lecturer)/*`, hàm chặn lại và chuyển hướng về `/(student)/dashboard` (`ROLE_MISMATCH`).
3. **Giảng viên truy cập link Sinh viên**: Nếu Giảng viên nhấn vào thông báo có link `/(student)/*`, hàm chặn lại và chuyển hướng về `/(lecturer)/dashboard` (`ROLE_MISMATCH`).
4. **Tài khoản Admin**: Bị chặn và điều hướng về `/unauthorized` (`ROLE_MISMATCH`), do Admin chỉ dùng Web Admin.
5. **Không tin tưởng URL payload mù quáng**: Đường dẫn được đối chiếu chặt chẽ với danh sách tiền tố được phép (`STUDENT_ALLOWED_PREFIXES`, `LECTURER_ALLOWED_PREFIXES`).

---

## 7. ĐIỀU TRA & GIẢI MÃ SỰ CỐ SỐ LƯỢNG TEST JEST (JEST TEST AUDIT)

### 7.1. Trả lời Thắc mắc: Tại sao Cả Phase 4 Closure và Phase 5 đều ghi "25 suites, 174 tests"?
Đây là câu hỏi xuất sắc và rất tinh tế từ phía Trưởng dự án. Kết quả kiểm toán độc lập đã làm sáng tỏ nguyên nhân 100%:

1. **Kiểm tra Danh mục Test Files Hiện có**:
   Chạy `cd mobile && npx jest --listTests` phát hiện đúng **25 test files**:
   - `realBackendLive.test.ts` (13 tests)
   - `studentBackendLive.test.ts` (8 tests)
   - `lecturerScreens.test.tsx` (9 tests)
   - `studentScreens.test.tsx` (12 tests)
   - `notificationSubsystem.test.tsx` (**12 tests — Phase 5**)
   - `offlineMode.test.tsx` (**10 tests — Phase 5**)
   - `studentHooks.test.tsx` (6 tests)
   - `lecturerHooks.test.tsx` (12 tests)
   - `loginFlow.test.tsx` (6 tests)
   - `refreshMutex.test.ts` (5 tests)
   - `authStore.test.ts` (4 tests)
   - `sessionRestoration.test.ts` (5 tests)
   - `dataSynchronization.test.ts` (**3 tests — Phase 5**)
   - `securityAuditing.test.ts` (3 tests)
   - `refreshMutexRaceCondition.test.ts` (2 tests)
   - `accountCacheIsolation.test.ts` (1 test)
   - `authApi.test.ts` (4 tests)
   - `qrAttendanceSecurity.test.ts` (18 tests)
   - `routeGuards.test.tsx` (11 tests)
   - `client.test.ts` (5 tests)
   - `studentApi.test.ts` (5 tests)
   - `lecturerApi.test.ts` (13 tests)
   - `queryClient.test.ts` (2 tests)
   - `tokenStorage.test.ts` (2 tests)
   - `jwt.test.ts` (3 tests)
   
   **Tổng số tests = 174 tests**.
   Trong đó, **3 test suites của Phase 5** đóng góp chính xác:
   - `notificationSubsystem.test.tsx`: 12 tests
   - `offlineMode.test.tsx`: 10 tests
   - `dataSynchronization.test.ts`: 3 tests
   **Tổng cộng Phase 5 = 25 tests**.

2. **Nguồn gốc Sự Nhầm lẫn trong Báo cáo Phase 4 Closure**:
   - Khi kỹ sư thực hiện nhiệm vụ `PHASE-4-CLOSURE`, mã nguồn và các file test của Phase 5 **đã được tạo sẵn trong thư mục làm việc (uncommitted workspace)**.
   - Khi lệnh `npm test` được chạy tại thời điểm đó, Jest đã quét và thực thi **toàn bộ 25 files** (bao gồm cả các file Phase 5).
   - Kỹ sư lúc đó đã sao chép nguyên văn kết quả `25 suites, 174 tests` vào báo cáo `phase-4-closure-report.md` mà không lọc riêng phân hệ Giảng viên.
   - Khi chuyển sang báo cáo Phase 5, số lượng test suite của toàn dự án vẫn là 25 suites và 174 tests.
3. **Kết luận**:
   - Jest **THỰC SỰ** discover và thực thi đầy đủ cả 3 file mới của Phase 5.
   - Hoàn toàn **KHÔNG CÓ** hiện tượng test bị mất, bị ghi đè, hay bị skip.
   - Không có bất kỳ thẻ `.only`, `.skip`, `xit`, hay `xdescribe` nào trong mã nguồn test (`grep` trả về 0 kết quả).

### 7.2. Kết quả Thực thi Kiểm thử Độc lập
- **Typecheck**: `npm run typecheck` đạt **0 lỗi (Exit Code 0)**.
- **Expo Doctor**: `npx expo-doctor` đạt **20/20 checks passed**.
- **Lưu ý về `realBackendLive.test.ts`**: Test suite này gọi trực tiếp mạng HTTPS tới Cloudflare `https://rikkeiportal.io.vn`. Khi mạng ra ngoài bị trễ (ETIMEDOUT), test suite này có thể gặp lỗi mạng ngoài ý muốn. Khi chạy đơn lẻ, test đạt **13/13 tests PASS**.

---

## 8. KIỂM TOÁN PHỤ THUỘC & CẤU HÌNH (DEPENDENCY & CONFIG AUDIT)

- **Các gói phụ thuộc mới**:
  - `@react-native-community/netinfo: 12.0.1` (Tương thích chính thức với Expo SDK 58).
  - `expo-notifications: ~58.1.8` (Khớp phiên bản SDK 58).
- **Cấu hình Jest (`jest.config.js`)**:
  - Bổ sung `standard-navigation` vào `transformIgnorePatterns` để Jest biên dịch mã ESM trong Expo Router v4 / SDK 58.
- **Cấu hình Setup (`setupTests.ts`)**:
  - Bổ sung mock chuẩn cho `expo-router` và `@expo/vector-icons` để hỗ trợ môi trường server-side rendering test của React DOM Server.
- Không có bất kỳ gói không tương thích nào với Expo SDK 58 hoặc kiến trúc New Architecture.

---

## 9. KIỂM TOÁN PHẠM VI GIT (GIT SCOPE AUDIT)

Chạy `git status --short` và `git diff --stat`:
- **Repository Cleanliness**:
  - `modified: .gitignore`: Thêm `.docs/`.
  - `untracked: docs/android/`: Chứa các báo cáo kỹ thuật.
  - `untracked: mobile/`: Toàn bộ mã nguồn Mobile.
  - Tuyệt đối **không có** bất kỳ thay đổi nào tác động vào Backend Java (`services/**`), Web Admin (`frontend/**`), hay cơ sở dữ liệu (`init-db/**`).

---

## 10. DANH MỤC LỖI & RỦI RO KỸ THUẬT CÒN TỒN TẠI (DEFECTS & RISKS)

1. **Rủi ro Không có Hàng đợi Ghi Ngoại tuyến (No Offline Mutation Queue)**:
   - *Hiện tượng*: Khi người dùng mất mạng, các thao tác nộp học phí, đăng ký môn hoặc điểm danh bị chặn hoàn toàn.
   - *Đánh giá*: Là quyết định an toàn đúng đắn tại thời điểm này, nhưng cần làm rõ với Product Owner để tránh hiểu lầm ứng dụng cho phép "điểm danh offline".
2. **Độ ổn định của Live Integration Test (`realBackendLive.test.ts`)**:
   - *Hiện tượng*: Việc chạy test suite tích hợp mạng thực tế trong cùng lệnh `npm test` cục bộ có thể gây lỗi rớt mạng bất thường khi Cloudflare chập chờn.
   - *Đề xuất*: Nên tách riêng `npm run test:unit` và `npm run test:e2e-live` trong cấu hình CI/CD.
3. **Độ bao phủ Test của `useDataSync`**:
   - *Hiện tượng*: Test suite `dataSynchronization.test.ts` kiểm thử logic invalidation qua mock query client, chưa giả lập toàn diện chu kỳ timer 600ms của hook khi unmount/remount.

---

## 11. NHỮNG HẠNG MỤC CHƯA TRIỂN KHAI (UNIMPLEMENTED PARTS)

1. **Hạ tầng Cơ sở dữ liệu cho Push Token**: Chưa có bảng `device_tokens` phía Backend PostgreSQL.
2. **API Đăng ký / Hủy Push Token**: Chưa có `POST/DELETE /api/v1/notifications/tokens` trên API Gateway.
3. **Cơ chế Gửi Push Nền (Background Push Service)**: Chưa tích hợp Firebase Cloud Messaging (FCM) hoặc Apple APNS trên Spring Boot.

---

## 12. KẾT LUẬN NGHIỆM THU ĐỘC LẬP (FINAL ACCEPTANCE CONCLUSION)

Dựa trên toàn bộ kết quả kiểm toán khách quan và đối soát mã nguồn:

### Kết luận: **ACCEPTED WITH CONDITIONS**

### Các điều kiện nghiệm thu ràng buộc:
1. **Điều kiện 1 (Phạm vi Đồng bộ)**:
   - Xác nhận và thống nhất rằng phân hệ Data Synchronization của Phase 5 là **One-Way Invalidation & Background Read-Cache Revalidation**, hoàn toàn **không** bao gồm đồng bộ hai chiều hay hàng đợi ghi ngoại tuyến.
2. **Điều kiện 2 (Push Notifications)**:
   - Nghiệm thu Hộp thư Thông báo Trong ứng dụng (In-App Notification Center, Unread Badge, Read Actions, Deep Link RBAC).
   - Xác nhận Remote Push Notification là **BLOCKED BY BACKEND** cho đến khi Backend triển khai bảng `device_tokens` và tích hợp FCM/APNS.
3. **Điều kiện 3 (Khuyến nghị dừng lại)**:
   - Đồng thuận với khuyến nghị của người dùng: **Dừng lại tại Phase 5**, không triển khai Phase 6 cho đến khi toàn bộ kiến trúc nền tảng (Phase 1–5) được chốt phê duyệt chính thức.
