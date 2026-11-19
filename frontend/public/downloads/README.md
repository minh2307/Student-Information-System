# Rikkei EduPortal Android APK Downloads

Thư mục này lưu trữ file APK cài đặt trực tiếp của ứng dụng Rikkei EduPortal dành cho điện thoại Android.

- Tên file chuẩn: `RikkeiEduPortal.apk`
- Đường dẫn truy cập công khai: `https://rikkeiportal.io.vn/downloads/RikkeiEduPortal.apk`

### Hướng dẫn xuất file APK từ source code mobile:
1. Di chuyển vào thư mục `mobile`:
   ```bash
   cd mobile
   ```
2. Build file APK preview:
   ```bash
   eas build -p android --profile preview
   # hoặc: npx expo run:android --variant release
   ```
3. Copy file `.apk` xuất ra vào thư mục `frontend/public/downloads/RikkeiEduPortal.apk`.
