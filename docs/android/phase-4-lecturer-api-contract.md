# BÁO CÁO ĐẶC TẢ HỢP ĐỒNG API PHÂN HỆ GIẢNG VIÊN (PHASE 4)
## RIKKEI EDUPORTAL MOBILE — LECTURER API CONTRACT SPECIFICATION

> **Dự án**: Rikkei EduPortal Mobile (Android & iOS)  
> **Phân hệ**: Giảng viên (Lecturer Module)  
> **Tài liệu**: Hợp đồng Tích hợp API Backend (`docs/android/phase-4-lecturer-api-contract.md`)  
> **Môi trường Backend Xác thực**: `https://rikkeiportal.io.vn` (API Gateway Proxy `services/api-gateway/`)  
> **Dịch vụ Backend Mục tiêu**: `lecturer-service` (`:8085`), `auth-service` (`:8081`), `course-service` (`:8082`)  
> **Trạng thái tài liệu**: ĐÃ XÁC MINH TOÀN DIỆN (100% VERIFIED VIA SOURCE CODE & LIVE TESTING)

---

## 1. TỔNG QUAN KIẾN TRÚC & PHÂN QUYỀN (RBAC)

Phân hệ Giảng viên (Lecturer Features) trên ứng dụng Rikkei EduPortal Mobile kết nối trực tiếp với backend thông qua Spring Cloud API Gateway (`:8080`).

- **Xác thực**: JWT Bearer Token chứa claims: `sub` (username), `userId`, `role` (`LECTURER`), `email`, `fullName`.
- **Cơ chế Gateway**:
  - `JwtGatewayValidator.java` chặn ngay lập tức các yêu cầu không có role `LECTURER` hoặc `ADMIN` đối với prefix `/api/v1/lecturer/**`.
  - Gateway trích xuất thông tin định danh từ JWT đã ký và chuyển tiếp vào downstream service dưới dạng các HTTP headers an toàn: `X-User-Username`, `X-User-Role`, `X-User-Id`.
- **Phân định nghiệp vụ Điểm danh QR**:
  - **Giảng viên**: Khởi tạo phiên điểm danh, xem và trình chiếu mã QR Động TOTP (xoay vòng mỗi 15 giây), giám sát danh sách sinh viên check-in thời gian thực, đóng phiên điểm danh, điều chỉnh điểm chuyên cần thủ công.
  - **Sinh viên**: Sử dụng camera quét mã QR của giảng viên và gửi request `POST /api/v1/attendance/check-in` để xác thực TOTP chữ ký HMAC-SHA256.

---

## 2. BẢNG DANH MỤC HỢP ĐỒNG API PHÂN HỆ GIẢNG VIÊN

| STT | Nhóm chức năng | Endpoint | Phương thức | Request DTO | Response DTO | Authorization (Role) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | Lớp học phần | `/api/v1/lecturer/classes` | `GET` | Query `?semester=` (optional) | `ApiResponse<List<ClassSectionResponse>>` | `LECTURER` | **VERIFIED** |
| **02** | Danh sách SV & Điểm | `/api/v1/lecturer/classes/{sectionId}/students` | `GET` | Path `sectionId` (Long) | `ApiResponse<List<StudentGradeResponse>>` | `LECTURER` | **VERIFIED** |
| **03** | Cập nhật Chuyên cần | `/api/v1/lecturer/enrollments/{enrollmentId}/attendance` | `PUT` | `AttendanceUpdateRequest` | `ApiResponse<StudentGradeResponse>` | `LECTURER` | **VERIFIED** |
| **04** | Cập nhật Điểm số | `/api/v1/lecturer/grades/{enrollmentId}` | `PUT` | `GradeUpdateRequest` | `ApiResponse<StudentGradeResponse>` | `LECTURER` | **VERIFIED** |
| **05** | Chốt điểm lớp | `/api/v1/lecturer/classes/{sectionId}/lock-grades` | `POST` | Path `sectionId` (Long) | `ApiResponse<LockGradesResponse>` | `LECTURER` | **VERIFIED** |
| **06** | Mở phiên Điểm danh | `/api/v1/lecturer/classes/{sectionId}/attendance/session` | `POST` | `StartAttendanceSessionRequest` | `ApiResponse<AttendanceSessionResponse>` | `LECTURER` | **VERIFIED** |
| **07** | Lấy QR Động TOTP 15s | `/api/v1/lecturer/classes/{sectionId}/attendance/qr-code` | `GET` | Path `sectionId` (Long) | `ApiResponse<DynamicQrResponse>` | `LECTURER` | **VERIFIED** |
| **08** | Chi tiết Phiên & DS Đã quét | `/api/v1/lecturer/classes/{sectionId}/attendance/session` | `GET` | Path `sectionId` (Long) | `ApiResponse<AttendanceSessionResponse>` | `LECTURER` | **VERIFIED** |
| **09** | Đóng phiên Điểm danh | `/api/v1/lecturer/classes/{sectionId}/attendance/close-session` | `POST` | Path `sectionId` (Long) | `ApiResponse<AttendanceSessionResponse>` | `LECTURER` | **VERIFIED** |
| **10** | Cảnh báo học vụ lớp | `/api/v1/lecturer/early-warnings/section/{sectionId}` | `GET` | Path `sectionId` (Long) | `ApiResponse<EarlyWarningSummaryResponse>` | `LECTURER`, `ADMIN` | **VERIFIED** |
| **11** | Bắn cảnh báo sớm | `/api/v1/lecturer/early-warnings/dispatch` | `POST` | `DispatchWarningRequest` | `ApiResponse<DispatchWarningResponse>` | `LECTURER`, `ADMIN` | **VERIFIED** |
| **12** | Cảnh báo cá nhân | `/api/v1/lecturer/early-warnings/my-alerts` | `GET` | None | `ApiResponse<List<StudentRiskDto>>` | `STUDENT`, `LECTURER`, `ADMIN` | **VERIFIED** |
| **13** | Hồ sơ Giảng viên | `/api/v1/profile/me` | `GET` | None | `ApiResponse<UserProfileResponse>` | Authenticated User | **VERIFIED** |
| **14** | Cập nhật Hồ sơ | `/api/v1/profile/me` | `PUT` | `UpdateProfileRequest` | `ApiResponse<UserProfileResponse>` | Authenticated User | **VERIFIED** |

---

## 3. CHI TIẾT HỢP ĐỒNG TỪNG ENDPOINT

### 3.1. Lấy Danh sách Lớp Giảng dạy (`getMyClasses`)
- **Method & URL**: `GET /api/v1/lecturer/classes?semester={semesterName}`
- **Quyền**: `ROLE_LECTURER` (Gateway và Service kiểm tra)
- **Request Parameters**:
  - `semester` *(String, Optional)*: Tên học kỳ (ví dụ: `2024-25_SEM2`). Nếu bỏ trống, trả về toàn bộ lớp phụ trách.
- **Backend Class**: `com.rikkei.eduportal.lecturer.controller.LecturerController#getMyClasses`
- **Response DTO (`ClassSectionResponse`)**:
```json
{
  "status": 200,
  "message": "Danh sách lớp học phần",
  "data": [
    {
      "sectionId": 1,
      "sectionCode": "CS201-2025-01",
      "courseName": "Data Structures and Algorithms",
      "courseCode": "CS201",
      "credits": 3,
      "semesterName": "2024-25_SEM2",
      "dayOfWeek": "MON",
      "startTime": "09:00:00",
      "endTime": "10:30:00",
      "roomName": "Room A-204",
      "currentEnrolled": 2,
      "maxCapacity": 40,
      "status": "OPEN"
    }
  ],
  "success": true
}
```
- **Error Codes**:
  - `401 Unauthorized`: Token hết hạn hoặc không hợp lệ.
  - `403 Forbidden`: Người dùng không có quyền `ROLE_LECTURER`.

---

### 3.2. Lấy Danh sách Sinh viên trong Lớp (`getStudentsOfSection`)
- **Method & URL**: `GET /api/v1/lecturer/classes/{sectionId}/students`
- **Quyền**: `ROLE_LECTURER`
- **Request Parameters**:
  - `sectionId` *(Long, Path variable, Required)*: ID của lớp học phần.
- **Ràng buộc nghiệp vụ**: Giảng viên chỉ được xem sinh viên của lớp do chính mình phụ trách (`LecturerProfile.id` khớp với `ClassSection.lecturerId`). Nếu không thuộc lớp, backend ném `AccessDeniedException("Bạn không phụ trách lớp học phần này.")`.
- **Response DTO (`StudentGradeResponse`)**:
```json
{
  "status": 200,
  "message": "Danh sách sinh viên và điểm",
  "data": [
    {
      "enrollmentId": 1,
      "studentCode": "SV2024001",
      "fullName": "Nguyễn Văn C",
      "attendanceRate": 95.00,
      "attendanceScore": 9.50,
      "midtermScore": 8.50,
      "finalScore": 8.80,
      "totalScore": 8.78,
      "letterGrade": "A",
      "isLocked": false
    }
  ],
  "success": true
}
```
- **Error Codes**:
  - `403 Forbidden`: Truy cập lớp không do giảng viên phụ trách.
  - `404 Not Found`: Lớp học phần không tồn tại.

---

### 3.3. Cập nhật Điểm Chuyên cần Thủ công
- **Method & URL**: `PUT /api/v1/lecturer/enrollments/{enrollmentId}/attendance`
- **Request Body (`AttendanceUpdateRequest`)**:
```json
{
  "attendanceRate": 92.5
}
```
- **Validation**:
  - `attendanceRate`: `@NotNull`, `@DecimalMin("0.0")`, `@DecimalMax("100.0")`.
- **Response**: `ApiResponse<StudentGradeResponse>` (Tự động tính lại điểm chuyên cần theo thang 10: `attendanceRate / 10`).

---

### 3.4. Cập nhật Điểm Thành phần Sinh viên
- **Method & URL**: `PUT /api/v1/lecturer/grades/{enrollmentId}`
- **Request Body (`GradeUpdateRequest`)**:
```json
{
  "attendanceScore": 9.0,
  "midtermScore": 8.5,
  "finalScore": 9.0
}
```
- **Validation**: Điểm số từ 0.0 đến 10.0. Các trường là optional (null = giữ nguyên).
- **Ràng buộc**: Nếu điểm đã bị khóa (`isLocked == true`), backend ném `GradeLockedConflictException("Điểm của lớp này đã được chốt, không thể chỉnh sửa.")` (HTTP 409 Conflict).

---

### 3.5. Chốt Điểm Toàn bộ Lớp (`lockGrades`)
- **Method & URL**: `POST /api/v1/lecturer/classes/{sectionId}/lock-grades`
- **Ràng buộc**:
  - Toàn bộ sinh viên trong lớp phải có đầy đủ điểm (chuyên cần, giữa kỳ, cuối kỳ). Nếu còn sinh viên thiếu điểm, backend ném `MissingGradesException("Không thể chốt điểm: Vẫn còn sinh viên chưa được nhập đủ điểm.")` (HTTP 422).
  - Điểm sau khi chốt sẽ chuyển sang trạng thái bất biến (`isLocked = true`).
- **Response DTO (`LockGradesResponse`)**:
```json
{
  "status": 200,
  "message": "Chốt điểm thành công",
  "data": {
    "sectionId": 1,
    "lockedCount": 2,
    "locked": true,
    "message": "Đã chốt điểm thành công cho 2 sinh viên."
  },
  "success": true
}
```

---

### 3.6. Bắt đầu Phiên Điểm danh QR Động (`startSession`)
- **Method & URL**: `POST /api/v1/lecturer/classes/{sectionId}/attendance/session`
- **Request Body (`StartAttendanceSessionRequest`)**:
```json
{
  "sessionName": "Buổi 1: Kiến trúc Client-Server"
}
```
*(Nếu body null hoặc rỗng, backend tự sinh: `"Điểm danh YYYY-MM-DD"`)*
- **Cơ chế**: Tự động đóng các phiên ACTIVE/OPEN trước đó của lớp này và sinh session secret ngẫu nhiên 64 ký tự.
- **Response DTO (`AttendanceSessionResponse`)**:
```json
{
  "status": 200,
  "message": "Bắt đầu phiên điểm danh thành công",
  "data": {
    "sessionId": 5,
    "sectionId": 1,
    "sectionCode": "CS201-2025-01",
    "courseName": "Data Structures and Algorithms",
    "sessionName": "Buổi 1: Kiến trúc Client-Server",
    "status": "ACTIVE",
    "stepSeconds": 15,
    "totalAttendees": 0,
    "createdAt": "2026-11-11T05:30:00",
    "closedAt": null,
    "records": []
  },
  "success": true
}
```

---

### 3.7. Lấy Mã QR Động TOTP Luân chuyển 15s (`getRotatingQrCode`)
- **Method & URL**: `GET /api/v1/lecturer/classes/{sectionId}/attendance/qr-code`
- **Ràng buộc**: Lớp phải có phiên đang `ACTIVE` hoặc `OPEN`. Nếu không có, trả về HTTP 404.
- **Thuật toán TOTP**:
  - `timeWindow = currentTimeMillis / (15 * 1000)`
  - `signature = HMAC-SHA256(sessionId + ":" + sectionId + ":" + timeWindow, sessionSecret)`
  - `qrToken = sessionId + "." + sectionId + "." + timeWindow + "." + signature`
  - Backend sinh ảnh Base64 PNG QR Code thông qua ZXing.
- **Response DTO (`DynamicQrResponse`)**:
```json
{
  "status": 200,
  "message": "Mã QR động hiện tại",
  "data": {
    "sessionId": 5,
    "sectionId": 1,
    "qrToken": "5.1.11962495.c3ab897...",
    "qrImageBase64": "data:image/png;base64,iVBORw0KGgo...",
    "stepSeconds": 15,
    "remainingSeconds": 12,
    "expiresAtEpochMs": 1794374355000
  },
  "success": true
}
```

---

### 3.8. Xem Chi tiết Phiên & Danh sách Đã Điểm danh Realtime (`getCurrentSession`)
- **Method & URL**: `GET /api/v1/lecturer/classes/{sectionId}/attendance/session`
- **Chức năng**: Giảng viên theo dõi danh sách sinh viên quét mã thành công ngay trong lúc phiên đang mở hoặc xem lại sau khi đóng.
- **Response**: Trả về `AttendanceSessionResponse` kèm danh sách `records`:
```json
{
  "recordId": 1,
  "studentCode": "SV2024001",
  "studentName": "Nguyễn Văn C",
  "checkInTime": "2026-11-11T05:31:12",
  "deviceInfo": "Expo / Android Mobile Client"
}
```

---

### 3.9. Kết thúc Phiên Điểm danh (`closeSession`)
- **Method & URL**: `POST /api/v1/lecturer/classes/{sectionId}/attendance/close-session`
- **Cơ chế**: Đổi trạng thái phiên thành `CLOSED`, gán `closedAt = now()`. Sau thời điểm này, mọi yêu cầu check-in với mã QR của phiên này sẽ bị từ chối với lỗi `InvalidQrException("Phiên điểm danh này đã kết thúc hoặc bị đóng.")`.

---

### 3.10. Báo cáo Cảnh báo Học vụ Sớm (`getSectionRisks`)
- **Method & URL**: `GET /api/v1/lecturer/early-warnings/section/{sectionId}`
- **Quyền**: `ROLE_LECTURER`, `ROLE_ADMIN`
- **Quy tắc tính toán rủi ro của Backend**:
  - **Chuyên cần**: Vắng > 20% tổng số buổi đã học -> `CRITICAL` (nguy cơ cấm thi).
  - **Điểm số**: Điểm giữa kỳ hoặc tổng kết < 4.0 -> `CRITICAL`. Vắng 10% - 20% -> `WARNING`.
- **Response DTO (`EarlyWarningSummaryResponse`)**:
```json
{
  "status": 200,
  "message": "Báo cáo cảnh báo sớm học vụ",
  "data": {
    "sectionId": 1,
    "sectionCode": "CS201-2025-01",
    "courseName": "Data Structures and Algorithms",
    "totalStudents": 2,
    "criticalCount": 2,
    "warningCount": 0,
    "safeCount": 0,
    "attendanceRiskCount": 2,
    "gradeRiskCount": 0,
    "students": [
      {
        "studentId": 1,
        "studentCode": "SV2024001",
        "fullName": "Nguyễn Văn C",
        "email": "nguyenvanc@rikkei.edu.vn",
        "absenceRate": 0.67,
        "riskLevel": "CRITICAL",
        "riskScore": 75,
        "riskReasons": [
          "Vắng 2/3 buổi (67%). Vượt ngưỡng cấm thi 20% theo quy chế đào tạo tín chỉ!"
        ],
        "suggestions": [
          "Cần gặp trực tiếp giảng viên để kiểm tra lại lịch điểm danh hoặc nộp đơn giải trình phép hợp lệ."
        ],
        "warningDispatched": false
      }
    ],
    "evaluationSummary": "Đã quét 2 sinh viên: Phát hiện 2 trường hợp Nguy cấp."
  },
  "success": true
}
```

---

### 3.11. Bắn Cảnh báo Học vụ Sớm 1-Chạm (`dispatchWarnings`)
- **Method & URL**: `POST /api/v1/lecturer/early-warnings/dispatch`
- **Request Body (`DispatchWarningRequest`)**:
```json
{
  "sectionId": 1,
  "studentIds": [1, 2],
  "customMessage": "Nhắc nhở: Các em cần bổ sung chuyên cần để đủ điều kiện dự thi cuối kỳ."
}
```
- **Response DTO (`DispatchWarningResponse`)**:
```json
{
  "status": 200,
  "message": "Đã bắn cảnh báo học vụ thành công",
  "data": {
    "sentCount": 2,
    "status": "SENT",
    "dispatchedAt": "2026-11-11T05:35:00",
    "recipientNames": ["Nguyễn Văn C", "Lê Thị D"],
    "message": "Đã phát 2 cảnh báo học vụ."
  },
  "success": true
}
```

---

### 3.12. Thông tin Hồ sơ Giảng viên (`getMyProfile`)
- **Method & URL**: `GET /api/v1/profile/me`
- **Response DTO (`UserProfileResponse`)**:
```json
{
  "status": 200,
  "message": "Lấy thông tin hồ sơ thành công",
  "data": {
    "user": {
      "id": 2,
      "username": "gv001",
      "email": "nguyenvana@rikkei.edu.vn",
      "fullName": "TS. Nguyễn Văn A",
      "role": "LECTURER",
      "avatarUrl": "https://api.dicebear.com/7.x/bottts/svg?seed=gv001",
      "status": "ACTIVE",
      "createdAt": "2026-10-27T06:36:38"
    },
    "studentProfile": null,
    "lecturerProfile": {
      "lecturerCode": "GV001",
      "department": "Khoa Công nghệ Thông tin",
      "degree": "Tiến sĩ"
    }
  },
  "success": true
}
```

---

## 4. XÁC NHẬN CÁC TÍNH NĂNG KHÔNG HỖ TRỢ / NGOÀI PHẠM VI (OUT OF SCOPE)

1. **Lecturer quét QR của Sinh viên**:
   - **Trạng thái**: `NOT IMPLEMENTED IN BACKEND`.
   - **Giải thích**: Sinh viên không có tính năng sinh mã QR cá nhân để giảng viên quét. Luồng điểm danh thiết kế chuẩn là **Giảng viên sinh mã QR Động TOTP 15s** và **Sinh viên dùng ứng dụng di động quét mã**.
2. **Admin Mobile Dashboard**:
   - **Trạng thái**: `NOT IMPLEMENTED / BLOCKED BY DESIGN`.
   - Bị chặn bởi `StudentGuard` và `LecturerGuard`, điều hướng sang `/unauthorized`.
3. **Ứng dụng Giảng viên riêng biệt (Separate APK)**:
   - **Trạng thái**: `NOT APPLICABLE`.
   - Ứng dụng là một bản build duy nhất phân luồng động theo vai trò người dùng sau khi đăng nhập.

---
*Báo cáo hợp đồng API này là căn cứ kỹ thuật chính thức để triển khai và nghiệm thu Phase 4.*
