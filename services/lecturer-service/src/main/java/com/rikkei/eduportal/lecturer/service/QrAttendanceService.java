package com.rikkei.eduportal.lecturer.service;

import com.rikkei.eduportal.common.EnrollmentStatus;
import com.rikkei.eduportal.common.SectionStatus;
import com.rikkei.eduportal.lecturer.dto.request.AttendanceCheckInRequest;
import com.rikkei.eduportal.lecturer.dto.request.StartAttendanceSessionRequest;
import com.rikkei.eduportal.lecturer.dto.response.*;
import com.rikkei.eduportal.lecturer.entity.*;
import com.rikkei.eduportal.lecturer.exception.*;
import com.rikkei.eduportal.lecturer.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.EnumMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.imageio.ImageIO;

/**
 * [TASK-D02-LUONG] Dịch vụ quản lý luồng Điểm danh Mã QR Động TOTP xoay vòng 15 giây.
 * Hỗ trợ toàn bộ quy trình E2E: Giảng viên mở phiên chiếu mã QR -> Sinh viên quét camera mobile
 * thời gian thực -> Xác thực TOTP HMAC-SHA256 & lưu bản ghi vào attendance_records.
 */
@Service
@Transactional(readOnly = true)
public class QrAttendanceService {

    private static final Logger log = LoggerFactory.getLogger(QrAttendanceService.class);
    public static final int DEFAULT_STEP_SECONDS = 15;
    public static final int DEFAULT_MAX_DRIFT_WINDOWS = 2; // Dung sai chênh lệch đồng hồ ±15s đến 30s (tối đa 2 chu kỳ)

    @Value("${attendance.totp.step-seconds:15}")
    private int defaultStepSeconds = DEFAULT_STEP_SECONDS;

    @Value("${attendance.totp.max-drift-windows:2}")
    private int maxDriftWindows = DEFAULT_MAX_DRIFT_WINDOWS;

    private final AttendanceSessionRepository sessionRepo;
    private final AttendanceRecordRepository recordRepo;
    private final ClassSectionRepository classSectionRepo;
    private final LecturerProfileRepository lecturerProfileRepo;
    private final StudentProfileRepository studentProfileRepo;
    private final EnrollmentRepository enrollmentRepo;

    public QrAttendanceService(AttendanceSessionRepository sessionRepo,
                               AttendanceRecordRepository recordRepo,
                               ClassSectionRepository classSectionRepo,
                               LecturerProfileRepository lecturerProfileRepo,
                               StudentProfileRepository studentProfileRepo,
                               EnrollmentRepository enrollmentRepo) {
        this.sessionRepo = sessionRepo;
        this.recordRepo = recordRepo;
        this.classSectionRepo = classSectionRepo;
        this.lecturerProfileRepo = lecturerProfileRepo;
        this.studentProfileRepo = studentProfileRepo;
        this.enrollmentRepo = enrollmentRepo;
    }

    public int getMaxDriftWindows() {
        return maxDriftWindows;
    }

    public void setMaxDriftWindows(int maxDriftWindows) {
        this.maxDriftWindows = maxDriftWindows;
    }

    public int getDefaultStepSeconds() {
        return defaultStepSeconds;
    }

    public void setDefaultStepSeconds(int defaultStepSeconds) {
        this.defaultStepSeconds = defaultStepSeconds;
    }

    /**
     * Bắt đầu một phiên điểm danh QR động mới cho lớp học phần.
     * Nếu đang có phiên OPEN, tự động đóng trước khi mở phiên mới.
     */
    @Transactional
    public AttendanceSessionResponse startSession(String lecturerUsername, Long sectionId, StartAttendanceSessionRequest request) {
        LecturerProfile lecturer = resolveLecturer(lecturerUsername);
        ClassSection classSection = resolveSection(sectionId, lecturer.getId());

        // Đóng các phiên đang mở trước đó của lớp này
        sessionRepo.findFirstByClassSectionIdAndStatusOrderByCreatedAtDesc(sectionId, "OPEN")
                .ifPresent(active -> {
                    active.setStatus("CLOSED");
                    active.setClosedAt(LocalDateTime.now());
                    sessionRepo.save(active);
                    log.info("Closed previous active attendance session id={} for sectionId={}", active.getId(), sectionId);
                });

        String sessionName = (request != null && request.sessionName() != null && !request.sessionName().isBlank())
                ? request.sessionName().trim()
                : "Điểm danh " + LocalDateTime.now().toLocalDate();

        String secret = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");

        AttendanceSession session = new AttendanceSession(classSection, lecturer, sessionName, secret);
        session.setStepSeconds(DEFAULT_STEP_SECONDS);
        AttendanceSession saved = sessionRepo.save(session);

        log.info("Started new attendance session id={} for sectionCode={} by lecturer={}",
                saved.getId(), classSection.getSectionCode(), lecturerUsername);

        return toSessionResponse(saved, List.of());
    }

    /**
     * Lấy token QR động hiện tại (thay đổi theo mỗi chu kỳ 15s - TOTP-like).
     */
    public DynamicQrResponse getRotatingQrCode(String lecturerUsername, Long sectionId) {
        LecturerProfile lecturer = resolveLecturer(lecturerUsername);
        ClassSection classSection = resolveSection(sectionId, lecturer.getId());

        AttendanceSession session = sessionRepo.findFirstByClassSectionIdAndStatusOrderByCreatedAtDesc(sectionId, "OPEN")
                .orElseThrow(() -> new ResourceNotFoundException("Không có phiên điểm danh nào đang mở cho lớp học phần này."));

        int stepSeconds = session.getStepSeconds() > 0 ? session.getStepSeconds() : DEFAULT_STEP_SECONDS;
        long nowMs = System.currentTimeMillis();
        long stepMs = stepSeconds * 1000L;
        long currentWindow = nowMs / stepMs;
        long remainingSeconds = stepSeconds - ((nowMs / 1000L) % stepSeconds);
        long expiresAtEpochMs = (currentWindow + 1) * stepMs;

        String payload = session.getId() + ":" + classSection.getId() + ":" + currentWindow;
        String signature = computeHmacSha256(payload, session.getSessionSecret());

        String qrToken = session.getId() + "." + classSection.getId() + "." + currentWindow + "." + signature;

        String qrImageBase64 = generateQrImageBase64(qrToken);

        return new DynamicQrResponse(
                session.getId(),
                classSection.getId(),
                qrToken,
                qrImageBase64,
                stepSeconds,
                remainingSeconds,
                expiresAtEpochMs
        );
    }

    /**
     * Lấy thông tin phiên điểm danh hiện tại và danh sách sinh viên đã điểm danh.
     */
    public AttendanceSessionResponse getCurrentSession(String lecturerUsername, Long sectionId) {
        LecturerProfile lecturer = resolveLecturer(lecturerUsername);
        resolveSection(sectionId, lecturer.getId());

        AttendanceSession session = sessionRepo.findFirstByClassSectionIdAndStatusOrderByCreatedAtDesc(sectionId, "OPEN")
                .or(() -> sessionRepo.findByClassSectionIdOrderByCreatedAtDesc(sectionId).stream().findFirst())
                .orElseThrow(() -> new ResourceNotFoundException("Chưa có phiên điểm danh nào cho lớp học phần này."));

        List<AttendanceRecord> records = recordRepo.findBySessionIdWithStudent(session.getId());
        List<AttendanceRecordResponse> recordResponses = records.stream()
                .map(r -> new AttendanceRecordResponse(
                        r.getId(),
                        r.getStudent().getStudentCode(),
                        r.getStudent().getUser().getFullName(),
                        r.getCheckInTime(),
                        r.getDeviceInfo()
                ))
                .toList();

        return toSessionResponse(session, recordResponses);
    }

    /**
     * Đóng phiên điểm danh.
     */
    @Transactional
    public AttendanceSessionResponse closeSession(String lecturerUsername, Long sectionId) {
        LecturerProfile lecturer = resolveLecturer(lecturerUsername);
        resolveSection(sectionId, lecturer.getId());

        AttendanceSession session = sessionRepo.findFirstByClassSectionIdAndStatusOrderByCreatedAtDesc(sectionId, "OPEN")
                .orElseThrow(() -> new ResourceNotFoundException("Không có phiên điểm danh nào đang mở cần đóng."));

        session.setStatus("CLOSED");
        session.setClosedAt(LocalDateTime.now());
        AttendanceSession saved = sessionRepo.save(session);

        List<AttendanceRecord> records = recordRepo.findBySessionIdWithStudent(saved.getId());
        List<AttendanceRecordResponse> recordResponses = records.stream()
                .map(r -> new AttendanceRecordResponse(
                        r.getId(),
                        r.getStudent().getStudentCode(),
                        r.getStudent().getUser().getFullName(),
                        r.getCheckInTime(),
                        r.getDeviceInfo()
                ))
                .toList();

        log.info("Closed attendance session id={} with {} attendees", saved.getId(), saved.getTotalAttendees());
        return toSessionResponse(saved, recordResponses);
    }

    /**
     * Sinh viên quét QR code điểm danh.
     * Xác thực:
     * 1. Cấu trúc token (sessionId.sectionId.timeWindow.signature) & xử lý chuỗi an toàn
     * 2. Kiểm tra tính hợp lệ của buổi học đang mở (Session status OPEN, Section active, không quá 12h)
     * 3. Nới lỏng Time Drift TOTP (dung sai chênh lệch đồng hồ ±15s đến 30s) & Đồng bộ Clock Mobile
     * 4. Tính toàn vẹn của chữ ký HMAC-SHA256
     * 5. Sinh viên có đăng ký (REGISTERED) lớp học phần này hay không
     * 6. Xử lý chặn điểm danh trùng (Idempotent 409 Conflict & Race condition)
     */
    @Transactional
    public AttendanceCheckInResponse studentCheckIn(String studentUsername, AttendanceCheckInRequest request) {
        if (request == null || request.qrToken() == null || request.qrToken().isBlank()) {
            throw new InvalidQrException("Mã QR không hợp lệ.");
        }

        String rawToken = request.qrToken().trim();
        if ((rawToken.startsWith("\"") && rawToken.endsWith("\"")) ||
            (rawToken.startsWith("'") && rawToken.endsWith("'"))) {
            rawToken = rawToken.substring(1, rawToken.length() - 1).trim();
        }

        String[] parts = rawToken.split("\\.");
        if (parts.length != 4) {
            throw new InvalidQrException("Định dạng mã QR không đúng cấu trúc điểm danh.");
        }

        Long sessionId;
        Long sectionId;
        long tokenWindow;
        String providedSignature = parts[3].trim();

        try {
            sessionId = Long.parseLong(parts[0].trim());
            sectionId = Long.parseLong(parts[1].trim());
            tokenWindow = Long.parseLong(parts[2].trim());
        } catch (NumberFormatException e) {
            throw new InvalidQrException("Thông số mã QR không hợp lệ.");
        }

        // 1. Kiểm tra tính hợp lệ của buổi học đang mở (Session & ClassSection)
        AttendanceSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiên điểm danh."));

        if (!"OPEN".equalsIgnoreCase(session.getStatus()) || session.getClosedAt() != null) {
            throw new InvalidQrException("Phiên điểm danh này đã kết thúc hoặc bị đóng.");
        }

        if (session.getClassSection() == null || !session.getClassSection().getId().equals(sectionId)) {
            throw new InvalidQrException("Mã QR không khớp với lớp học phần của phiên điểm danh.");
        }

        if (session.getClassSection().getStatus() == SectionStatus.CANCELLED) {
            throw new InvalidQrException("Lớp học phần đã bị hủy, không thể điểm danh.");
        }

        // Tự động đóng phiên nếu mở quá 12 giờ
        if (session.getCreatedAt() != null && session.getCreatedAt().isBefore(LocalDateTime.now().minusHours(12))) {
            session.setStatus("CLOSED");
            session.setClosedAt(LocalDateTime.now());
            sessionRepo.save(session);
            throw new InvalidQrException("Phiên điểm danh đã quá hạn thời gian cho phép và đã tự động đóng.");
        }

        // 2. Nới lỏng dung sai chênh lệch đồng hồ (Time Drift Window ±15s đến 30s) & Đồng bộ Clock Mobile
        int stepSeconds = (session.getStepSeconds() != null && session.getStepSeconds() > 0)
                ? session.getStepSeconds()
                : defaultStepSeconds;
        long nowMs = System.currentTimeMillis();
        long nowWindow = nowMs / (stepSeconds * 1000L);
        long windowDiff = Math.abs(nowWindow - tokenWindow);
        int allowedDriftWindows = Math.max(1, maxDriftWindows);

        if (windowDiff > allowedDriftWindows) {
            long driftSeconds = windowDiff * stepSeconds;
            log.warn("Expired QR token: nowWindow={}, tokenWindow={}, diff={}, driftSeconds={}s, maxDriftWindows={} (±{}s)",
                    nowWindow, tokenWindow, windowDiff, driftSeconds, allowedDriftWindows, allowedDriftWindows * stepSeconds);
            throw new InvalidQrException("Mã QR đã hết hạn. Vui lòng quét mã QR mới đang hiển thị trên màn hình.");
        }

        // Ghi nhận đồng bộ clock mobile nếu client gửi clientTimestampMs
        if (request.clientTimestampMs() != null) {
            long mobileClockDriftMs = nowMs - request.clientTimestampMs();
            if (Math.abs(mobileClockDriftMs) > 15000) {
                log.info("Detected mobile clock drift: {} ms for student: {} (device={})",
                        mobileClockDriftMs, studentUsername, request.deviceInfo());
            }
        }

        // 3. Xác thực chữ ký HMAC-SHA256
        String payload = sessionId + ":" + sectionId + ":" + tokenWindow;
        String expectedSignature = computeHmacSha256(payload, session.getSessionSecret());

        if (!MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.UTF_8),
                providedSignature.getBytes(StandardCharsets.UTF_8))) {
            log.warn("Invalid QR signature for session id={}", sessionId);
            throw new InvalidQrException("Mã QR không hợp lệ hoặc đã bị can thiệp trái phép.");
        }

        // 4. Xác thực sinh viên
        StudentProfile student = studentProfileRepo.findByUserUsername(studentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ sinh viên cho tài khoản: " + studentUsername));

        // 5. Kiểm tra sinh viên có trong lớp học phần không
        Enrollment enrollment = enrollmentRepo.findByClassSectionIdAndStudentId(sectionId, student.getId())
                .orElseThrow(() -> new AccessDeniedException("Bạn không thuộc danh sách sinh viên lớp học phần này."));

        if (enrollment.getStatus() != EnrollmentStatus.REGISTERED) {
            throw new AccessDeniedException("Trạng thái đăng ký môn học của bạn không hợp lệ để điểm danh (" + enrollment.getStatus() + ").");
        }

        // 6. Xử lý chặn điểm danh trùng (Idempotent 409 Conflict & Race Condition)
        if (recordRepo.existsBySessionIdAndStudentId(session.getId(), student.getId())) {
            throw new AttendanceAlreadyCheckedInException("Bạn đã điểm danh thành công phiên học này rồi.");
        }

        // 7. Ghi nhận điểm danh
        AttendanceRecord record = new AttendanceRecord(
                session,
                enrollment,
                student,
                request.deviceInfo() != null ? request.deviceInfo().trim() : "Unknown Device"
        );

        try {
            recordRepo.save(record);
        } catch (DataIntegrityViolationException e) {
            log.warn("Concurrent duplicate attendance detected for session id={} student={}", session.getId(), student.getStudentCode());
            throw new AttendanceAlreadyCheckedInException("Bạn đã điểm danh thành công phiên học này rồi.");
        }

        int currentAttendees = session.getTotalAttendees() != null ? session.getTotalAttendees() : 0;
        session.setTotalAttendees(currentAttendees + 1);
        sessionRepo.save(session);

        log.info("Student {} ({}) checked in successfully for session {} in class {}",
                student.getStudentCode(), student.getUser().getFullName(), session.getId(), session.getClassSection().getSectionCode());

        return new AttendanceCheckInResponse(
                session.getId(),
                sectionId,
                session.getClassSection().getSectionCode(),
                session.getClassSection().getCourse().getName(),
                student.getStudentCode(),
                student.getUser().getFullName(),
                record.getCheckInTime(),
                "Điểm danh thành công lúc " + record.getCheckInTime().toLocalTime()
        );
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private LecturerProfile resolveLecturer(String username) {
        return lecturerProfileRepo.findByUserUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giảng viên với username: " + username));
    }

    private ClassSection resolveSection(Long sectionId, Long lecturerId) {
        return classSectionRepo.findByIdAndLecturerId(sectionId, lecturerId)
                .orElseThrow(() -> new AccessDeniedException("Giảng viên không có quyền quản lý lớp học phần id: " + sectionId));
    }

    private AttendanceSessionResponse toSessionResponse(AttendanceSession session, List<AttendanceRecordResponse> records) {
        return new AttendanceSessionResponse(
                session.getId(),
                session.getClassSection().getId(),
                session.getClassSection().getSectionCode(),
                session.getClassSection().getCourse().getName(),
                session.getSessionName(),
                session.getStatus(),
                session.getStepSeconds(),
                session.getTotalAttendees(),
                session.getCreatedAt(),
                session.getClosedAt(),
                records
        );
    }

    private String generateQrImageBase64(String content) {
        try {
            Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
            hints.put(EncodeHintType.MARGIN, 2);
            hints.put(EncodeHintType.ERROR_CORRECTION, com.google.zxing.qrcode.decoder.ErrorCorrectionLevel.M);

            QRCodeWriter qrWriter = new QRCodeWriter();
            BitMatrix matrix = qrWriter.encode(content, BarcodeFormat.QR_CODE, 350, 350, hints);
            BufferedImage image = MatrixToImageWriter.toBufferedImage(matrix);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "PNG", baos);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(baos.toByteArray());
        } catch (WriterException | java.io.IOException e) {
            log.error("Failed to generate QR code image", e);
            return null;
        }
    }

    private String computeHmacSha256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hmacBytes);
        } catch (Exception e) {
            throw new RuntimeException("Error computing HMAC-SHA256", e);
        }
    }
}
