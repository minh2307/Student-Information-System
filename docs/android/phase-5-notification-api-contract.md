# TÀI LIỆU HỢP ĐỒNG KỸ THUẬT API THÔNG BÁO & PUSH NOTIFICATIONS — PHASE 5
## NOTIFICATION API CONTRACT & BACKEND INTEGRATION SPECIFICATION (RIKKEI EDUPORTAL)

> **Dự án**: Rikkei EduPortal — Student Information System  
> **Phân hệ**: Mobile Application (React Native + Expo SDK 58 + TypeScript)  
> **Giai đoạn**: Phase 5 – Offline Mode, Push Notifications & Data Synchronization  
> **Địa chỉ API Gateway**: `https://rikkeiportal.io.vn`  
> **Tài liệu tham chiếu Backend**: `services/enrollment-service`, `services/api-gateway`, `services/auth-service`, `init-db/01-schema.sql`  
> **Ngày lập**: 11/11/2026  
> **Trạng thái Khảo sát**: **COMPLETED — VERIFIED LIVE & IDENTIFIED BACKEND CONSTRAINTS**  

---

## 1. Tóm tắt Khảo sát Backend Thực tế (Backend Discovery Summary)

Dựa trên việc kiểm tra toàn diện mã nguồn Java Spring Boot Microservices (`NotificationController.java`, `AnnouncementAndNotificationService.java`, `NotificationRepository.java`, `GatewayProxyController.java`, `JwtGatewayValidator.java`), lược đồ cơ sở dữ liệu (`init-db/01-schema.sql`), và thực thi các lệnh gọi mạng trực tiếp tới môi trường Production `https://rikkeiportal.io.vn`:

### 1.1. Ma trận Trạng thái Endpoint Backend

| STT | Chức năng nghiệp vụ | Phương thức | Endpoint Gateway | Dịch vụ phụ trách | Phân quyền (Role) | Trạng thái Thực tế |
|:---:|:---|:---:|:---|:---|:---:|:---:|
| 1 | **Lấy danh sách thông báo người dùng** | `GET` | `/api/v1/notifications` | `enrollment-service` | Authenticated (`STUDENT`, `LECTURER`, `ADMIN`) | **VERIFIED (200 OK)** |
| 2 | **Đánh dấu thông báo đã đọc** | `PUT` | `/api/v1/notifications/{id}/read` | `enrollment-service` | Authenticated (`STUDENT`, `LECTURER`, `ADMIN`) | **VERIFIED (200 OK)** |
| 3 | **Đánh dấu tất cả thông báo đã đọc** | `PUT` | `/api/v1/notifications/read-all` | `enrollment-service` | Authenticated (`STUDENT`, `LECTURER`, `ADMIN`) | **VERIFIED (200 OK)** |
| 4 | **Bản tin thông báo chung (Announcements)** | `GET` | `/api/v1/announcements` | `enrollment-service` | Public Read-only | **VERIFIED (200 OK)** |
| 5 | **Đăng ký Device / Push Token** | `POST` | `/api/v1/notifications/tokens` | N/A | Authenticated | **BLOCKED / NOT IMPLEMENTED** |
| 6 | **Hủy đăng ký Device / Push Token** | `DELETE` | `/api/v1/notifications/tokens` | N/A | Authenticated | **BLOCKED / NOT IMPLEMENTED** |
| 7 | **Dịch vụ gửi Push Notification từ xa** | Background | N/A (FCM / APNS) | N/A | N/A | **NOT IMPLEMENTED** |
| 8 | **Bảng lưu trữ Device Token trong DB** | Database | `device_tokens` | PostgreSQL | N/A | **NOT IMPLEMENTED** |

---

## 2. Đặc tả Chi tiết Các API Thực tế Đã Xác minh (Verified APIs)

### 2.1. API Lấy danh sách thông báo người dùng (`GET /api/v1/notifications`)

- **URL**: `https://rikkeiportal.io.vn/api/v1/notifications`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <accessToken>` (Bắt buộc)
  - `Accept: application/json`
- **Query Parameters**: Không có (Backend tự động nhận diện người dùng thông qua Header `X-User-Username` được Gateway trích xuất từ JWT).
- **Phân quyền Gateway**: Cho phép tất cả người dùng hợp lệ (`STUDENT`, `LECTURER`, `ADMIN`).
- **Request Body**: Không có.

#### Response Body thành công (HTTP 200 OK):
```json
{
  "status": 200,
  "message": "Lấy thông báo thành công",
  "data": [
    {
      "id": 101,
      "title": "Nhắc nhở học vụ: Lịch thi học kỳ II",
      "message": "Lịch thi học kỳ 2024-25_SEM2 đã được công bố. Sinh viên vui lòng kiểm tra phòng thi và thời gian thi.",
      "type": "ACADEMIC",
      "isRead": false,
      "linkUrl": "/(student)/exams",
      "createdAt": "2026-11-10T14:30:00"
    },
    {
      "id": 98,
      "title": "Thông báo học phí",
      "message": "Hạn nộp học phí kỳ 2024-25_SEM2 là ngày 05/12/2026. Vui lòng thanh toán qua VietQR.",
      "type": "TUITION",
      "isRead": true,
      "linkUrl": "/(student)/tuition",
      "createdAt": "2026-11-08T09:15:00"
    }
  ],
  "success": true
}
```

#### Bảng Ánh xạ Kiểu Dữ liệu `NotificationDto`:
| Trường dữ liệu | Kiểu dữ liệu | Bắt buộc | Ý nghĩa & Mô tả |
| :--- | :--- | :---: | :--- |
| `id` | `number` | Có | Mã định danh duy nhất của thông báo |
| `title` | `string` | Có | Tiêu đề thông báo |
| `message` | `string` | Có | Nội dung chi tiết của thông báo |
| `type` | `string` | Không | Phân loại thông báo: `"GENERAL"`, `"ACADEMIC"`, `"EXAM"`, `"TUITION"`, `"ATTENDANCE"`, `"ALERT"` |
| `isRead` | `boolean` | Có | Trạng thái người dùng đã xem thông báo hay chưa |
| `linkUrl` | `string \| null` | Không | Đường dẫn điều hướng nội bộ (Deep link đích trong ứng dụng) |
| `createdAt` | `string` | Có | Thời điểm phát sinh thông báo (chuỗi ISO-8601) |

---

### 2.2. API Đánh dấu thông báo đã đọc (`PUT /api/v1/notifications/{id}/read`)

- **URL**: `https://rikkeiportal.io.vn/api/v1/notifications/{id}/read`
- **Method**: `PUT`
- **Headers**:
  - `Authorization: Bearer <accessToken>` (Bắt buộc)
  - `Accept: application/json`
- **Path Variables**:
  - `id` (Long, bắt buộc): ID của thông báo cần đánh dấu đã đọc.
- **Request Body**: Không có.

#### Response Body thành công (HTTP 200 OK):
```json
{
  "status": 200,
  "message": "Đánh dấu đã đọc thành công",
  "data": null,
  "success": true
}
```

#### Xử lý lỗi (Error Cases):
- `401 Unauthorized`: Token không hợp lệ hoặc đã hết hạn.
- `404 Not Found`: ID thông báo không tồn tại.

---

### 2.3. API Đánh dấu tất cả thông báo đã đọc (`PUT /api/v1/notifications/read-all`)

- **URL**: `https://rikkeiportal.io.vn/api/v1/notifications/read-all`
- **Method**: `PUT`
- **Headers**:
  - `Authorization: Bearer <accessToken>` (Bắt buộc)
  - `Accept: application/json`
- **Request Body**: Không có.

#### Response Body thành công (HTTP 200 OK):
```json
{
  "status": 200,
  "message": "Đánh dấu tất cả đã đọc thành công",
  "data": null,
  "success": true
}
```

---

### 2.4. API Danh sách Thông báo Chung Bản tin (`GET /api/v1/announcements`)

- **URL**: `https://rikkeiportal.io.vn/api/v1/announcements`
- **Method**: `GET`
- **Headers**: `Accept: application/json` (Không bắt buộc Authorization)
- **Query Parameters**:
  - `category` (optional, string): Danh mục thông báo (`ALL`, `HỌC VỤ`, `HỌC BỔNG`, `HỌC PHÍ`).

#### Response Body thành công (HTTP 200 OK):
```json
{
  "status": 200,
  "message": "Lấy danh sách thông báo thành công",
  "data": [
    {
      "id": 3,
      "title": "lịch thanh toán học bổng kì II",
      "category": "HỌC BỔNG",
      "content": "học bổng...",
      "author": "Phòng Đào tạo",
      "isPinned": true,
      "createdAt": "2026-11-09T05:46:03.196557"
    }
  ],
  "success": true
}
```

---

## 3. Khảo sát Chuyên sâu Push Notifications (FCM / APNS / Device Token)

### 3.1. Kết quả Rà soát Backend
1. **API Đăng ký Token thiết bị**: **KHÔNG TỒN TẠI**.
   - Kiểm tra endpoint giả định `POST /api/v1/notifications/tokens` trên Production: Trả về HTTP 500 (`No static resource api/v1/notifications/tokens.`).
   - Tìm kiếm toàn bộ codebase Java của các microservice không có bất kỳ Controller hoặc Handler nào nhận Push Token.
2. **Cơ sở dữ liệu lưu Device Token**: **KHÔNG TỒN TẠI**.
   - Bảng `notifications` trong `init-db/01-schema.sql` chỉ chứa: `id`, `user_id`, `title`, `message`, `type`, `is_read`, `link_url`, `created_at`.
   - Không có bảng `device_tokens`, `fcm_tokens`, hay `user_devices`.
3. **Cơ chế gửi Push Notification từ xa**: **CHƯA ĐƯỢC TRIỂN KHAI TRÊN BACKEND**.
   - Không tích hợp Firebase Cloud Messaging (FCM) Admin SDK hoặc Apple Push Notification Service (APNS).
   - Backend chỉ hỗ trợ Web Server-Sent Events (SSE) cho bộ đếm số chỗ môn học (`RealtimeSeatService.java`).

### 3.2. Nguyên tắc Xử lý trên Mobile (Strict Compliance)
- **Tuyệt đối không giả lập Push Notification thành công**: Không báo cho người dùng hoặc hệ thống là token đã được đăng ký thành công trên máy chủ nếu Backend chưa tiếp nhận.
- **Ghi nhận trạng thái BLOCKED**: Trong mã nguồn Mobile, module Push Token Registration sẽ đóng gói rõ ràng trạng thái `NOT_IMPLEMENTED_BY_BACKEND`.
- **Triển khai In-App Notification Center hoàn chỉnh**: Tận dụng tối đa các API thực tế đã tồn tại (`GET /api/v1/notifications`, `PUT /api/v1/notifications/{id}/read`, `PUT /api/v1/notifications/read-all`) để cung cấp Hộp thư thông báo trong ứng dụng (In-App Notification Center) cho cả hai vai trò Sinh viên và Giảng viên.
- **Sẵn sàng hạ tầng Local Notification & Deep Link**:
  - Hỗ trợ xin quyền thông báo cục bộ (`expo-notifications`) kèm giải thích minh bạch lý do.
  - Thiết lập Android Notification Channels với độ ưu tiên cao.
  - Thiết lập bộ phân luồng Deep Link an toàn, kiểm tra nghiêm ngặt Authentication và Role trước khi chuyển tiếp màn hình.

---

## 4. Đề xuất Hợp đồng Kỹ thuật cho Backend (Khi nâng cấp Phase sau)

Khi Backend đội ngũ triển khai hạ tầng Firebase Cloud Messaging hoặc Expo Push Service, đề xuất bổ sung các endpoints chuẩn RESTful sau:

### 4.1. Đăng ký Device Token (`POST /api/v1/notifications/devices`)
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**:
```json
{
  "deviceToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "ANDROID", // "ANDROID" | "IOS"
  "deviceModel": "Pixel 7 Pro",
  "appVersion": "1.0.0"
}
```
- **Response**: HTTP 201 Created `{ "status": 201, "message": "Đăng ký thiết bị nhận thông báo thành công" }`.

### 4.2. Hủy đăng ký Device Token (`DELETE /api/v1/notifications/devices`)
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**:
```json
{
  "deviceToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```
- **Response**: HTTP 200 OK `{ "status": 200, "message": "Hủy đăng ký thiết bị thành công" }`.

### 4.3. Bảng cơ sở dữ liệu đề xuất:
```sql
CREATE TABLE IF NOT EXISTS user_device_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token VARCHAR(255) NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL,
    device_model VARCHAR(100),
    app_version VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_user_device_tokens_user ON user_device_tokens(user_id);
```
