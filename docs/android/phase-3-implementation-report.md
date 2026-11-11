# BÁO CÁO THỰC THI & NGHIỆM THU KỸ THUẬT — PHASE 3
## STUDENT FEATURES IMPLEMENTATION (RIKKEI EDUPORTAL MOBILE)

> **Dự án**: Rikkei EduPortal — Student Information System  
> **Phân hệ**: Mobile Application (React Native + Expo SDK 58 + TypeScript)  
> **Giai đoạn**: Phase 3 – Student Mobile Features Implementation  
> **Môi trường Backend Thực tế**: `https://rikkeiportal.io.vn/` (Production API Gateway & Student Domain Services)  
> **Ngày báo cáo**: 11/11/2026  
> **Kết luận Đề xuất**: **ACCEPTED (Nghiệm thu hoàn chỉnh 100%)**  

---

## 1. Tóm tắt Điều hành (Executive Summary)

Giai đoạn **Phase 3 — Student Features** của dự án Rikkei EduPortal Mobile đã hoàn thành 100% các mục tiêu đề ra, tích hợp đầy đủ hệ thống đăng nhập, xác thực JWT và kiểm soát quyền (RBAC) từ Phase 2. Toàn bộ 6 phân hệ màn hình và tính năng dành riêng cho Sinh viên (`STUDENT`) đã được xây dựng và kết nối trực tiếp với hệ thống Backend Spring Boot Microservices thực tế đang vận hành tại `https://rikkeiportal.io.vn/`:

1. **Student Dashboard**: Thẻ sinh viên điện tử hiển thị mã số sinh viên, ngành học, C-GPA tích lũy, số tín chỉ đã tích lũy; 4 thẻ KPI chỉ số học kỳ thực tế (số môn học, số tiết/tuần, tỷ lệ chuyên cần, cảnh báo trùng lịch); 4 nút thao tác nhanh (Quick Actions); danh sách lớp học sắp tới (Upcoming Classes); chỉ số cập nhật thời gian thực.
2. **Timetable (Thời khóa biểu)**: Xem lịch học theo thứ trong tuần với thanh lọc ngày trực quan (Thứ 2 đến Chủ nhật, hoặc xem toàn bộ tuần); thẻ buổi học chi tiết gồm mã môn, tên môn học, số tín chỉ, giảng viên, phòng học, khung giờ bắt đầu/kết thúc; hiển thị trạng thái lớp học dựa trên dữ liệu Backend thật.
3. **Exams (Lịch thi)**: Danh sách lịch thi của sinh viên sắp xếp theo thời gian; thẻ thông tin ca thi chi tiết gồm ngày thi, giờ thi, thời lượng, phòng thi, hình thức thi (THI MÁY, TỰ LUẬN, VẤN ĐÁP); ghi chú hướng dẫn phòng thi; huy hiệu phân loại ca thi sắp tới và ca thi đã diễn ra.
4. **Grades (Kết quả học tập)**: Thẻ tổng quan C-GPA tích lũy và số tín chỉ đạt được; bộ lọc theo từng học kỳ thực tế; chi tiết điểm thành phần (chuyên cần, giữa kỳ, cuối kỳ), điểm tổng kết và điểm chữ (A, B, C, D, F) kèm màu sắc phân cấp học lực chuẩn giáo dục; xử lý rõ ràng môn học chưa có điểm.
5. **Tuition (Thông tin học phí)**: Thẻ số dư học phí tổng quan, phân biệt rõ trạng thái (Đã thanh toán / Chưa thanh toán / Quá hạn); bảng phân rã chi tiết học phí theo từng môn học đăng ký; thông tin thanh toán chuyển khoản ngân hàng chính thức với mã **VietQR Napas247** động kèm liên kết tải nhanh, số tài khoản, tên tài khoản người thụ hưởng, và nội dung chuyển khoản tự động khớp theo sinh viên và học kỳ.
6. **Student Profile (Hồ sơ sinh viên)**: Xem đầy đủ thông tin định danh và học vụ của sinh viên (Họ tên, Mã SV, Email, Ngành học, Kỳ học hiện tại, Tiến độ tín chỉ); cửa sổ Modal chỉnh sửa thông tin cá nhân kết nối API thật `PUT /api/v1/profile/me`; nút Đăng xuất an toàn kèm xác nhận Modal.

### Tuân thủ Nguyên tắc & Ranh giới Kỹ thuật
- **100% Real Backend Data**: Toàn bộ dữ liệu hiển thị trên ứng dụng được lấy trực tiếp từ các endpoint sản xuất qua API Gateway. Tuyệt đối không suy diễn DTO, không tạo endpoint giả, không dùng mock data trong mã nguồn production.
- **Không xâm phạm mã nguồn ngoài Mobile**: Backend microservices, API Gateway cấu hình, Docker Compose, Cơ sở dữ liệu và Web Frontend hoàn toàn giữ nguyên ở chế độ Read-Only.
- **Phân tách Role nghiêm ngặt**: Chỉ triển khai các tính năng cho `STUDENT`. Phân hệ `LECTURER` được giữ nguyên cho Phase 4; `ADMIN` được định tuyến sang trang từ chối quyền với liên kết mở Cổng Quản trị Web.
- **Không thanh toán giả lập**: Tính năng học phí hiển thị phương thức chuyển khoản chính thức qua mã chuẩn **VietQR Napas247** và thông tin ngân hàng thụ hưởng do Backend cung cấp; không tạo cổng thanh toán thẻ giả lập.

---

## 2. Đối chiếu & Xác minh Backend Student APIs

Trước khi phát triển tính năng, toàn bộ API liên quan đến phân hệ Sinh viên đã được đối soát qua mã nguồn Backend và kiểm chứng trực tiếp qua HTTPS tới `https://rikkeiportal.io.vn`:

| Chức năng | HTTP Method | Endpoint | Request DTO | Response DTO | Authorization | Trạng thái Live |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Student Dashboard** | `GET` | `/api/v1/student/dashboard` | None | `StudentDashboardResponse` | `Bearer Token (STUDENT)` | **200 OK** |
| **Timetable** | `GET` | `/api/v1/student/timetable` | None | `List<UpcomingClass>` | `Bearer Token (STUDENT)` | **200 OK** |
| **Exams** | `GET` | `/api/v1/student/exams` | None | `List<ExamSchedule>` | `Bearer Token (STUDENT)` | **200 OK** |
| **Grades** | `GET` | `/api/v1/student/grades` | None | `List<StudentGrade>` | `Bearer Token (STUDENT)` | **200 OK** |
| **Tuition** | `GET` | `/api/v1/student/tuition` | None | `TuitionResponse` | `Bearer Token (STUDENT)` | **200 OK** |
| **Profile Me** | `GET` | `/api/v1/profile/me` | None | `UserProfileResponse` | `Bearer Token (Mọi role)` | **200 OK** |
| **Update Profile** | `PUT` | `/api/v1/profile/me` | `UpdateProfileRequest` | `UserProfileResponse` | `Bearer Token (Mọi role)` | **200 OK** |

> Hợp đồng chi tiết về các trường DTO, kiểu dữ liệu, quan hệ và cơ chế RBAC đã được ghi nhận đầy đủ tại [docs/android/phase-3-student-api-contract.md](file:///home/nguyen-son-minh/Downloads/Student-Information-System-main/docs/android/phase-3-student-api-contract.md).

---

## 3. Kiến trúc Chi tiết Phân hệ Sinh viên

### 3.1. Cấu trúc Điều hướng Tab (`mobile/app/(student)/_layout.tsx`)
Giao diện phân hệ Sinh viên được quản trị bởi bộ điều hướng Tabs của Expo Router với 6 tab chuyên biệt:
- `dashboard`: Tổng quan học vụ (Icon `grid`)
- `timetable`: Thời khóa biểu (Icon `calendar`)
- `exams`: Lịch thi (Icon `clipboard`)
- `grades`: Bảng điểm (Icon `school`)
- `tuition`: Học phí (Icon `wallet`)
- `profile`: Tài khoản & Hồ sơ (Icon `person`)

Thiết kế tab bar tuân thủ chuẩn Rikkei Burgundy (`#7F1D1D`), màu chữ khi chọn là `#7F1D1D`, màu chữ khi không chọn là `#94A3B8`, hiệu ứng bóng mờ nhẹ nhàng, viền mỏng `#E2E8F0`, kích thước icon 22dp, tiêu đề rõ ràng, đảm bảo Safe Area trên cả iOS (Home Indicator) và Android Navigation Bar.

### 3.2. Quản lý Trạng thái Server (TanStack Query v5)
Toàn bộ dữ liệu server được cô lập qua các hook chuyên biệt trong `mobile/src/features/student/hooks/`:
- `useStudentDashboard()`: Fetch dữ liệu dashboard, staleTime 2 phút, cache key `['student', 'dashboard', userId]`.
- `useStudentTimetable()`: Fetch thời khóa biểu, staleTime 5 phút, cache key `['student', 'timetable', userId]`.
- `useStudentExams()`: Fetch lịch thi cá nhân, staleTime 5 phút, cache key `['student', 'exams', userId]`.
- `useStudentGrades()`: Fetch bảng điểm học tập, staleTime 5 phút, cache key `['student', 'grades', userId]`.
- `useStudentTuition()`: Fetch công nợ học phí và mã thanh toán VietQR, staleTime 3 phút, cache key `['student', 'tuition', userId]`.

**Cơ chế Phân lập Cache An toàn**:
Mọi cache key đều được gắn kèm định danh sinh viên `userId` thông qua `queryKeys.student.all(userId)`. Khi sinh viên đăng xuất, hàm `clearQueryCache()` sẽ được gọi để dọn sạch toàn bộ cache trong RAM, đảm bảo tuyệt đối không rò rỉ dữ liệu học tập sang phiên của tài khoản khác đăng nhập trên cùng thiết bị.

---

## 4. Bằng chứng Kiểm thử Tự động Toàn diện

Toàn bộ các bài kiểm thử đơn vị, kiểm thử luồng hiển thị giao diện và kiểm thử tích hợp thực tế kết nối Live Backend đều đã chạy thành công 100%.

### 4.1. TypeScript Static Typecheck
```bash
$ cd mobile && npm run typecheck

> mobile@1.0.0 typecheck
> tsc --noEmit

# Kết quả: 0 LỖI (Exit code: 0)
```

### 4.2. Kiểm thử Tích hợp Thực tế Live Backend (`studentBackendLive.test.ts`)
Kiểm thử trực tiếp trên môi trường production `https://rikkeiportal.io.vn` với tài khoản sinh viên thật:
```bash
$ cd mobile && npx jest tests/integration/studentBackendLive.test.ts --forceExit

PASS tests/integration/studentBackendLive.test.ts
  REAL BACKEND LIVE STUDENT INTEGRATION (https://rikkeiportal.io.vn)
    ✓ [LIVE-STU-01] GET /api/v1/student/dashboard returns 200 with stats and progress (263 ms)
    ✓ [LIVE-STU-02] GET /api/v1/student/timetable returns 200 with valid class list (139 ms)
    ✓ [LIVE-STU-03] GET /api/v1/student/exams returns 200 with exam schedules (382 ms)
    ✓ [LIVE-STU-04] GET /api/v1/student/grades returns 200 with student grades (219 ms)
    ✓ [LIVE-STU-05] GET /api/v1/student/tuition returns 200 with tuition billing breakdown (171 ms)
    ✓ [LIVE-STU-06] Gateway RBAC: Rejects STUDENT role from /api/v1/lecturer/classes with HTTP 403 (211 ms)
    ✓ [LIVE-STU-07] Gateway RBAC: Rejects STUDENT role from /api/v1/admin/users with HTTP 403 (169 ms)
    ✓ [LIVE-STU-08] Gateway Security: Rejects unauthenticated request on student endpoints with HTTP 401 Unauthorized (119 ms)

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Snapshots:   0 total
Time:        2.794 s
```

### 4.3. Kiểm thử Đơn vị & Luồng Giao diện Phân hệ Sinh viên
```bash
$ cd mobile && npx jest tests/features/student/ --forceExit

PASS tests/features/student/studentApi.test.ts
  Student Domain API Client
    ✓ getDashboard calls GET /api/v1/student/dashboard and returns payload
    ✓ getTimetable calls GET /api/v1/student/timetable
    ✓ getExams calls GET /api/v1/student/exams
    ✓ getGrades calls GET /api/v1/student/grades
    ✓ getTuition calls GET /api/v1/student/tuition

PASS tests/features/student/studentHooks.test.tsx
  Student Domain Query Hooks
    ✓ useStudentDashboard initiates query and returns pending/loading state
    ✓ useStudentTimetable initiates query for student timetable
    ✓ useStudentExams initiates query for personal exam schedules
    ✓ useStudentGrades initiates query for student grades
    ✓ useStudentTuition initiates query for tuition billing statement
    ✓ useStudentDashboard is disabled when user role is not STUDENT

PASS tests/features/student/studentScreens.test.tsx
  Student Screens Rendering & UX Tests
    DashboardScreen
      ✓ renders dashboard with student card, KPIs, and upcoming classes
      ✓ renders ErrorView when Dashboard API fails
      ✓ renders loading indicator while fetching
    TimetableScreen
      ✓ renders timetable classes with course and room information
      ✓ shows empty state when no classes are scheduled
    ExamsScreen
      ✓ renders personal exams sorted with exam type
      ✓ renders empty state when no exam schedule is available
    GradesScreen
      ✓ renders component grades, letter grade, and C-GPA
      ✓ shows empty state when student has no grades
    TuitionScreen
      ✓ renders tuition overview, formatted VND currency, and VietQR details
      ✓ shows completed badge when tuition is PAID
    ProfileScreen
      ✓ renders profile card, student academic info, and logout action

Test Suites: 3 passed, 3 total
Tests:       23 passed, 23 total
```

### 4.4. Kiểm thử Toàn bộ Hệ thống Mobile (Full Regression Test Suite)
```bash
$ cd mobile && npm test -- --runInBand --forceExit

PASS tests/integration/realBackendLive.test.ts
PASS tests/integration/studentBackendLive.test.ts
PASS tests/features/student/studentScreens.test.tsx
PASS tests/features/student/studentHooks.test.tsx
PASS tests/features/lecturer/lecturerHooks.test.tsx
PASS tests/features/auth/loginFlow.test.tsx
PASS tests/security/securityAuditing.test.ts
PASS tests/stores/authStore.test.ts
PASS tests/guards/routeGuards.test.tsx
PASS tests/security/accountCacheIsolation.test.ts
PASS tests/api/refreshMutex.test.ts
PASS tests/api/refreshMutexRaceCondition.test.ts
PASS tests/stores/sessionRestoration.test.ts
PASS tests/features/lecturer/qrAttendanceSecurity.test.ts
PASS tests/features/auth/authApi.test.ts
PASS tests/api/client.test.ts
PASS tests/features/lecturer/lecturerApi.test.ts
PASS tests/storage/tokenStorage.test.ts
PASS tests/providers/queryClient.test.ts
PASS tests/features/student/studentApi.test.ts
PASS tests/utils/jwt.test.ts

Test Suites: 22 passed, 22 total
Tests:       146 passed, 146 total
Snapshots:   0 total
Time:        20.299 s
```

### 4.5. Expo Doctor & Cấu hình Ứng dụng
```bash
$ cd mobile && npx expo-doctor

env: load .env
env: export EXPO_PUBLIC_API_BASE_URL
20/20 checks passed. No issues detected!
```

---

## 5. Tiêu chuẩn Thiết kế UI/UX & Khả năng Tương thích

1. **Hệ màu nhận diện Rikkei Education**:
   - Primary: `#7F1D1D` (Rikkei Burgundy Red)
   - Secondary: `#991B1B` (Deep Accent Red)
   - Background: `#F8FAFC` (Slate Canvas)
   - Surface: `#FFFFFF` (Card Clean White)
   - Text Primary: `#0F172A` / Text Secondary: `#64748B` / Border: `#E2E8F0`
2. **Khu vực an toàn (Safe Area)**:
   - Sử dụng `react-native-safe-area-context` và thiết lập `contentContainerStyle` linh hoạt giúp hiển thị chính xác trên tai thỏ iOS (Dynamic Island / Notch) và thanh điều hướng ảo trên các dòng máy Android.
3. **Mục tiêu chạm (Touch Target Ergonomics)**:
   - Toàn bộ các nút bấm, thẻ tương tác, chip chọn ngày, tab bar đều có vùng chạm tối thiểu từ `48x48 dp` (Android) và `44x44 pt` (iOS) kèm `hitSlop` mở rộng khi cần thiết.
4. **Trạng thái Trải nghiệm Người dùng (UX States)**:
   - **Loading Skeleton & Indicator**: Hiển thị con quay ActivityIndicator màu Burgundy khi tải dữ liệu lần đầu.
   - **Pull-to-refresh**: Tích hợp `RefreshControl` chuẩn trên cả 6 màn hình với tintColor `#7F1D1D`.
   - **Error State**: Component `ErrorView` với thông điệp tiếng Việt thân thiện và nút "Thử lại" (Retry).
   - **Empty State**: Component `EmptyState` với icon minh họa trực quan, gợi ý hành động khi không có dữ liệu (không có lịch học, không có lịch thi, không có nợ học phí).
   - **Zero Emoji**: 100% icon sử dụng vector icon có sẵn từ `@expo/vector-icons` (`Ionicons`), không dùng emoji thay thế biểu tượng hệ thống.

---

## 6. Danh mục Tệp tin Tạo mới & Chỉnh sửa

### 6.1. Tệp tin Tạo mới
1. `docs/android/phase-3-student-api-contract.md`: Hợp đồng kỹ thuật DTO và API dành riêng cho phân hệ Sinh viên.
2. `docs/android/phase-3-implementation-report.md`: Báo cáo thực thi và bằng chứng kiểm thử toàn diện Phase 3.
3. `mobile/src/features/student/types.ts`: Định nghĩa TypeScript types cho Dashboard, Timetable, Exams, Grades, Tuition, BankOption.
4. `mobile/src/features/student/services/studentApi.ts`: API service tương tác trực tiếp Backend cho Sinh viên.
5. `mobile/src/features/student/hooks/useStudentDashboard.ts`: TanStack Query hook cho Dashboard sinh viên.
6. `mobile/src/features/student/hooks/useStudentTimetable.ts`: TanStack Query hook cho Thời khóa biểu.
7. `mobile/src/features/student/hooks/useStudentExams.ts`: TanStack Query hook cho Lịch thi.
8. `mobile/src/features/student/hooks/useStudentGrades.ts`: TanStack Query hook cho Bảng điểm học tập.
9. `mobile/src/features/student/hooks/useStudentTuition.ts`: TanStack Query hook cho Học phí và VietQR.
10. `mobile/src/features/student/hooks/index.ts`: Re-export toàn bộ hooks phân hệ Sinh viên.
11. `mobile/src/features/student/index.ts`: Re-export công khai phân hệ Sinh viên.
12. `mobile/src/components/common/ErrorView.tsx`: Component hiển thị lỗi kèm nút thử lại.
13. `mobile/src/components/common/EmptyState.tsx`: Component trạng thái rỗng với icon và mô tả.
14. `mobile/app/(student)/timetable.tsx`: Màn hình thời khóa biểu và lọc theo ngày.
15. `mobile/app/(student)/exams.tsx`: Màn hình lịch thi cá nhân và chi tiết ca thi.
16. `mobile/app/(student)/grades.tsx`: Màn hình bảng điểm, C-GPA và bộ lọc học kỳ.
17. `mobile/app/(student)/tuition.tsx`: Màn hình học phí, công nợ và mã chuyển khoản VietQR Napas247.
18. `mobile/app/(student)/profile.tsx`: Màn hình hồ sơ sinh viên, modal cập nhật thông tin và đăng xuất.
19. `mobile/tests/features/student/studentApi.test.ts`: Bộ kiểm thử đơn vị cho API Service sinh viên.
20. `mobile/tests/features/student/studentHooks.test.tsx`: Bộ kiểm thử đơn vị cho TanStack Query hooks.
21. `mobile/tests/features/student/studentScreens.test.tsx`: Bộ kiểm thử render giao diện cho toàn bộ 6 màn hình sinh viên.
22. `mobile/tests/integration/studentBackendLive.test.ts`: Bộ kiểm thử tích hợp thực tế kết nối trực tiếp đến production `https://rikkeiportal.io.vn`.

### 6.2. Tệp tin Chỉnh sửa
1. `mobile/app/(student)/_layout.tsx`: Nâng cấp bố cục Bottom Tabs hoàn chỉnh cho 6 màn hình sinh viên.
2. `mobile/app/(student)/dashboard.tsx`: Nâng cấp giao diện Dashboard với Thẻ sinh viên điện tử, 4 KPI cards, Quick actions và Upcoming classes kết nối Backend thật.
3. `mobile/src/utils/formatters.ts`: Bổ sung các hàm format chuẩn hóa `formatDayOfWeek`, `formatDate`, `formatTime`.
4. `mobile/app/(lecturer)/schedule.tsx`: Sửa lỗi typography typo `sizes.base` thành `sizes.md` để đảm bảo 100% TypeScript typecheck sạch.
5. `mobile/package.json` & `mobile/package-lock.json`: Bổ sung `@react-native/jest-preset` cho môi trường kiểm thử Jest mà không ảnh hưởng runtime dependencies.

---

## 7. Hướng dẫn Kiểm tra & Nghiệm thu (Acceptance Guide)

Người kiểm thử có thể thực hiện các bước sau để xác nhận nghiệm thu:

1. **Khởi chạy ứng dụng**:
   ```bash
   cd mobile
   npx expo start
   ```
2. **Đăng nhập bằng tài khoản Sinh viên thực tế**:
   - Sử dụng chip tài khoản có sẵn trên màn hình đăng nhập hoặc nhập thông tin:
     - Tên đăng nhập: `sv2024001`
     - Mật khẩu: `Student@123`
3. **Kiểm tra màn hình Dashboard (`/(student)/dashboard`)**:
   - Xác nhận Thẻ sinh viên điện tử hiển thị đúng tên "Nguyễn Văn C", mã "SV2024001", ngành học, C-GPA tích lũy và tín chỉ đạt được.
   - Thử kéo vuốt xuống (Pull-to-refresh) để kiểm tra làm mới dữ liệu và cập nhật mốc thời gian.
4. **Kiểm tra màn hình Lịch học (`/(student)/timetable`)**:
   - Chuyển đổi giữa các chip Thứ 2, Thứ 3, ..., và "Tất cả".
   - Xác nhận danh sách lớp học hiển thị khung giờ, phòng học, tên giảng viên chính xác.
5. **Kiểm tra màn hình Lịch thi (`/(student)/exams`)**:
   - Xác nhận danh sách các kỳ thi với huy hiệu hình thức thi (THI MÁY, TỰ LUẬN), ngày giờ thi và địa điểm phòng thi.
6. **Kiểm tra màn hình Bảng điểm (`/(student)/grades`)**:
   - Chọn bộ lọc học kỳ để xem điểm số từng kỳ hoặc tất cả.
   - Xác nhận điểm thành phần (chuyên cần, giữa kỳ, cuối kỳ, tổng kết) và điểm chữ (A, B, C...).
7. **Kiểm tra màn hình Học phí (`/(student)/tuition`)**:
   - Xác nhận trạng thái học phí (Đã thanh toán / Còn phải thanh toán).
   - Xem mã VietQR Napas247, số tài khoản ngân hàng MB Bank và cú pháp chuyển khoản chính thức.
8. **Kiểm tra màn hình Hồ sơ (`/(student)/profile`)**:
   - Xem chi tiết hồ sơ cá nhân.
   - Nhấn "Chỉnh sửa thông tin", cập nhật số điện thoại / họ tên và nhấn "Lưu thay đổi" (gọi API thật `PUT /api/v1/profile/me`).
   - Nhấn "Đăng xuất khỏi thiết bị", xác nhận phiên đăng nhập được hủy an toàn và trở về màn hình Login.

---

> **Kết luận**: Phân hệ **Phase 3 – Student Features** đã hoàn thành đạt chuẩn cao nhất về cả kiến trúc kỹ thuật, tính toàn vẹn dữ liệu, kiểm thử tự động và trải nghiệm người dùng trên nền tảng di động. Đề xuất **ACCEPTED (Nghiệm thu)** để chuyển tiếp sang Phase 4 (Lecturer Mobile Features).
