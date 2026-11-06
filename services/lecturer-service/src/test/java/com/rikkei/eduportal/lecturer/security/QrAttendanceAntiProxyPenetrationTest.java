package com.rikkei.eduportal.lecturer.security;

import com.rikkei.eduportal.common.EnrollmentStatus;
import com.rikkei.eduportal.lecturer.dto.request.AttendanceCheckInRequest;
import com.rikkei.eduportal.lecturer.dto.response.AttendanceCheckInResponse;
import com.rikkei.eduportal.lecturer.entity.*;
import com.rikkei.eduportal.lecturer.exception.AccessDeniedException;
import com.rikkei.eduportal.lecturer.exception.AttendanceAlreadyCheckedInException;
import com.rikkei.eduportal.lecturer.exception.InvalidQrException;
import com.rikkei.eduportal.lecturer.repository.*;
import com.rikkei.eduportal.lecturer.service.QrAttendanceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * [TASK-D05-LUONG] Bộ Kiểm Thử Thâm Nhập (Penetration Test) Điểm Danh QR TOTP Anti-Proxy.
 * 
 * Kiểm nghiệm thực tế các kịch bản gian lận & tấn công ủy thác điểm danh (Proxy Attendance):
 * 1. Chụp ảnh màn hình chiếu QR gửi Zalo cho bạn ở nhà quét sau chu kỳ xoay vòng (Replay & Photo Relay Attack).
 * 2. Gian lận đồng hồ điện thoại: Chỉnh lùi đồng hồ hệ thống trên Mobile Client (Clock Rollback Attack).
 * 3. Chỉnh tiến đồng hồ điện thoại để đoán trước mã (Clock Fast-Forward Attack).
 * 4. Gửi token đã hết hạn từ phiên học trước / chu kỳ trước (Stale Token Replay).
 * 5. Tấn công giả mạo token: Can thiệp sửa đổi tokenWindow và làm giả chữ ký (HMAC Forgery / Tampering).
 * 6. Điểm danh trùng lặp nhiều lần hoặc tấn công tranh chấp đa luồng (Double Check-in & Race Condition).
 * 7. Vượt rào phiên điểm danh đã đóng (Closed Session Bypass).
 * 8. Quét hộ cho sinh viên không đăng ký lớp học phần (Unauthorized Proxy Check-in).
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("PENETRATION TEST SUITE: QR TOTP Anti-Proxy & Fraud Resistance Assessment")
class QrAttendanceAntiProxyPenetrationTest {

    @Mock
    private AttendanceSessionRepository sessionRepo;

    @Mock
    private AttendanceRecordRepository recordRepo;

    @Mock
    private ClassSectionRepository classSectionRepo;

    @Mock
    private LecturerProfileRepository lecturerProfileRepo;

    @Mock
    private StudentProfileRepository studentProfileRepo;

    @Mock
    private EnrollmentRepository enrollmentRepo;

    @InjectMocks
    private QrAttendanceService qrAttendanceService;

    private AttendanceSession activeSession;
    private ClassSection classSection;
    private Course course;
    private LecturerProfile lecturer;
    private StudentProfile legitimateStudent;
    private StudentProfile proxyAttackerStudent;
    private Enrollment legitimateEnrollment;

    private static final String SESSION_SECRET = "8f4a1c6e9b2d3f5a7c8e0b1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f";
    private static final Long SESSION_ID = 101L;
    private static final Long SECTION_ID = 55L;
    private static final int STEP_SECONDS = 15;

    @BeforeEach
    void setUp() {
        qrAttendanceService.setDefaultStepSeconds(STEP_SECONDS);
        qrAttendanceService.setMaxDriftWindows(2);

        // Course & Section
        course = new Course();
        course.setId(10L);
        course.setCourseCode("CS301");
        course.setName("An Toàn & Bảo Mật Hệ Thống");

        lecturer = new LecturerProfile();
        lecturer.setId(1L);

        classSection = new ClassSection();
        classSection.setId(SECTION_ID);
        classSection.setSectionCode("CS301-01");
        classSection.setCourse(course);
        classSection.setLecturer(lecturer);

        // Active Session
        activeSession = new AttendanceSession(classSection, lecturer, "Buổi 5 - An Toàn Ứng Dụng", SESSION_SECRET);
        activeSession.setId(SESSION_ID);
        activeSession.setStatus("ACTIVE");
        activeSession.setStepSeconds(STEP_SECONDS);
        activeSession.setTotalAttendees(0);

        // Sinh viên hợp lệ có mặt trong lớp
        User userLegit = new User();
        userLegit.setId(201L);
        userLegit.setUsername("sv_legitimate");
        userLegit.setFullName("Nguyễn Văn Thật");

        legitimateStudent = new StudentProfile();
        legitimateStudent.setId(501L);
        legitimateStudent.setStudentCode("SV2024001");
        legitimateStudent.setUser(userLegit);

        legitimateEnrollment = new Enrollment();
        legitimateEnrollment.setId(1001L);
        legitimateEnrollment.setClassSection(classSection);
        legitimateEnrollment.setStudent(legitimateStudent);
        legitimateEnrollment.setStatus(EnrollmentStatus.REGISTERED);

        // Kẻ gian cố điểm danh hộ
        User userProxy = new User();
        userProxy.setId(202L);
        userProxy.setUsername("sv_proxy_target");
        userProxy.setFullName("Trần Văn Vắng Mặt");

        proxyAttackerStudent = new StudentProfile();
        proxyAttackerStudent.setId(502L);
        proxyAttackerStudent.setStudentCode("SV2024002");
        proxyAttackerStudent.setUser(userProxy);
    }

    private String generateSignature(Long sessionId, Long sectionId, long window, String secret) {
        try {
            String payload = sessionId + ":" + sectionId + ":" + window;
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new RuntimeException("HMAC computation failed", e);
        }
    }

    private String createQrToken(Long sessionId, Long sectionId, long window, String secret) {
        String sig = generateSignature(sessionId, sectionId, window, secret);
        return sessionId + "." + sectionId + "." + window + "." + sig;
    }

    // =========================================================================
    // VECTƠ TẤN CÔNG 1: CHỤP ẢNH GỬI ZALO CHO BẠN QUÉT (PHOTO RELAY PROXY)
    // =========================================================================
    @Nested
    @DisplayName("Kịch Bản 1: Tấn Công Chụp Ảnh Gửi Zalo Cho Bạn Quét Sau 20s (Screenshot Relay)")
    class ScreenshotZaloRelayTests {

        @Test
        @DisplayName("PEN-TC-01A: Từ chối quét token chụp ảnh Zalo sau khi đã trôi qua chu kỳ hiệu lực (> 30s / > 2 windows)")
        void testZaloScreenshotRelay_AfterElapsedWindows_StrictlyRejected() {
            // Giả lập: Sinh viên A chụp màn hình lúc window W0.
            // Sinh viên B nhận qua Zalo và quét sau 45s (trôi qua 3 chu kỳ = 45s).
            long nowMs = System.currentTimeMillis();
            long nowWindow = nowMs / (STEP_SECONDS * 1000L);
            long capturedWindow = nowWindow - 3; // Lùi 3 chu kỳ = trôi qua 45 giây

            String photoRelayedToken = createQrToken(SESSION_ID, SECTION_ID, capturedWindow, SESSION_SECRET);

            when(sessionRepo.findById(SESSION_ID)).thenReturn(Optional.of(activeSession));

            AttendanceCheckInRequest fraudRequest = new AttendanceCheckInRequest(
                    photoRelayedToken,
                    "Zalo Received Image - iPhone 13 Pro",
                    nowMs
            );

            // Kỳ vọng: Hệ thống chặn đứng hành vi điểm danh hộ, từ chối ném InvalidQrException
            assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv_proxy_target", fraudRequest))
                    .isInstanceOf(InvalidQrException.class)
                    .hasMessageContaining("Mã QR đã hết hạn");

            // Đảm bảo không có bản ghi gian lận nào được lưu vào CSDL
            verify(recordRepo, never()).save(any());
            assertThat(activeSession.getTotalAttendees()).isEqualTo(0);
        }

        @Test
        @DisplayName("PEN-TC-01B: Cấu hình Strict Mode (maxDriftWindows = 1): Quét sau 20s (lệch 2 chu kỳ) bị từ chối 100%")
        void testZaloScreenshotRelay_StrictMode_RejectedAfter20Seconds() {
            // Thiết lập ngưỡng kiểm tra khắt khe 1 window (15s) cho môi trường kiểm thử thâm nhập
            qrAttendanceService.setMaxDriftWindows(1);

            long nowMs = System.currentTimeMillis();
            long nowWindow = nowMs / (STEP_SECONDS * 1000L);
            // Mã QR chụp ở cuối chu kỳ trước, 20s sau bạn mới quét -> lệch 2 chu kỳ (30s)
            long capturedWindow = nowWindow - 2;

            String photoRelayedToken = createQrToken(SESSION_ID, SECTION_ID, capturedWindow, SESSION_SECRET);

            when(sessionRepo.findById(SESSION_ID)).thenReturn(Optional.of(activeSession));

            AttendanceCheckInRequest fraudRequest = new AttendanceCheckInRequest(
                    photoRelayedToken,
                    "Zalo Photo Scan after 20s",
                    nowMs
            );

            assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv_proxy_target", fraudRequest))
                    .isInstanceOf(InvalidQrException.class)
                    .hasMessageContaining("Mã QR đã hết hạn");

            verify(recordRepo, never()).save(any());
        }
    }

    // =========================================================================
    // VECTƠ TẤN CÔNG 2: GIAN LẬN ĐỒNG HỒ ĐIỆN THOẠI (CLIENT CLOCK MANIPULATION)
    // =========================================================================
    @Nested
    @DisplayName("Kịch Bản 2: Tấn Công Chỉnh Lùi Đồng Hồ Điện Thoại (Clock Rollback)")
    class ClockRollbackAttackTests {

        @Test
        @DisplayName("PEN-TC-02A: Chỉnh lùi đồng hồ điện thoại -5 phút: Hệ thống dùng giờ Server tuyệt đối, triệt tiêu 100% gian lận")
        void testClockRollback_FiveMinutesAgo_SystemRejectsServerAuthoritative() {
            // Kẻ gian có token cũ từ 5 phút trước.
            // Kẻ gian chỉnh lùi đồng hồ điện thoại về 5 phút trước (-300,000 ms) để đánh lừa client app.
            long realServerTimeMs = System.currentTimeMillis();
            long manipulatedClientTimeMs = realServerTimeMs - (5 * 60 * 1000L); // Lùi 5 phút

            long staleWindow = manipulatedClientTimeMs / (STEP_SECONDS * 1000L);
            String staleToken = createQrToken(SESSION_ID, SECTION_ID, staleWindow, SESSION_SECRET);

            when(sessionRepo.findById(SESSION_ID)).thenReturn(Optional.of(activeSession));

            AttendanceCheckInRequest rollbackRequest = new AttendanceCheckInRequest(
                    staleToken,
                    "Mobile Android (Clock Rolled Back -300s)",
                    manipulatedClientTimeMs
            );

            // Chứng minh: Server bỏ qua clientTimestampMs, tính nowWindow từ System.currentTimeMillis() của Server
            assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv_proxy_target", rollbackRequest))
                    .isInstanceOf(InvalidQrException.class)
                    .hasMessageContaining("Mã QR đã hết hạn");

            verify(recordRepo, never()).save(any());
        }

        @Test
        @DisplayName("PEN-TC-02B: Chỉnh lùi đồng hồ điện thoại -1 giờ: Vẫn bị từ chối dứt khoát")
        void testClockRollback_OneHourAgo_Rejected() {
            long realServerTimeMs = System.currentTimeMillis();
            long clientTimeOneHourAgo = realServerTimeMs - (3600 * 1000L);
            long windowOneHourAgo = clientTimeOneHourAgo / (STEP_SECONDS * 1000L);

            String oldToken = createQrToken(SESSION_ID, SECTION_ID, windowOneHourAgo, SESSION_SECRET);

            when(sessionRepo.findById(SESSION_ID)).thenReturn(Optional.of(activeSession));

            AttendanceCheckInRequest req = new AttendanceCheckInRequest(
                    oldToken,
                    "iOS Device (Manual Clock -1 hour)",
                    clientTimeOneHourAgo
            );

            assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv_proxy_target", req))
                    .isInstanceOf(InvalidQrException.class)
                    .hasMessageContaining("Mã QR đã hết hạn");

            verify(recordRepo, never()).save(any());
        }

        @Test
        @DisplayName("PEN-TC-02C: Chỉnh tiến đồng hồ điện thoại +10 phút (Fast-forward): Server từ chối token tương lai")
        void testClockFastForward_FutureToken_Rejected() {
            long realServerTimeMs = System.currentTimeMillis();
            long futureClientTimeMs = realServerTimeMs + (10 * 60 * 1000L);
            long futureWindow = futureClientTimeMs / (STEP_SECONDS * 1000L);

            String futureToken = createQrToken(SESSION_ID, SECTION_ID, futureWindow, SESSION_SECRET);

            when(sessionRepo.findById(SESSION_ID)).thenReturn(Optional.of(activeSession));

            AttendanceCheckInRequest futureReq = new AttendanceCheckInRequest(
                    futureToken,
                    "Mobile Phone (Clock Set to Future +10m)",
                    futureClientTimeMs
            );

            assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv_proxy_target", futureReq))
                    .isInstanceOf(InvalidQrException.class)
                    .hasMessageContaining("Mã QR đã hết hạn");

            verify(recordRepo, never()).save(any());
        }
    }

    // =========================================================================
    // VECTƠ TẤN CÔNG 3: TẤN CÔNG LÀM GIẢ CHỮ KÝ & SỬA ĐỔI TOKEN (HMAC TAMPERING)
    // =========================================================================
    @Nested
    @DisplayName("Kịch Bản 3: Tấn Công Sửa Đổi Dữ Liệu Token (Token Tampering & Signature Forgery)")
    class TokenTamperingAttackTests {

        @Test
        @DisplayName("PEN-TC-03A: Sửa tokenWindow thành thời gian hiện tại nhưng giữ chữ ký cũ -> Bị chặn bởi HMAC-SHA256")
        void testTamperedWindowWithOldSignature_ThrowsInvalidQrSignature() {
            // Kẻ tấn công đổi window timestamp trong chuỗi token để đánh lừa bộ kiểm tra thời gian
            long currentWindow = System.currentTimeMillis() / (STEP_SECONDS * 1000L);
            long pastWindow = currentWindow - 10;
            String originalSignature = generateSignature(SESSION_ID, SECTION_ID, pastWindow, SESSION_SECRET);

            // Ghép chuỗi giả mạo: sessionId.sectionId.currentWindow.originalSignature
            String tamperedToken = SESSION_ID + "." + SECTION_ID + "." + currentWindow + "." + originalSignature;

            when(sessionRepo.findById(SESSION_ID)).thenReturn(Optional.of(activeSession));

            AttendanceCheckInRequest tamperedRequest = new AttendanceCheckInRequest(
                    tamperedToken,
                    "Attacker Script - Modified Window Parameter"
            );

            assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv_proxy_target", tamperedRequest))
                    .isInstanceOf(InvalidQrException.class)
                    .hasMessageContaining("Mã QR không hợp lệ hoặc đã bị can thiệp trái phép");

            verify(recordRepo, never()).save(any());
        }

        @Test
        @DisplayName("PEN-TC-03B: Tự sinh chữ ký bằng secret giả lập đoán mò -> Bị chặn do không có Session Secret thực")
        void testForgedSignatureWithFakeSecret_ThrowsInvalidQrSignature() {
            long currentWindow = System.currentTimeMillis() / (STEP_SECONDS * 1000L);
            String fakeSecret = "attacker_guessed_secret_key_1234567890abcdef";
            String forgedSignature = generateSignature(SESSION_ID, SECTION_ID, currentWindow, fakeSecret);

            String forgedToken = SESSION_ID + "." + SECTION_ID + "." + currentWindow + "." + forgedSignature;

            when(sessionRepo.findById(SESSION_ID)).thenReturn(Optional.of(activeSession));

            AttendanceCheckInRequest forgedReq = new AttendanceCheckInRequest(
                    forgedToken,
                    "Attacker Script - Guessed Secret"
            );

            assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv_proxy_target", forgedReq))
                    .isInstanceOf(InvalidQrException.class)
                    .hasMessageContaining("Mã QR không hợp lệ hoặc đã bị can thiệp trái phép");

            verify(recordRepo, never()).save(any());
        }

        @Test
        @DisplayName("PEN-TC-03C: Cắt gọt chuỗi token, chèn ký tự lạ, SQL Injection, XSS payload -> Bị chặn từ tầng Parse")
        void testMalformedAndInjectedTokens_BlockedAtParseTime() {
            // Token thiếu thành phần
            assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv_proxy_target", new AttendanceCheckInRequest("101.55.sig", "Dev")))
                    .isInstanceOf(InvalidQrException.class)
                    .hasMessageContaining("Định dạng mã QR không đúng");

            // Token chèn chữ cái vào trường số
            assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv_proxy_target", new AttendanceCheckInRequest("101.NaN.12345.sig", "Dev")))
                    .isInstanceOf(InvalidQrException.class)
                    .hasMessageContaining("Thông số mã QR không hợp lệ");

            // Token chứa SQL injection payload
            assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv_proxy_target", new AttendanceCheckInRequest("101' OR '1'='1.55.1.sig", "Dev")))
                    .isInstanceOf(InvalidQrException.class);
        }
    }

    // =========================================================================
    // VECTƠ TẤN CÔNG 4: ĐIỂM DANH TRÙNG LẶP & ĐỒNG THỜI (DOUBLE CHECK-IN & CONCURRENCY)
    // =========================================================================
    @Nested
    @DisplayName("Kịch Bản 4: Điểm Danh Trùng Lặp & Tấn Công Tranh Chấp Đa Luồng (Double Check-in)")
    class DoubleCheckInTests {

        @Test
        @DisplayName("PEN-TC-04A: Sinh viên quét lại lần 2 bằng mã hợp lệ -> HTTP 409 Conflict (ĐÃ ĐIỂM DANH TRƯỚC ĐÓ)")
        void testDoubleCheckIn_WithinSameSession_Returns409Conflict() {
            long currentWindow = System.currentTimeMillis() / (STEP_SECONDS * 1000L);
            String validToken = createQrToken(SESSION_ID, SECTION_ID, currentWindow, SESSION_SECRET);

            when(sessionRepo.findById(SESSION_ID)).thenReturn(Optional.of(activeSession));
            when(studentProfileRepo.findByUserUsername("sv_legitimate")).thenReturn(Optional.of(legitimateStudent));
            when(enrollmentRepo.findByClassSectionIdAndStudentId(SECTION_ID, legitimateStudent.getId()))
                    .thenReturn(Optional.of(legitimateEnrollment));
            // Đã tồn tại bản ghi điểm danh
            when(recordRepo.existsBySessionIdAndStudentId(SESSION_ID, legitimateStudent.getId())).thenReturn(true);

            AttendanceCheckInRequest req = new AttendanceCheckInRequest(validToken, "iPhone 15");

            assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv_legitimate", req))
                    .isInstanceOf(AttendanceAlreadyCheckedInException.class)
                    .hasMessageContaining("ĐÃ ĐIỂM DANH TRƯỚC ĐÓ");

            verify(recordRepo, never()).save(any());
        }

        @Test
        @DisplayName("PEN-TC-04B: Tấn công tranh chấp đồng thời (Race Condition) qua mặt bộ nhớ đệm -> Bị Unique DB Constraint bắt gọn")
        void testConcurrentCheckIn_DatabaseUniqueConstraint_GuaranteesIdempotency() {
            long currentWindow = System.currentTimeMillis() / (STEP_SECONDS * 1000L);
            String validToken = createQrToken(SESSION_ID, SECTION_ID, currentWindow, SESSION_SECRET);

            when(sessionRepo.findById(SESSION_ID)).thenReturn(Optional.of(activeSession));
            when(studentProfileRepo.findByUserUsername("sv_legitimate")).thenReturn(Optional.of(legitimateStudent));
            when(enrollmentRepo.findByClassSectionIdAndStudentId(SECTION_ID, legitimateStudent.getId()))
                    .thenReturn(Optional.of(legitimateEnrollment));
            when(recordRepo.existsBySessionIdAndStudentId(SESSION_ID, legitimateStudent.getId())).thenReturn(false);

            // Giả lập DB ném DataIntegrityViolationException do 2 luồng commit cùng lúc
            when(recordRepo.save(any(AttendanceRecord.class)))
                    .thenThrow(new DataIntegrityViolationException("Unique constraint violation: uq_session_student"));

            AttendanceCheckInRequest concurrentReq = new AttendanceCheckInRequest(validToken, "Concurrent Bot 1");

            assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv_legitimate", concurrentReq))
                    .isInstanceOf(AttendanceAlreadyCheckedInException.class)
                    .hasMessageContaining("ĐÃ ĐIỂM DANH TRƯỚC ĐÓ");
        }
    }

    // =========================================================================
    // VECTƠ TẤN CÔNG 5: VƯỢT RÀO PHIÊN ĐIỂM DANH ĐÃ ĐÓNG (CLOSED SESSION BYPASS)
    // =========================================================================
    @Nested
    @DisplayName("Kịch Bản 5: Vượt Rào Khi Giảng Viên Đã Đóng Phiên Học (Closed Session)")
    class ClosedSessionTests {

        @Test
        @DisplayName("PEN-TC-05A: Quét mã sau khi giảng viên bấm đóng phiên (status = CLOSED) -> Từ chối 100%")
        void testCheckIn_AfterLecturerClosesSession_Rejected() {
            activeSession.setStatus("CLOSED");
            activeSession.setClosedAt(LocalDateTime.now().minusSeconds(10));

            long currentWindow = System.currentTimeMillis() / (STEP_SECONDS * 1000L);
            String validToken = createQrToken(SESSION_ID, SECTION_ID, currentWindow, SESSION_SECRET);

            when(sessionRepo.findById(SESSION_ID)).thenReturn(Optional.of(activeSession));

            AttendanceCheckInRequest req = new AttendanceCheckInRequest(validToken, "Mobile");

            assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv_legitimate", req))
                    .isInstanceOf(InvalidQrException.class)
                    .hasMessageContaining("Phiên điểm danh này đã kết thúc hoặc bị đóng");

            verify(recordRepo, never()).save(any());
        }

        @Test
        @DisplayName("PEN-TC-05B: Quét mã khi session có closedAt trong quá khứ -> Từ chối hết hạn mở điểm danh")
        void testCheckIn_PastClosedAt_Rejected() {
            activeSession.setStatus("ACTIVE");
            activeSession.setClosedAt(LocalDateTime.now().minusMinutes(2));

            long currentWindow = System.currentTimeMillis() / (STEP_SECONDS * 1000L);
            String validToken = createQrToken(SESSION_ID, SECTION_ID, currentWindow, SESSION_SECRET);

            when(sessionRepo.findById(SESSION_ID)).thenReturn(Optional.of(activeSession));

            AttendanceCheckInRequest req = new AttendanceCheckInRequest(validToken, "Mobile");

            assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv_legitimate", req))
                    .isInstanceOf(InvalidQrException.class)
                    .hasMessageContaining("hết thời gian mở điểm danh");

            verify(recordRepo, never()).save(any());
        }
    }

    // =========================================================================
    // VECTƠ TẤN CÔNG 6: ĐIỂM DANH HỘ CHO SINH VIÊN NGOÀI DANH SÁCH LỚP (UNAUTHORIZED)
    // =========================================================================
    @Nested
    @DisplayName("Kịch Bản 6: Sinh Viên Không Có Trong Danh Sách Lớp Học Phần")
    class UnauthorizedStudentTests {

        @Test
        @DisplayName("PEN-TC-06A: Sinh viên có mã QR tươi nhưng không đăng ký học phần -> Từ chối HTTP 403 Forbidden")
        void testStudentNotEnrolled_ThrowsAccessDenied() {
            long currentWindow = System.currentTimeMillis() / (STEP_SECONDS * 1000L);
            String validToken = createQrToken(SESSION_ID, SECTION_ID, currentWindow, SESSION_SECRET);

            when(sessionRepo.findById(SESSION_ID)).thenReturn(Optional.of(activeSession));
            when(studentProfileRepo.findByUserUsername("sv_proxy_target")).thenReturn(Optional.of(proxyAttackerStudent));
            // Không tìm thấy bản ghi đăng ký (enrollment)
            when(enrollmentRepo.findByClassSectionIdAndStudentId(SECTION_ID, proxyAttackerStudent.getId()))
                    .thenReturn(Optional.empty());

            AttendanceCheckInRequest req = new AttendanceCheckInRequest(validToken, "Mobile Outside Class");

            assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv_proxy_target", req))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("Bạn không thuộc danh sách sinh viên lớp học phần này");

            verify(recordRepo, never()).save(any());
        }
    }

    // =========================================================================
    // VECTƠ HỢP LỆ: ĐIỂM DANH THÀNH CÔNG VỚI MÃ TƯƠI TRONG LỚP (BASELINE BENCHMARK)
    // =========================================================================
    @Nested
    @DisplayName("Kịch Bản Cơ Sở: Sinh Viên Có Mặt Quét Mã Hợp Lệ Trực Tiếp Tại Lớp (Baseline)")
    class BaselineLegitimateTests {

        @Test
        @DisplayName("PEN-TC-BASE: Sinh viên quét mã QR trực tiếp từ máy chiếu trong chu kỳ 15s -> Điểm danh thành công")
        void testLegitimateStudent_CheckIn_Within15Seconds_Success() {
            long currentWindow = System.currentTimeMillis() / (STEP_SECONDS * 1000L);
            String freshToken = createQrToken(SESSION_ID, SECTION_ID, currentWindow, SESSION_SECRET);

            when(sessionRepo.findById(SESSION_ID)).thenReturn(Optional.of(activeSession));
            when(studentProfileRepo.findByUserUsername("sv_legitimate")).thenReturn(Optional.of(legitimateStudent));
            when(enrollmentRepo.findByClassSectionIdAndStudentId(SECTION_ID, legitimateStudent.getId()))
                    .thenReturn(Optional.of(legitimateEnrollment));
            when(recordRepo.existsBySessionIdAndStudentId(SESSION_ID, legitimateStudent.getId())).thenReturn(false);
            when(recordRepo.save(any(AttendanceRecord.class))).thenAnswer(inv -> inv.getArgument(0));

            AttendanceCheckInRequest req = new AttendanceCheckInRequest(
                    freshToken,
                    "iPhone 15 Pro - Direct Projector Scan",
                    System.currentTimeMillis()
            );

            AttendanceCheckInResponse response = qrAttendanceService.studentCheckIn("sv_legitimate", req);

            assertThat(response).isNotNull();
            assertThat(response.studentCode()).isEqualTo("SV2024001");
            assertThat(response.studentName()).isEqualTo("Nguyễn Văn Thật");
            assertThat(response.message()).contains("Điểm danh thành công");
            assertThat(activeSession.getTotalAttendees()).isEqualTo(1);
            verify(recordRepo, times(1)).save(any(AttendanceRecord.class));
        }
    }
}
