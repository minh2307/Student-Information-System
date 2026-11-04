package com.rikkei.eduportal.lecturer.service;

import com.rikkei.eduportal.common.EnrollmentStatus;
import com.rikkei.eduportal.lecturer.dto.request.AttendanceCheckInRequest;
import com.rikkei.eduportal.lecturer.dto.request.StartAttendanceSessionRequest;
import com.rikkei.eduportal.lecturer.dto.response.AttendanceCheckInResponse;
import com.rikkei.eduportal.lecturer.dto.response.AttendanceSessionResponse;
import com.rikkei.eduportal.lecturer.dto.response.DynamicQrResponse;
import com.rikkei.eduportal.lecturer.entity.*;
import com.rikkei.eduportal.lecturer.exception.AttendanceAlreadyCheckedInException;
import com.rikkei.eduportal.lecturer.exception.InvalidQrException;
import com.rikkei.eduportal.lecturer.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * [TASK-D02-LUONG] Test Suite E2E: Luồng Điểm Danh Mã QR Động TOTP Xoay 15 Giây.
 * Kiểm tra trọn vẹn quy trình từ giảng viên mở phiên chiếu mã QR -> sinh viên quét check-in realtime
 * -> lưu bản ghi vào attendance_records -> chống gian lận TOTP 15s & chống điểm danh trùng.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("E2E Integration Test: Dynamic Rotating QR Code Attendance Flow (15s Window)")
class QrAttendanceE2EIntegrationTest {

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

    private LecturerProfile mockLecturer;
    private User lecturerUser;
    private ClassSection mockSection;
    private Course mockCourse;
    private StudentProfile mockStudent1;
    private User studentUser1;
    private Enrollment mockEnrollment1;
    private AttendanceSession liveSession;
    private final List<AttendanceRecord> simulatedRecords = new ArrayList<>();

    private final String sessionSecret = "test_totp_hmac_secret_key_abcdef1234567890";

    @BeforeEach
    void setUp() {
        simulatedRecords.clear();

        // 1. Giảng viên phụ trách lớp
        lecturerUser = new User();
        lecturerUser.setId(100L);
        lecturerUser.setUsername("gv_hoangluong");
        lecturerUser.setFullName("ThS. Hoàng Văn Lương");

        mockLecturer = new LecturerProfile();
        mockLecturer.setId(10L);
        mockLecturer.setUser(lecturerUser);

        // 2. Lớp học phần & môn học
        mockCourse = new Course();
        mockCourse.setId(500L);
        mockCourse.setCourseCode("IT4409");
        mockCourse.setName("Kiến trúc Vi dịch vụ và Ứng dụng Phân tán");

        mockSection = new ClassSection();
        mockSection.setId(88L);
        mockSection.setSectionCode("IT4409-2024-02");
        mockSection.setCourse(mockCourse);
        mockSection.setLecturer(mockLecturer);

        // 3. Sinh viên trong danh sách lớp
        studentUser1 = new User();
        studentUser1.setId(201L);
        studentUser1.setUsername("sv20210088");
        studentUser1.setFullName("Lê Minh Quân");

        mockStudent1 = new StudentProfile();
        mockStudent1.setId(301L);
        mockStudent1.setStudentCode("20210088");
        mockStudent1.setUser(studentUser1);

        mockEnrollment1 = new Enrollment();
        mockEnrollment1.setId(1001L);
        mockEnrollment1.setClassSection(mockSection);
        mockEnrollment1.setStudent(mockStudent1);
        mockEnrollment1.setStatus(EnrollmentStatus.REGISTERED);

        // 4. Session điểm danh mẫu
        liveSession = new AttendanceSession(mockSection, mockLecturer, "Điểm danh Buổi 12 - Microservices", sessionSecret);
        liveSession.setId(999L);
        liveSession.setStatus("OPEN");
        liveSession.setStepSeconds(15);
        liveSession.setTotalAttendees(0);
    }

    private String computeHmacSha256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hmacBytes);
        } catch (Exception e) {
            throw new RuntimeException("Error computing HMAC", e);
        }
    }

    @Test
    @DisplayName("E2E-01: Toàn bộ luồng điểm danh trong 15 giây thành công và lưu bản ghi attendance_records")
    void testE2E_FullAttendanceFlow_Within15Seconds_Success() {
        // --- BƯỚC 1: Giảng viên mở phiên điểm danh mới trên máy chiếu ---
        when(lecturerProfileRepo.findByUserUsername("gv_hoangluong")).thenReturn(Optional.of(mockLecturer));
        when(classSectionRepo.findByIdAndLecturerId(88L, 10L)).thenReturn(Optional.of(mockSection));
        when(sessionRepo.findFirstByClassSectionIdAndStatusOrderByCreatedAtDesc(88L, "OPEN"))
                .thenReturn(Optional.empty()) // ban đầu chưa có phiên cũ
                .thenReturn(Optional.of(liveSession)); // sau khi mở thì có phiên liveSession
        when(sessionRepo.save(any(AttendanceSession.class))).thenAnswer(inv -> {
            AttendanceSession s = inv.getArgument(0);
            if (s.getId() == null) s.setId(999L);
            return s;
        });

        StartAttendanceSessionRequest startReq = new StartAttendanceSessionRequest("Điểm danh Buổi 12 - Microservices");
        AttendanceSessionResponse startedSession = qrAttendanceService.startSession("gv_hoangluong", 88L, startReq);

        assertThat(startedSession).isNotNull();
        assertThat(startedSession.sessionId()).isEqualTo(999L);
        assertThat(startedSession.status()).isEqualTo("OPEN");
        assertThat(startedSession.stepSeconds()).isEqualTo(15);
        assertThat(startedSession.totalAttendees()).isEqualTo(0);

        // --- BƯỚC 2: Giảng viên lấy mã QR xoay 15 giây hiển thị lên Projector ---
        DynamicQrResponse dynamicQr = qrAttendanceService.getRotatingQrCode("gv_hoangluong", 88L);

        assertThat(dynamicQr).isNotNull();
        assertThat(dynamicQr.qrToken()).isNotBlank();
        assertThat(dynamicQr.stepSeconds()).isEqualTo(15);
        assertThat(dynamicQr.remainingSeconds()).isGreaterThan(0).isLessThanOrEqualTo(15);
        assertThat(dynamicQr.qrImageBase64()).startsWith("data:image/png;base64,");

        String[] tokenParts = dynamicQr.qrToken().split("\\.");
        assertThat(tokenParts).hasSize(4);
        assertThat(tokenParts[0]).isEqualTo("999"); // sessionId
        assertThat(tokenParts[1]).isEqualTo("88");  // sectionId
        long tokenWindow = Long.parseLong(tokenParts[2]);
        long expectedCurrentWindow = System.currentTimeMillis() / 15000L;
        assertThat(Math.abs(expectedCurrentWindow - tokenWindow)).isLessThanOrEqualTo(1L);

        // --- BƯỚC 3: Sinh viên bật camera mobile quét mã QR trong chu kỳ 15 giây ---
        when(sessionRepo.findById(999L)).thenReturn(Optional.of(liveSession));
        when(studentProfileRepo.findByUserUsername("sv20210088")).thenReturn(Optional.of(mockStudent1));
        when(enrollmentRepo.findByClassSectionIdAndStudentId(88L, 301L)).thenReturn(Optional.of(mockEnrollment1));
        when(recordRepo.existsBySessionIdAndStudentId(999L, 301L)).thenReturn(false);

        // Mô phỏng lưu bản ghi vào database attendance_records
        when(recordRepo.save(any(AttendanceRecord.class))).thenAnswer(inv -> {
            AttendanceRecord rec = inv.getArgument(0);
            rec.setId(777L);
            simulatedRecords.add(rec);
            return rec;
        });

        AttendanceCheckInRequest checkInReq = new AttendanceCheckInRequest(
                dynamicQr.qrToken(),
                "iPhone 15 Pro Max - Safari Mobile 17.4"
        );

        AttendanceCheckInResponse checkInResponse = qrAttendanceService.studentCheckIn("sv20210088", checkInReq);

        // --- BƯỚC 4: Kiểm tra kết quả trả về cho mobile sinh viên (hiển thị Toast xanh) ---
        assertThat(checkInResponse).isNotNull();
        assertThat(checkInResponse.sessionId()).isEqualTo(999L);
        assertThat(checkInResponse.sectionId()).isEqualTo(88L);
        assertThat(checkInResponse.sectionCode()).isEqualTo("IT4409-2024-02");
        assertThat(checkInResponse.courseName()).isEqualTo("Kiến trúc Vi dịch vụ và Ứng dụng Phân tán");
        assertThat(checkInResponse.studentCode()).isEqualTo("20210088");
        assertThat(checkInResponse.studentName()).isEqualTo("Lê Minh Quân");
        assertThat(checkInResponse.checkInTime()).isNotNull();
        assertThat(checkInResponse.message()).contains("Điểm danh thành công");

        // --- BƯỚC 5: Kiểm tra bản ghi đã được lưu chính xác vào attendance_records ---
        ArgumentCaptor<AttendanceRecord> recordCaptor = ArgumentCaptor.forClass(AttendanceRecord.class);
        verify(recordRepo, times(1)).save(recordCaptor.capture());
        AttendanceRecord savedRecord = recordCaptor.getValue();

        assertThat(savedRecord.getSession().getId()).isEqualTo(999L);
        assertThat(savedRecord.getStudent().getId()).isEqualTo(301L);
        assertThat(savedRecord.getStudent().getStudentCode()).isEqualTo("20210088");
        assertThat(savedRecord.getEnrollment().getId()).isEqualTo(1001L);
        assertThat(savedRecord.getDeviceInfo()).isEqualTo("iPhone 15 Pro Max - Safari Mobile 17.4");
        assertThat(savedRecord.getCheckInTime()).isNotNull();

        // --- BƯỚC 6: Kiểm tra số lượng tham dự tăng lên realtime trên màn hình giảng viên ---
        assertThat(liveSession.getTotalAttendees()).isEqualTo(1);
        verify(sessionRepo, atLeastOnce()).save(liveSession);

        when(recordRepo.findBySessionIdWithStudent(999L)).thenReturn(simulatedRecords);
        AttendanceSessionResponse currentSessionState = qrAttendanceService.getCurrentSession("gv_hoangluong", 88L);
        assertThat(currentSessionState.totalAttendees()).isEqualTo(1);
        assertThat(currentSessionState.records()).hasSize(1);
        assertThat(currentSessionState.records().get(0).studentCode()).isEqualTo("20210088");
        assertThat(currentSessionState.records().get(0).studentName()).isEqualTo("Lê Minh Quân");
    }

    @Test
    @DisplayName("E2E-02: Anti-Proxy — Chụp màn hình gửi nhóm quá 15 giây (> 1 window) bị từ chối")
    void testE2E_AntiProxy_ScreenShotSharing_After15Seconds_Rejected() {
        when(sessionRepo.findById(999L)).thenReturn(Optional.of(liveSession));

        // Token sinh ra từ 2 chu kỳ trước (cũ hơn 30 giây)
        long expiredWindow = (System.currentTimeMillis() / 15000L) - 2;
        String payload = "999:88:" + expiredWindow;
        String signature = computeHmacSha256(payload, sessionSecret);
        String staleToken = "999.88." + expiredWindow + "." + signature;

        AttendanceCheckInRequest staleRequest = new AttendanceCheckInRequest(
                staleToken,
                "Samsung Galaxy S24 - Chrome Mobile"
        );

        assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv20210088", staleRequest))
                .isInstanceOf(InvalidQrException.class)
                .hasMessageContaining("Mã QR đã hết hạn");

        // Đảm bảo không có bản ghi nào bị ghi nhận sai
        verify(recordRepo, never()).save(any());
        assertThat(liveSession.getTotalAttendees()).isEqualTo(0);
    }

    @Test
    @DisplayName("E2E-03: Chống điểm danh trùng (Idempotency) — Sinh viên quét lại bị từ chối")
    void testE2E_DoubleCheckIn_WithinSameSession_ThrowsAlreadyCheckedIn() {
        long currentWindow = System.currentTimeMillis() / 15000L;
        String payload = "999:88:" + currentWindow;
        String signature = computeHmacSha256(payload, sessionSecret);
        String validToken = "999.88." + currentWindow + "." + signature;

        when(sessionRepo.findById(999L)).thenReturn(Optional.of(liveSession));
        when(studentProfileRepo.findByUserUsername("sv20210088")).thenReturn(Optional.of(mockStudent1));
        when(enrollmentRepo.findByClassSectionIdAndStudentId(88L, 301L)).thenReturn(Optional.of(mockEnrollment1));
        // Sinh viên đã có bản ghi trong session này
        when(recordRepo.existsBySessionIdAndStudentId(999L, 301L)).thenReturn(true);

        AttendanceCheckInRequest duplicateReq = new AttendanceCheckInRequest(validToken, "Mobile Device");

        assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv20210088", duplicateReq))
                .isInstanceOf(AttendanceAlreadyCheckedInException.class)
                .hasMessageContaining("Bạn đã điểm danh thành công phiên học này rồi");

        verify(recordRepo, never()).save(any());
    }

    @Test
    @DisplayName("E2E-04: Giảng viên kết thúc phiên (close-session) — Các lượt quét sau đó bị chặn ngay")
    void testE2E_CloseSession_BlocksFutureCheckIns() {
        when(lecturerProfileRepo.findByUserUsername("gv_hoangluong")).thenReturn(Optional.of(mockLecturer));
        when(classSectionRepo.findByIdAndLecturerId(88L, 10L)).thenReturn(Optional.of(mockSection));
        when(sessionRepo.findFirstByClassSectionIdAndStatusOrderByCreatedAtDesc(88L, "OPEN"))
                .thenReturn(Optional.of(liveSession));
        when(sessionRepo.save(any(AttendanceSession.class))).thenAnswer(inv -> inv.getArgument(0));

        // Giảng viên kết thúc phiên
        AttendanceSessionResponse closedResponse = qrAttendanceService.closeSession("gv_hoangluong", 88L);
        assertThat(closedResponse.status()).isEqualTo("CLOSED");
        assertThat(liveSession.getStatus()).isEqualTo("CLOSED");
        assertThat(liveSession.getClosedAt()).isNotNull();

        // Sinh viên quét vào phiên đã CLOSED -> ném InvalidQrException
        when(sessionRepo.findById(999L)).thenReturn(Optional.of(liveSession));
        long currentWindow = System.currentTimeMillis() / 15000L;
        String token = "999.88." + currentWindow + ".sig123";

        assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv20210088", new AttendanceCheckInRequest(token, "Phone")))
                .isInstanceOf(InvalidQrException.class)
                .hasMessageContaining("Phiên điểm danh này đã kết thúc hoặc bị đóng");
    }
}
