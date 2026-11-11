# BIÊN BẢN NGHIỆM THU ĐỘC LẬP — PHASE 3
## STUDENT FEATURES ACCEPTANCE AUDIT (RIKKEI EDUPORTAL MOBILE)

> **Dự án**: Rikkei EduPortal — Student Information System  
> **Phân hệ**: Mobile Application (React Native + Expo SDK 58 + TypeScript)  
> **Giai đoạn**: Phase 3 – Student Mobile Features Implementation  
> **Kiểm toán viên**: Senior Mobile QA Lead / Independent Security & Acceptance Auditor  
> **Môi trường Backend Thực tế**: `https://rikkeiportal.io.vn/` (Production API Gateway & Microservices)  
> **Ngày thực hiện**: 11/11/2026  
> **Kết luận Nghiệm thu**: **ACCEPTED WITH CONDITIONS (Nghiệm thu có điều kiện)**  

---

## 1. Tóm Tắt Kết Quả Nghiệm Thu (Executive Summary)

Đội ngũ kiểm toán độc lập đã tiến hành rà soát chuyên sâu toàn bộ mã nguồn, tài liệu thiết kế, hợp đồng API, logic nghiệp vụ, tính toàn vẹn bảo mật cache và kết quả chạy test tự động của **Phase 3 — Student Features**.

### Bảng Tổng Hợp Đánh Giá 8 Hạng Mục
| Hạng mục Kiểm tra | Trạng thái | Đánh giá Tóm tắt |
| :--- | :---: | :--- |
| **1. Tài liệu Kỹ thuật** | **PASS** | Hợp đồng API Contract (`phase-3-student-api-contract.md`) và Báo cáo (`phase-3-implementation-report.md`) đầy đủ, chuẩn xác, khớp 100% với Backend DTOs. |
| **2. Student API Audit** | **PASS** | 7 endpoint sinh viên đối soát trực tiếp với mã nguồn Spring Boot (`StudentPortalController.java`, `TuitionController.java`, `ProfileController.java`) và live production `https://rikkeiportal.io.vn`. |
| **3. Business Logic Audit** | **PASS** | Toàn bộ Dashboard, Timetable, Exams, Grades, Tuition, Profile đều lấy dữ liệu thật, không tự bịa công thức C-GPA, không hardcode mock data. |
| **4. Tuition & VietQR Audit** | **PASS** | **Mã VietQR Napas247 do Backend tạo 100%** qua `VietQrPayloadGenerator`. Không tự ý tạo QR giả, không tuyên bố "đã thanh toán" chỉ vì hiển thị QR. |
| **5. Cache & Security Audit** | **PASS** | Phân lập cache triệt để theo `userId`, xóa sạch RAM và `SecureStore` khi logout. Không rò rỉ dữ liệu giữa Student A và Student B. |
| **6. Test Suite & Coverage** | **WARNING** | TypeScript: 0 lỗi. Live Backend: 8/8 PASS. Tuy nhiên, Full Jest suite bị **2 suites fail** do file `dashboard.tsx` bị gắn component `OfflineIndicator` chưa có fallback an toàn từ nhánh Phase 5 đang phát dở. |
| **7. Cross-Platform & Expo** | **PASS** | `expo-doctor` đạt 20/20 checks PASS. `expo config --type public` hợp lệ, hỗ trợ iOS và Android đồng nhất. |
| **8. Git Scope Boundaries** | **PASS** | 100% không chạm Backend, Web Frontend, Database, Docker. |

---

## 2. Chi Tiết Kiểm Toán API & Đối Soát Backend Thực Tế

Kiểm toán viên đã đọc trực tiếp mã nguồn Java Spring Boot của `services/enrollment-service` và `services/auth-service` để đối chiếu từng trường DTO:

### 2.1. Student Dashboard (`GET /api/v1/student/dashboard`)
- **Backend Controller**: `StudentPortalController.java:64-69`.
- **Backend Service**: `StudentDashboardService.java`.
- **Response DTO**: `StudentDashboardResponse` gồm:
  - `stats`: `registeredCourses`, `weeklyClasses`, `pendingRegistrations`, `scheduleConflicts`.
  - `semesterProgress`: `creditsEarned`, `totalRequiredCredits`, `attendanceRate`, `currentCgpa`, `previousCgpa`, `academicStanding`.
  - `upcomingClasses`: `List<UpcomingClassDto>`.
- **Mobile Mapping**: [`dashboard.tsx`](file:///home/nguyen-son-minh/Downloads/Student-Information-System-main/mobile/app/(student)/dashboard.tsx) đọc trực tiếp từ `useStudentDashboard()`. Các chỉ số KPI được lấy nguyên bản từ server, không tự tính toán hay suy đoán.

### 2.2. Timetable (`GET /api/v1/student/timetable`)
- **Backend Controller**: `StudentPortalController.java:75-82`.
- **Response DTO**: `List<UpcomingClassDto>` (`courseCode`, `courseName`, `dayOfWeek`, `startTime`, `endTime`, `roomName`, `lecturerName`, `credits`, `status`).
- **Timezone Audit**: Backend trả về `LocalTime` dạng chuỗi `"09:00"` hoặc `"13:00:00"`. Mobile xử lý qua `formatTime()` bằng cách cắt chuỗi chu vi 5 ký tự (`substring(0, 5)`), **tuyệt đối không đưa qua `new Date()`** nên không bị lệch múi giờ UTC+7.

### 2.3. Exams (`GET /api/v1/student/exams`)
- **Backend Controller**: `StudentPortalController.java:88-95`.
- **Response DTO**: `List<ExamScheduleDto>` (`id`, `courseCode`, `courseName`, `credits`, `examDate`, `startTime`, `endTime`, `roomName`, `examType`, `notes`).
- **Mobile Mapping**: [`exams.tsx`](file:///home/nguyen-son-minh/Downloads/Student-Information-System-main/mobile/app/(student)/exams.tsx) sắp xếp theo `examDate` và `startTime`, phân chia ca thi "Sắp tới" và "Đã kết thúc" dựa trên chuỗi ngày ISO `YYYY-MM-DD`.

### 2.4. Grades (`GET /api/v1/student/grades`)
- **Backend Controller**: `StudentPortalController.java:233-238`.
- **Response DTO**: `List<StudentGradeDto>` (`enrollmentId`, `courseCode`, `courseName`, `credits`, `semesterName`, `attendanceScore`, `midtermScore`, `finalScore`, `totalScore`, `letterGrade`, `isLocked`).
- **Audit logic**: [`grades.tsx`](file:///home/nguyen-son-minh/Downloads/Student-Information-System-main/mobile/app/(student)/grades.tsx) hiển thị trực tiếp `attendanceScore`, `midtermScore`, `finalScore`, `totalScore`, và `letterGrade`. Ứng dụng **không tự tính điểm tổng kết hay GPA**, tôn trọng hoàn toàn kết quả học vụ từ Backend.

### 2.5. Profile (`GET /api/v1/profile/me` & `PUT /api/v1/profile/me`)
- **Backend Controller**: `ProfileController.java`.
- **Response DTO**: `UserProfileResponse` (`user`, `studentProfile`, `lecturerProfile`).
- **Update Profile**: Cho phép cập nhật `fullName`, `email`, `phone`. Không cho phép sửa `studentCode`, `cgpa`, `creditsEarned` từ phía client.

---

## 3. Kiểm Toán Chuyên Sâu Phân Hệ Học Phí & VietQR (Tuition Audit)

> **CẢNH BÁO QUAN TRỌNG**: Đây là hạng mục kiểm tra bắt buộc phải xác minh nguồn gốc mã QR và luồng giao dịch.

### 3.1. Nguồn Gốc Dữ Liệu VietQR
Kiểm tra mã nguồn `services/enrollment-service/src/main/java/com/rikkei/eduportal/enrollment/service/TuitionService.java:198-208`:
```java
// Khởi tạo VietQR Payload chuẩn EMVCo & QuickLink cho từng ngân hàng hỗ trợ
String mbPayload = VietQrPayloadGenerator.generatePayload(MB_BIN, DEFAULT_ACCOUNT_NO, qrAmountLong, transferContent);
String mbQuickLink = VietQrPayloadGenerator.generateQuickLink(MB_BIN, DEFAULT_ACCOUNT_NO, qrAmountLong, transferContent, DEFAULT_ACCOUNT_NAME);

String vietinPayload = VietQrPayloadGenerator.generatePayload(VIETIN_BIN, DEFAULT_ACCOUNT_NO, qrAmountLong, transferContent);
String vietinQuickLink = VietQrPayloadGenerator.generateQuickLink(VIETIN_BIN, DEFAULT_ACCOUNT_NO, qrAmountLong, transferContent, DEFAULT_ACCOUNT_NAME);
```
- **Xác nhận 1**: Mã QR và link ảnh QR (`vietQrQuickLink`) **do chính Backend tạo ra 100%**, Mobile chỉ nhận URL từ API `GET /api/v1/student/tuition` và render qua `<Image source={{ uri: tuition.vietQrQuickLink }} />`. Mobile không tự tạo chuỗi VietQR hay link giả mạo.
- **Xác nhận 2**: Cú pháp chuyển khoản chuẩn hóa từ Backend: `HP <MSSV> <HOCKY>` (Ví dụ: `HP SV2024001 2024-25_SEM2`).
- **Xác nhận 3**: Thông tin thụ hưởng chính thức từ Backend:
  - Ngân hàng chính: MB Bank (BIN `970422`) hoặc VietinBank (BIN `970415`).
  - Số tài khoản: `999988882025`.
  - Tên người thụ hưởng: `HOC VIEN CONG NGHE RIKKEI`.
  - Số tiền mã hóa trong QR: Chính xác bằng số tiền còn nợ (`remainingAmount`).

### 3.2. Trạng Thái Thanh Toán Trên Mobile
- Mobile phân biệt 4 trạng thái học phí từ DTO: `PAID` (Đã hoàn thành), `PARTIAL` (Đã nộp một phần), `UNPAID` (Chưa thanh toán), `NOT_ENROLLED` (Chưa phát sinh).
- **Tuyệt đối không hiểu việc hiển thị QR là đã thanh toán**:
  - Khi trạng thái là `UNPAID` hoặc `PARTIAL`, ứng dụng hiển thị rõ số tiền còn nợ và huy hiệu màu đỏ/vàng `Chưa thanh toán`.
  - Chỉ khi Backend trả về `status: "PAID"` và `remainingAmount: 0`, ứng dụng mới ẩn mã QR và hiển thị huy hiệu xanh `Đã hoàn thành`.
  - Không có chức năng "Xác nhận đã thanh toán giả" (mock checkout button) trên Mobile.

---

## 4. Kiểm Toán An Ninh & Phân Lập Bộ Nhớ Đệm (Zero-Leakage Assurance)

### 4.1. Quy Trình Chuyển Đổi Tài Khoản (Student A -> Student B)
Kiểm tra thực tế qua test [`accountCacheIsolation.test.ts`](file:///home/nguyen-son-minh/Downloads/Student-Information-System-main/mobile/tests/security/accountCacheIsolation.test.ts):
1. Khi Student A (`sv2024001`) bấm Đăng xuất:
   - `authStore.logout()` thực hiện gọi API hủy token trên server.
   - Xóa Access Token và Refresh Token trong phần cứng **SecureStore**.
   - Xóa toàn bộ profile lưu tạm trong `AsyncStorage`.
   - Gọi `clearQueryCache()` để giải phóng toàn bộ dữ liệu trong bộ nhớ RAM của TanStack Query.
2. Khi Student B đăng nhập:
   - Toàn bộ query cache của Student A không còn tồn tại (`getQueryData` trả về `undefined`).
   - Query keys đều được gắn kèm scope định danh sinh viên: `['student', scope, 'dashboard']`, ngăn chặn tuyệt đối việc Student B nhìn thấy thời khóa biểu, lịch thi, bảng điểm của Student A.

### 4.2. Xử Lý Khi Mất Mạng (Offline Logout)
Trong `mobile/src/stores/authStore.ts:110-146`, khối `finally` luôn luôn thực thi:
```typescript
finally {
  await tokenStorage.clearTokens();
  await AsyncStorage.removeItem(...);
  await clearQueryCache();
  set({ user: null, studentProfile: null, isAuthenticated: false, ... });
}
```
Ngay cả khi thiết bị mất kết nối mạng và request gọi Backend `authApi.logout()` bị timeout hoặc lỗi mạng, toàn bộ dữ liệu xác thực, token và cache cục bộ trên thiết bị đều bị xóa sạch 100%.

---

## 5. Kiểm Toán Test Suite & Nhật Ký Lệnh Thực Tế

### 5.1. Nhật Ký Chạy 4 Lệnh Bắt Buộc

#### Lệnh 1: `npm run typecheck`
- **Thư mục**: `/mobile`
- **Lệnh**: `npm run typecheck` (`tsc --noEmit`)
- **Exit Code**: **`0` (PASS)**
- **Kết quả**: 0 lỗi TypeScript trên toàn bộ project.

#### Lệnh 2: `npm test -- --runInBand --forceExit`
- **Thư mục**: `/mobile`
- **Lệnh**: `npm test -- --runInBand --forceExit`
- **Exit Code**: **`1` (FAIL)**
- **Kết quả**: **20 passed, 2 failed, 22 total suites (140 passed, 6 failed, 146 total tests)**.

#### Lệnh 3: `npx expo-doctor`
- **Thư mục**: `/mobile`
- **Lệnh**: `npx expo-doctor`
- **Exit Code**: **`0` (PASS)**
- **Kết quả**: `20/20 checks passed. No issues detected!`.

#### Lệnh 4: `npx expo config --type public`
- **Thư mục**: `/mobile`
- **Lệnh**: `npx expo config --type public`
- **Exit Code**: **`0` (PASS)**
- **Kết quả**: Cấu hình Expo SDK 58 hợp lệ, `bundleIdentifier: "com.rikkei.eduportal"`, `package: "com.rikkei.eduportal"`.

---

## 6. Phân Tích Nguyên Nhân Gốc (Root-Cause Analysis) Lỗi Test

### 6.1. Chi Tiết Lỗi Tại Lệnh 2 (`npm test`)
Trong lần chạy Full Jest Suite, 2 test suites bị thất bại:
1. `tests/features/student/studentScreens.test.tsx` (DashboardScreen)
2. `tests/features/lecturer/lecturerScreens.test.tsx` (LecturerDashboardScreen)

**Thông báo lỗi từ Jest Console**:
```
useOffline must be used within an OfflineProvider
  49 |   const context = useContext(OfflineContext);
  50 |   if (!context) {
> 51 |     throw new Error('useOffline must be used within an OfflineProvider');
     |           ^
     at useOffline (src/features/offline/OfflineContext.tsx:51:11)
     at OfflineIndicator (src/features/offline/components/OfflineIndicator.tsx:36:54)
     at DashboardScreen (mobile/app/(student)/dashboard.tsx:65:7)
```

### 6.2. Nguồn Gốc Lỗi (Root Cause)
1. Trong quá trình bắt đầu chuẩn bị Phase 5 (Offline & Sync), thư mục `mobile/src/features/offline/` đã được tạo và component `<OfflineIndicator />` được import trực tiếp vào đầu file `mobile/app/(student)/dashboard.tsx:25` và `mobile/app/(lecturer)/dashboard.tsx:24`.
2. Hook `useOffline()` trong `OfflineContext.tsx:51` có logic kiểm tra nghiêm ngặt: nếu không nằm trong `<OfflineProvider>` thì lập tức ném ngoại lệ (`throw new Error(...)`).
3. Khi chạy ứng dụng thật thông qua `_layout.tsx`, `<OfflineProvider>` bọc ngoài toàn bộ ứng dụng nên chạy bình thường. Nhưng khi chạy unit test isolated của `DashboardScreen` (`renderToStaticMarkup(<DashboardScreen />)`), không có `<OfflineProvider>` bao quanh, dẫn đến component bị crash.
4. **Đánh giá kiểm toán**: Đây là lỗi **rò rỉ mã chưa hoàn thiện từ Phase 5** (Coupling Leakage) vào mã nguồn của Phase 3 & 4. Bản thân logic của Sinh viên (Dashboard, Timetable, Exams, Grades, Tuition, Profile) và API kết nối Backend hoàn toàn chính xác (8/8 Live tests PASS, 5/5 Student API tests PASS, 6/6 Student Hooks tests PASS).

---

## 7. Ranh Giới Phạm Vi Git (Git Scope Audit)

- **`git status --short`**:
  - `M .gitignore` (Chỉ thêm `.docs/` vào danh sách loại trừ).
  - Không có file nào ngoài `mobile/` và `docs/android/` bị thay đổi.
- **Backend microservices**: `services/` (auth, enrollment, exam, notification...) hoàn toàn nguyên vẹn 100%.
- **Web Frontend**: `frontend/` hoàn toàn nguyên vẹn 100%.
- **Database & Production**: `docker-compose.yml`, `init.sql` hoàn toàn nguyên vẹn 100%.

---

## 8. Kết Luận & Điều Kiện Nghiệm Thu (Acceptance Verdict)

### KẾT LUẬN: **ACCEPTED WITH CONDITIONS (Nghiệm thu có điều kiện)**

Toàn bộ nghiệp vụ Student Features của Phase 3 được đánh giá đạt chất lượng cao về tích hợp Backend thật, giao diện chuẩn Rikkei Burgundy, an toàn bảo mật dữ liệu học phí và cô lập cache tài khoản. Tuy nhiên, dự án chưa được xem là hoàn tất tuyệt đối cho tới khi xử lý xong các điều kiện kỹ thuật dưới đây:

### CÁC ĐIỀU KIỆN TIÊN QUYẾT TRƯỚC KHI BƯỚC VÀO PHASE 5:

1. **Điều kiện 1 (Bắt buộc) — Thêm Safe Fallback cho `useOffline` hoặc cách ly khỏi Dashboard**:
   - Trong `mobile/src/features/offline/OfflineContext.tsx`, hook `useOffline()` không nên `throw new Error` khi thiếu Provider mà cần trả về fallback an toàn:
     ```typescript
     export const useOffline = (): OfflineContextValue => {
       const context = useContext(OfflineContext);
       if (!context) {
         return {
           isOffline: false,
           isConnected: true,
           isInternetReachable: true,
           type: 'unknown',
           lastOnlineAt: null,
           checkConnectivity: async () => true,
         };
       }
       return context;
     };
     ```
   - Điều này giúp mọi màn hình có thể render độc lập trong unit test và SSR mà không bị crash, đồng thời đảm bảo 100% 22/22 test suites trong Jest đều PASS.
2. **Điều kiện 2 (Khuyến nghị) — Bổ sung tham số ngân hàng vào Query Key Học phí**:
   - Trong `mobile/src/api/queryKeys.ts`, cập nhật:
     ```typescript
     tuition: (semester?: string, bank?: string, scope?: string) =>
       ['student', scope ?? 'current', 'tuition', semester ?? 'current', bank ?? 'default'] as const,
     ```
   - Điều này đảm bảo khi sinh viên bấm đổi chip ngân hàng (MB Bank sang VietinBank), TanStack Query sẽ kích hoạt request đổi mã QR tương ứng theo đúng chuẩn Backend.
3. **Điều kiện 3 — Tuân thủ thứ tự nghiệm thu**:
   - Tiến hành nghiệm thu độc lập Phase 4 (Lecturer Features & QR Attendance) trước khi chính thức kích hoạt triển khai Phase 5 (Offline Mode & Sync), đúng theo khuyến nghị của người dùng.

---

*Biên bản được lập bởi Antigravity Independent QA Reviewer. Trạng thái hiện tại: Đang dừng lại chờ Người dùng đánh giá và chỉ đạo bước tiếp theo.*
