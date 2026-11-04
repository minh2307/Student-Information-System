# API Contract: Academic Advisor (Gemini AI & Enrollment Data Integration)

Tài liệu đặc tả chuẩn hóa API Contract giữa Frontend (UI Web/Mobile) và AI Service (`ai-service`) kết hợp `enrollment-service` cho tính năng **AI Academic Advisor (Cố vấn Học tập Thông minh)** trên hệ thống Rikkei EduPortal.

---

## 1. Tổng quan Endpoint & Bảo mật

| Thông số | Giá trị |
| :--- | :--- |
| **Endpoint** | `/api/v1/ai/academic-advisor` |
| **Direct Service URL** | `http://ai-service:8084/api/v1/ai/academic-advisor` |
| **Gateway Routed URL** | `http://api-gateway:8080/api/v1/ai/academic-advisor` |
| **HTTP Method** | `POST` |
| **Content-Type** | `application/json; charset=UTF-8` |
| **Yêu cầu Xác thực** | Bearer JWT Token (`Authorization: Bearer <token>`) |
| **Phân quyền bắt buộc** | Role: `STUDENT` (`@RequireRoles({Role.STUDENT})`) |
| **Bảo vệ Cô lập Dữ liệu** | Danh tính sinh viên được trích xuất trực tiếp từ JWT Claims / Security Context (`sub`/`username`). Hệ thống **tự động ghi đè** mọi `studentCode` do client gửi lên để ngăn chặn hành vi truy cập trái phép bảng điểm sinh viên khác. |

---

## 2. Request Contract

### 2.1 Cấu trúc Request JSON

```json
{
  "message": "Tôi nên đăng ký những môn nào trong học kỳ tiếp theo?",
  "history": [
    {
      "role": "user",
      "content": "Chào cố vấn, mình muốn kiểm tra số tín chỉ đã học."
    },
    {
      "role": "assistant",
      "content": "Chào bạn! Hiện tại bạn đã hoàn thành 84/160 tín chỉ theo chương trình chuẩn."
    }
  ],
  "studentCode": "SV2024001",
  "currentSemester": 6,
  "major": "B.Tech - Computer Science"
}
```

### 2.2 Chi tiết các trường Request

| Tên trường | Kiểu dữ liệu | Bắt buộc | Mô tả & Ràng buộc |
| :--- | :--- | :---: | :--- |
| `message` | `String` | **Có** | Nội dung câu hỏi của sinh viên. Không được để trống. Alias: `prompt`, `question`, `query`. |
| `history` | `Array<ChatMessageDto>` | Không | Danh sách lịch sử hội thoại gần nhất (tối đa 6 turns) phục vụ duy trì ngữ cảnh. Mỗi item gồm `{ role: "user" \| "assistant", content: "..." }`. |
| `studentCode` | `String` | Không | Mã sinh viên tham khảo từ phía client. *Lưu ý: Backend luôn ưu tiên danh tính đã xác thực từ JWT để đảm bảo an toàn.* |
| `currentSemester` | `Integer` | Không | Học kỳ hiện tại của sinh viên. |
| `major` | `String` | Không | Chuyên ngành đào tạo. |
| `creditsEarned` | `Integer` | Không | Số tín chỉ đã tích lũy (tùy chọn). |
| `currentCgpa` | `Double` | Không | Điểm trung bình tích lũy hiện tại (tùy chọn). |
| `conflictingSections` | `Array<String>` | Không | Danh sách mã lớp học phần bị xung đột thời khóa biểu nếu FE đã phát hiện trước. |

---

## 3. Response Modes & Definitions

Hệ thống cung cấp 3 trạng thái phản hồi rõ ràng thông qua trường `data.mode`:

| Response Mode | Ý nghĩa | Điều kiện kích hoạt |
| :--- | :--- | :--- |
| **`GEMINI`** | Phản hồi thông minh cá nhân hóa từ Google Gemini AI | Gemini API khả dụng + Enrollment Service khả dụng kết nối thành công. |
| **`FALLBACK`** | Phản hồi dự phòng thông minh qua Offline Rule Engine | Gemini không khả dụng (thiếu key, lỗi mạng, timeout, rate limit) **nhưng** Enrollment Service khả dụng với dữ liệu học vụ thực tế. |
| **`LIMITED`** | Phản hồi tư vấn quy chế chung có cảnh báo giới hạn | Enrollment Service không khả dụng (connection refused, timeout). Hệ thống **tuyệt đối không bịa đặt** số tín chỉ hay môn học của sinh viên. |

---

## 4. Response Contract Examples

### 4.1 Response khi Gemini khả dụng (`mode: GEMINI`)

```json
{
  "status": 200,
  "success": true,
  "message": "Tư vấn học tập thành công từ Cố vấn AI",
  "data": {
    "reply": "Chào bạn! Dựa trên lịch sử học tập tại Rikkei EduPortal, bạn đã tích lũy thành công **84 / 160 tín chỉ** với điểm C-GPA **8.74** (Xếp loại: Xuất sắc).\n\nVì bạn đã đạt điểm A môn tiên quyết **CS201 (Cấu trúc dữ liệu và giải thuật)**, trong học kỳ tiếp theo bạn hoàn toàn đủ điều kiện đăng ký môn chuyên ngành cốt lõi:\n\n1. **CS401 - Web Application Development** (3 TC): Đã đạt môn tiên quyết CS201, phù hợp lộ trình kỳ 6 ngành Công nghệ Thông tin.\n2. **AI101 - Artificial Intelligence Basics** (3 TC): Đã đạt điều kiện tiên quyết CS201, hiện đang mở lớp trong kỳ và không bị xung đột thời khóa biểu.\n\n⚠️ *Lưu ý*: Lớp học phần CS402-01 của bạn hiện đang bị cảnh báo trùng lịch. Bạn hãy chuyển sang Section mở vào khung giờ khác để hoàn thiện đăng ký nhé!",
    "mode": "GEMINI",
    "category": "COURSE_RECOMMENDATION",
    "provider": "gemini",
    "model": "gemini-1.5-flash",
    "fallbackUsed": false,
    "academicSummary": {
      "studentCode": "SV2024001",
      "fullName": "Nguyễn Văn C",
      "major": "B.Tech - Computer Science",
      "currentSemester": 6,
      "completedCredits": 84,
      "registeredCreditsCurrentSemester": 6,
      "remainingCreditsToGraduate": 76,
      "totalRequiredCredits": 160,
      "currentCgpa": 8.74,
      "previousCgpa": 8.62,
      "academicStanding": "Xuất sắc",
      "attendanceRate": 97.5,
      "completedCoursesCount": 2,
      "currentlyEnrolledCoursesCount": 2,
      "failedCoursesCount": 0,
      "scheduleConflictCount": 1
    },
    "recommendations": [
      {
        "courseCode": "CS401",
        "courseName": "Web Application Development",
        "credits": 3,
        "reason": "Đã hoàn thành môn tiên quyết CS201 (Data Structures and Algorithms). Môn mở lớp trong kỳ và phù hợp lộ trình ngành B.Tech - Computer Science.",
        "prerequisiteSatisfied": true,
        "availableInCurrentSemester": true,
        "recommendedPriority": "HIGH"
      },
      {
        "courseCode": "AI101",
        "courseName": "Artificial Intelligence Basics",
        "credits": 3,
        "reason": "Đã hoàn thành môn tiên quyết CS201 (Data Structures and Algorithms). Môn mở lớp trong kỳ và phù hợp lộ trình ngành B.Tech - Computer Science.",
        "prerequisiteSatisfied": true,
        "availableInCurrentSemester": true,
        "recommendedPriority": "HIGH"
      }
    ],
    "limitations": [],
    "suggestions": [
      "Một kỳ mình được đăng ký tối đa bao nhiêu tín chỉ?",
      "Mình bị trùng lịch học giữa 2 môn thì phải làm thế nào?",
      "Điều kiện tiên quyết để học môn CS401 Web Development là gì?",
      "Gợi ý lộ trình môn học cho sinh viên kỳ 4 ngành CNTT?",
      "Quy chế điểm chuyên cần và điều kiện được thi cuối kỳ?"
    ],
    "timestamp": "2026-11-03T12:00:00"
  }
}
```

---

### 4.2 Response khi Gemini không khả dụng - Chế độ Dự phòng (`mode: FALLBACK`)

Khi `GEMINI_API_KEY` chưa cấu hình, rỗng, bị lỗi rate-limit hoặc timeout, hệ thống tự động kích hoạt **Deterministic Offline Advisor** sử dụng dữ liệu thực tế từ `enrollment-service`:

```json
{
  "status": 200,
  "success": true,
  "message": "Tư vấn học tập thành công qua bộ quy chế dự phòng",
  "data": {
    "reply": "> ℹ️ **Chế độ Dự phòng Thông minh (Offline Advisor)**: Trợ lý AI đang xử lý ngoại tuyến dựa trên dữ liệu học vụ thực tế được trích xuất từ hệ thống đăng ký học phần.\n\n### 🗺️ Gợi ý Lộ trình Học tập & Môn học Đăng ký Ngành CNTT\n\n**Hồ sơ học tập thực tế của bạn:**\n- **Mã sinh viên**: `SV2024001` (Nguyễn Văn C)\n- **Chuyên ngành**: B.Tech - Computer Science | **Học kỳ hiện tại**: Kỳ 6\n- **Tiến độ tích lũy**: **84 / 160 tín chỉ** (Còn thiếu 76 TC để tốt nghiệp)\n- **Điểm C-GPA**: **8.74 / 10.0** (Xếp loại: **Xuất sắc**)\n\n📚 **Các môn học khuyến nghị đăng ký cho học kỳ tiếp theo:**\n\n1. **CS401 - Web Application Development** (3 TC) ⭐ [Ưu tiên cao]\n   - *Lý do*: Đã hoàn thành môn tiên quyết CS201 (Data Structures and Algorithms). Môn mở lớp trong kỳ và phù hợp lộ trình ngành B.Tech - Computer Science.\n2. **AI101 - Artificial Intelligence Basics** (3 TC) ⭐ [Ưu tiên cao]\n   - *Lý do*: Đã hoàn thành môn tiên quyết CS201 (Data Structures and Algorithms). Môn mở lớp trong kỳ và phù hợp lộ trình ngành B.Tech - Computer Science.\n\n💡 **Kế hoạch tải tín chỉ**: Bạn nên đăng ký từ **15 đến 18 tín chỉ** (khoảng 5-6 môn) để cân đối khối lượng học tập và thời gian thực hành đồ án.",
    "mode": "FALLBACK",
    "category": "COURSE_RECOMMENDATION",
    "provider": "Offline Academic Rule Engine",
    "model": "rule-based-advisor-v2",
    "fallbackUsed": true,
    "academicSummary": {
      "studentCode": "SV2024001",
      "fullName": "Nguyễn Văn C",
      "major": "B.Tech - Computer Science",
      "currentSemester": 6,
      "completedCredits": 84,
      "registeredCreditsCurrentSemester": 6,
      "remainingCreditsToGraduate": 76,
      "totalRequiredCredits": 160,
      "currentCgpa": 8.74,
      "previousCgpa": 8.62,
      "academicStanding": "Xuất sắc",
      "attendanceRate": 97.5,
      "completedCoursesCount": 2,
      "currentlyEnrolledCoursesCount": 2,
      "failedCoursesCount": 0,
      "scheduleConflictCount": 0
    },
    "recommendations": [
      {
        "courseCode": "CS401",
        "courseName": "Web Application Development",
        "credits": 3,
        "reason": "Đã hoàn thành môn tiên quyết CS201 (Data Structures and Algorithms). Môn mở lớp trong kỳ và phù hợp lộ trình ngành B.Tech - Computer Science.",
        "prerequisiteSatisfied": true,
        "availableInCurrentSemester": true,
        "recommendedPriority": "HIGH"
      },
      {
        "courseCode": "AI101",
        "courseName": "Artificial Intelligence Basics",
        "credits": 3,
        "reason": "Đã hoàn thành môn tiên quyết CS201 (Data Structures and Algorithms). Môn mở lớp trong kỳ và phù hợp lộ trình ngành B.Tech - Computer Science.",
        "prerequisiteSatisfied": true,
        "availableInCurrentSemester": true,
        "recommendedPriority": "HIGH"
      }
    ],
    "limitations": [],
    "suggestions": [
      "Một kỳ mình được đăng ký tối đa bao nhiêu tín chỉ?",
      "Cách kiểm tra môn học tiên quyết trên hệ thống?",
      "Làm thế nào để xử lý trùng lịch học giữa 2 môn?"
    ],
    "timestamp": "2026-11-03T12:00:00"
  }
}
```

---

### 4.3 Response khi Enrollment Service không khả dụng (`mode: LIMITED`)

Khi `enrollment-service` bảo trì hoặc gặp sự cố mạng, hệ thống **không bao giờ bịa đặt** kết quả học tập của sinh viên:

```json
{
  "status": 200,
  "success": true,
  "message": "Tư vấn học tập thành công qua bộ quy chế dự phòng",
  "data": {
    "reply": "> ⚠️ **Thông báo Hạn chế Hệ thống**: Không thể kết nối đến máy chủ Quản lý Đào tạo (Enrollment Service). Dưới đây là thông tin tư vấn dựa trên quy chế chung (không có dữ liệu cá nhân).\n\n### 📚 Quy chế Số tín chỉ Đăng ký mỗi Học kỳ\n\n- **Số tín chỉ tối đa**: Bạn được phép đăng ký **tối đa 24 tín chỉ** trong một học kỳ chính.\n- **Số tín chỉ tối thiểu**: Tối thiểu **12 tín chỉ** đối với sinh viên học bình thường (khuyến nghị 15 - 18 tín chỉ/kỳ).\n- **Tổng số tín chỉ toàn khóa**: Cần tích lũy đủ **160 tín chỉ** để xét tốt nghiệp.",
    "mode": "LIMITED",
    "category": "CREDITS_LIMIT",
    "provider": "Offline Academic Rule Engine",
    "model": "rule-based-advisor-v2",
    "fallbackUsed": true,
    "academicSummary": null,
    "recommendations": [],
    "limitations": [
      "Dịch vụ học vụ (Enrollment Service) tạm thời không khả dụng. Không thể truy xuất dữ liệu học tập cá nhân."
    ],
    "suggestions": [
      "Sinh viên bị cảnh báo học vụ thì được đăng ký tối đa bao nhiêu tín?",
      "Gợi ý môn học kỳ này cho mình?",
      "Bị trùng lịch học giữa 2 môn thì xử lý thế nào?"
    ],
    "timestamp": "2026-11-03T12:00:00"
  }
}
```

---

## 5. Bảng mã lỗi HTTP (Error Codes)

| HTTP Status | Mô tả lỗi | Nguyên nhân & Hành động xử lý |
| :---: | :--- | :--- |
| `400 Bad Request` | `Nội dung câu hỏi không được để trống` | Client gửi body rỗng hoặc message trắng. Kiểm tra lại payload. |
| `401 Unauthorized` | `Yêu cầu đăng nhập: Vui lòng cung cấp mã xác thực JWT...` | Token bị thiếu, hết hạn hoặc sai chữ ký HMAC-SHA256. |
| `403 Forbidden` | `Truy cập bị từ chối: Bạn không có quyền truy cập...` | Tài khoản đăng nhập không có Role `STUDENT` (ví dụ tài khoản LECTURER hoặc ADMIN). |
| `500 Internal Error` | `Lỗi hệ thống: ...` | Lỗi ngoại lệ chưa được xử lý tại máy chủ AI Service. |

---

## 6. Hướng dẫn Tích hợp Frontend (FE Integration Notes)

1. **Hiển thị văn bản (Typewriter / Markdown Streaming)**:
   - Sử dụng `res.data.data.reply` (hoặc `res.data.data.message`). Cả hai trường đều chứa cùng nội dung Markdown để đảm bảo tương thích 100% với code React cũ (`StudentAdvisorWidget.jsx` và `AiAdvisor.jsx`).
2. **Hiển thị Badge trạng thái AI**:
   - Nếu `res.data.data.mode === 'GEMINI'`: Hiển thị icon Sparkles xanh với nhãn *"Gemini AI Advisor"*.
   - Nếu `res.data.data.mode === 'FALLBACK'`: Hiển thị badge vàng cam *"Offline Rule Engine"*.
   - Nếu `res.data.data.mode === 'LIMITED'`: Hiển thị badge xám *"Quy chế Chung (Chưa kết nối hồ sơ)"*.
3. **Hiển thị Thẻ Tóm tắt Học vụ (`academicSummary`)**:
   - Khi có `res.data.data.academicSummary`: FE có thể render widget tóm tắt nhanh gồm C-GPA, Tín chỉ tích lũy (Progress Bar), và cảnh báo trùng lịch.
4. **Hiển thị Danh sách Môn học Khuyến nghị (`recommendations`)**:
   - Mảng `res.data.data.recommendations` cung cấp danh sách môn học cấu trúc sẵn `{ courseCode, courseName, credits, reason, recommendedPriority }` giúp FE có thể hiển thị nút *"Đăng ký ngay"* 1-chạm vào bảng đăng ký môn học.
