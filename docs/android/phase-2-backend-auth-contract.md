# TÀI LIỆU HỢP ĐỒNG KỸ THUẬT XÁC THỰC BACKEND — PHASE 2
## BACKEND AUTHENTICATION CONTRACT & JWT LIFECYCLE (RIKKEI EDUPORTAL)

> **Dự án**: Rikkei EduPortal — Student Information System  
> **Phân hệ**: Mobile Application (React Native + Expo SDK 58 + TypeScript)  
> **Mục tiêu**: Tích hợp xác thực thực tế với Backend Spring Boot Microservices qua API Gateway  
> **Địa chỉ API Gateway**: `https://rikkeiportal.io.vn`  
> **Tài liệu tham chiếu Backend**: `services/auth-service`, `services/api-gateway`, `common-lib`  
> **Ngày lập**: 11/11/2026  
> **Trạng thái**: **VERIFIED WITH LIVE BACKEND (Đã kiểm chứng trực tiếp trên Production)**  

---

## 1. Tổng quan Kiến trúc Xác thực (Authentication Architecture)

Hệ thống Rikkei EduPortal sử dụng mô hình xác thực phi trạng thái (Stateless Authentication) dựa trên JSON Web Token (JWT) kết hợp cơ chế luân chuyển Refresh Token (Refresh Token Rotation - RTR) có phát hiện tái sử dụng (Token Reuse Detection):

```
┌────────────────────────────────────────────────────────────────────────┐
│               MOBILE CLIENT (REACT NATIVE / EXPO SDK 58)                │
├────────────────────────────────────────────────────────────────────────┤
│  1. Login: Gửi credentials (username/password)                         │
│  2. Token Storage:                                                     │
│     - Access Token (15m): Lưu trong Expo SecureStore (Keystore/Keychain)│
│     - Refresh Token (7d): Lưu trong Expo SecureStore (Keystore/Keychain)│
│     - User & Profiles: Lưu trong AsyncStorage (Phi nhạy cảm)           │
│  3. Request: Gắn Header Authorization: Bearer <accessToken>           │
│  4. Refresh Mutex Queue: Đơn luồng hóa khi gặp HTTP 401               │
│  5. Logout: Thu hồi Refresh Token trên DB & xóa sạch bộ nhớ máy        │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTPS
                                     ▼
                ┌────────────────────────────────────────┐
                │        API GATEWAY (:8080)             │
                │        https://rikkeiportal.io.vn      │
                │ 1. Kiểm tra JWT Claims & Route Role    │
                │ 2. Xóa Header Client giả mạo (X-User-*)│
                │ 3. Inject X-User-Id, X-User-Username,  │
                │    X-User-Role vào request nội bộ      │
                └──────────────────┬─────────────────────┘
                                   │ HTTP Nội bộ
                                   ▼
                ┌────────────────────────────────────────┐
                │        AUTH-SERVICE (:8081)            │
                │ 1. BCrypt Password Validation          │
                │ 2. Sinh JWT Access Token (HS512, 15m)  │
                │ 3. Lưu trữ RefreshToken Entity (7d)    │
                │ 4. RTR & Token Reuse Detection         │
                │ 5. Phục vụ /profile/me & Cập nhật HS   │
                └────────────────────────────────────────┘
```

---

## 2. Danh mục Endpoint Xác thực Thực tế (Verified Endpoints)

Toàn bộ các endpoint dưới đây đã được đối chiếu trực tiếp từ mã nguồn Java của `services/auth-service` và kiểm thử trực tiếp trên môi trường chạy thực `https://rikkeiportal.io.vn`.

| Nghiệp vụ | Phương thức | Endpoint Gateway | Controller Backend | Yêu cầu Xác thực |
| :--- | :---: | :--- | :--- | :---: |
| **Đăng nhập** | `POST` | `/api/v1/auth/login` | `AuthController.java:32` | Public |
| **Làm mới Token** | `POST` | `/api/v1/auth/refresh` | `AuthController.java:44` | Public (kèm RefreshToken) |
| **Đăng xuất** | `POST` | `/api/v1/auth/logout` | `AuthController.java:50` | Public / Optional Bearer |
| **Hồ sơ Cá nhân** | `GET` | `/api/v1/profile/me` | `ProfileController.java:25` | `Bearer <accessToken>` |
| **Cập nhật Hồ sơ**| `PUT` | `/api/v1/profile/me` | `ProfileController.java:32` | `Bearer <accessToken>` |

---

## 3. Đặc tả Chi tiết API Contracts (Request / Response DTOs)

### 3.1. API Đăng Nhập (`POST /api/v1/auth/login`)

- **URL**: `https://rikkeiportal.io.vn/api/v1/auth/login`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`, `Accept: application/json`

#### Request Body:
```json
{
  "username": "sv2024001",
  "password": "your_password",
  "turnstileToken": null
}
```
*Ghi chú*:
- `username`: Bắt buộc (`@NotBlank`). Chấp nhận Username hoặc Email tài khoản.
- `password`: Bắt buộc (`@NotBlank`).
- `turnstileToken` / `cf-turnstile-response`: Không bắt buộc (Optional). Trên Production server, hệ thống cho phép bỏ qua nếu không cấu hình Secret hoặc client là Mobile.

#### Response Body thành công (HTTP 200 OK):
```json
{
  "status": 200,
  "message": "Đăng nhập thành công",
  "data": {
    "accessToken": "eyJhbGciOiJIUzUxMiJ9...",
    "refreshToken": "f2f4b829-49e3-4d62-91af-deb4e66c13fd-4517def3-b725-4b69-af42-6ca69d8f669d",
    "tokenType": "Bearer",
    "user": {
      "id": 4,
      "username": "sv2024001",
      "email": "nguyenvanc@rikkei.edu.vn",
      "fullName": "Nguyễn Văn C",
      "role": "STUDENT",
      "avatarUrl": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcScCF2vV_2-uM8PwEDpPFtsTA9UZmWZTiuUYl-B4mobIxDe1VzR6BVMnX8&s=10",
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

*Trường hợp tài khoản Giảng viên (`LECTURER`)*:
- `user.role`: `"LECTURER"`
- `studentProfile`: `null`
- `lecturerProfile`:
  ```json
  {
    "lecturerCode": "GV001",
    "department": "Khoa Công nghệ Thông tin",
    "degree": "Tiến sĩ"
  }
  ```

*Trường hợp tài khoản Quản trị viên (`ADMIN`)*:
- `user.role`: `"ADMIN"`
- `studentProfile`: `null`
- `lecturerProfile`: `null`

#### Response Body thất bại:
- **Sai tài khoản hoặc mật khẩu (HTTP 401)**:
  ```json
  {
    "status": 401,
    "message": "Tên đăng nhập hoặc mật khẩu không chính xác",
    "success": false
  }
  ```
- **Tài khoản bị khóa (HTTP 400)**:
  ```json
  {
    "status": 400,
    "message": "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Ban Đào tạo!",
    "success": false
  }
  ```
- **Dữ liệu rỗng / Không hợp lệ (HTTP 400)**:
  ```json
  {
    "status": 400,
    "message": "Dữ liệu không hợp lệ",
    "data": {
      "username": "Username không được để trống",
      "password": "Password không được để trống"
    },
    "success": false
  }
  ```

---

### 3.2. API Làm Mới Token (`POST /api/v1/auth/refresh`)

- **URL**: `https://rikkeiportal.io.vn/api/v1/auth/refresh`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`

#### Request Body:
```json
{
  "refreshToken": "f2f4b829-49e3-4d62-91af-deb4e66c13fd-4517def3-b725-4b69-af42-6ca69d8f669d"
}
```

#### Response Body thành công (HTTP 200 OK):
Trả về đối tượng `AuthResponse` chứa cả **Access Token mới** và **Refresh Token mới (Rotation)**:
```json
{
  "status": 200,
  "message": "Làm mới token thành công",
  "data": {
    "accessToken": "eyJhbGciOiJIUzUxMiJ9...",
    "refreshToken": "4e89d79d-17bf-4ae0-be14-dfc09b871585-a9c53833-dd6e-4b14-83c9-62bc40a2e805",
    "tokenType": "Bearer",
    "user": { ... },
    "studentProfile": { ... },
    "lecturerProfile": null
  },
  "success": true
}
```

#### Quy tắc An ninh Token Reuse Detection (Backend `RefreshTokenService.java:44`):
1. Mỗi `refreshToken` **chỉ được sử dụng đúng 1 lần**. Khi gọi refresh thành công, token cũ được set `isRevoked = true`.
2. Nếu client gửi lại một refresh token đã bị thu hồi (`isRevoked == true`):
   - Server lập tức gọi `refreshTokenRepository.revokeAllUserTokens(user)` để thu hồi **toàn bộ phiên** của người dùng.
   - Trả về mã lỗi HTTP 401:
   ```json
   {
     "status": 401,
     "message": "CẢNH BÁO: Refresh token đã bị thu hồi trước đó. Vui lòng đăng nhập lại!",
     "success": false
   }
   ```
3. Nếu refresh token hết hạn (quá 7 ngày):
   - Server đánh dấu `isRevoked = true`, trả về HTTP 401:
   ```json
   {
     "status": 401,
     "message": "Refresh token đã hết hạn. Vui lòng đăng nhập lại!",
     "success": false
   }
   ```

---

### 3.3. API Đăng Xuất (`POST /api/v1/auth/logout`)

- **URL**: `https://rikkeiportal.io.vn/api/v1/auth/logout`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`

#### Request Body:
```json
{
  "refreshToken": "4e89d79d-17bf-4ae0-be14-dfc09b871585-a9c53833-dd6e-4b14-83c9-62bc40a2e805"
}
```

#### Response Body thành công (HTTP 200 OK):
```json
{
  "status": 200,
  "message": "Đăng xuất thành công",
  "data": null,
  "success": true
}
```

*Hành vi Backend*:
- Đánh dấu `revoked = true` cho refresh token trong bảng `refresh_tokens`.
- Không thể tái sử dụng refresh token này nữa.
- Nếu không gửi kèm `refreshToken` (hoặc body rỗng), API vẫn trả về HTTP 200 "Đăng xuất thành công" để client an toàn dọn dẹp phiên cục bộ.

---

### 3.4. API Hồ Sơ Người Dùng Hiện Tại (`GET /api/v1/profile/me`)

- **URL**: `https://rikkeiportal.io.vn/api/v1/profile/me`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <accessToken>`

#### Response Body thành công (HTTP 200 OK):
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
      "avatarUrl": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcScCF2vV_2-uM8PwEDpPFtsTA9UZmWZTiuUYl-B4mobIxDe1VzR6BVMnX8&s=10",
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

#### Response Body lỗi:
- Thiếu hoặc token hết hạn (HTTP 401):
  ```json
  {
    "status": 401,
    "message": "Yêu cầu xác thực: Phiên đăng nhập không hợp lệ hoặc đã hết hạn."
  }
  ```

---

### 3.5. API Cập Nhật Hồ Sơ Cá Nhân (`PUT /api/v1/profile/me`)

- **URL**: `https://rikkeiportal.io.vn/api/v1/profile/me`
- **Method**: `PUT`
- **Headers**: `Authorization: Bearer <accessToken>`, `Content-Type: application/json`

#### Request Body (`UpdateProfileRequest`):
```json
{
  "fullName": "Nguyễn Văn C",
  "email": "nguyenvanc@rikkei.edu.vn",
  "avatarUrl": "https://example.com/avatar.jpg",
  "oldPassword": "old_password_if_changing",
  "newPassword": "new_password_if_changing"
}
```

---

## 4. Đặc tả Cấu trúc JWT Claims

Backend sinh JWT thông qua `JwtTokenProvider.java` với thuật toán HS512:

```json
{
  "sub": "sv2024001",
  "userId": 4,
  "email": "nguyenvanc@rikkei.edu.vn",
  "fullName": "Nguyễn Văn C",
  "role": "STUDENT",
  "iat": 1794365034,
  "exp": 1794365934
}
```

- **`sub`**: Tên đăng nhập người dùng (`username`).
- **`userId`**: Định danh người dùng (Số nguyên `Long`).
- **`email`**: Email học vụ.
- **`fullName`**: Họ và tên hiển thị.
- **`role`**: Vai trò (`STUDENT`, `LECTURER`, `ADMIN`).
- **`exp` - `iat`**: 900 giây (15 phút).

---

## 5. Ma trận Phân quyền & Điều hướng (Role Mapping)

Backend phân quyền qua trường `role` (`Role.java`: `STUDENT`, `LECTURER`, `ADMIN`).

| Backend Role | Mobile Role | Điều hướng Đích | Hành vi / Ghi chú |
| :--- | :--- | :--- | :--- |
| **`STUDENT`** | `STUDENT` | `/(student)/dashboard` | Phân hệ Sinh viên đầy đủ: Thời khóa biểu, Điểm, Đăng ký môn |
| **`LECTURER`** | `LECTURER` | `/(lecturer)/dashboard` | Phân hệ Giảng viên đầy đủ: Lịch dạy, QR Điểm danh 15s, Sổ điểm |
| **`ADMIN`** | `ADMIN` | `/unauthorized` | Màn hình hướng dẫn mở Cổng Quản trị Web `https://rikkeiportal.io.vn/` |
| **Bất kỳ giá trị khác** | `UNKNOWN` | `/unauthorized` | Từ chối an toàn, không cấp quyền |

*Nguyên tắc bất biến*: Client không tự sinh role hay tin tưởng input của người dùng; Role bắt buộc được trích xuất từ dữ liệu phản hồi có chữ ký của Backend (`AuthResponse.user.role` hoặc `JWT.role`).

---

## 6. Vòng đời Token & Xử lý Đồng thời (JWT Lifecycle & Refresh Mutex)

```
                       [HTTP Request]
                             │
                  Có Access Token trong SecureStore?
                   ├── Không ──> Gửi request không header (hoặc dừng)
                   └── Có ────> Gắn Header "Authorization: Bearer <token>"
                             │
                             ▼
                     [Gửi tới Server]
                             │
                      Nhận HTTP Response
                       ├── 200-299: Thành công -> Trả về UI
                       ├── Khác 401: Lỗi nghiệp vụ -> Chuẩn hóa ApiError
                       └── 401 Unauthorized:
                             │
                   Request là endpoint /auth/*?
                    ├── Có ──> Bỏ qua refresh, báo lỗi đăng nhập/hết hạn
                    └── Không:
                          │
                  Có Refresh Token trong SecureStore?
                   ├── Không ──> Clear local tokens -> Điều hướng về Login
                   └── Có:
                         │
                 Đang có Refresh Request chạy (isRefreshing = true)?
                  ├── Có ──> Đưa vào failedQueue (Chờ Promise)
                  └── Không:
                        │
                        ├─> Đặt isRefreshing = true
                        ├─> Gọi POST /api/v1/auth/refresh (Unintercepted)
                        │
                        ├── THÀNH CÔNG:
                        │     1. Lưu accessToken & refreshToken mới vào SecureStore
                        │     2. Cập nhật Zustand useAuthStore
                        │     3. Giải phóng failedQueue với token mới
                        │     4. Thử lại request gốc với token mới
                        │     5. Đặt isRefreshing = false
                        │
                        └── THẤT BẠI (Token revoked/expired):
                              1. Reject toàn bộ failedQueue
                              2. Xóa SecureStore tokens
                              3. Xóa AsyncStorage profile cache
                              4. Xóa TanStack Query cache
                              5. useAuthStore.logout() -> Về Login
                              6. Đặt isRefreshing = false
```

### Xử lý Cạnh tranh khi Đăng xuất (Logout Race Condition Guard):
Nếu người dùng ấn Đăng xuất trong lúc một request `POST /api/v1/auth/refresh` đang bay trên đường truyền:
- Hệ thống đánh dấu phiên đã bị hủy (`sessionEpoch` hoặc cờ hủy đăng nhập).
- Khi response refresh trả về, Mobile **hủy bỏ kết quả**, tuyệt đối **không ghi đè token mới** vào SecureStore.

---

## 7. Bảng Chuẩn hóa Lỗi (Error Mapping)

| Mã HTTP | Tình huống Backend | Thông điệp Chuẩn hóa cho Người Dùng (Tiếng Việt) |
| :---: | :--- | :--- |
| **400** | Dữ liệu không hợp lệ / Tài khoản bị khóa | Lấy trực tiếp thông điệp `message` từ Backend (VD: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Ban Đào tạo!") |
| **401** | Sai mật khẩu / Token hết hạn | "Tên đăng nhập hoặc mật khẩu không chính xác" hoặc "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại." |
| **403** | Không đủ quyền hạn (Forbidden) | "Bạn không có quyền thực hiện chức năng này." |
| **404** | Tuyến đường hoặc dữ liệu không tìm thấy | "Không tìm thấy dữ liệu yêu cầu trên hệ thống." |
| **409** | Xung đột dữ liệu (Conflict) | "Dữ liệu đang có sự xung đột. Vui lòng làm mới trang." |
| **422** | Lỗi xử lý ngữ nghĩa | "Yêu cầu không thể xử lý. Vui lòng kiểm tra lại thông tin." |
| **429** | Vượt giới hạn tần suất (Rate limit) | "Bạn đang thao tác quá nhanh. Vui lòng chờ trong giây lát." |
| **500** | Lỗi máy chủ nội bộ | "Hệ thống đang gặp sự cố tạm thời. Vui lòng thử lại sau." |
| **502 / 503** | API Gateway hoặc Service mất kết nối | "Máy chủ đang bảo trì hoặc tạm thời gián đoạn kết nối. Vui lòng quay lại sau ít phút." |
| **Timeout** | Quá 15 giây không phản hồi | "Kết nối mạng quá thời gian phản hồi (Timeout). Vui lòng kiểm tra lại đường truyền." |
| **No Internet**| Thiết bị mất mạng (Wifi/4G) | "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng (Wifi/4G)." |

*Nguyên tắc An ninh*:
- Tuyệt đối không hiển thị Java Stack Trace, Database Column Name hay Internal Exception class cho người dùng cuối.
- Không chuyển mọi lỗi 5xx hoặc 4xx thành lệnh Đăng xuất ngoài ý muốn (chỉ lỗi Refresh thất bại hoặc 401 trên session không thể khôi phục mới kích hoạt Logout).

---

## 8. Kết luận Kiểm chứng (Verification Conclusion)

- **100% Endpoints đã được kiểm chứng hoạt động thực tế trên `https://rikkeiportal.io.vn`**.
- DTOs và cấu trúc dữ liệu JSON hoàn toàn đồng nhất giữa Backend và Mobile.
- Sẵn sàng triển khai mã nguồn tích hợp Phase 2 trên ứng dụng React Native.
