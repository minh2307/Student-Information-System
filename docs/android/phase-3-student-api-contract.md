# TÀI LIỆU HỢP ĐỒNG KỸ THUẬT API PHÂN HỆ SINH VIÊN — PHASE 3
## STUDENT API CONTRACT & BACKEND INTEGRATION SPECIFICATION (RIKKEI EDUPORTAL)

> **Dự án**: Rikkei EduPortal — Student Information System  
> **Phân hệ**: Mobile Application (React Native + Expo SDK 58 + TypeScript)  
> **Mục tiêu**: Đặc tả và đối chiếu toàn bộ các API thực tế phục vụ phân hệ Sinh viên (Student Subsystem)  
> **Địa chỉ API Gateway**: `https://rikkeiportal.io.vn`  
> **Tài liệu tham chiếu Backend**: `services/enrollment-service`, `services/auth-service`, `services/api-gateway`, `common-lib`  
> **Ngày lập**: 11/11/2026  
> **Trạng thái**: **VERIFIED WITH LIVE BACKEND (Đã kiểm chứng 100% trên môi trường Production)**  

---

## 1. Tóm tắt Kiểm định API Thực tế (Backend Discovery Summary)

Toàn bộ các API phục vụ phân hệ Sinh viên trong Phase 3 đã được rà soát trực tiếp từ mã nguồn Java của Spring Boot Microservices (`StudentPortalController.java`, `TuitionController.java`, `ProfileController.java`, `ExamScheduleService.java`, `CourseRegistrationService.java`) và kiểm chứng trực tiếp qua mạng HTTPS tới `https://rikkeiportal.io.vn`:

| STT | Nghiệp vụ | Phương thức | Endpoint Gateway | Controller Backend | Yêu cầu Quyền (Role) | Trạng thái Live |
|:---:|:---|:---:|:---|:---|:---:|:---:|
| 1 | **Student Dashboard** | `GET` | `/api/v1/student/dashboard` | `StudentPortalController.java:65` | `STUDENT`, `ADMIN` | **VERIFIED (200 OK)** |
| 2 | **Thời khóa biểu (Timetable)** | `GET` | `/api/v1/student/timetable` | `StudentPortalController.java:76` | `STUDENT`, `ADMIN` | **VERIFIED (200 OK)** |
| 3 | **Lịch thi (Exams)** | `GET` | `/api/v1/student/exams` | `StudentPortalController.java:89` | `STUDENT`, `ADMIN` | **VERIFIED (200 OK)** |
| 4 | **Bảng điểm (Grades)** | `GET` | `/api/v1/student/grades` | `StudentPortalController.java:234` | `STUDENT`, `ADMIN` | **VERIFIED (200 OK)** |
| 5 | **Thông tin Học phí (Tuition)** | `GET` | `/api/v1/student/tuition` | `TuitionController.java:34` | `STUDENT`, `ADMIN` | **VERIFIED (200 OK)** |
| 6 | **Hồ sơ Cá nhân (Profile)** | `GET` | `/api/v1/profile/me` | `ProfileController.java:26` | Any Authenticated | **VERIFIED (200 OK)** |
| 7 | **Cập nhật Hồ sơ (Update Profile)** | `PUT` | `/api/v1/profile/me` | `ProfileController.java:33` | Any Authenticated | **VERIFIED (200 OK)** |
| 8 | **Học vụ Tổng hợp (Academic Context)** | `GET` | `/api/v1/student/academic-context` | `StudentPortalController.java:54` | `STUDENT`, `ADMIN` | **VERIFIED (200 OK)** |

---

## 2. Đặc tả Chi tiết Các API Hợp đồng (Detailed API Specifications)

### 2.1. API Student Dashboard (`GET /api/v1/student/dashboard`)

- **URL**: `https://rikkeiportal.io.vn/api/v1/student/dashboard`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <accessToken>`, `Accept: application/json`
- **Query Parameters**: Không có
- **Phân quyền Gateway**: Bắt buộc token có role `STUDENT` hoặc `ADMIN`. `LECTURER` bị từ chối với HTTP 403.
- **Request Body**: Không có

#### Response Body thành công (HTTP 200 OK):
```json
{
  "status": 200,
  "message": "Lấy dữ liệu dashboard thành công",
  "data": {
    "stats": {
      "registeredCourses": 6,
      "weeklyClasses": 23,
      "pendingRegistrations": 0,
      "scheduleConflicts": 0
    },
    "upcomingClasses": [
      {
        "id": 1,
        "courseCode": "CS201",
        "courseName": "Data Structures and Algorithms",
        "dayOfWeek": "MON",
        "startTime": "09:00",
        "endTime": "10:30",
        "roomName": "Room A-204",
        "lecturerName": "Tiến sĩ TS. Nguyễn Văn A",
        "sectionCode": "CS201-2025-01",
        "credits": 3,
        "semesterName": "2024-25_SEM2",
        "status": "REGISTERED"
      }
    ],
    "semesterProgress": {
      "creditsEarned": 84,
      "totalRequiredCredits": 160,
      "attendanceRate": 99.2,
      "currentCgpa": 8.74,
      "previousCgpa": 8.62,
      "academicStanding": "Xuất sắc"
    }
  },
  "success": true
}
```

#### Bảng Ánh xạ Kiểu Dữ liệu (Field Mapping):
| Field | Type | Ý nghĩa & Mô tả |
| :--- | :--- | :--- |
| `stats.registeredCourses` | `number` | Số môn học phần đã đăng ký hợp lệ trong học kỳ |
| `stats.weeklyClasses` | `number` | Tổng số tiết / giờ học trong một tuần |
| `stats.pendingRegistrations` | `number` | Số môn đang ở trạng thái chờ duyệt (PENDING) |
| `stats.scheduleConflicts` | `number` | Số ca học bị phát hiện trùng lịch |
| `upcomingClasses[].id` | `number` | ID của lớp học phần |
| `upcomingClasses[].courseCode` | `string` | Mã môn học (VD: CS201) |
| `upcomingClasses[].courseName` | `string` | Tên môn học |
| `upcomingClasses[].dayOfWeek` | `string` | Thứ trong tuần: `"MON"`, `"TUE"`, `"WED"`, `"THU"`, `"FRI"`, `"SAT"`, `"SUN"` |
| `upcomingClasses[].startTime` | `string` | Giờ bắt đầu (định dạng `HH:mm`, VD: `"09:00"`) |
| `upcomingClasses[].endTime` | `string` | Giờ kết thúc (định dạng `HH:mm`, VD: `"10:30"`) |
| `upcomingClasses[].roomName` | `string` | Phòng học (VD: `"Room A-204"`, `"Lab Cloud-1"`) |
| `upcomingClasses[].lecturerName` | `string` | Họ tên kèm học vị giảng viên đứng lớp |
| `upcomingClasses[].sectionCode` | `string` | Mã lớp học phần (VD: `"CS201-2025-01"`) |
| `upcomingClasses[].credits` | `number` | Số tín chỉ của học phần |
| `upcomingClasses[].semesterName` | `string` | Tên học kỳ (VD: `"2024-25_SEM2"`) |
| `upcomingClasses[].status` | `string` | Trạng thái đăng ký: `"REGISTERED"`, `"PENDING"` |
| `semesterProgress.creditsEarned` | `number` | Số tín chỉ sinh viên đã tích lũy |
| `semesterProgress.totalRequiredCredits` | `number` | Tổng số tín chỉ yêu cầu tốt nghiệp (mặc định 160) |
| `semesterProgress.attendanceRate` | `number` | Tỷ lệ chuyên cần trung bình tính theo % (VD: 99.2) |
| `semesterProgress.currentCgpa` | `number` | Điểm trung bình tích lũy hiện tại (thang 10, VD: 8.74) |
| `semesterProgress.previousCgpa` | `number` | Điểm C-GPA của học kỳ liền trước (VD: 8.62) |
| `semesterProgress.academicStanding` | `string` | Xếp loại học lực: `"Xuất sắc"`, `"Giỏi"`, `"Khá"`, `"Trung bình"`, `"Yếu"` |

---

### 2.2. API Thời Khóa Biểu (`GET /api/v1/student/timetable`)

- **URL**: `https://rikkeiportal.io.vn/api/v1/student/timetable`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Query Parameters**:
  - `semester`: (Tùy chọn) Lọc theo học kỳ (VD: `"2024-25_SEM2"`, `"ALL"`, hoặc bỏ trống để lấy kỳ hiện tại).
- **Phân quyền Gateway**: `STUDENT`, `ADMIN`
- **Sorting Backend**: Đã được sắp xếp theo thứ tự ngày trong tuần (`MON` -> `SUN`) và theo `startTime`.

#### Response Body thành công (HTTP 200 OK):
```json
{
  "status": 200,
  "message": "Lấy thời khóa biểu thành công",
  "data": [
    {
      "id": 1,
      "courseCode": "CS201",
      "courseName": "Data Structures and Algorithms",
      "dayOfWeek": "MON",
      "startTime": "09:00",
      "endTime": "10:30",
      "roomName": "Room A-204",
      "lecturerName": "Tiến sĩ TS. Nguyễn Văn A",
      "sectionCode": "CS201-2025-01",
      "credits": 3,
      "semesterName": "2024-25_SEM2",
      "status": "REGISTERED"
    },
    {
      "id": 32,
      "courseCode": "SEC301",
      "courseName": "Mật mã học & Giao thức An toàn",
      "dayOfWeek": "MON",
      "startTime": "14:45",
      "endTime": "16:15",
      "roomName": "P.A-304",
      "lecturerName": "Thạc sĩ ThS. Hoàng Bích Ngọc",
      "sectionCode": "SEC301-242-01",
      "credits": 3,
      "semesterName": "2024-25_SEM2",
      "status": "REGISTERED"
    }
  ],
  "success": true
}
```

---

### 2.3. API Lịch Thi Cá Nhân (`GET /api/v1/student/exams`)

- **URL**: `https://rikkeiportal.io.vn/api/v1/student/exams`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Query Parameters**:
  - `semester`: (Tùy chọn) Mã học kỳ (VD: `"2024-25_SEM2"`).
- **Phân quyền Gateway**: `STUDENT`, `ADMIN`

#### Response Body thành công (HTTP 200 OK):
```json
{
  "status": 200,
  "message": "Lấy lịch thi thành công",
  "data": [
    {
      "id": 10,
      "courseCode": "CS405",
      "courseName": "Điện toán Đám mây & Thực hành DevOps",
      "sectionCode": "CS405-242-01",
      "credits": 4,
      "examDate": "2025-06-15",
      "startTime": "13:00:00",
      "endTime": "14:30:00",
      "roomName": "Lab Cloud-1",
      "examType": "THI MÁY",
      "notes": "Sinh viên mang theo thẻ sinh viên và có mặt trước 15 phút",
      "lecturerName": "Tiến sĩ TS. Vũ Trọng Khôi",
      "classSectionId": 25,
      "semesterName": "2024-25_SEM2",
      "currentEnrolled": 2,
      "maxCapacity": 40
    },
    {
      "id": 1,
      "courseCode": "CS201",
      "courseName": "Data Structures and Algorithms",
      "sectionCode": "CS201-2025-01",
      "credits": 3,
      "examDate": "2025-06-16",
      "startTime": "10:30:00",
      "endTime": "12:00:00",
      "roomName": "Room A-204",
      "examType": "TỰ LUẬN",
      "notes": "Sinh viên mang theo thẻ sinh viên và có mặt trước 15 phút",
      "lecturerName": "Tiến sĩ TS. Nguyễn Văn A",
      "classSectionId": 1,
      "semesterName": "2024-25_SEM2",
      "currentEnrolled": 2,
      "maxCapacity": 40
    }
  ],
  "success": true
}
```

#### Bảng Ánh xạ Kiểu Dữ liệu:
| Field | Type | Ý nghĩa & Mô tả |
| :--- | :--- | :--- |
| `id` | `number` | ID phiên thi |
| `courseCode` | `string` | Mã môn thi (VD: CS405) |
| `courseName` | `string` | Tên học phần thi |
| `sectionCode` | `string` | Mã lớp học phần dự thi |
| `credits` | `number` | Số tín chỉ của học phần |
| `examDate` | `string` | Ngày thi theo định dạng ISO `YYYY-MM-DD` |
| `startTime` | `string` | Giờ bắt đầu (`HH:mm:ss` hoặc `HH:mm`) |
| `endTime` | `string` | Giờ kết thúc (`HH:mm:ss` hoặc `HH:mm`) |
| `roomName` | `string` | Phòng thi được phân công |
| `examType` | `string` | Hình thức thi: `"TỰ LUẬN"`, `"TRẮC NGHIỆM"`, `"THI MÁY"`, `"BẢO VỆ ĐỒ ÁN"` |
| `notes` | `string` | Ghi chú hoặc quy chế phòng thi cho thí sinh |
| `lecturerName` | `string` | Giảng viên coi thi / phụ trách |
| `semesterName` | `string` | Kỳ thi tương ứng |

---

### 2.4. API Kết Quả Học Tập / Bảng Điểm (`GET /api/v1/student/grades`)

- **URL**: `https://rikkeiportal.io.vn/api/v1/student/grades`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Query Parameters**: Không có (Backend trả về toàn bộ điểm các kỳ của sinh viên)
- **Phân quyền Gateway**: `STUDENT`, `ADMIN`

#### Response Body thành công (HTTP 200 OK):
```json
{
  "status": 200,
  "message": "Lấy bảng điểm thành công",
  "data": [
    {
      "enrollmentId": 1,
      "courseCode": "CS201",
      "courseName": "Data Structures and Algorithms",
      "credits": 3,
      "semesterName": "2024-25_SEM2",
      "attendanceScore": 9.5,
      "midtermScore": 8.5,
      "finalScore": 8.78,
      "totalScore": 8.78,
      "letterGrade": "A",
      "isLocked": false
    },
    {
      "enrollmentId": 2,
      "courseCode": "CS301",
      "courseName": "Database Management Systems",
      "credits": 3,
      "semesterName": "2024-25_SEM2",
      "attendanceScore": 10.0,
      "midtermScore": 9.0,
      "finalScore": 8.8,
      "totalScore": 8.8,
      "letterGrade": "A",
      "isLocked": false
    }
  ],
  "success": true
}
```

#### Bảng Ánh xạ Kiểu Dữ liệu:
| Field | Type | Nullable | Ý nghĩa |
| :--- | :--- | :---: | :--- |
| `enrollmentId` | `number` | Không | ID bản ghi ghi danh |
| `courseCode` | `string` | Không | Mã học phần |
| `courseName` | `string` | Không | Tên học phần |
| `credits` | `number` | Có | Số tín chỉ của học phần |
| `semesterName` | `string` | Không | Tên học kỳ (VD: `"2024-25_SEM2"`) |
| `attendanceScore` | `number` | Có | Điểm chuyên cần (thang 10, null nếu chưa nhập) |
| `midtermScore` | `number` | Có | Điểm giữa kỳ (thang 10, null nếu chưa nhập) |
| `finalScore` | `number` | Có | Điểm cuối kỳ / tổng kết |
| `totalScore` | `number` | Có | Điểm tổng kết môn học (thang 10) |
| `letterGrade` | `string` | Có | Điểm chữ: `"A"`, `"B+"`, `"B"`, `"C+"`, `"C"`, `"D"`, `"F"`, null nếu chưa có |
| `isLocked` | `boolean` | Không | Trạng thái chốt sổ điểm bởi Giảng viên/Ban Đào tạo |

---

### 2.5. API Thông Tin Học Phí (`GET /api/v1/student/tuition`)

- **URL**: `https://rikkeiportal.io.vn/api/v1/student/tuition`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Query Parameters**:
  - `semester`: (Tùy chọn) Mã học kỳ (VD: `"2024-25_SEM2"`). Mặc định là kỳ hiện tại.
  - `bank`: (Tùy chọn) Mã BIN ngân hàng (VD: `970422` cho MB, `970415` cho VietinBank).
- **Phân quyền Gateway**: `STUDENT`, `ADMIN`

#### Response Body thành công (HTTP 200 OK):
```json
{
  "status": 200,
  "message": "Lấy thông tin học phí thành công",
  "data": {
    "id": 1,
    "semesterName": "2024-25_SEM2",
    "totalCredits": 19,
    "creditUnitPrice": 100,
    "facilityFee": 1000,
    "totalAmount": 2900,
    "paidAmount": 0,
    "remainingAmount": 2900,
    "excessAmount": 0,
    "status": "UNPAID",
    "dueDate": "2026-12-05",
    "paymentDate": null,
    "transactionCode": null,
    "paymentMethod": null,
    "courses": [
      {
        "courseCode": "CS201",
        "courseName": "Data Structures and Algorithms",
        "credits": 3,
        "fee": 300
      },
      {
        "courseCode": "CS405",
        "courseName": "Điện toán Đám mây & Thực hành DevOps",
        "credits": 4,
        "fee": 400
      }
    ],
    "studentCode": "SV2024001",
    "studentName": "Nguyễn Văn C",
    "bankBin": "970422",
    "bankName": "MB Bank (Ngân hàng TMCP Quân đội)",
    "bankShortName": "MB",
    "accountNumber": "999988882025",
    "accountName": "HOC VIEN CONG NGHE RIKKEI",
    "transferContent": "HP SV2024001 2024-25_SEM2",
    "vietQrPayload": "00020101021238560010A0000007270126000697042201129999888820250208QRIBFTTA5303704540429005802VN62290825HP SV2024001 2024-25_SEM26304F13D",
    "vietQrQuickLink": "https://img.vietqr.io/image/970422-999988882025-compact2.png?amount=2900&addInfo=HP+SV2024001+2024-25_SEM2&accountName=HOC+VIEN+CONG+NGHE+RIKKEI",
    "supportedBanks": [
      {
        "bankBin": "970422",
        "bankShortName": "MB",
        "bankName": "MB Bank (Ngân hàng TMCP Quân đội)",
        "accountNumber": "999988882025",
        "accountName": "HOC VIEN CONG NGHE RIKKEI",
        "vietQrPayload": "...",
        "vietQrQuickLink": "..."
      },
      {
        "bankBin": "970415",
        "bankShortName": "VietinBank",
        "bankName": "VietinBank (Ngân hàng TMCP Công thương Việt Nam)",
        "accountNumber": "999988882025",
        "accountName": "HOC VIEN CONG NGHE RIKKEI",
        "vietQrPayload": "...",
        "vietQrQuickLink": "..."
      }
    ]
  },
  "success": true
}
```

#### Quy tắc Nghiệp vụ Trạng thái Học phí:
- `"PAID"`: Đã thanh toán đầy đủ (`paidAmount >= totalAmount`).
- `"UNPAID"`: Chưa nộp khoản tiền nào (`paidAmount == 0`).
- `"PARTIAL"`: Đã nộp một phần (`0 < paidAmount < totalAmount`).
- `"NOT_ENROLLED"`: Chưa đăng ký học phần nào trong kỳ (công nợ = 0 VNĐ).

---

### 2.6. API Hồ Sơ Cá Nhân (`GET` / `PUT /api/v1/profile/me`)

#### Xem Hồ sơ (`GET /api/v1/profile/me`):
- **URL**: `https://rikkeiportal.io.vn/api/v1/profile/me`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**:
```json
{
  "status": 200,
  "message": "Lấy thông tin hồ sơ thành công",
  "data": {
    "user": {
      "id": 4,
      "username": "sv2024001",
      "email": "nguyenvanc@rikkei.edu.vn",
      "fullName": "Nguyễn Văn C",
      "role": "STUDENT",
      "avatarUrl": "https://encrypted-tbn0.gstatic.com/images?q=tbn:...",
      "status": "ACTIVE",
      "createdAt": "2026-10-27T06:36:38.724609"
    },
    "studentProfile": {
      "studentCode": "SV2024001",
      "major": "B.Tech - Computer Science",
      "currentSemester": 6,
      "creditsEarned": 84,
      "totalRequiredCredits": 160,
      "currentCgpa": 8.74,
      "previousCgpa": 8.62
    },
    "lecturerProfile": null
  },
  "success": true
}
```

#### Cập nhật Hồ sơ (`PUT /api/v1/profile/me`):
- **URL**: `https://rikkeiportal.io.vn/api/v1/profile/me`
- **Method**: `PUT`
- **Headers**: `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Request Body**:
```json
{
  "fullName": "Nguyễn Văn C",
  "email": "nguyenvanc@rikkei.edu.vn",
  "avatarUrl": "https://example.com/avatar.jpg",
  "oldPassword": "optional_old_password",
  "newPassword": "optional_new_password"
}
```
- **Validation**:
  - `email`: Phải đúng định dạng `@Email`.
  - `oldPassword`/`newPassword`: Chỉ gửi khi người dùng muốn đổi mật khẩu. Nếu đổi mật khẩu, `oldPassword` bắt buộc đúng với mật khẩu hiện tại.

---

### 2.7. Danh mục API Không Tồn Tại hoặc Ngoài Phạm Vi Phase 3 (Excluded / Not Implemented)

| Nghiệp vụ | Trạng thái Backend | Nguyên tắc Xử lý trên Mobile Phase 3 |
| :--- | :---: | :--- |
| **Thanh toán Trực tuyến Mock** | **KHÔNG TỒN TẠI** | Tuyệt đối không tạo API mock nộp tiền giả. Chỉ hiển thị thông tin VietQR/Chuyển khoản thực tế do Backend cung cấp (`TuitionDto`). |
| **Tính toán GPA / Xếp loại Tự do** | **KHÔNG TỰ SUY DIỄN** | Điểm số, CGPA, xếp loại học vụ bắt buộc lấy từ Backend (`SemesterProgressDto`, `StudentGradeDto`). Tuyệt đối không tự bịa công thức tính. |
| **Đổi vai trò tài khoản từ Client** | **BỊ CHẶN BỞI GATEWAY** | Role hoàn toàn do chữ ký JWT và Backend quyết định (`STUDENT`, `LECTURER`, `ADMIN`). |
| **Admin Mobile Dashboard** | **KHÔNG HỖ TRỢ** | Điều hướng `/unauthorized` kèm đường dẫn mở Cổng Quản Trị Web. |

---

## 3. Mã Phản hồi Lỗi và Xử lý Ngoại lệ (Error Responses)

Mọi phản hồi lỗi từ API Gateway và các Microservices hạ tầng đều tuân thủ cấu trúc `ApiResponse<T>`:

```json
{
  "status": 401,
  "message": "Yêu cầu xác thực: Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
  "success": false
}
```

- **HTTP 401 Unauthorized**: Token JWT hết hạn hoặc không hợp lệ. Mobile Interceptor tự động kích hoạt hàng đợi Mutex Refresh Token. Nếu Refresh Token cũng hết hạn, session bị hủy sạch và chuyển hướng về `/(auth)/login`.
- **HTTP 403 Forbidden**: Tài khoản không đủ quyền (ví dụ `LECTURER` truy cập endpoint `/api/v1/student/**`). Route Guard và Gateway chặn đồng thời.
- **HTTP 404 Not Found**: Không tìm thấy dữ liệu học viên trong CSDL.
- **HTTP 500 / 503 Service Unavailable**: Máy chủ bảo trì hoặc sự cố kết nối. Màn hình Mobile hiển thị Error State kèm nút **Thử lại (Retry)**, không crash ứng dụng.

---

## 4. Kết luận Đối soát

- **100% 7 API chính thức của phân hệ Sinh viên đã tồn tại trên Backend và đã được kiểm chứng hoạt động thực tế với HTTP 200 OK.**
- Cấu trúc DTO hoàn toàn khớp giữa Backend Spring Boot và kiểu TypeScript trên Mobile.
- Tài liệu này là cơ sở vững chắc để triển khai các Services, Hooks và UI Screens cho Phase 3.
