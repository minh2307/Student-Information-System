# BÁO CÁO TRIỂN KHAI CHẾ ĐỘ NGOẠI TUYẾN, THÔNG BÁO & ĐỒNG BỘ DỮ LIỆU (PHASE 5)
## RIKKEI EDUPORTAL MOBILE — OFFLINE MODE, PUSH NOTIFICATIONS & DATA SYNCHRONIZATION IMPLEMENTATION REPORT

> **Dự án**: Rikkei EduPortal Mobile (Android & iOS)  
> **Giai đoạn**: Phase 5 — Chế độ Ngoại tuyến, Thông báo & Đồng bộ Dữ liệu  
> **Tài liệu**: `docs/android/phase-5-implementation-report.md`  
> **Kỹ sư chịu trách nhiệm**: Senior React Native Engineer / Mobile Integration Specialist  
> **Ngày hoàn thành**: 11/11/2026  
> **Trạng thái Nghiệm thu**: **ACCEPTED WITH CONDITIONS** (Nghiệm thu có điều kiện do giới hạn tính năng từ Backend)

---

## 1. TỔNG QUAN TRIỂN KHAI

Phase 5 tập trung hoàn thiện khả năng hoạt động khi mất kết nối Internet, cơ chế đồng bộ dữ liệu tự động khi có mạng trở lại, và hệ thống thông báo cho ứng dụng Rikkei EduPortal Mobile trên nền tảng React Native (Expo SDK 58, TypeScript, TanStack Query v5, Zustand, Axios, Expo SecureStore, NetInfo, Expo Notifications).

Khác với Phase 3 (dành riêng cho Sinh viên) và Phase 4 (dành riêng cho Giảng viên), Phase 5 cung cấp nền tảng dùng chung cốt lõi cho cả hai vai trò trên cùng một codebase duy nhất. Toàn bộ tính năng đã được kiểm thử, tích hợp an toàn mà không làm ảnh hưởng đến bất kỳ nghiệp vụ nào của Phase 1, Phase 2, Phase 3 và Phase 4.

### Tóm tắt Trạng thái Nghiệm thu (Acceptance Conclusion):
- **Phạm vi A — Offline Mode**: **ACCEPTED** (Hoàn thành 100%, bảo mật cách ly theo tài khoản tuyệt đối).
- **Phạm vi B — In-App Notifications**: **ACCEPTED** (Hộp thư thông báo, badge chưa đọc, phân loại danh mục, điều hướng RBAC deep link hoạt động trơn tru).
- **Phạm vi B — Remote Push Notifications**: **BLOCKED BY BACKEND** (Backend thực tế chưa xây dựng API đăng ký device token và chưa tích hợp dịch vụ push FCM/APNS; Mobile ghi nhận trạng thái minh bạch, không giả lập dữ liệu).
- **Phạm vi C — Data Synchronization**: **ACCEPTED** (Chính sách đồng bộ 10 tài nguyên rõ ràng, cơ chế debounce chống bão request, bảo tồn single-flight refresh mutex).

---

## 2. DANH MỤC CÁC CHỨC NĂNG ĐÃ TRIỂN KHAI CHI TIẾT

### 2.1. Phạm vi A — Chế độ Ngoại tuyến (Offline Mode)
1. **Lưu đệm Dữ liệu Ngoại tuyến (Offline Data Cache)**:
   - Sử dụng TanStack Query kết hợp AsyncStorage lưu trữ dữ liệu đọc an toàn theo từng vai trò:
     - **Sinh viên**: Tổng quan Dashboard, Thời khóa biểu, Lịch thi, Bảng điểm, Thông tin Học phí, Hồ sơ sinh viên.
     - **Giảng viên**: Tổng quan Dashboard, Thời khóa biểu giảng dạy, Danh sách lớp học phần, Danh sách sinh viên, Hồ sơ giảng viên.
   - Tuyệt đối **không lưu trữ** mã QR điểm danh động (TOTP 15s) vào cache (`staleTime = 0, gcTime = 0`).
2. **Cách ly Dữ liệu Theo Tài khoản Tuyệt đối (User-Scoped Cache Isolation)**:
   - Toàn bộ Query Key được định danh duy nhất theo User ID (ví dụ: `['student', 'user_4', 'timetable', ...]`).
   - Ngăn chặn hoàn toàn việc Sinh viên A xem cache của Sinh viên B hoặc Sinh viên xem dữ liệu Giảng viên trên cùng một thiết bị.
   - Thao tác Đăng xuất (kể cả khi đang **ngoại tuyến**) xóa sạch bộ nhớ tạm RAM (`queryClient.clear()`), xóa bỏ token phần cứng (`SecureStore.deleteItemAsync`) và xóa sạch namespace của tài khoản trong `AsyncStorage`.
3. **Chỉ báo Trực quan & Trải nghiệm Người dùng (Offline UI Indicators)**:
   - **`OfflineIndicator`**: Banner thông báo màu vàng cảnh báo người dùng đang ở chế độ ngoại tuyến, kèm nút "Thử lại".
   - **`LastSyncedIndicator`**: Hiển thị thời điểm đồng bộ thành công gần nhất ("Đồng bộ lúc: HH:mm") và nhãn "Dữ liệu lưu tạm" khi mất mạng, không gây nhầm lẫn với dữ liệu thời gian thực.
   - **`OfflineEmptyState`**: Màn hình rỗng thân thiện khi người dùng xem mục chưa từng được đồng bộ về máy.
4. **Bảo vệ Thao tác Ghi Dữ liệu Ngoại tuyến (Offline Action Guard)**:
   - Hook `useRequireOnlineAction` chặn các thao tác ghi nhạy cảm (Đăng ký học phần, Quét QR điểm danh, Cập nhật điểm, Thanh toán học phí) khi mất kết nối mạng.
   - Hiển thị thông báo giải thích rõ ràng bằng tiếng Việt; không tự ý tạo hàng đợi gửi lặp request hay hiển thị thành công giả khi Backend chưa hỗ trợ Idempotency Key.

---

### 2.2. Phạm vi B — Hệ thống Thông báo (Push & In-App Notifications)
1. **Khảo sát Năng lực Backend Thực tế (Backend Discovery)**:
   - Đã kiểm tra toàn bộ mã nguồn `enrollment-service`, `api-gateway`, `auth-service` và cơ sở dữ liệu PostgreSQL.
   - Lập tài liệu hợp đồng kỹ thuật: `docs/android/phase-5-notification-api-contract.md`.
   - Kết quả xác minh trực tiếp:
     - `GET /api/v1/notifications` -> **VERIFIED (200 OK)**
     - `PUT /api/v1/notifications/{id}/read` -> **VERIFIED (200 OK)**
     - `PUT /api/v1/notifications/read-all` -> **VERIFIED (200 OK)**
     - `GET /api/v1/announcements` -> **VERIFIED (200 OK)**
     - `POST /api/v1/notifications/tokens` -> **BLOCKED / NOT IMPLEMENTED**
2. **Hộp thư Thông báo Trong Ứng dụng (In-App Notification Center Modal)**:
   - Modal hiển thị danh sách thông báo người dùng với giao diện chuyên nghiệp.
   - Hỗ trợ bộ lọc thông báo: "Tất cả" và "Chưa đọc".
   - Phân loại danh mục trực quan kèm Icon và màu sắc chủ đề (`SCHEDULE`, `EXAM`, `GRADE`, `TUITION`, `ACADEMIC`).
   - Đánh dấu đã đọc từng thông báo với Optimistic Update và đánh dấu tất cả đã đọc.
3. **Nút Chuông Thông báo Trên Thanh Tiêu đề (Notification Bell Button)**:
   - Tích hợp tại Header của cả phân hệ Sinh viên (`app/(student)/_layout.tsx`) và Giảng viên (`app/(lecturer)/_layout.tsx`).
   - Badge hiển thị số lượng thông báo chưa đọc cập nhật tự động theo thời gian thực (hỗ trợ hiển thị `99+`).
4. **Kiểm soát An ninh Điều hướng Deep Link (RBAC Deep Link Security Guard)**:
   - Hàm `resolveNotificationRoute` phân tích `linkUrl` đính kèm trong thông báo:
     - Nếu chưa đăng nhập: Chuyển hướng bắt buộc về `/(auth)/login` (`UNAUTHENTICATED`).
     - Nếu Sinh viên nhấn vào thông báo có link Giảng viên (`/(lecturer)/*`): Chặn truy cập và chuyển về `/(student)/dashboard` (`ROLE_MISMATCH`).
     - Nếu Giảng viên nhấn vào thông báo có link Sinh viên (`/(student)/*`): Chặn truy cập và chuyển về `/(lecturer)/dashboard` (`ROLE_MISMATCH`).
5. **Đăng ký Push Token Phía Thiết bị**:
   - Khởi tạo Notification Channel `rikkei-default` trên Android (High Importance, Vibration, Lights).
   - Yêu cầu cấp quyền thông báo người dùng đúng chuẩn qua `expo-notifications`.
   - Hàm `registerPushTokenWithBackend` ghi nhận trạng thái **`BLOCKED_BY_BACKEND`**, giải thích chi tiết trong log và không giả lập thành công.

---

### 2.3. Phạm vi C — Đồng bộ Dữ liệu (Data Synchronization)
1. **Chính sách Đồng bộ Hóa Tài nguyên (`SYNC_POLICIES`)**:
   - Ban hành bảng chuẩn thời gian sống của dữ liệu trên 10 loại tài nguyên học vụ (`DASHBOARD`, `TIMETABLE`, `EXAMS`, `GRADES`, `TUITION`, `NOTIFICATIONS`, `LECTURER_SCHEDULE`, `LECTURER_CLASSES`, `PROFILE`, `ATTENDANCE`).
   - Phân biệt rõ ràng: `staleTime` (thời gian dữ liệu còn mới), `gcTime` (thời gian lưu giữ bộ đệm trước khi giải phóng bộ nhớ), và `refetchOnReconnect` (tự động làm mới khi có mạng).
2. **Cơ chế Tự động Làm mới khi Có mạng Trở lại (Auto-Reconnect Coordinator)**:
   - Hook `useDataSync` lắng nghe sự thay đổi trạng thái từ `@react-native-community/netinfo`.
   - Áp dụng bộ đếm **Debounce 600ms** để tránh các đợt phát request dồn dập khi mạng vừa chập chờn khôi phục.
   - Cơ chế cờ khóa `syncLockRef` ngăn chặn Request Storming.
   - Tự động làm mới có chọn lọc các active query tương ứng với vai trò của người dùng hiện tại (`STUDENT` hoặc `LECTURER`).
3. **Bảo tồn Tuyệt đối Cơ chế Single-Flight Refresh Mutex**:
   - Cơ chế giải quyết tranh chấp làm mới token (Phase 1–2) được duy trì nguyên vẹn: Khi kết nối mạng khôi phục lúc Access Token đã hết hạn, hệ thống chỉ gửi duy nhất 1 request refresh token lên Gateway, ngăn ngừa triệt để lỗi xung đột `401 Unauthorized` hàng loạt.

---

## 3. DANH SÁCH FILE VÀ TÀI NGUYÊN ĐÃ TẠO / CHỈNH SỬA

| STT | Đường dẫn File | Loại thay đổi | Trách nhiệm chức năng |
|:---:|:---|:---:|:---|
| 1 | `mobile/src/features/offline/types.ts` | **Mới** | Kiểu dữ liệu TypeScript cho NetworkState, OfflineContext, LastSynced |
| 2 | `mobile/src/features/offline/useNetworkStatus.ts` | **Mới** | Hook theo dõi trạng thái kết nối mạng qua NetInfo |
| 3 | `mobile/src/features/offline/OfflineContext.tsx` | **Mới** | React Context & Provider chia sẻ trạng thái offline toàn app |
| 4 | `mobile/src/features/offline/components/OfflineIndicator.tsx` | **Mới** | Banner cảnh báo trạng thái ngoại tuyến |
| 5 | `mobile/src/features/offline/components/LastSyncedIndicator.tsx` | **Mới** | Chỉ báo thời gian đồng bộ và nhãn dữ liệu lưu tạm |
| 6 | `mobile/src/features/offline/components/OfflineEmptyState.tsx` | **Mới** | Giao diện rỗng khi offline chưa có dữ liệu cache |
| 7 | `mobile/src/features/offline/hooks/useRequireOnlineAction.ts` | **Mới** | Hook chặn các thao tác ghi nhạy cảm khi mất mạng |
| 8 | `mobile/src/features/offline/index.ts` | **Mới** | Module barrel export cho phân hệ Offline |
| 9 | `mobile/src/features/notifications/types.ts` | **Mới** | Kiểu dữ liệu NotificationDto, PushRegistrationResult |
| 10 | `mobile/src/features/notifications/services/notificationApi.ts` | **Mới** | API Service cho thông báo & push registration |
| 11 | `mobile/src/features/notifications/hooks/useNotifications.ts` | **Mới** | TanStack Query hook, unread count & optimistic updates |
| 12 | `mobile/src/features/notifications/hooks/useNotificationPermission.ts` | **Mới** | Xử lý cấp quyền thông báo & Android Channel |
| 13 | `mobile/src/features/notifications/utils/notificationDeepLink.ts` | **Mới** | Bộ giải quyết điều hướng Deep Link kèm kiểm tra RBAC |
| 14 | `mobile/src/features/notifications/components/NotificationCenterModal.tsx` | **Mới** | Giao diện Modal Hộp thư thông báo trong app |
| 15 | `mobile/src/features/notifications/components/NotificationBellButton.tsx` | **Mới** | Nút chuông thông báo kèm badge chưa đọc trên Header |
| 16 | `mobile/src/features/notifications/index.ts` | **Mới** | Module barrel export cho phân hệ Thông báo |
| 17 | `mobile/src/features/sync/types.ts` | **Mới** | Kiểu dữ liệu chính sách đồng bộ SyncPolicyDefinition |
| 18 | `mobile/src/features/sync/syncPolicy.ts` | **Mới** | Bảng chính sách thời gian sống cho 10 loại tài nguyên |
| 19 | `mobile/src/features/sync/useDataSync.ts` | **Mới** | Hook điều phối đồng bộ tự động khi có mạng với debounce & lock |
| 20 | `mobile/src/features/sync/index.ts` | **Mới** | Module barrel export cho phân hệ Đồng bộ |
| 21 | `mobile/src/providers/AppProviders.tsx` | Cập nhật | Tích hợp OfflineProvider vào cây component gốc |
| 22 | `mobile/src/api/endpoints.ts` | Cập nhật | Thêm endpoint `MARK_ALL_READ` và `ANNOUNCEMENTS` |
| 23 | `mobile/app/(student)/dashboard.tsx` | Cập nhật | Tích hợp OfflineIndicator & LastSyncedIndicator |
| 24 | `mobile/app/(student)/_layout.tsx` | Cập nhật | Gắn NotificationBellButton vào header sinh viên |
| 25 | `mobile/app/(lecturer)/dashboard.tsx` | Cập nhật | Tích hợp OfflineIndicator & LastSyncedIndicator |
| 26 | `mobile/app/(lecturer)/_layout.tsx` | Cập nhật | Gắn NotificationBellButton vào header giảng viên |
| 27 | `mobile/tests/setupTests.ts` | Cập nhật | Thêm mock NetInfo, Expo Notifications, Expo Router, Icons |
| 28 | `mobile/jest.config.js` | Cập nhật | Cấu hình transformIgnorePatterns cho standard-navigation |
| 29 | `mobile/tests/features/offline/offlineMode.test.tsx` | **Mới** | Bộ 7 bài test Chế độ Ngoại tuyến & Cách ly Cache |
| 30 | `mobile/tests/features/notifications/notificationSubsystem.test.tsx` | **Mới** | Bộ bài test Hộp thư Thông báo, Push Block & Deep Link RBAC |
| 31 | `mobile/tests/features/sync/dataSynchronization.test.ts` | **Mới** | Bộ 3 bài test Chính sách Đồng bộ & Chống Request Storm |
| 32 | `docs/android/phase-5-notification-api-contract.md` | **Mới** | Hợp đồng API và bằng chứng khảo sát Backend thực tế |
| 33 | `docs/android/phase-5-offline-sync-design.md` | **Mới** | Thiết kế chi tiết kiến trúc Offline & Đồng bộ dữ liệu |
| 34 | `docs/android/phase-5-implementation-report.md` | **Mới** | Báo cáo triển khai toàn diện Phase 5 |

---

## 4. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG & BẢO ĐẢM CHẤT LƯỢNG

Toàn bộ hệ thống kiểm thử tự động của ứng dụng Rikkei EduPortal Mobile đã được thực thi và xác nhận thành công tuyệt đối:

### 4.1. Kết quả Kiểm thử Jest Test Suite
```bash
$ npm test -- --runInBand --forceExit

PASS tests/integration/realBackendLive.test.ts
PASS tests/integration/studentBackendLive.test.ts
PASS tests/features/lecturer/lecturerScreens.test.tsx
PASS tests/features/student/studentScreens.test.tsx
PASS tests/features/offline/offlineMode.test.tsx
PASS tests/features/notifications/notificationSubsystem.test.tsx
PASS tests/features/student/studentHooks.test.tsx
PASS tests/features/lecturer/lecturerHooks.test.tsx
PASS tests/features/auth/loginFlow.test.tsx
PASS tests/api/refreshMutex.test.ts
PASS tests/security/securityAuditing.test.ts
PASS tests/stores/authStore.test.ts
PASS tests/security/accountCacheIsolation.test.ts
PASS tests/features/lecturer/lecturerApi.test.ts
PASS tests/providers/queryClient.test.ts
PASS tests/stores/sessionRestoration.test.ts
PASS tests/features/sync/dataSynchronization.test.ts
PASS tests/features/lecturer/qrAttendanceSecurity.test.ts
PASS tests/api/refreshMutexRaceCondition.test.ts
PASS tests/features/auth/authApi.test.ts
PASS tests/guards/routeGuards.test.tsx
PASS tests/api/client.test.ts
PASS tests/features/student/studentApi.test.ts
PASS tests/storage/tokenStorage.test.ts
PASS tests/utils/jwt.test.ts

Test Suites: 25 passed, 25 total
Tests:       174 passed, 174 total
Snapshots:   0 total
Time:        26.188 s
```
- **Tổng số Test Suites**: 25/25 đạt (100%).
- **Tổng số Tests**: 174/174 đạt (100%).
- Không có bất kỳ hồi quy (regression) nào trên các phân hệ Auth, Sinh viên, Giảng viên đã bàn giao trước đó.

### 4.2. Kết quả Kiểm tra Kiểu TypeScript (Typecheck)
```bash
$ npm run typecheck
> mobile@1.0.0 typecheck
> tsc --noEmit
# Hoàn thành 100% không phát sinh lỗi kiểu dữ liệu (0 errors).
```

### 4.3. Kết quả Kiểm tra Tính tương thích Expo Doctor
```bash
$ npx expo-doctor
20/20 checks passed. No issues detected!
```
- Mọi gói phụ thuộc (`@react-native-community/netinfo: 12.0.1`, `expo-notifications: ~58.1.8`, `expo-secure-store: ~15.0.8`) hoàn toàn tương thích với Expo SDK 58 và kiến trúc New Architecture của React Native.

---

## 5. ĐIỀU KIỆN NGHIỆM THU & ĐỀ XUẤT CHO ĐỘI NGŨ BACKEND

Do tuân thủ nguyên tắc **"Không tự ý thay đổi Backend để phục vụ Mobile"**, tính năng Remote Push Notification được đánh giá ở trạng thái **ACCEPTED WITH CONDITIONS**. Dưới đây là các điều kiện cụ thể và đề xuất kỹ thuật gửi đến đội ngũ phát triển Backend để hoàn thiện tính năng này trong tương lai:

### 5.1. Khởi tạo Bảng Lưu trữ Device Token trong Cơ sở dữ liệu
Đề xuất khởi tạo bảng `device_tokens` trong PostgreSQL (`enrollment-service` hoặc `auth-service`):
```sql
CREATE TABLE IF NOT EXISTS device_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token VARCHAR(255) NOT NULL,
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('ANDROID', 'IOS', 'EXPO')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_device_token UNIQUE (user_id, device_token)
);

CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
```

### 5.2. Triển khai API Đăng ký và Hủy đăng ký Push Token
Đề xuất bổ sung các endpoints sau vào Controller quản trị thông báo:
- `POST /api/v1/notifications/tokens`: Đăng ký hoặc kích hoạt lại Device Token gắn với User hiện tại trích xuất từ JWT.
- `DELETE /api/v1/notifications/tokens`: Vô hiệu hóa Device Token khi người dùng bấm Đăng xuất.

### 5.3. Tích hợp Dịch vụ Gửi Push (FCM / APNS)
- Tích hợp Firebase Admin SDK hoặc Expo Server SDK vào Spring Boot microservice.
- Kích hoạt gửi thông báo đẩy ngầm khi phát sinh các sự kiện học vụ quan trọng:
  - Sinh viên được công bố điểm thi mới.
  - Nhắc nhở lịch thi trước 24 giờ.
  - Nhắc nhở hạn nộp học phí trước 3 ngày.
  - Giảng viên được phân công lớp học phần mới hoặc lịch dạy có sự thay đổi.

---

## 6. SẴN SÀNG CHUYỂN GIAO & KẾ HOẠCH BÀN GIAO

Toàn bộ mã nguồn, cấu hình, bài kiểm thử tự động và tài liệu kiến trúc của **Phase 5** đã được hoàn thiện chỉn chu và sẵn sàng cho việc nghiệm thu chuyển giao:
- Ứng dụng di động Rikkei EduPortal Mobile sở hữu khả năng chịu lỗi cao, vận hành bền bỉ khi mất kết nối mạng.
- Giao diện thân thiện, minh bạch, bảo vệ dữ liệu cá nhân tối đa theo tiêu chuẩn bảo mật ngân hàng/doanh nghiệp.
- Sẵn sàng chuyển giao cho người dùng đánh giá và chuẩn bị cho các bước tiếp theo của dự án.
