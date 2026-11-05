# API Contract: Schedule Optimizer (CSP AI Solver)

Tài liệu đặc tả chuẩn hóa API Contract giữa Frontend và Backend cho module **Smart Schedule Optimizer** thuộc `enrollment-service`.

---

## 1. Tổng quan Endpoint

| Thông số | Giá trị |
| :--- | :--- |
| **Endpoint** | `/api/v1/student/schedule-optimizer/solve` |
| **Method** | `POST` |
| **Content-Type** | `application/json` |
| **Authentication** | Bearer JWT Token (`Authorization: Bearer <token>`) |
| **Custom Headers (Tùy chọn)** | `X-User-Username`, `X-Student-Code` |

---

## 2. Request Contract

### 2.1 Cấu trúc Request JSON

```json
{
  "courseIds": [101, 102, 103],
  "semesterName": "2024-25_SEM2",
  "avoidDays": ["SAT", "SUN"],
  "preferredShift": "MORNING",
  "optimizationGoal": "COMPACT",
  "onlyAvailableSeats": true,
  "maxSolutions": 100,
  "maxExecutionTimeMs": 3000,
  "maxSearchNodes": 50000
}
```

### 2.2 Chi tiết các trường Request

| Tên trường | Kiểu dữ liệu | Bắt buộc | Mặc định | Mô tả & Ràng buộc |
| :--- | :--- | :---: | :--- | :--- |
| `courseIds` | `Array<Long>` | **Có** | `[]` | Danh sách ID các môn học sinh viên muốn xếp lịch. Tổng số tín chỉ $\le 24$ TC (Quy chế BR-01). |
| `semesterName` | `String` | Không | `"2024-25_SEM2"` | Tên học kỳ đang mở đăng ký. |
| `avoidDays` | `Array<String>` | Không | `["SAT", "SUN"]` | Danh sách các thứ muốn tránh: `["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]`. |
| `preferredShift`| `String` | Không | `"ANY"` | Ca học ưu tiên: `"MORNING"` (07:00 - 11:45), `"AFTERNOON"` (13:00 - 17:45), hoặc `"ANY"`. |
| `optimizationGoal`| `String` | Không | `"COMPACT"` | Mục tiêu xếp lịch: `"COMPACT"` (dồn ngày gọn), `"BALANCED"` (cân bằng tối đa 2 lớp/ngày), `"MAX_FREE_DAYS"` (tối đa ngày nghỉ). |
| `onlyAvailableSeats`| `Boolean` | Không | `true` | Chỉ lọc các lớp còn chỗ trống (`currentEnrolled < maxCapacity`). |
| `maxSolutions` | `Integer` | Không | `100` | Giới hạn số lượng nghiệm tối đa cần tìm trước khi dừng DFS. |
| `maxExecutionTimeMs`| `Long` | Không | `3000` | Giới hạn thời gian tối đa chạy solver (tính bằng ms). |
| `maxSearchNodes` | `Integer` | Không | `50000` | Giới hạn số node (trạng thái) duyệt tối đa của thuật toán DFS Backtracking. |

---

## 3. Response Contract

Tất cả các response trả về đều tuân theo chuẩn bọc envelope `ApiResponse<T>` của hệ thống:

```json
{
  "status": 200,
  "message": "AI đã tối ưu hóa thời khóa biểu thành công",
  "data": { ... }
}
```

### 3.1 Response Data Fields

| Tên trường | Kiểu dữ liệu | Mô tả | Lưu ý tích hợp FE |
| :--- | :--- | :--- | :--- |
| `status` | `String` (Enum) | Trạng thái giải bài toán CSP: `SUCCESS`, `NO_SOLUTION`, `TIME_LIMIT_EXCEEDED`, `SEARCH_LIMIT_REACHED`, `INVALID_REQUEST` | Trường định danh chuẩn cho FE phân nhánh xử lý |
| `statusMessage` | `String` | Thông báo chi tiết bằng tiếng Việt để hiển thị trực tiếp lên UI/Toast | FE hiện tại đang bind trực tiếp trường này |
| `semesterName` | `String` | Học kỳ áp dụng | Ví dụ: `"2024-25_SEM2"` |
| `requestedCoursesCount` | `Integer` | Số môn học hợp lệ được đưa vào thuật toán | |
| `totalSolutions` | `Integer` | Tổng số phương án thời khóa biểu không trùng lịch tìm được | Trường chuẩn REST |
| `validOptionsCount` | `Integer` | Giống `totalSolutions` | Duy trì tương thích ngược 100% cho FE hiện tại |
| `nodesExplored` | `Integer` | Số node mà DFS Backtracking đã duyệt qua | Đo lường hiệu năng |
| `totalCombinationsChecked` | `Integer` | Giống `nodesExplored` | Duy trì tương thích ngược 100% cho FE hiện tại |
| `executionTimeMs` | `Long` | Tổng thời gian tính toán của solver (ms) | |
| `conflictDetails` | `String` | Chẩn đoán nguyên nhân xung đột cụ thể khi không tìm thấy nghiệm | Hữu ích khi `status == "NO_SOLUTION"` |
| `plans` | `Array<SchedulePlanOption>` | Danh sách Top 3 phương án thời khóa biểu đã phân loại theo thứ hạng đa dạng | FE hiện tại đang đọc `data.plans` |
| `schedules` | `Array<SchedulePlanOption>` | Alias trỏ cùng dữ liệu với `plans` | Chuẩn hóa API REST |

---

## 4. Các kịch bản Response mẫu (FE-Ready JSON)

### 4.1 Thành công tìm được phương án (`SUCCESS`) - HTTP 200

```json
{
  "status": 200,
  "message": "AI đã tối ưu hóa thời khóa biểu thành công",
  "data": {
    "status": "SUCCESS",
    "statusMessage": "AI CSP Optimizer đã phân tích 36 tổ hợp và tìm thấy 12 phương án hợp lệ không bị trùng lịch!",
    "semesterName": "2024-25_SEM2",
    "requestedCoursesCount": 3,
    "totalSolutions": 12,
    "validOptionsCount": 12,
    "nodesExplored": 36,
    "totalCombinationsChecked": 36,
    "executionTimeMs": 14,
    "plans": [
      {
        "planIndex": 1,
        "title": "Phương án 1: Tối ưu hàng đầu (AI Khuyên dùng)",
        "matchPercentage": 96,
        "totalCredits": 9,
        "studyDaysCount": 3,
        "studyDays": ["MON", "WED", "FRI"],
        "highlights": [
          "Tránh 100% Thứ 7 & ngày nghỉ cuối tuần",
          "100% các lớp học thuộc Ca Sáng (07:00 - 11:45)",
          "Lịch gọn trong 3 ngày/tuần (Nghỉ 4 ngày)",
          "Chỗ trống an toàn (trung bình >= 5 chỗ/lớp)"
        ],
        "sections": [
          {
            "id": 101,
            "sectionCode": "CS101-01",
            "courseId": 1,
            "courseCode": "CS101",
            "courseName": "Lập trình Cơ bản",
            "credits": 3,
            "weeklyHours": 3,
            "dayOfWeek": "MON",
            "startTime": "07:00:00",
            "endTime": "09:15:00",
            "roomName": "A-101",
            "maxCapacity": 50,
            "currentEnrolled": 24,
            "lecturerName": "ThS. Nguyễn Văn A",
            "status": "OPEN"
          }
        ]
      }
    ],
    "schedules": [
      {
        "planIndex": 1,
        "title": "Phương án 1: Tối ưu hàng đầu (AI Khuyên dùng)",
        "matchPercentage": 96,
        "totalCredits": 9,
        "studyDaysCount": 3,
        "studyDays": ["MON", "WED", "FRI"],
        "highlights": [
          "Tránh 100% Thứ 7 & ngày nghỉ cuối tuần"
        ],
        "sections": [
          {
            "id": 101,
            "sectionCode": "CS101-01",
            "courseId": 1,
            "courseCode": "CS101",
            "courseName": "Lập trình Cơ bản",
            "credits": 3,
            "dayOfWeek": "MON",
            "startTime": "07:00:00",
            "endTime": "09:15:00",
            "roomName": "A-101"
          }
        ]
      }
    ]
  }
}
```

### 4.2 Không có phương án khả thi (`NO_SOLUTION`) - HTTP 200

Khi thuật toán đã duyệt triệt để toàn bộ không gian tìm kiếm và chứng minh chắc chắn 100% không thể ghép được lịch:

```json
{
  "status": 200,
  "message": "Không thể ghép được phương án nào không bị trùng lịch giữa 2 môn học đã chọn. Xung đột: Lớp CS101-01 (MON 09:00:00-10:30:00) trùng lịch với lớp CS102-01 (MON 09:00:00-10:30:00). (Tất cả các lớp của 2 môn này đều bị xung đột thời gian).",
  "data": {
    "status": "NO_SOLUTION",
    "statusMessage": "Không thể ghép được phương án nào không bị trùng lịch giữa 2 môn học đã chọn. Xung đột: Lớp CS101-01 (MON 09:00:00-10:30:00) trùng lịch với lớp CS102-01 (MON 09:00:00-10:30:00). (Tất cả các lớp của 2 môn này đều bị xung đột thời gian).",
    "semesterName": "2024-25_SEM2",
    "requestedCoursesCount": 2,
    "totalSolutions": 0,
    "validOptionsCount": 0,
    "nodesExplored": 4,
    "totalCombinationsChecked": 4,
    "executionTimeMs": 3,
    "conflictDetails": "Xung đột: Lớp CS101-01 (MON 09:00:00-10:30:00) trùng lịch với lớp CS102-01 (MON 09:00:00-10:30:00). (Tất cả các lớp của 2 môn này đều bị xung đột thời gian).",
    "plans": [],
    "schedules": []
  }
}
```

### 4.3 Quá thời gian cho phép (`TIME_LIMIT_EXCEEDED`) - HTTP 200

> [!IMPORTANT]
> Solver bị ngắt khi chạm ngưỡng `maxExecutionTimeMs` (mặc định 3000ms).
> Trạng thái này **KHÔNG** tương đương với `NO_SOLUTION`, vì không gian tìm kiếm chưa được duyệt hết.

```json
{
  "status": 200,
  "message": "Thời gian tìm kiếm đã vượt quá giới hạn tối đa (3000ms). Không thể kết luận bài toán có nghiệm hay không. Vui lòng giảm bớt số môn hoặc nới lỏng ràng buộc ca học.",
  "data": {
    "status": "TIME_LIMIT_EXCEEDED",
    "statusMessage": "Thời gian tìm kiếm đã vượt quá giới hạn tối đa (3000ms). Không thể kết luận bài toán có nghiệm hay không. Vui lòng giảm bớt số môn hoặc nới lỏng ràng buộc ca học.",
    "semesterName": "2024-25_SEM2",
    "requestedCoursesCount": 6,
    "totalSolutions": 0,
    "validOptionsCount": 0,
    "nodesExplored": 18450,
    "totalCombinationsChecked": 18450,
    "executionTimeMs": 3004,
    "plans": [],
    "schedules": []
  }
}
```

### 4.4 Chạm giới hạn số node (`SEARCH_LIMIT_REACHED`) - HTTP 200

```json
{
  "status": 200,
  "message": "Đã chạm giới hạn duyệt tối đa (50000 nodes). Không thể tìm thấy phương án trong giới hạn tìm kiếm cho phép.",
  "data": {
    "status": "SEARCH_LIMIT_REACHED",
    "statusMessage": "Đã chạm giới hạn duyệt tối đa (50000 nodes). Không thể tìm thấy phương án trong giới hạn tìm kiếm cho phép.",
    "semesterName": "2024-25_SEM2",
    "requestedCoursesCount": 8,
    "totalSolutions": 0,
    "validOptionsCount": 0,
    "nodesExplored": 50000,
    "totalCombinationsChecked": 50000,
    "executionTimeMs": 112,
    "plans": [],
    "schedules": []
  }
}
```

### 4.5 Dữ liệu yêu cầu không hợp lệ (`INVALID_REQUEST`) - HTTP 200

Trường hợp sinh viên chọn quá 24 tín chỉ (Quy chế BR-01) hoặc danh sách môn học rỗng:

```json
{
  "status": 200,
  "message": "Quy chế BR-01: Tổng số tín chỉ các môn đã chọn (27 TC) vượt quá hạn mức tối đa 24 tín chỉ trong một học kỳ. Vui lòng giảm bớt số lượng môn học.",
  "data": {
    "status": "INVALID_REQUEST",
    "statusMessage": "Quy chế BR-01: Tổng số tín chỉ các môn đã chọn (27 TC) vượt quá hạn mức tối đa 24 tín chỉ trong một học kỳ. Vui lòng giảm bớt số lượng môn học.",
    "semesterName": "2024-25_SEM2",
    "requestedCoursesCount": 9,
    "totalSolutions": 0,
    "validOptionsCount": 0,
    "nodesExplored": 0,
    "totalCombinationsChecked": 0,
    "executionTimeMs": 1,
    "plans": [],
    "schedules": []
  }
}
```

---

## 5. Hướng dẫn tích hợp Frontend (FE Integration Notes)

1. **Phân biệt rành mạch giữa No Solution và Timeout/Search Limit**:
   - `data.status === "SUCCESS"`: Hiển thị danh sách phương án (`data.plans` hoặc `data.schedules`).
   - `data.status === "NO_SOLUTION"`: Hiển thị banner/toast cảnh báo: *"Không có cách xếp nào tránh được xung đột giữa các môn đã chọn"* cùng chi tiết `data.conflictDetails`.
   - `data.status === "TIME_LIMIT_EXCEEDED"` hoặc `data.status === "SEARCH_LIMIT_REACHED"`: Hiển thị thông báo: *"Bài toán có độ phức tạp cao, chưa tìm thấy lịch phù hợp trong thời gian quy định. Vui lòng thử nới lỏng ràng buộc ca học hoặc bỏ bớt 1 môn"*.
   - `data.status === "INVALID_REQUEST"`: Báo lỗi nhập liệu hoặc vi phạm quy chế BR-01 (quá 24 tín chỉ).

2. **Khả năng tương thích ngược (Backward Compatibility)**:
   - Toàn bộ các trường cũ mà `ScheduleOptimizerModal.jsx` sử dụng (`data.plans`, `data.validOptionsCount`, `data.statusMessage`, `data.totalCombinationsChecked`) vẫn được giữ nguyên đầy đủ.
   - Frontend không cần sửa đổi bất kỳ code logic hiển thị nào hiện tại mà vẫn hoạt động bình thường, đồng thời có thể tận dụng ngay các trường chuẩn hóa mới (`status`, `schedules`, `executionTimeMs`, `conflictDetails`).
