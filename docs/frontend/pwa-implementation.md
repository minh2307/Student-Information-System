# Tài liệu Kỹ thuật: PWA Service Worker & Install Prompt (EDUP-210)

Tài liệu đặc tả kiến trúc, vòng đời, cơ chế bộ nhớ đệm ngoại tuyến (Offline Caching) và hướng dẫn cài đặt Progressive Web App (PWA) trên hệ thống Rikkei EduPortal.

---

## 1. Tổng quan Kiến trúc PWA

Hệ thống Rikkei EduPortal được xây dựng theo mô hình **Single Page Application (SPA)** với React 18 và Vite 6, tích hợp **Progressive Web App (PWA)** chuẩn W3C để mang lại trải nghiệm tối ưu trên cả thiết bị di động (Mobile) và máy tính để bàn (Desktop).

```
┌────────────────────────────────────────────────────────┐
│                     Client Browser                     │
│  ┌──────────────────────┐    ┌──────────────────────┐  │
│  │   React App (UI)     │    │ PwaInstallPrompt.jsx │  │
│  └──────────┬───────────┘    └──────────┬───────────┘  │
└─────────────┼───────────────────────────┼──────────────┘
              │                           │
              ▼                           ▼
┌────────────────────────────────────────────────────────┐
│            Service Worker Layer (public/sw.js)         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 1. HTML Navigation   ➔ Network-First (App Shell) │  │
│  │ 2. Static Assets     ➔ Stale-While-Revalidate    │  │
│  │ 3. API & Auth Data   ➔ STRICT BYPASS (No Cache)  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────┬───────────────────────────┬──────────────┘
              │ (Cache Hit)               │ (Cache Miss / Sync)
              ▼                           ▼
┌───────────────────────────┐   ┌────────────────────────┐
│  Browser Cache Storage    │   │  Backend Microservices │
│  - eduportal-static-v1    │   │  (API Gateway :8080)   │
│  - eduportal-dynamic-v1   │   │                        │
└───────────────────────────┘   └────────────────────────┘
```

---

## 2. Vòng đời Service Worker (Lifecycle Management)

Service Worker được quản lý tập trung qua [frontend/src/pwaRegistration.js](file:///home/nguyen-son-minh/Downloads/Student-Information-System-main/frontend/src/pwaRegistration.js) và [frontend/public/sw.js](file:///home/nguyen-son-minh/Downloads/Student-Information-System-main/frontend/public/sw.js):

### 2.1 Cài đặt (`install`)
- Định nghĩa phiên bản cache: `CACHE_VERSION = 'v1.0.0'`.
- Tự động Pre-cache các tài nguyên tĩnh cốt lõi:
  - Application Shell: `/`, `/index.html`.
  - Manifest & Icons: `/manifest.json`, `/images/logo.png`, `/images/logo.svg`, `/images/icon-192x192.png`, `/images/icon-512x512.png`, `/images/icon-maskable-512x512.png`, `/images/stamp-seal.svg`.
- Sử dụng `Promise.allSettled` đảm bảo việc thiếu một tài nguyên không làm gián đoạn quá trình cài đặt worker.
- **Không tự động gọi `skipWaiting()` vô điều kiện** nhằm tránh hiện tượng reload đột ngột khi người dùng đang thao tác hoặc điền form.

### 2.2 Kích hoạt (`activate`)
- Dọn dẹp an toàn các phiên bản cache cũ bắt đầu bằng prefix `eduportal-`.
- Tuyệt đối không xóa nhầm cache của các ứng dụng khác trên cùng origin.
- Kích hoạt `self.clients.claim()` để worker mới lập tức kiểm soát các client đang mở.

### 2.3 Giao tiếp Client (`message`)
- Hỗ trợ sự kiện `{ type: 'SKIP_WAITING' }`: Cho phép người dùng chủ động nhấn nút "Cập nhật ngay" trên thanh thông báo khi có phiên bản mới.
- Hỗ trợ sự kiện `{ type: 'GET_VERSION' }`: Trả về phiên bản hiện tại của Service Worker phục vụ kiểm toán và chẩn đoán.

---

## 3. Chiến lược Bộ nhớ đệm (Caching Strategies)

### 3.1 Điều hướng HTML (SPA Navigation Routes)
* **Chiến lược:** `Network-First with App Shell Cache Fallback`.
* **Luồng xử lý:**
  1. Khi người dùng truy cập một route (ví dụ `/student/dashboard`, `/student/grades`): Service Worker thử tải trang từ mạng.
  2. Nếu mạng khả dụng (HTTP 200), cập nhật bản sao mới nhất của `/index.html` vào `STATIC_CACHE`.
  3. Nếu mất mạng (Offline), trả về `/index.html` (Application Shell) đã lưu trong cache. React Router trên client sẽ nhận quyền điều khiển và dựng giao diện offline tương ứng.
  4. Nếu chưa từng truy cập và không có cache, hiển thị trang Fallback Offline thân thiện có nút "Thử kết nối lại".

### 3.2 Tài nguyên tĩnh (Static Bundles & Assets)
* **Chiến lược:** `Stale-While-Revalidate`.
* **Đối tượng áp dụng:**
  - File biên dịch: `/assets/*.js`, `/assets/*.css`.
  - Hình ảnh & Biểu tượng: `/images/*`, `.png`, `.jpg`, `.svg`, `.ico`, `.webp`.
  - Phông chữ Web: Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`), `.woff2`, `.woff`, `.ttf`.
* **Luồng xử lý:**
  1. Trả về ngay lập tức dữ liệu từ Cache nếu có (giúp giao diện tải tức thì trong < 100ms).
  2. Song song đó, gửi request ngầm đến server để lấy bản mới nhất.
  3. Khi nhận được phản hồi HTTP 200 từ mạng, tự động cập nhật lại Cache cho lần truy cập tiếp theo.

### 3.3 Giới hạn dung lượng bộ nhớ đệm (Cache Eviction)
- Áp dụng cơ chế FIFO (First-In, First-Out) qua hàm `limitCacheSize(cacheName, maxItems)`.
- Giới hạn tối đa 60 mục trong Dynamic Cache để bảo vệ dung lượng lưu trữ trên thiết bị di động.

---

## 4. Bảo vệ Dữ liệu Nhạy cảm & API (Strict Security Rules)

> [!IMPORTANT]
> **Quy tắc An ninh Bất khả xâm phạm:**
> Service Worker **TUYỆT ĐỐI KHÔNG BAO GIỜ CACHE** dữ liệu API học vụ hoặc thông tin định danh cá nhân.

Các danh mục endpoint bị loại trừ 100% khỏi Cache:
- Xác thực & Phân quyền: `/api/v1/auth/*`, login, refresh token, logout, JWT.
- Dữ liệu Sinh viên: `/api/v1/student/*`, hồ sơ, điểm số (`/grades`), học bạ, học phí (`/tuition/*`), lịch thi (`/calendar/*`).
- Đăng ký tín chỉ & Giữ chỗ: `/api/v1/student/enrollments`, `/class-sections/live-seats` (SSE Stream).
- Cổng Giảng viên: `/api/v1/lecturer/*`, nhập điểm, điểm danh QR (`/attendance/*`).
- Quản trị viên: `/api/v1/admin/*`, danh sách tài khoản, audit logs.
- Trợ lý AI: `/api/v1/ai/*`, tư vấn học tập.

Khi thiết bị ở chế độ Offline và gửi request API, Service Worker sẽ trả về payload JSON có mã trạng thái `HTTP 503 Service Unavailable` kèm header `X-EduPortal-Offline: true`:
```json
{
  "status": 503,
  "success": false,
  "message": "Thiết bị đang ở chế độ Ngoại tuyến (Offline). Tính năng này yêu cầu kết nối mạng.",
  "offline": true
}
```

---

## 5. Trải nghiệm Cài đặt PWA (Install Prompt Component)

Thành phần [PwaInstallPrompt.jsx](file:///home/nguyen-son-minh/Downloads/Student-Information-System-main/frontend/src/components/PwaInstallPrompt.jsx) được gắn toàn cục tại `App.jsx` với các tính năng:

### 5.1 Android Chrome & Desktop Chromium
- Lắng nghe sự kiện chuẩn `beforeinstallprompt`, chủ động gọi `e.preventDefault()` để chặn thanh mini-infobar mặc định.
- Hiển thị banner tùy biến EduPortal với nút **"Cài đặt ngay"**.
- Khi người dùng nhấn nút, gọi `deferredPrompt.prompt()` và chờ kết quả từ `userChoice`.
- Tự động ghi nhận cờ `eduportal_pwa_installed = true` khi cài đặt thành công qua sự kiện `appinstalled`.

### 5.2 iOS Safari (iPhone & iPad)
- Do Apple iOS Safari không hỗ trợ `beforeinstallprompt`, hệ thống nhận diện trình duyệt iOS Safari qua User-Agent:
  - Thiết bị: iPhone, iPad, iPod hoặc iPadOS (MacIntel với `maxTouchPoints > 1`).
  - Trình duyệt: Safari gốc (loại trừ Chrome iOS `CriOS`, Firefox iOS `FxiOS`, Edge `EdgiOS`).
- Hiển thị nút **"Hướng dẫn cài đặt"**. Khi nhấn, mở Modal từng bước trực quan:
  1. **Bước 1:** Nhấn biểu tượng **Chia sẻ (Share)** trên thanh công cụ Safari.
  2. **Bước 2:** Chọn mục **Thêm vào MH chính (Add to Home Screen)**.
  3. **Bước 3:** Nhấn nút **Thêm (Add)** ở góc trên bên phải màn hình.

### 5.3 Nhận diện Ứng dụng đã cài đặt (Standalone Detection)
Banner cài đặt sẽ tự động ẩn vĩnh viễn nếu:
- Ứng dụng đang chạy trong chế độ standalone: `window.matchMedia('(display-mode: standalone)').matches`.
- Ứng dụng đang chạy qua Safari WebApp: `window.navigator.standalone === true`.
- Khởi chạy qua Android App Wrapper: `document.referrer.includes('android-app://')`.
- Đã ghi nhận cờ trong bộ nhớ: `localStorage.getItem('eduportal_pwa_installed') === 'true'`.

### 5.4 Cơ chế Tạm ẩn (Dismissal Suppression)
- Khi người dùng nhấn nút **"Để sau"** hoặc icon đóng (X):
  - Lưu thời điểm hết hạn vào `localStorage.setItem('eduportal_pwa_dismissed_until', timestamp)`.
  - Tạm ẩn thông báo cài đặt trong **3 ngày** (259.200.000 ms) để tránh gây phiền hà cho người học.

---

## 6. Hướng dẫn Kiểm thử Ngoại tuyến (How to Test Offline)

### 6.1 Kiểm thử qua Chrome DevTools:
1. Build và chạy bản preview:
   ```bash
   cd frontend
   npm run build
   npm run preview
   ```
2. Mở trình duyệt tại `http://localhost:4173/` (hoặc domain VPS `https://rikkeiportal.io.vn/`).
3. Mở **DevTools (F12)** ➔ Tab **Application** ➔ **Service Workers**:
   - Kiểm tra `sw.js` hiển thị trạng thái `Activated and is running`.
4. Tại Tab **Application** ➔ **Storage** ➔ **Cache Storage**:
   - Xác nhận có 2 bộ đệm: `eduportal-static-v1.0.0` và `eduportal-dynamic-v1.0.0`.
   - Kiểm tra các file `index.html`, `manifest.json`, icon đã được pre-cache.
5. Kiểm thử Offline:
   - Tại Tab **Network**, tick chọn checkbox **Offline**.
   - F5 tải lại trang: Giao diện ứng dụng vẫn tải bình thường từ Cache.
   - Banner màu hổ phách hiển thị ở đầu trang: *"Bạn đang ở chế độ Ngoại tuyến (Offline)"*.
   - Bỏ chọn checkbox **Offline**: Banner xanh lá thông báo *"Đã kết nối Internet trở lại"*.

### 6.2 Kiểm thử Tự động (Automated Unit Tests):
Chạy test suite tự động cho PWA bằng lệnh:
```bash
cd frontend
npm test
```
*Kết quả:* 15/15 test cases PASS (xác thực manifest, pre-cache, regex bảo mật API, nhận diện iOS Safari, standalone mode).

---

## 7. Các giới hạn đã biết (Known Limitations)

1. **Hạn chế của iOS Safari:**
   - Apple không cho phép kích hoạt dialog cài đặt trực tiếp qua JavaScript. Mọi PWA trên iOS đều bắt buộc phải hướng dẫn người dùng qua menu Chia sẻ của hệ điều hành.
2. **Các tính năng phụ thuộc Backend:**
   - Các chức năng thanh toán học phí VietQR, quét mã QR điểm danh trực tiếp qua camera, giữ chỗ môn học thời gian thực (5-Minute Slot Reservation) và đăng ký tín chỉ bắt buộc phải có kết nối mạng tới microservices. Khi ngoại tuyến, hệ thống hiển thị thông báo rõ ràng thay vì giả mạo kết quả giao dịch.
