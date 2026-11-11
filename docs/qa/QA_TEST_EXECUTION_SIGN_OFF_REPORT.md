# CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
**Độc lập – Tự do – Hạnh phúc**

---

# BIÊN BẢN KIỂM THỬ CHẤT LƯỢNG PHẦN MỀM & PHÊ DUYỆT PHÁT HÀNH
## (QA TEST EXECUTION SIGN-OFF REPORT — RELEASE READINESS CERTIFICATE)

### DỰ ÁN: HỆ SINH THÁI QUẢN LÝ ĐÀO TẠO THÔNG MINH RIKKEI EDUPORTAL (SMART CAMPUS SIS)

---

## I. THÔNG TIN CHUNG & PHẠM VI KIỂM THỬ

| Hạng mục | Thông tin chi tiết |
|:---|:---|
| **Tên dự án / Hệ thống** | **Rikkei EduPortal — Smart Campus SIS v2.1** |
| **Kiến trúc kiểm thử** | 6 Spring Boot 3.3.4 Microservices (`api-gateway`, `auth-service`, `course-service`, `enrollment-service`, `ai-service`, `lecturer-service`) + React 18 / Vite 6 PWA + PostgreSQL 16/17 |
| **Nhánh nguồn phát hành (Baseline)** | `origin/dev` (Commit `476d1e9` — đồng bộ sang nhánh QA phát hành `Full-stack-Dev-/-CI-CD-&-QA-Luong`) |
| **Nhánh thực thi Pipeline & QA** | `Full-stack-Dev-/-CI-CD-&-QA-Luong` |
| **GitHub Actions CI Run (QA Branch)** | **Run `#42963155741`** — `CI/CD Pipeline — Rikkei EduPortal` ([Xem kết quả trực tuyến](https://github.com/minh2307/Student-Information-System/actions/runs/42963155741)) |
| **GitHub Actions CI Run (`dev` Baseline)** | **Run `#42947711544`** — `CI/CD Pipeline — Rikkei EduPortal` ([Xem kết quả trực tuyến](https://github.com/minh2307/Student-Information-System/actions/runs/42947711544)) |
| **Ngày thực hiện & Lập biên bản** | `11/11/2026` (UTC+7) |
| **Trưởng nhóm QA / Kiểm thử CI-CD** | **Hoàng Văn Lương** — Lead Full-stack Dev / CI-CD & QA Engineer |
| **Technical Lead / Scrum Master** | **Nguyễn Sơn Minh** (Team Lead) / **Nguyễn Tuấn Minh** |
| **Kết luận chất lượng (Release Verdict)** | **ĐẠT CHUẨN PHÁT HÀNH (`GO FOR RELEASE`) — 0 CRITICAL / 0 BLOCKER / 0 MAJOR BUGS** |

---

## II. KẾT QUẢ KÍCH HOẠT PIPELINE CI/CD (GITHUB ACTIONS)

Pipeline tự động hóa CI/CD (`.github/workflows/ci-cd.yml`) đã được kích hoạt thực thi trực tiếp trên nhánh `Full-stack-Dev-/-CI-CD-&-QA-Luong` (Commit `5939848`, đồng bộ đầy đủ mã nguồn phát hành từ `origin/dev` commit `476d1e9`) và ghi nhận trạng thái **SUCCESS** trên toàn bộ các Job kiểm thử:

| Job CI/CD | Mô tả nhiệm vụ | Môi trường Runner | Thời gian | Trạng thái |
|:---|:---|:---|:---:|:---:|
| **🎨 Frontend Build & Test** | Cài đặt `npm ci`, chạy `npm test` (85 tests / 32 suites) và biên dịch production `vite build` (`1709` modules) | `ubuntu-latest` / Node 20 | `17s` | **PASSED (`success`)** |
| **🔨 Backend Build & Test (Gradle)** | Khởi tạo PostgreSQL 16 (`01-schema.sql`, `02-seed-data.sql`), biên dịch và chạy toàn bộ `./gradlew test --no-daemon --parallel` | `ubuntu-latest` / Java 21 (Temurin) | `2m 03s` | **PASSED (`success`)** |
| **🧪 API Integration Tests (Newman)** | Khởi chạy toàn bộ 6 microservices (`8080`–`8085`), chạy liên hoàn bộ **CI Newman (26 requests)** + reset DB + chạy bộ **E2E 5 Microservices Newman (45 requests)** | `ubuntu-latest` / PostgreSQL 16 + Newman `htmlextra`, `junit` | `1m 28s` | **PASSED (`success`)** |
| **🐳 Build & Push Docker / 🚀 Deploy Production** | Kiểm soát an toàn nhánh phát hành (`if: github.ref_name == 'main'`), không ghi đè VPS Production từ nhánh QA | GitHub Actions Policy Guard | — | **SKIPPED (An toàn theo quy chế Git Workflow)** |

**Artifacts kiểm thử đã lưu trữ trên GitHub Actions (`Run #42963155741`):**
* `backend-test-reports` (`452,668 bytes`) — Báo cáo JUnit/HTML Gradle của toàn bộ 6 backend services.
* `newman-reports` (`103,308 bytes`) — Báo cáo JUnit XML (`junit.xml`, `e2e-junit.xml`) & HTML (`report.html`, `e2e-report.html`).
* `frontend-dist` (`2,587,420 bytes`) — Gói build PWA/SPA sẵn sàng đóng gói Nginx.
* `backend-jars` (`245,597,008 bytes`) — 6 Spring Boot executable fat JARs đã kiểm chứng.

---

## III. CHI TIẾT KẾT QUẢ KIỂM THỬ ĐA TẦNG (TEST EXECUTION MATRIX)

### 1. Kiểm thử Backend Unit & Integration Tests (`./gradlew test --no-daemon --parallel`)

Thực thi trực tiếp với cơ sở dữ liệu PostgreSQL (`academic_db`) đã nạp schema & seed data chuẩn:

| Microservice Module | Số Test Suites | Tổng Test Cases | Passed | Failed | Errors | Skipped | Thời gian | Trạng thái |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `services/ai-service` | 10 | 41 | **41** | 0 | 0 | 0 | 11.50s | **PASS** |
| `services/api-gateway` | 1 | 4 | **4** | 0 | 0 | 0 | 0.10s | **PASS** |
| `services/auth-service` | 9 | 43 | **43** | 0 | 0 | 0 | 8.64s | **PASS** |
| `services/course-service` | 7 | 30 | **30** | 0 | 0 | 0 | 4.84s | **PASS** |
| `services/enrollment-service` | 41 | 324 | **323** | 0 | 0 | 1\* | 18.20s | **PASS** |
| `services/lecturer-service` | 19 | 119 | **119** | 0 | 0 | 0 | 10.24s | **PASS** |
| **TỔNG CỘNG BACKEND** | **87** | **561** | **560** | **0** | **0** | **1\*** | **~38s (parallel)** | **100% EXECUTED PASS** |

> **Ghi chú minh bạch về test bị skip (`1*`):** Test case `LivePayOSDemonstrationTest.testLivePayOSRealPaymentCreation` được đánh dấu `@Disabled("Manual test gọi trực tiếp lên cổng PayOS thật - Mở annotation khi cần test live")` có chủ đích trong mã nguồn để tránh tạo giao dịch thanh toán thật tới cổng thương mại PayOS khi chạy tự động CI/CD. Luồng tích hợp PayOS tự động được bao phủ đầy đủ bởi `PayOSServiceTest` và kiểm thử đối soát trong `enrollment-service`.
>
> **Chỉ số JaCoCo Code Coverage (`enrollment-service`):** Class coverage đạt **88.10%** (`74/84`), Instruction coverage **66.91%** (`12,424/18,567`), Line coverage **66.85%** (`2,729/4,082`).

---

### 2. Kiểm thử Frontend Unit, Component & PWA (`npm test` & `npm run build`)

| Hạng mục kiểm thử | Công cụ | Kết quả thực tế | Thời gian | Trạng thái |
|:---|:---|:---|:---:|:---:|
| **Frontend Test Suites** (`frontend/test/*.test.js`) | Node Test Runner (`node --test`) | **85/85 test cases PASS** across **32 suites** (`0` fail, `0` skipped) | 376.56ms | **PASS** |
| **Production Bundle Build** (`vite build`) | Vite v6.4.4 / esbuild | **1,709 modules** transformed thành công, tạo `dist/` chuẩn PWA | 4.05s | **PASS** |

Các phân hệ được kiểm chứng tự động ở Frontend gồm: PWA Service Worker & Offline Caching (`EDUP-210`), iCal & WebCal integration (`EDUP-209`), Academic Advisor Markdown & Session Isolation, AI Smart Schedule Optimizer (`EDUP-202`), PayOS & Tuition Financial Standing Separation (`TASK-FEE-01`), Admin Users Scroll & Mobile Navigation.

---

### 3. Kiểm thử Tích hợp API Tự động Bằng Newman (`newman run`)

Cả hai bộ sưu tập kiểm thử API đã được thực thi nối tiếp với cơ sở dữ liệu sạch (`DROP SCHEMA public CASCADE` + `01-schema.sql` + `02-seed-data.sql`):

#### A. Bộ Test CI Pipeline (`postman/eduportal.postman_collection.json` + `postman/ci.postman_environment.json`)
* **Số Requests thực thi:** **26 / 26** (`0` failed)
* **Số Assertions kiểm tra:** **45 / 45** (`0` failed)
* **Thời gian chạy / Độ trễ TB:** **3.0s** (`2.698s` JUnit) — Response trung bình: **103ms** (`min: 3ms, max: 483ms`)
* **Phạm vi bao phủ:** Authentication JWT (`admin`, `gv001`, `gv002`, `sv2024001`), RBAC Security (`401`/`403`), Lecturer Grade Formula `10-40-50`, Immutability Lock (`409 Conflict`), Student Enrollment & Concurrent Race Condition, iCal RFC 5545 & WebCal Token Security (`text/calendar`).

#### B. Bộ Test End-to-End 5 Microservices + Gateway (`postman/rikkei-eduportal-e2e.json`)
* **Số Requests thực thi:** **45 / 45** across **8 test folders** (`0` failed)
* **Số Assertions kiểm tra:** **67 / 67** (`0` failed)
* **Thời gian chạy / Độ trễ TB:** **3.6s** (`3.144s` JUnit) — Response trung bình: **69ms** (`min: 2ms, max: 944ms`)
* **Phạm vi bao phủ:**
  1. `auth-service` (`8081`): Đăng nhập đa vai trò, kiểm tra `/profile/me`, chặn sai mật khẩu (`401`).
  2. `course-service` (`8082`): Danh mục môn học, học kỳ, quản trị tạo môn & lớp học phần.
  3. `enrollment-service` (`8083`): Dashboard sinh viên, giữ chỗ nguyên tử 5 phút (`reserve`), xác nhận combo (`batch-enroll-reservations`), thời khóa biểu, bảng điểm, học phí VietQR/PayOS, lịch thi.
  4. `lecturer-service` (`8085`): Mở phiên điểm danh QR TOTP 15s, lấy mã QR động, sinh viên quét check-in, chống quét trùng (`409 Conflict`), đóng phiên & chặn quét trễ (`400 Bad Request`), nhập điểm & khóa sổ bất biến (`409 Conflict`), cảnh báo sớm vắng $\ge 20\%$ (`/lecturer/early-warnings/section/{id}`).
  5. `ai-service` (`8084`): Cố vấn học tập AI 24/7 (`academic-advisor`) & Sinh đề cương (`generate-syllabus`) kèm cơ chế fallback tin cậy khi không dùng key ngoài.
  6. `api-gateway` (`8080`): Kiểm soát biên RBAC tập trung (`403 Forbidden` khi `STUDENT` gọi `POST /api/v1/admin/class-sections`, `401 Unauthorized` khi thiếu JWT).

---

### 4. Kiểm thử End-to-End Thực Chiến Qua Frontend Vite Proxy (`scripts/smoke-test-live-student.mjs`)

Thực thi luồng người dùng thật qua địa chỉ `http://localhost:5173` $\rightarrow$ API Gateway (`8080`) $\rightarrow$ 5 Backend Microservices:
* **Tổng số Test Cases:** **32 / 32 PASS (100%, 0 FAIL)**
* Bao gồm kiểm chứng kết nối luồng **Server-Sent Events (SSE)** `live-seats`, tải PWA Shell (`/`), `manifest.json`, `sw.js`, Security Headers và ranh giới RBAC.

---

## IV. QUẢN LÝ LỖI & ĐỐI SOÁT CHẤT LƯỢNG (DEFECT SUMMARY)

### 1. Bảng phân loại lỗi phát hiện trong đợt kiểm thử phát hành

| Mức độ nghiêm trọng (Severity) | Số lượng phát hiện | Đã khắc phục | Tồn đọng mở (Open) | Ghi chú |
|:---|:---:|:---:|:---:|:---|
| **Critical / Blocker (S1)** | **0** | 0 | **0** | Không có sự cố sập dịch vụ, rò rỉ dữ liệu, mất mát giao dịch hay sai lệch bảo mật. |
| **Major / High (S2)** | **0** | 0 | **0** | Mọi luồng nghiệp vụ cốt lõi (Auth, Đăng ký, Thanh toán, QR TOTP, Khóa điểm, iCal, PWA) hoạt động 100%. |
| **Minor / Test Script Sync (S3)** | **5** *(Test script mismatch)* | **5** | **0** | Đã cập nhật `postman/generate_e2e_collection.py` & `postman/rikkei-eduportal-e2e.json` cho khớp 100% schema/route thực tế của bản phát hành. |

### 2. Chi tiết 5 điểm đồng bộ hợp đồng kiểm thử (E2E Test Contract Alignment)
Trong quá trình kích hoạt bộ test 45 requests `rikkei-eduportal-e2e.json`, QA phát hiện và chuẩn hóa kịp thời 5 câu lệnh assertion/URL cũ trong script sinh test (`postman/generate_e2e_collection.py`) để phản ánh đúng kiến trúc bản phát hành hiện hành (không phải lỗi sản phẩm):
1. **`06. GET /profile/me`:** Cập nhật đường dẫn đọc JSON từ `res.data.username` sang `res.data.user.username` & `res.data.studentProfile.studentCode` theo chuẩn DTO hồ sơ đa vai trò mới.
2. **`13. GET /student/dashboard`:** Cập nhật kiểm tra cấu trúc thuộc tính `stats` và `semesterProgress` trong `ApiResponse.data`.
3. **`15. POST /student/class-sections/4/reserve`:** Cập nhật tên trường thời hạn giữ chỗ `expiresAt` khớp `SlotReservationResponse.java`.
4. **`36. Early Warning Endpoint`:** Cập nhật đúng route triển khai thực tế `/api/v1/lecturer/early-warnings/section/{sectionId}` (thay cho route dự thảo cũ `/lecturer/classes/1/early-warning`).
5. **`43. RBAC POST /admin/class-sections`:** Điều hướng request kiểm tra phân quyền qua cổng biên `{{base_gateway_url}}` (`8080`) nơi `JwtGatewayValidator` thực thi kiểm soát RBAC `403 Forbidden` cho toàn cụm microservices.

---

## V. HỒ SƠ CHỨNG CỨ NGHIỆM THU BỔ TRỢ ĐÃ HOÀN TẤT TRONG SPRINT

* `docs/qa/BIEN_BAN_QA_PEN_TEST_QR_TOTP_ANTI_PROXY.md` — Kiểm thử thâm nhập QR TOTP 15s chống điểm danh hộ qua Zalo / giả lập đồng hồ (Pass 14/14 penetration tests).
* `docs/qa/BIEN_BAN_QA_OFFLINE_FALLBACK_MOBILE.md` — Xác nhận hoạt động PWA Offline Fallback xem thời khóa biểu và bảng điểm trên thiết bị di động.
* `docs/qa/BIEN_BAN_NGHIEM_THU_AC_EDUP_205_EDUP_206.md` — Biên bản nghiệm thu PO cho `EDUP-205` & `EDUP-206` chuyển trạng thái `DONE`.
* `reports/acceptance/BIEN_BAN_NGHIEM_THU_AC_EDUP_201_EDUP_202.md` — Biên bản nghiệm thu PO cho `EDUP-201` & `EDUP-202`.
* `reports/acceptance/BIEN_BAN_NGHIEM_THU_AC_EDUP_209_EDUP_210.md` — Biên bản nghiệm thu PO cho `EDUP-209` & `EDUP-210`.

---

## VI. QUYẾT ĐỊNH PHÊ DUYỆT PHÁT HÀNH (OFFICIAL QA SIGN-OFF)

Căn cứ vào kết quả thực thi pipeline tự động trên GitHub Actions (**Run `#42963155741`** và Baseline **`#42947711544`**) cùng toàn bộ số liệu kiểm thử đa tầng (Backend Gradle `560/560 executed PASS`, Frontend `85/85 PASS`, Newman CI `26/26 PASS`, Newman E2E `45/45 PASS`, Live E2E Smoke Test `32/32 PASS`) với **0 lỗi nghiêm trọng (0 Critical / 0 Blocker / 0 Major Bugs)**:

> ### **KẾT LUẬN CHÍNH THỨC: APPROVED — GO FOR PRODUCTION RELEASE**
> 1. **Hệ thống Rikkei EduPortal v2.1 ĐỦ ĐIỀU KIỆN PHÁT HÀNH RA THỊ TRƯỜNG.**
> 2. Toàn bộ kiểm thử tự động CI/CD đạt độ tin cậy và bao phủ đầy đủ cho 5 microservices nghiệp vụ, API Gateway và Frontend PWA.
> 3. Khuyến nghị nhóm vận hành/DevOps tiến hành quy trình Merge PR chuẩn hóa từ `dev` sang `main` theo [`docs/deployment/git-workflow.md`](../deployment/git-workflow.md) để đóng gói Docker Release Tag và triển khai Production.

---

| ĐẠI DIỆN QA & CI/CD LEAD<br>*(Người lập & Chịu trách nhiệm Kiểm thử)* | ĐẠI DIỆN TECHNICAL LEAD<br>*(Phê duyệt Kỹ thuật & Kiến trúc)* | ĐẠI DIỆN PRODUCT OWNER (PO)<br>*(Phê duyệt Nghiệm thu Phát hành)* |
|:---:|:---:|:---:|
| *(Đã ký xác nhận)* | *(Chờ/Đã đối soát)* | *(Chờ/Đã đối soát)* |
| **Hoàng Văn Lương**<br>Lead Full-stack Dev / CI-CD & QA | **Nguyễn Sơn Minh / Nguyễn Tuấn Minh**<br>Technical Lead / Scrum Master | **Trần Đình Khoa**<br>Product Owner – Rikkei EduPortal |
