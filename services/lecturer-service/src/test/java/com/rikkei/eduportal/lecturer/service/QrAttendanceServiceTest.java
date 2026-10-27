package com.rikkei.eduportal.lecturer.service;

import com.rikkei.eduportal.common.EnrollmentStatus;
import com.rikkei.eduportal.lecturer.dto.request.AttendanceCheckInRequest;
import com.rikkei.eduportal.lecturer.dto.request.StartAttendanceSessionRequest;
import com.rikkei.eduportal.lecturer.dto.response.AttendanceCheckInResponse;
import com.rikkei.eduportal.lecturer.dto.response.AttendanceSessionResponse;
import com.rikkei.eduportal.lecturer.dto.response.DynamicQrResponse;
import com.rikkei.eduportal.lecturer.entity.*;
import com.rikkei.eduportal.lecturer.exception.AccessDeniedException;
import com.rikkei.eduportal.lecturer.exception.AttendanceAlreadyCheckedInException;
import com.rikkei.eduportal.lecturer.exception.InvalidQrException;
import com.rikkei.eduportal.lecturer.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Test Suite: Dynamic Rotating QR Code Attendance (QrAttendanceService)")
class QrAttendanceServiceTest {

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
    private StudentProfile mockStudent;
    private User studentUser;
    private Enrollment mockEnrollment;
    private AttendanceSession mockSession;

    private final String sessionSecret = "mock_secret_key_1234567890abcdef";

    @BeforeEach
    void setUp() {
        lecturerUser = new User();
        lecturerUser.setId(1L);
        lecturerUser.setUsername("lecturer1");
        lecturerUser.setFullName("TS. Nguyễn Văn A");

        mockLecturer = new LecturerProfile();
        mockLecturer.setId(10L);
        mockLecturer.setUser(lecturerUser);

        mockCourse = new Course();
        mockCourse.setId(100L);
        mockCourse.setCourseCode("IT3010");
        mockCourse.setName("Lập trình nâng cao");

        mockSection = new ClassSection();
        mockSection.setId(50L);
        mockSection.setSectionCode("IT3010-01");
        mockSection.setCourse(mockCourse);
        mockSection.setLecturer(mockLecturer);

        studentUser = new User();
        studentUser.setId(2L);
        studentUser.setUsername("sv20210001");
        studentUser.setFullName("Trần Sinh Viên");

        mockStudent = new StudentProfile();
        mockStudent.setId(20L);
        mockStudent.setStudentCode("20210001");
        mockStudent.setUser(studentUser);

        mockEnrollment = new Enrollment();
        mockEnrollment.setId(500L);
        mockEnrollment.setClassSection(mockSection);
        mockEnrollment.setStudent(mockStudent);
        mockEnrollment.setStatus(EnrollmentStatus.REGISTERED);

        mockSession = new AttendanceSession(mockSection, mockLecturer, "Điểm danh tuần 5", sessionSecret);
        mockSession.setId(1L);
        mockSession.setStatus("OPEN");
        mockSession.setStepSeconds(15);
    }

    private String computeHmac(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    @DisplayName("TC-QR-01: Giảng viên khởi tạo phiên điểm danh thành công với secret ngẫu nhiên và step 15s")
    void testStartSession_success() {
        when(lecturerProfileRepo.findByUserUsername("lecturer1")).thenReturn(Optional.of(mockLecturer));
        when(classSectionRepo.findByIdAndLecturerId(50L, 10L)).thenReturn(Optional.of(mockSection));
        when(sessionRepo.findFirstByClassSectionIdAndStatusOrderByCreatedAtDesc(50L, "OPEN")).thenReturn(Optional.empty());
        when(sessionRepo.save(any(AttendanceSession.class))).thenAnswer(invocation -> {
            AttendanceSession s = invocation.getArgument(0);
            s.setId(1L);
            return s;
        });

        StartAttendanceSessionRequest request = new StartAttendanceSessionRequest("Điểm danh Lab 3");
        AttendanceSessionResponse res = qrAttendanceService.startSession("lecturer1", 50L, request);

        assertThat(res).isNotNull();
        assertThat(res.sessionId()).isEqualTo(1L);
        assertThat(res.sectionCode()).isEqualTo("IT3010-01");
        assertThat(res.status()).isEqualTo("OPEN");
        assertThat(res.stepSeconds()).isEqualTo(15);
        verify(sessionRepo, times(1)).save(any(AttendanceSession.class));
    }

    @Test
    @DisplayName("TC-QR-02: Giảng viên lấy mã QR động hợp lệ theo chu kỳ 15s")
    void testGetRotatingQrCode_success() {
        when(lecturerProfileRepo.findByUserUsername("lecturer1")).thenReturn(Optional.of(mockLecturer));
        when(classSectionRepo.findByIdAndLecturerId(50L, 10L)).thenReturn(Optional.of(mockSection));
        when(sessionRepo.findFirstByClassSectionIdAndStatusOrderByCreatedAtDesc(50L, "OPEN"))
                .thenReturn(Optional.of(mockSession));

        DynamicQrResponse res = qrAttendanceService.getRotatingQrCode("lecturer1", 50L);

        assertThat(res).isNotNull();
        assertThat(res.sessionId()).isEqualTo(1L);
        assertThat(res.sectionId()).isEqualTo(50L);
        assertThat(res.qrToken()).isNotBlank();
        assertThat(res.stepSeconds()).isEqualTo(15);
        assertThat(res.remainingSeconds()).isBetween(1L, 15L);

        // Verify token structure: sessionId.sectionId.window.signature
        String[] parts = res.qrToken().split("\\.");
        assertThat(parts).hasSize(4);
        assertThat(parts[0]).isEqualTo("1");
        assertThat(parts[1]).isEqualTo("50");
    }

    @Test
    @DisplayName("TC-QR-03: Sinh viên quét mã QR hợp lệ trong khoảng thời gian cho phép điểm danh thành công")
    void testStudentCheckIn_success() {
        long currentWindow = System.currentTimeMillis() / 15000L;
        String payload = "1:50:" + currentWindow;
        String validSignature = computeHmac(payload, sessionSecret);
        String validQrToken = "1.50." + currentWindow + "." + validSignature;

        when(sessionRepo.findById(1L)).thenReturn(Optional.of(mockSession));
        when(studentProfileRepo.findByUserUsername("sv20210001")).thenReturn(Optional.of(mockStudent));
        when(enrollmentRepo.findByClassSectionIdAndStudentId(50L, 20L)).thenReturn(Optional.of(mockEnrollment));
        when(recordRepo.existsBySessionIdAndStudentId(1L, 20L)).thenReturn(false);

        AttendanceCheckInRequest request = new AttendanceCheckInRequest(validQrToken, "Chrome/Linux");
        AttendanceCheckInResponse res = qrAttendanceService.studentCheckIn("sv20210001", request);

        assertThat(res).isNotNull();
        assertThat(res.sessionId()).isEqualTo(1L);
        assertThat(res.studentCode()).isEqualTo("20210001");
        assertThat(res.studentName()).isEqualTo("Trần Sinh Viên");
        assertThat(res.courseName()).isEqualTo("Lập trình nâng cao");

        verify(recordRepo, times(1)).save(any(AttendanceRecord.class));
        verify(sessionRepo, times(1)).save(mockSession);
        assertThat(mockSession.getTotalAttendees()).isEqualTo(1);
    }

    @Test
    @DisplayName("TC-QR-04: Từ chối điểm danh khi mã QR đã hết hạn (> 30s)")
    void testStudentCheckIn_expiredToken_throwsException() {
        long expiredWindow = (System.currentTimeMillis() / 15000L) - 5; // 5 chu kỳ trước (75 giây trước)
        String payload = "1:50:" + expiredWindow;
        String sig = computeHmac(payload, sessionSecret);
        String expiredToken = "1.50." + expiredWindow + "." + sig;

        when(sessionRepo.findById(1L)).thenReturn(Optional.of(mockSession));

        AttendanceCheckInRequest request = new AttendanceCheckInRequest(expiredToken, "iPhone Safari");

        assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv20210001", request))
                .isInstanceOf(InvalidQrException.class)
                .hasMessageContaining("Mã QR đã hết hạn");

        verify(recordRepo, never()).save(any());
    }

    @Test
    @DisplayName("TC-QR-05: Từ chối điểm danh khi token bị can thiệp chữ ký sai (HMAC mismatch)")
    void testStudentCheckIn_tamperedSignature_throwsException() {
        long currentWindow = System.currentTimeMillis() / 15000L;
        String fakeToken = "1.50." + currentWindow + ".fake_signature_9999999999";

        when(sessionRepo.findById(1L)).thenReturn(Optional.of(mockSession));

        AttendanceCheckInRequest request = new AttendanceCheckInRequest(fakeToken, "Android Chrome");

        assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv20210001", request))
                .isInstanceOf(InvalidQrException.class)
                .hasMessageContaining("Mã QR không hợp lệ hoặc đã bị can thiệp");

        verify(recordRepo, never()).save(any());
    }

    @Test
    @DisplayName("TC-QR-06: Từ chối điểm danh nếu sinh viên không đăng ký môn học này")
    void testStudentCheckIn_studentNotEnrolled_throwsAccessDenied() {
        long currentWindow = System.currentTimeMillis() / 15000L;
        String payload = "1:50:" + currentWindow;
        String sig = computeHmac(payload, sessionSecret);
        String validQrToken = "1.50." + currentWindow + "." + sig;

        when(sessionRepo.findById(1L)).thenReturn(Optional.of(mockSession));
        when(studentProfileRepo.findByUserUsername("sv20210001")).thenReturn(Optional.of(mockStudent));
        when(enrollmentRepo.findByClassSectionIdAndStudentId(50L, 20L)).thenReturn(Optional.empty());

        AttendanceCheckInRequest request = new AttendanceCheckInRequest(validQrToken, "Device");

        assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv20210001", request))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Bạn không thuộc danh sách sinh viên lớp học phần này");

        verify(recordRepo, never()).save(any());
    }

    @Test
    @DisplayName("TC-QR-07: Từ chối điểm danh khi sinh viên cố tình điểm danh lại lần 2 (chống duplicate)")
    void testStudentCheckIn_duplicateCheckIn_throwsConflict() {
        long currentWindow = System.currentTimeMillis() / 15000L;
        String payload = "1:50:" + currentWindow;
        String sig = computeHmac(payload, sessionSecret);
        String validQrToken = "1.50." + currentWindow + "." + sig;

        when(sessionRepo.findById(1L)).thenReturn(Optional.of(mockSession));
        when(studentProfileRepo.findByUserUsername("sv20210001")).thenReturn(Optional.of(mockStudent));
        when(enrollmentRepo.findByClassSectionIdAndStudentId(50L, 20L)).thenReturn(Optional.of(mockEnrollment));
        when(recordRepo.existsBySessionIdAndStudentId(1L, 20L)).thenReturn(true);

        AttendanceCheckInRequest request = new AttendanceCheckInRequest(validQrToken, "Device");

        assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv20210001", request))
                .isInstanceOf(AttendanceAlreadyCheckedInException.class)
                .hasMessageContaining("Bạn đã điểm danh thành công phiên học này rồi");

        verify(recordRepo, never()).save(any());
    }

    @Test
    @DisplayName("TC-QR-08: Giảng viên đóng phiên điểm danh và từ chối mọi lượt quét sau khi đóng")
    void testCloseSession_success() {
        when(lecturerProfileRepo.findByUserUsername("lecturer1")).thenReturn(Optional.of(mockLecturer));
        when(classSectionRepo.findByIdAndLecturerId(50L, 10L)).thenReturn(Optional.of(mockSection));
        when(sessionRepo.findFirstByClassSectionIdAndStatusOrderByCreatedAtDesc(50L, "OPEN"))
                .thenReturn(Optional.of(mockSession));
        when(sessionRepo.save(any(AttendanceSession.class))).thenReturn(mockSession);
        when(recordRepo.findBySessionIdWithStudent(1L)).thenReturn(List.of());

        AttendanceSessionResponse res = qrAttendanceService.closeSession("lecturer1", 50L);

        assertThat(res.status()).isEqualTo("CLOSED");
        assertThat(mockSession.getStatus()).isEqualTo("CLOSED");
        assertThat(mockSession.getClosedAt()).isNotNull();

        // Check-in on closed session throws InvalidQrException
        long currentWindow = System.currentTimeMillis() / 15000L;
        String token = "1.50." + currentWindow + ".sig";
        when(sessionRepo.findById(1L)).thenReturn(Optional.of(mockSession));

        assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv20210001", new AttendanceCheckInRequest(token, "dev")))
                .isInstanceOf(InvalidQrException.class)
                .hasMessageContaining("Phiên điểm danh này đã kết thúc hoặc bị đóng");
    }

    @Test
    @DisplayName("TC-QR-09: Từ chối token sai format hoặc rỗng")
    void testStudentCheckIn_malformedToken_throwsInvalidQr() {
        assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv20210001", new AttendanceCheckInRequest("", "dev")))
                .isInstanceOf(InvalidQrException.class);

        assertThatThrownBy(() -> qrAttendanceService.studentCheckIn("sv20210001", new AttendanceCheckInRequest("invalid.token", "dev")))
                .isInstanceOf(InvalidQrException.class);
    }
}
