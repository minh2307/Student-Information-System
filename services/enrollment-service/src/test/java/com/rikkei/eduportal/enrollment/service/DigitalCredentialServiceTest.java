package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.CredentialVerificationResult;
import com.rikkei.eduportal.enrollment.dto.DigitalCredentialDto;
import com.rikkei.eduportal.enrollment.dto.SemesterProgressDto;
import com.rikkei.eduportal.enrollment.dto.StudentDashboardResponse;
import com.rikkei.eduportal.enrollment.entity.StudentProfile;
import com.rikkei.eduportal.enrollment.entity.User;
import com.rikkei.eduportal.enrollment.repository.StudentProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DigitalCredentialServiceTest {

    @Mock
    private StudentProfileRepository studentProfileRepo;

    @Mock
    private StudentDashboardService dashboardService;

    private DigitalCredentialService credentialService;

    private StudentProfile student;
    private User user;
    private StudentDashboardResponse dashboardResponse;

    @BeforeEach
    void setUp() {
        credentialService = new DigitalCredentialService(
                studentProfileRepo,
                dashboardService,
                "test-signing-secret-key-32bytes-len!!",
                "http://localhost:5173"
        );

        user = new User();
        user.setId(10L);
        user.setFullName("Nguyen Van A");
        user.setEmail("vana@rikkei.edu.vn");

        student = new StudentProfile();
        student.setId(1L);
        student.setStudentCode("SV2024001");
        student.setUser(user);

        SemesterProgressDto progress = new SemesterProgressDto();
        progress.setCurrentCgpa(java.math.BigDecimal.valueOf(8.75));
        progress.setCreditsEarned(84);
        progress.setAcademicStanding("Xuất sắc");

        dashboardResponse = new StudentDashboardResponse();
        dashboardResponse.setSemesterProgress(progress);
    }

    @Test
    @DisplayName("TC-CRED-01: Sinh bảng điểm số có chữ ký mật mã thành công")
    void testGenerateTranscriptCredential_Success() {
        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(dashboardService.getStudentDashboard("SV2024001")).thenReturn(dashboardResponse);

        DigitalCredentialDto credential = credentialService.generateTranscriptCredential("SV2024001");

        assertNotNull(credential);
        assertEquals("SV2024001", credential.getStudentCode());
        assertEquals("Nguyen Van A", credential.getFullName());
        assertEquals(8.75, credential.getCgpa());
        assertEquals(84, credential.getCreditsEarned());
        assertNotNull(credential.getSignature());
        assertTrue(credential.getSignature().length() >= 64);
        assertTrue(credential.getVerificationUrl().contains(credential.getSerial()));
        assertTrue(credential.getVerificationUrl().contains(credential.getSignature()));
    }

    @Test
    @DisplayName("TC-CRED-02: Xác thực bảng điểm hợp lệ thành công (Chính hãng 100%)")
    void testVerifyTranscriptCredential_ValidSignature_ReturnsTrue() {
        when(studentProfileRepo.findByUsernameOrStudentCode("SV2024001")).thenReturn(Optional.of(student));
        when(dashboardService.getStudentDashboard("SV2024001")).thenReturn(dashboardResponse);

        String serial = "RK-2025-SV2024001";
        String canonical = credentialService.buildCanonicalData(serial, "SV2024001", "Nguyen Van A", 8.75, 84);
        String validSig = credentialService.computeHmacSignature(canonical);

        CredentialVerificationResult result = credentialService.verifyTranscriptCredential(serial, validSig);

        assertNotNull(result);
        assertTrue(result.isValid());
        assertEquals(serial, result.getSerial());
        assertTrue(result.getMessage().contains("BẢNG ĐIỂM SỐ CHÍNH HÃNG"));
        assertNotNull(result.getCredential());
        assertEquals("Nguyen Van A", result.getCredential().getFullName());
    }

    @Test
    @DisplayName("TC-CRED-03: Phát hiện bảng điểm bị sửa đổi trái phép (Chữ ký không khớp)")
    void testVerifyTranscriptCredential_TamperedSignature_ReturnsFalse() {
        when(studentProfileRepo.findByUsernameOrStudentCode("SV2024001")).thenReturn(Optional.of(student));
        when(dashboardService.getStudentDashboard("SV2024001")).thenReturn(dashboardResponse);

        String serial = "RK-2025-SV2024001";
        String fakeSig = "deadbeef1234567890abcdefdeadbeef1234567890abcdefdeadbeef12345678";

        CredentialVerificationResult result = credentialService.verifyTranscriptCredential(serial, fakeSig);

        assertNotNull(result);
        assertFalse(result.isValid());
        assertTrue(result.getMessage().contains("CẢNH BÁO: Chữ ký số không hợp lệ"));
        assertNull(result.getCredential());
    }

    @Test
    @DisplayName("TC-CRED-04: Xác thực với mã Serial không tồn tại")
    void testVerifyTranscriptCredential_StudentNotFound_ReturnsFalse() {
        when(studentProfileRepo.findByUsernameOrStudentCode("SV9999999")).thenReturn(Optional.empty());

        CredentialVerificationResult result = credentialService.verifyTranscriptCredential(
                "RK-2025-SV9999999", "somesig");

        assertNotNull(result);
        assertFalse(result.isValid());
        assertTrue(result.getMessage().contains("Không tìm thấy hồ sơ sinh viên"));
    }

    @Test
    @DisplayName("TC-CRED-05: Xác thực với thông tin trống")
    void testVerifyTranscriptCredential_EmptyInput_ReturnsFalse() {
        CredentialVerificationResult result = credentialService.verifyTranscriptCredential("", "");
        assertNotNull(result);
        assertFalse(result.isValid());
        assertTrue(result.getMessage().contains("Thông tin xác thực không đầy đủ"));
    }
}
