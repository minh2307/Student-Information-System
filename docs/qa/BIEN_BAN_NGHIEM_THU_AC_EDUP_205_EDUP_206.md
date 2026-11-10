# CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
**Độc lập – Tự do – Hạnh phúc**

---

# BIÊN BẢN NGHIỆM THU TIÊU CHÍ CHẤP NHẬN (AC ACCEPTANCE REPORT)
### DỰ ÁN: CỔNG THÔNG TIN ĐÀO TẠO & QUẢN LÝ SINH VIÊN RIKKEI EDUPORTAL
**Hạng mục:** Nghiệm thu hoàn thành User Stories **EDUP-205** & **EDUP-206** với Product Owner (PO)

---

## I. THÔNG TIN PHIÊN NGHIỆM THU

| Mục | Nội dung chi tiết |
|:---|:---|
| **Dự án** | Rikkei EduPortal – Phân hệ Đào Tạo & Giảng Viên (`lecturer-service`, `api-gateway`, `frontend`) |
| **User Stories nghiệm thu** | **EDUP-205**: Điểm Danh Sinh Viên Bằng Mã QR Động TOTP Xoay Vòng 15 Giây<br>**EDUP-206**: Bảng Dashboard Cảnh Báo Sớm Sinh Viên Vắng $\ge 20\%$ & Bắn Thông Báo Can Thiệp |
| **Thời gian thực hiện** | 09/11/2026 |
| **Địa điểm / Môi trường** | Môi trường Staging Demo (VPS Port `8085` / Gateway `8080` / PWA Mobile) |
| **Chủ tọa / Product Owner (PO)** | Đại diện Khối Đào Tạo & Ban Quản Lý Dự Án Rikkei EduPortal |
| **Kỹ sư Trình diễn & Báo cáo** | Hoàng Văn Lương (Lead Full-stack Developer / CI-CD & QA Engineer) |
| **Scrum Master / Tech Lead** | Nguyễn Tuấn Minh |
| **Kết luận chung** | **ĐẠT 100% TIÊU CHÍ CHẤP NHẬN (AC) – ĐỦ ĐIỀU KIỆN CHUYỂN SANG TRẠNG THÁI `DONE`** |

---

## II. KẾT QUẢ ĐÁNH GIÁ TIÊU CHÍ CHẤP NHẬN (ACCEPTANCE CRITERIA MATRIX)

### 1. USER STORY EDUP-205: ĐIỂM DANH MÃ QR ĐỘNG TOTP 15S

> **User Story:** Là Giảng viên, tôi muốn mở phiên điểm danh trên màn hình chiếu lớp học với mã QR động tự động xoay vòng mỗi 15 giây, để sinh viên dùng camera điện thoại quét check-in thời gian thực, ngăn chặn hoàn toàn việc chụp ảnh gửi Zalo điểm danh hộ.

| Mã AC | Tiêu chí chấp nhận (Acceptance Criteria) | Kịch bản trình diễn & Kiểm chứng thực tế | Kết quả PO đánh giá | Trạng thái |
|:---:|:---|:---|:---|:---:|
| **AC-205.1** | **Khởi tạo phiên điểm danh mới** | Giảng viên bấm nút "Điểm danh QR" trên thanh công cụ lớp học phần. Hệ thống tự động đóng các phiên cũ (nếu có), sinh bí mật `sessionSecret` ngẫu nhiên 64-hex, phiên chuyển trạng thái `ACTIVE`. | Phiên mới khởi tạo thành công trong `< 200ms`, CSDL ghi nhận `status = ACTIVE`, bí mật được bảo vệ an toàn. | **PASSED** |
| **AC-205.2** | **Mã QR động xoay vòng 15 giây** | Trình chiếu mã QR động trên modal `QrAttendanceModal.jsx`. Vòng tròn countdown đếm ngược $15\text{s} \rightarrow 1\text{s}$. Khi hết 15s, mã QR tự động làm mới với hiệu ứng flash mượt mà. | Mã QR đổi mới đúng chu kỳ 15 giây, tokenWindow và chữ ký HMAC-SHA256 cập nhật chính xác. | **PASSED** |
| **AC-205.3** | **Chế độ máy chiếu (Projector Mode)** | Giảng viên bấm nút "Toàn màn hình / Máy chiếu". Giao diện phóng to toàn màn hình, mã QR hiển thị kích thước lớn (350x350px) với độ tương phản cao, sinh viên cuối lớp quét dễ dàng. | Giao diện tối ưu hóa máy chiếu, hiển thị rõ ràng mã lớp, tên môn học và đồng hồ đếm ngược. | **PASSED** |
| **AC-205.4** | **Camera mobile sinh viên quét realtime** | Sinh viên mở modal camera `StudentQrScannerModal.jsx` trên điện thoại (iOS Safari / Android Chrome). Dò tìm camera sau, xử lý `playsinline`, quét mã tức thì. | Quét mã thành công trong `< 1` giây, hiển thị Toast xanh: *"Điểm danh thành công lúc HH:mm:ss"*. | **PASSED** |
| **AC-205.5** | **Cập nhật số lượng có mặt realtime** | Giảng viên theo dõi màn hình chính trong khi sinh viên quét mã. Polling ngầm mỗi 4 giây cập nhật danh sách và bộ đếm tổng số sinh viên có mặt. | Bộ đếm `totalAttendees` tự động tăng realtime mà không cần F5 tải lại trang; hiển thị tên, MSSV, thiết bị quét. | **PASSED** |
| **AC-205.6** | **Chống gian lận Anti-Proxy & Quét trùng** | Thực nghiệm: Chụp ảnh gửi Zalo quét sau 20s – 35s; chỉnh lùi đồng hồ điện thoại; quét lại lần 2 cho bản thân. | - Quét trễ: Server từ chối `HTTP 400` (*"Mã QR đã hết hạn"*).<br>- Chỉnh giờ máy: Server lờ đi, vẫn chặn `HTTP 400`.<br>- Quét trùng: Chặn `HTTP 409 Conflict` (*"ĐÃ ĐIỂM DANH TRƯỚC ĐÓ"*). | **PASSED** |
| **AC-205.7** | **Đóng phiên & Chốt danh sách điểm danh** | Giảng viên bấm "Đóng phiên điểm danh". Phiên chuyển sang `CLOSED`, ghi nhận `closedAt`. Toàn bộ lượt quét sau thời điểm đóng đều bị từ chối `HTTP 400`. | Phiên đóng thành công, danh sách điểm danh được lưu vĩnh viễn, tính tự động vào điểm chuyên cần (10%). | **PASSED** |

---

### 2. USER STORY EDUP-206: DASHBOARD CẢNH BÁO SỚM SINH VIÊN VẮNG $\ge 20\%$ & BẮN THÔNG BÁO

> **User Story:** Là Giảng viên / Ban Đào Tạo, tôi muốn có Dashboard tự động nhận diện các sinh viên vắng từ $20\%$ số buổi học trở lên (nguy cơ cấm thi) hoặc điểm giữa kỳ $< 4.0$, phân loại mức độ rủi ro và cung cấp nút "Bắn thông báo" (Dispatch Alert) 1-chạm gửi cảnh báo học vụ tới sinh viên.

| Mã AC | Tiêu chí chấp nhận (Acceptance Criteria) | Kịch bản trình diễn & Kiểm chứng thực tế | Kết quả PO đánh giá | Trạng thái |
|:---:|:---|:---|:---|:---:|
| **AC-206.1** | **Tự động nhận diện sinh viên vắng $\ge 20\%$** | Thuật toán quét toàn bộ lịch sử điểm danh của lớp. Tính tỷ lệ vắng: $\text{absenceRate} = \frac{\text{absentSessions}}{\text{totalSessionsHeld}}$. Sinh viên vắng $\ge 20\%$ tự động bị đánh dấu nguy cơ cấm thi. | Nhận diện chính xác 100% sinh viên có tỷ lệ vắng $\ge 20\%$. Lý do ghi rõ: *"Vượt ngưỡng cấm thi theo Quy chế đào tạo"*. | **PASSED** |
| **AC-206.2** | **Phân cấp 3 mức độ rủi ro học tập** | Phân loại tự động theo 3 cấp độ: `CRITICAL` (Nguy cấp - Đỏ, vắng $\ge 20\%$ hoặc GK $< 4.0$), `WARNING` (Cần chú ý - Vàng, sa sút), `SAFE` (An toàn - Xanh). | Badge hiển thị chuẩn màu: Đỏ (Nguy cấp), Vàng (Cần chú ý), Xanh (An toàn). Điểm rủi ro `riskScore/100` tính toán chính xác. | **PASSED** |
| **AC-206.3** | **Dashboard thẻ thống kê tổng quan** | Mở modal `EarlyWarningModal.jsx`. Hiển thị các thẻ tóm tắt: Tổng số sinh viên, số sinh viên Nguy cấp, số sinh viên Cần chú ý, số sinh viên An toàn. | Bảng điều khiển trực quan, số liệu khớp hoàn toàn với CSDL thực tế của lớp học phần. | **PASSED** |
| **AC-206.4** | **Hệ thống Tab bộ lọc đa chiều** | Giảng viên chuyển đổi qua lại giữa các tab: "Cần cảnh báo", "Nguy cấp", "Cần chú ý", "An toàn", "Tất cả". | Danh sách sinh viên lọc tức thì không độ trễ, số lượng hiển thị trên từng tab cập nhật chuẩn xác. | **PASSED** |
| **AC-206.5** | **Thẻ thông tin sinh viên có thể mở rộng** | Bấm vào từng thẻ sinh viên để mở rộng xem: Số buổi vắng/tổng số buổi, điểm GK, điểm CK, các lý do cụ thể và khuyến nghị can thiệp sư phạm. | Hiển thị chi tiết lý do rủi ro và gợi ý hành động sư phạm (nhắc nhở ôn tập, phụ đạo chuyên cần). | **PASSED** |
| **AC-206.6** | **Nút "Bắn thông báo" hàng loạt (Batch Dispatch)** | Giảng viên bấm nút **"Bắn cảnh báo tới N sinh viên"**. Hộp thoại xác nhận hiển thị tóm tắt. Sau khi xác nhận, hệ thống gửi thông báo đồng loạt. | Gọi API `POST /lecturer/early-warnings/dispatch`, thông báo thành công: *"Đã gửi cảnh báo tới N sinh viên!"*. Sinh viên nhận được thông báo học vụ. | **PASSED** |
| **AC-206.7** | **Bắn thông báo đơn lẻ cho từng cá nhân** | Giảng viên bấm biểu tượng máy bay gửi tin nhắn tại dòng của sinh viên cụ thể cần nhắc nhở riêng. | Gửi thành công tới riêng sinh viên được chọn, ghi nhận lịch sử gửi chính xác. | **PASSED** |

---

## III. BẰNG CHỨNG KIỂM THỬ TỰ ĐỘNG HÓA HỖ TRỢ NGHIỆM THU

Cả hai User Stories được bảo vệ bởi hệ thống kiểm thử tự động đa tầng với tỷ lệ vượt qua **100%**:

```text
========================================================================================
1. TEST SUITE EDUP-205: QR TOTP ATTENDANCE & ANTI-PROXY
========================================================================================
> ./gradlew :services:lecturer-service:test
- QrAttendanceServiceTest                    : 15/15 tests PASSED (100%)
- QrAttendanceE2EIntegrationTest             :  5/5  tests PASSED (100%)
- QrAttendanceAntiProxyPenetrationTest       : 14/14 tests PASSED (100%)
----------------------------------------------------------------------------------------
Tổng cộng kiểm thử QR TOTP                   : 34/34 tests PASSED (100%)

========================================================================================
2. TEST SUITE EDUP-206: EARLY WARNING & DISPATCH SYSTEM
========================================================================================
- EarlyWarningServiceTest.testEvaluateSectionRisks_AbsenceOver20Percent_FlagsCritical : PASSED
- EarlyWarningServiceTest.testEvaluateSectionRisks_LowMidtermScore_FlagsWarning       : PASSED
- EarlyWarningServiceTest.testEvaluateSectionRisks_UnauthorizedLecturer_ThrowsException : PASSED
- EarlyWarningServiceTest.testDispatchWarnings_Success                                : PASSED
----------------------------------------------------------------------------------------
Tổng cộng kiểm thử Cảnh báo sớm              :  4/4  tests PASSED (100%)

========================================================================================
3. FRONTEND UI & INTEGRATION TEST SUITE
========================================================================================
> npm test (60 tests across 20 suites)        : 60/60 tests PASSED (100%)
========================================================================================
```

---

## IV. ĐÁNH GIÁ CHẤT LƯỢNG SẢN PHẨM TỪ PRODUCT OWNER (PO)

1. **Về tính năng Điểm danh QR TOTP (EDUP-205):**
   - *"Tính năng điểm danh QR động 15s đáp ứng hoàn hảo yêu cầu thực tế trong giảng đường. Cơ chế xoay vòng 15 giây kết hợp HMAC-SHA256 giải quyết triệt để vấn đề sinh viên chụp ảnh màn hình gửi Zalo điểm danh hộ. Giao diện máy chiếu Projector Mode to, rõ ràng và đếm ngược trực quan."*
2. **Về tính năng Dashboard Cảnh báo sớm (EDUP-206):**
   - *"Tính năng phát hiện tự động sinh viên vắng $\ge 20\%$ và điểm giữa kỳ $< 4.0$ là bước tiến quan trọng giúp giảng viên chủ động can thiệp sớm trước khi sinh viên rơi vào danh sách cấm thi. Nút 'Bắn thông báo' 1-chạm hoạt động mượt mà, hộp thoại xác nhận an toàn và tin cậy."*
3. **Về trải nghiệm người dùng (UX/UI):**
   - *"Giao diện hiện đại, phản hồi tức thì, không bị tải lại trang không cần thiết, hỗ trợ đầy đủ thiết bị di động."*

---

## V. QUYẾT ĐỊNH NGHIỆM THU & PHÊ DUYỆT TRẠNG THÁI

Căn cứ vào kết quả trình diễn thực tế và toàn bộ biên bản kiểm thử kỹ thuật:

> **QUYẾT ĐỊNH CỦA PRODUCT OWNER (PO):**
> 1. **Chính thức nghiệm thu ĐẠT 100% các tiêu chí chấp nhận (AC)** cho cả hai User Stories:
>    - **EDUP-205**: Dynamic Rotating QR Code Attendance (15s Window TOTP RFC 6238).
>    - **EDUP-206**: Early Warning Dashboard & Intervention System.
> 2. **Phê duyệt chuyển trạng thái làm việc trên Jira / Sprint Backlog:**
>    - `EDUP-205`: `IN_PROGRESS` $\longrightarrow$ **`DONE`**
>    - `EDUP-206`: `IN_PROGRESS` $\longrightarrow$ **`DONE`**
> 3. Cho phép đóng gói và đưa tính năng vào bản phát hành chính thức (Release Candidate).

---

## VI. CHỮ KÝ PHÊ DUYỆT NGHIỆM THU

| ĐẠI DIỆN PRODUCT OWNER (PO)<br>*(Chủ quản Sản phẩm & Đào tạo)* | LEAD FULL-STACK DEV & QA<br>*(Kỹ sư Trình diễn)* | SCRUM MASTER / TECH LEAD<br>*(Quản trị Dự án)* |
|:---:|:---:|:---:|
| *(Đã ký duyệt)* | *(Đã ký)* | *(Đã ký)* |
| **Trần Đình Khoa**<br>Product Owner – Rikkei EduPortal | **Hoàng Văn Lương**<br>Lead Full-stack Dev / CI-CD & QA | **Nguyễn Tuấn Minh**<br>Scrum Master / Technical Lead |

