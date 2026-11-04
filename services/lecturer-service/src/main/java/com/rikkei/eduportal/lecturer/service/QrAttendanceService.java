package com.rikkei.eduportal.lecturer.service;

import com.rikkei.eduportal.common.EnrollmentStatus;
import com.rikkei.eduportal.lecturer.dto.request.AttendanceCheckInRequest;
import com.rikkei.eduportal.lecturer.dto.request.StartAttendanceSessionRequest;
import com.rikkei.eduportal.lecturer.dto.response.*;
import com.rikkei.eduportal.lecturer.entity.*;
import com.rikkei.eduportal.lecturer.exception.*;
import com.rikkei.eduportal.lecturer.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class QrAttendanceService {

    private static final Logger log = LoggerFactory.getLogger(QrAttendanceService.class);
    private static final int DEFAULT_STEP_SECONDS = 15;
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss");

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

    /**
     * Bắt đầu một phiên điểm danh QR động mới cho lớp học phần.
     * Nếu đang có phiên OPEN/ACTIVE, tự động đóng trước khi mở phiên mới.
     */
    @Transactional
    public AttendanceSessionResponse startSession(String lecturerUsername, Long sectionId, StartAttendanceSessionRequest request) {
        LecturerProfile lecturer = resolveLecturer(lecturerUsername);
        ClassSection classSection = resolveSection(sectionId, lecturer.getId());

        // Đóng các phiên đang mở trước đó của lớp này
        findActiveSession(sectionId).ifPresent(active -> {
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
        session.setStatus("ACTIVE"); // Thiết lập trạng thái ACTIVE theo chuẩn
        AttendanceSession saved = sessionRepo.save(session);

        log.info("Started new attendance session id={} status={} for sectionCode={} by lecturer={}",
                saved.getId(), saved.getStatus(), classSection.getSectionCode(), lecturerUsername);

        return toSessionResponse(saved, List.of());
    }

    /**
     * Lấy token QR động hiện tại (thay đổi theo mỗi chu kỳ 15s - TOTP-like).
     */
    public DynamicQrResponse getRotatingQrCode(String lecturerUsername, Long sectionId) {
        LecturerProfile lecturer = resolveLecturer(lecturerUsername);
        ClassSection classSection = resolveSection(sectionId, lecturer.getId());

        AttendanceSession session = findActiveSession(sectionId)
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

        return new DynamicQrResponse(
                session.getId(),
                classSection.getId(),
                qrToken,
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

        AttendanceSession session = findActiveSession(sectionId)
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

        AttendanceSession session = findActiveSession(sectionId)
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
     * Quy trình xác thực bảo mật chuẩn RFC 6238 TOTP:
     * 1. Kiểm tra cấu trúc QR Token (sessionId.sectionId.timeWindow.signature)
     * 2. Ràng buộc trạng thái phiên: Phải ở trạng thái ACTIVE hoặc OPEN và còn trong thời gian mở điểm danh.
     * 3. Nới lỏng cửa sổ xác thực TOTP (Time Drift Tolerance Window):
     *    Chấp nhận mã ở chu kỳ [T0 - 1 bước, T0, T0 + 1 bước] (dung sai từ 15s đến 30s)
     *    để bù đắp độ trễ mạng 4G/Wifi và độ lệch đồng hồ giữa thiết bị sinh viên và server.
     * 4. Xác thực tính toàn vẹn của chữ ký HMAC-SHA256 với tokenWindow đã quét.
     * 5. Kiểm tra sinh viên có trong danh sách lớp học phần và ở trạng thái REGISTERED.
     * 6. Ngăn chặn điểm danh trùng lặp (Idempotent / 409 Conflict): Trả về thông báo "ĐÃ ĐIỂM DANH TRƯỚC ĐÓ".
     * 7. Ghi nhận bản ghi và trả về phản hồi chi tiết { success, message, checkedInAt, ... }.
     */
    @Transactional
    public AttendanceCheckInResponse studentCheckIn(String studentUsername, AttendanceCheckInRequest request) {
        if (request == null || request.qrToken() == null || request.qrToken().isBlank()) {
            throw new InvalidQrException("Mã QR không hợp lệ.");
        }

        String[] parts = request.qrToken().trim().split("\\.");
        if (parts.length != 4) {
            throw new InvalidQrException("Định dạng mã QR không đúng cấu trúc điểm danh.");
        }

        Long sessionId;
        Long sectionId;
        long tokenWindow;
        String providedSignature = parts[3];

        try {
            sessionId = Long.parseLong(parts[0]);
            sectionId = Long.parseLong(parts[1]);
            tokenWindow = Long.parseLong(parts[2]);
        } catch (NumberFormatException e) {
            throw new InvalidQrException("Thông số mã QR không hợp lệ.");
        }

        AttendanceSession session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiên điểm danh."));

        // Ràng buộc nghiệp vụ: Kiểm tra phiên học (Session) phải ở trạng thái ACTIVE hoặc OPEN
        String status = session.getStatus();
        boolean isActive = status != null && (status.equalsIgnoreCase("ACTIVE") || status.equalsIgnoreCase("OPEN"));
        if (!isActive) {
            log.warn("Attempt to check-in on inactive session id={}, status={}", sessionId, status);
            throw new InvalidQrException("Phiên điểm danh này đã kết thúc hoặc không ở trạng thái ACTIVE/OPEN.");
        }

        // Kiểm tra phiên còn trong thời gian mở điểm danh
        if (session.getClosedAt() != null && LocalDateTime.now().isAfter(session.getClosedAt())) {
            log.warn("Attempt to check-in on closed session id={}, closedAt={}", sessionId, session.getClosedAt());
            throw new InvalidQrException("Phiên điểm danh này đã hết thời gian mở điểm danh.");
        }

        if (!session.getClassSection().getId().equals(sectionId)) {
            throw new InvalidQrException("Mã QR không khớp với lớp học phần của phiên điểm danh.");
        }

        // Nới lỏng cửa sổ xác thực TOTP (Time Drift Tolerance Window):
        // Thay vì chỉ kiểm tra mã ở bước thời gian hiện tại T0, chấp nhận chu kỳ [T0 - 1, T0, T0 + 1]
        // dung sai từ 15s đến 30s để giải quyết độ trễ mạng và lệch giờ.
        int stepSeconds = session.getStepSeconds() > 0 ? session.getStepSeconds() : DEFAULT_STEP_SECONDS;
        long nowWindow = System.currentTimeMillis() / (stepSeconds * 1000L);
        long windowDiff = nowWindow - tokenWindow;

        if (windowDiff < -1 || windowDiff > 1) {
            log.warn("Expired QR token out of tolerance window: nowWindow={}, tokenWindow={}, diff={}",
                    nowWindow, tokenWindow, windowDiff);
            throw new InvalidQrException("Mã QR đã hết hạn. Vui lòng quét mã QR mới đang hiển thị trên màn hình.");
        }

        // Xác thực tính toàn vẹn của chữ ký HMAC-SHA256 theo tokenWindow
        String payload = sessionId + ":" + sectionId + ":" + tokenWindow;
        String expectedSignature = computeHmacSha256(payload, session.getSessionSecret());

        if (!MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.UTF_8),
                providedSignature.getBytes(StandardCharsets.UTF_8))) {
            log.warn("Invalid QR signature for session id={}", sessionId);
            throw new InvalidQrException("Mã QR không hợp lệ hoặc đã bị can thiệp trái phép.");
        }

        // Xác thực hồ sơ sinh viên
        StudentProfile student = studentProfileRepo.findByUserUsername(studentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ sinh viên cho tài khoản: " + studentUsername));

        // Kiểm tra sinh viên có trong danh sách lớp không
        Enrollment enrollment = enrollmentRepo.findByClassSectionIdAndStudentId(sectionId, student.getId())
                .orElseThrow(() -> new AccessDeniedException("Bạn không thuộc danh sách sinh viên lớp học phần này."));

        if (enrollment.getStatus() != EnrollmentStatus.REGISTERED) {
            throw new AccessDeniedException("Trạng thái đăng ký môn học của bạn không hợp lệ để điểm danh (" + enrollment.getStatus() + ").");
        }

        // Ngăn chặn điểm danh trùng lặp
        if (recordRepo.existsBySessionIdAndStudentId(session.getId(), student.getId())) {
            log.warn("Duplicate check-in attempt by student {} for session {}", student.getStudentCode(), session.getId());
            throw new AttendanceAlreadyCheckedInException("ĐÃ ĐIỂM DANH TRƯỚC ĐÓ: Bạn đã điểm danh thành công phiên học này rồi.");
        }

        // Ghi nhận điểm danh
        AttendanceRecord record = new AttendanceRecord(
                session,
                enrollment,
                student,
                request.deviceInfo() != null ? request.deviceInfo().trim() : "Unknown Mobile Device"
        );
        recordRepo.save(record);

        int updatedAttendees = session.getTotalAttendees() + 1;
        session.setTotalAttendees(updatedAttendees);
        sessionRepo.save(session);

        log.info("Student {} ({}) checked in successfully for session {} in class {}",
                student.getStudentCode(), student.getUser().getFullName(), session.getId(), session.getClassSection().getSectionCode());

        String formattedTime = record.getCheckInTime().toLocalTime().format(TIME_FORMATTER);
        String successMsg = "Điểm danh thành công lúc " + formattedTime;

        return new AttendanceCheckInResponse(
                session.getId(),
                sectionId,
                session.getClassSection().getSectionCode(),
                session.getClassSection().getCourse().getName(),
                student.getStudentCode(),
                student.getUser().getFullName(),
                record.getCheckInTime(),
                successMsg
        );
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Tìm phiên điểm danh đang hoạt động (OPEN hoặc ACTIVE).
     */
    private Optional<AttendanceSession> findActiveSession(Long sectionId) {
        return sessionRepo.findFirstByClassSectionIdAndStatusInOrderByCreatedAtDesc(sectionId, List.of("ACTIVE", "OPEN"))
                .or(() -> sessionRepo.findFirstByClassSectionIdAndStatusOrderByCreatedAtDesc(sectionId, "OPEN"))
                .or(() -> sessionRepo.findFirstByClassSectionIdAndStatusOrderByCreatedAtDesc(sectionId, "ACTIVE"));
    }

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
