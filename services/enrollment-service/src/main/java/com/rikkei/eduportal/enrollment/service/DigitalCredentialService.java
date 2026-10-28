package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.CredentialVerificationResult;
import com.rikkei.eduportal.enrollment.dto.DigitalCredentialDto;
import com.rikkei.eduportal.enrollment.dto.StudentDashboardResponse;
import com.rikkei.eduportal.enrollment.entity.StudentProfile;
import com.rikkei.eduportal.enrollment.entity.User;
import com.rikkei.eduportal.enrollment.repository.StudentProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;

@Service
public class DigitalCredentialService {

    private static final Logger log = LoggerFactory.getLogger(DigitalCredentialService.class);

    private static final String DEFAULT_SECRET = "rikkei-eduportal-digital-credential-master-hmac-key-2025-v1";
    private static final String ISSUER_NAME = "Học Viện Công Nghệ Rikkei (Rikkei Academy of Technology)";

    private final StudentProfileRepository studentProfileRepo;
    private final StudentDashboardService dashboardService;
    private final String signingSecret;
    private final String portalBaseUrl;

    public DigitalCredentialService(
            StudentProfileRepository studentProfileRepo,
            StudentDashboardService dashboardService,
            @Value("${app.credentials.secret:" + DEFAULT_SECRET + "}") String signingSecret,
            @Value("${app.portal.base-url:http://localhost:5173}") String portalBaseUrl) {
        this.studentProfileRepo = studentProfileRepo;
        this.dashboardService = dashboardService;
        this.signingSecret = signingSecret;
        this.portalBaseUrl = portalBaseUrl;
    }

    /**
     * Sinh bảng điểm số có gắn chữ ký mật mã chống giả mạo (Verifiable Digital Transcript)
     */
    public DigitalCredentialDto generateTranscriptCredential(String studentIdentifier) {
        StudentProfile student = dashboardService.resolveStudent(studentIdentifier);
        User user = student.getUser();
        StudentDashboardResponse dashboard = dashboardService.getStudentDashboard(student.getStudentCode());

        int year = LocalDateTime.now().getYear();
        String serial = "RK-" + year + "-" + student.getStudentCode().toUpperCase();

        Double cgpa = (dashboard.getSemesterProgress() != null && dashboard.getSemesterProgress().getCurrentCgpa() != null)
                ? dashboard.getSemesterProgress().getCurrentCgpa().doubleValue() : 8.50;
        Integer credits = dashboard.getSemesterProgress() != null
                ? dashboard.getSemesterProgress().getCreditsEarned() : 84;
        String standing = dashboard.getSemesterProgress() != null
                ? dashboard.getSemesterProgress().getAcademicStanding() : "Giỏi";

        String canonicalData = buildCanonicalData(serial, student.getStudentCode(),
                user != null ? user.getFullName() : student.getStudentCode(), cgpa, credits);

        String signature = computeHmacSignature(canonicalData);
        String verificationUrl = portalBaseUrl + "/verify/transcript?serial=" + serial + "&sig=" + signature;

        DigitalCredentialDto dto = new DigitalCredentialDto();
        dto.setSerial(serial);
        dto.setStudentCode(student.getStudentCode());
        dto.setFullName(user != null ? user.getFullName() : student.getStudentCode());
        dto.setEmail(user != null ? user.getEmail() : "");
        dto.setMajor("Kỹ nghệ Phần mềm (Software Engineering)");
        dto.setCgpa(cgpa);
        dto.setCreditsEarned(credits);
        dto.setTotalRequiredCredits(135);
        dto.setAcademicStanding(standing);
        dto.setIssuedAt(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        dto.setIssuer(ISSUER_NAME);
        dto.setSignature(signature);
        dto.setVerificationUrl(verificationUrl);
        dto.setStatus("VALID");

        log.info("Generated verifiable digital credential {} for student {}", serial, student.getStudentCode());
        return dto;
    }

    /**
     * Xác thực công khai tính hợp lệ và toàn vẹn của Bảng điểm số
     */
    public CredentialVerificationResult verifyTranscriptCredential(String serial, String signature) {
        String nowStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

        if (serial == null || serial.trim().isEmpty() || signature == null || signature.trim().isEmpty()) {
            return new CredentialVerificationResult(false, serial,
                    "Thông tin xác thực không đầy đủ (Thiếu mã Serial hoặc Chữ ký mật mã).", null, nowStr);
        }

        // Serial format: RK-2025-SV2024001
        String[] parts = serial.trim().split("-");
        if (parts.length < 3) {
            return new CredentialVerificationResult(false, serial,
                    "Định dạng mã chứng thực số không hợp lệ.", null, nowStr);
        }

        String studentCode = parts[parts.length - 1];
        StudentProfile student = studentProfileRepo.findByUsernameOrStudentCode(studentCode)
                .orElse(null);

        if (student == null) {
            return new CredentialVerificationResult(false, serial,
                    "Không tìm thấy hồ sơ sinh viên tương ứng với mã chứng chỉ này trong cơ sở dữ liệu học viện.", null, nowStr);
        }

        User user = student.getUser();
        StudentDashboardResponse dashboard = dashboardService.getStudentDashboard(student.getStudentCode());

        Double cgpa = (dashboard.getSemesterProgress() != null && dashboard.getSemesterProgress().getCurrentCgpa() != null)
                ? dashboard.getSemesterProgress().getCurrentCgpa().doubleValue() : 8.50;
        Integer credits = dashboard.getSemesterProgress() != null
                ? dashboard.getSemesterProgress().getCreditsEarned() : 84;
        String standing = dashboard.getSemesterProgress() != null
                ? dashboard.getSemesterProgress().getAcademicStanding() : "Giỏi";

        String expectedCanonical = buildCanonicalData(serial.trim(), student.getStudentCode(),
                user != null ? user.getFullName() : student.getStudentCode(), cgpa, credits);

        String expectedSignature = computeHmacSignature(expectedCanonical);

        // Constant-time comparison to prevent timing attacks
        boolean matches = MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.UTF_8),
                signature.trim().getBytes(StandardCharsets.UTF_8)
        );

        if (!matches) {
            log.warn("Credential verification failed: Signature mismatch for serial {}", serial);
            return new CredentialVerificationResult(false, serial,
                    "CẢNH BÁO: Chữ ký số không hợp lệ! Dữ liệu bảng điểm đã bị chỉnh sửa hoặc giả mạo.", null, nowStr);
        }

        DigitalCredentialDto dto = new DigitalCredentialDto();
        dto.setSerial(serial);
        dto.setStudentCode(student.getStudentCode());
        dto.setFullName(user != null ? user.getFullName() : student.getStudentCode());
        dto.setEmail(user != null ? user.getEmail() : "");
        dto.setMajor("Kỹ nghệ Phần mềm (Software Engineering)");
        dto.setCgpa(cgpa);
        dto.setCreditsEarned(credits);
        dto.setTotalRequiredCredits(135);
        dto.setAcademicStanding(standing);
        dto.setIssuedAt(nowStr);
        dto.setIssuer(ISSUER_NAME);
        dto.setSignature(signature);
        dto.setVerificationUrl(portalBaseUrl + "/verify/transcript?serial=" + serial + "&sig=" + signature);
        dto.setStatus("VALID");

        return new CredentialVerificationResult(true, serial,
                "BẢNG ĐIỂM SỐ CHÍNH HÃNG: Toàn bộ thông tin học vụ đã được đối soát và xác thực chữ ký mật mã toàn vẹn bởi Học Viện Công Nghệ Rikkei.",
                dto, nowStr);
    }

    public String buildCanonicalData(String serial, String studentCode, String fullName, Double cgpa, Integer credits) {
        return String.format("SERIAL=%s|CODE=%s|NAME=%s|CGPA=%.2f|CREDITS=%d",
                serial.trim().toUpperCase(),
                studentCode.trim().toUpperCase(),
                fullName != null ? fullName.trim() : "",
                cgpa != null ? cgpa : 0.0,
                credits != null ? credits : 0);
    }

    public String computeHmacSignature(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(signingSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            throw new RuntimeException("Lỗi sinh chữ ký số HMAC: " + ex.getMessage(), ex);
        }
    }
}
