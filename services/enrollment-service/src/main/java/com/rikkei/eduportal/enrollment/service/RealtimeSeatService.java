package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.ReservationExpiryEvent;
import com.rikkei.eduportal.enrollment.dto.SectionSeatUpdateDto;
import com.rikkei.eduportal.enrollment.dto.SlotReservationResponse;
import com.rikkei.eduportal.enrollment.entity.*;
import com.rikkei.eduportal.enrollment.exception.BusinessException;
import com.rikkei.eduportal.enrollment.exception.ResourceNotFoundException;
import com.rikkei.eduportal.enrollment.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Service quản lý luồng SSE real-time + vòng đời giữ chỗ 300 giây.
 *
 * <h2>Cải tiến vòng đời SSE Emitter (EDUP-204)</h2>
 * <ul>
 *   <li>Mỗi kết nối SSE được ánh xạ 1-1 với studentId qua {@code studentEmitters}
 *       để hỗ trợ targeted push (gửi đúng client) thay vì broadcast toàn bộ.</li>
 *   <li>onCompletion / onTimeout / onError đều gọi {@code completeAndRemove()} để
 *       đảm bảo emitter được kết thúc sạch trước khi xóa khỏi map.</li>
 *   <li>Heartbeat 25 s dọn dead emitter tự động.</li>
 * </ul>
 *
 * <h2>Tự động thu hồi chỗ hết hạn 300 s (EDUP-203)</h2>
 * <ul>
 *   <li>Scheduler 10 s: đánh dấu EXPIRED + broadcast SEAT_UPDATE cho các lớp bị ảnh hưởng.</li>
 *   <li>Scheduler 10 s: push sự kiện {@code RESERVATION_EXPIRING} (60 s cuối)
 *       và {@code RESERVATION_EXPIRED} đến đúng sinh viên qua SSE.</li>
 * </ul>
 */
@Service
public class RealtimeSeatService {

    private static final Logger log = LoggerFactory.getLogger(RealtimeSeatService.class);

    /** Thời gian giữ chỗ: 300 giây = 5 phút (EDUP-203). */
    static final int RESERVATION_DURATION_SECONDS = 300;
    private static final int RESERVATION_DURATION_MINUTES = RESERVATION_DURATION_SECONDS / 60;

    /** Ngưỡng cảnh báo "sắp hết hạn" (giây). Gửi sự kiện RESERVATION_EXPIRING khi còn <= 60 s. */
    private static final long EXPIRING_WARN_THRESHOLD_SECONDS = 60L;

    /** Timeout SSE connection: 30 phút (ms). */
    private static final long SSE_TIMEOUT_MS = 30L * 60 * 1000;

    // ------------------------------------------------------------------ //
    //  Cấu trúc lưu trữ emitter                                           //
    // ------------------------------------------------------------------ //

    /**
     * Map: studentId → danh sách SseEmitter của sinh viên đó.
     * Một sinh viên có thể mở nhiều tab nên dùng List per key.
     * Dùng ConcurrentHashMap + CopyOnWriteArrayList để thread-safe với scheduler.
     */
    private final ConcurrentHashMap<Long, CopyOnWriteArrayList<SseEmitter>> studentEmitters =
            new ConcurrentHashMap<>();

    /**
     * Danh sách emitter của khách vãng lai (chưa xác thực, dùng cho broadcast SEAT_UPDATE).
     * Vẫn duy trì để tương thích với endpoint {@code /live-seats} không cần studentId.
     */
    private final CopyOnWriteArrayList<SseEmitter> anonymousEmitters = new CopyOnWriteArrayList<>();

    // ------------------------------------------------------------------ //
    //  Dependencies                                                        //
    // ------------------------------------------------------------------ //

    private final SlotReservationRepository reservationRepo;
    private final ClassSectionRepository classSectionRepo;
    private final EnrollmentRepository enrollmentRepo;
    private final StudentDashboardService dashboardService;

    public RealtimeSeatService(SlotReservationRepository reservationRepo,
                               ClassSectionRepository classSectionRepo,
                               EnrollmentRepository enrollmentRepo,
                               StudentDashboardService dashboardService) {
        this.reservationRepo = reservationRepo;
        this.classSectionRepo = classSectionRepo;
        this.enrollmentRepo = enrollmentRepo;
        this.dashboardService = dashboardService;
    }

    // ================================================================== //
    //  SSE Subscription                                                   //
    // ================================================================== //

    /**
     * Sinh viên đăng ký luồng SSE (anonymous — chỉ nhận SEAT_UPDATE + HEARTBEAT).
     * Dùng khi client chưa có studentId hoặc gọi từ endpoint công khai.
     */
    public SseEmitter subscribeLiveSeats() {
        SseEmitter emitter = createEmitter();
        anonymousEmitters.add(emitter);

        emitter.onCompletion(() -> anonymousEmitters.remove(emitter));
        emitter.onTimeout(() -> {
            completeQuietly(emitter);
            anonymousEmitters.remove(emitter);
        });
        emitter.onError(ex -> {
            anonymousEmitters.remove(emitter);
        });

        sendWelcomeEvent(emitter);
        return emitter;
    }

    /**
     * Sinh viên đăng ký luồng SSE có định danh (nhận SEAT_UPDATE + HEARTBEAT
     * + RESERVATION_EXPIRING + RESERVATION_EXPIRED đích danh).
     *
     * @param studentIdentifier username / studentCode / JWT subject
     * @return SseEmitter đã cấu hình đầy đủ lifecycle callbacks
     */
    public SseEmitter subscribeLiveSeatsAuthenticated(String studentIdentifier) {
        StudentProfile student = dashboardService.resolveStudent(studentIdentifier);
        Long studentId = student.getId();

        SseEmitter emitter = createEmitter();

        // Đăng ký vào map theo studentId
        studentEmitters.computeIfAbsent(studentId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeStudentEmitter(studentId, emitter));
        emitter.onTimeout(() -> {
            completeQuietly(emitter);
            removeStudentEmitter(studentId, emitter);
        });
        emitter.onError(ex -> removeStudentEmitter(studentId, emitter));

        sendWelcomeEvent(emitter);
        return emitter;
    }

    // ================================================================== //
    //  Heartbeat (25 s) — EDUP-204-1                                     //
    // ================================================================== //

    /**
     * Gửi ping keep-alive mỗi 25 s cho tất cả emitter để chống timeout.
     * Dead emitter bị loại bỏ ngay trong vòng lặp.
     */
    @Scheduled(fixedRate = 25_000)
    public void sendHeartbeat() {
        broadcastToAll(SseEmitter.event().name("HEARTBEAT").comment("keep-alive"), "HEARTBEAT");
    }

    // ================================================================== //
    //  Seat Broadcast                                                     //
    // ================================================================== //

    /**
     * Phát sóng biến động sĩ số của một lớp học phần đến toàn bộ client SSE.
     */
    public void broadcastSeatUpdate(Long sectionId) {
        ClassSection section = classSectionRepo.findById(sectionId).orElse(null);
        if (section == null) return;

        LocalDateTime now = LocalDateTime.now();
        long activeReservations = reservationRepo.countActiveReservations(sectionId, now);
        int reservedCount = (int) activeReservations;
        int maxCapacity = section.getMaxCapacity();
        int currentEnrolled = section.getCurrentEnrolled();
        int availableSeats = Math.max(0, maxCapacity - currentEnrolled - reservedCount);

        SectionSeatUpdateDto update = new SectionSeatUpdateDto(
                section.getId(),
                section.getSectionCode(),
                currentEnrolled,
                maxCapacity,
                reservedCount,
                availableSeats,
                availableSeats > 0 ? "OPEN" : "FULL",
                now
        );

        SseEmitter.SseEventBuilder event = SseEmitter.event()
                .name("SEAT_UPDATE")
                .data(update);

        broadcastToAll(event, "SEAT_UPDATE sectionId=" + sectionId);
    }

    // ================================================================== //
    //  Reservation Logic                                                  //
    // ================================================================== //

    /**
     * Cơ chế Giữ chỗ 300 giây (Distributed Slot Reservation — EDUP-203, F-06).
     */
    @Transactional
    public SlotReservationResponse reserveSlot(String studentIdentifier, Long sectionId) {
        StudentProfile student = dashboardService.resolveStudent(studentIdentifier);
        ClassSection section = classSectionRepo.findById(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp học phần với ID: " + sectionId));

        if (!"OPEN".equalsIgnoreCase(section.getStatus())) {
            throw new BusinessException("Lớp học phần hiện không mở cho đăng ký.");
        }

        LocalDateTime now = LocalDateTime.now();

        // 1. Trả về phiên giữ chỗ hiện tại nếu sinh viên đã giữ và còn hạn
        Optional<SlotReservation> existingActive = reservationRepo
                .findFirstByStudentIdAndClassSectionIdAndStatus(student.getId(), sectionId, "ACTIVE");
        if (existingActive.isPresent() && existingActive.get().getExpiresAt().isAfter(now)) {
            SlotReservation res = existingActive.get();
            long remaining = Duration.between(now, res.getExpiresAt()).getSeconds();
            return toReservationResponse(res, remaining, "Bạn đã có phiên giữ chỗ cho lớp này.");
        }

        // 2. Sinh viên đã đăng ký chính thức?
        enrollmentRepo.findByStudentIdAndClassSectionId(student.getId(), sectionId)
                .ifPresent(e -> {
                    if ("REGISTERED".equalsIgnoreCase(e.getStatus()) || "PENDING".equalsIgnoreCase(e.getStatus())) {
                        throw new BusinessException("Bạn đã đăng ký lớp học phần này rồi.");
                    }
                });

        // 3. Kiểm tra sĩ số khả dụng (currentEnrolled + activeReservations)
        long activeReservations = reservationRepo.countActiveReservations(sectionId, now);
        int totalOccupied = section.getCurrentEnrolled() + (int) activeReservations;
        if (totalOccupied >= section.getMaxCapacity()) {
            throw new BusinessException("Lớp học phần đã hết chỗ (Bao gồm "
                    + activeReservations + " vị trí đang được sinh viên khác giữ tạm thời).");
        }

        // 4. Tạo phiên giữ chỗ 300 s
        SlotReservation reservation = new SlotReservation(student, section, RESERVATION_DURATION_MINUTES);
        SlotReservation saved = reservationRepo.save(reservation);

        log.info("SLOT_RESERVED studentId={} sectionId={} expiresAt={}",
                student.getId(), sectionId, saved.getExpiresAt());

        // Phát sóng ngay lập tức
        broadcastSeatUpdate(sectionId);

        long remainingSeconds = Duration.between(now, saved.getExpiresAt()).getSeconds();
        return toReservationResponse(saved, remainingSeconds,
                "Giữ chỗ thành công trong 300 giây. Vui lòng bấm Đăng ký để chốt chỗ.");
    }

    /** Hủy giữ chỗ theo mã lớp học phần. */
    @Transactional
    public void cancelReservation(String studentIdentifier, Long sectionId) {
        StudentProfile student = dashboardService.resolveStudent(studentIdentifier);
        reservationRepo.findFirstByStudentIdAndClassSectionIdAndStatus(student.getId(), sectionId, "ACTIVE")
                .ifPresent(r -> {
                    r.setStatus("CANCELLED");
                    reservationRepo.save(r);
                    log.info("SLOT_RESERVATION_CANCELLED studentId={} sectionId={}", student.getId(), sectionId);
                    broadcastSeatUpdate(sectionId);
                });
    }

    /** Hủy toàn bộ các phiên giữ chỗ ACTIVE của sinh viên (1-Chạm). */
    @Transactional
    public int cancelAllMyReservations(String studentIdentifier) {
        StudentProfile student = dashboardService.resolveStudent(studentIdentifier);
        LocalDateTime now = LocalDateTime.now();
        List<SlotReservation> active = reservationRepo.findActiveByStudentId(student.getId(), now);
        for (SlotReservation r : active) {
            r.setStatus("CANCELLED");
            reservationRepo.save(r);
            broadcastSeatUpdate(r.getClassSection().getId());
        }
        log.info("CANCELLED_ALL_RESERVATIONS studentId={} count={}", student.getId(), active.size());
        return active.size();
    }

    /** Lấy danh sách các chỗ đang được sinh viên giữ tạm thời. */
    @Transactional(readOnly = true)
    public List<SlotReservationResponse> getMyActiveReservations(String studentIdentifier) {
        StudentProfile student = dashboardService.resolveStudent(studentIdentifier);
        LocalDateTime now = LocalDateTime.now();
        List<SlotReservation> active = reservationRepo.findActiveByStudentId(student.getId(), now);
        return active.stream().map(r -> {
            long remaining = Duration.between(now, r.getExpiresAt()).getSeconds();
            return toReservationResponse(r, Math.max(0, remaining), "Đang giữ chỗ");
        }).toList();
    }

    /** Chuyển trạng thái giữ chỗ sang COMMITTED khi đăng ký chính thức. */
    @Transactional
    public void markCommitted(Long studentId, Long sectionId) {
        reservationRepo.findFirstByStudentIdAndClassSectionIdAndStatus(studentId, sectionId, "ACTIVE")
                .ifPresent(r -> {
                    r.setStatus("COMMITTED");
                    reservationRepo.save(r);
                });
    }

    // ================================================================== //
    //  Scheduler: Tự động thu hồi chỗ hết hạn (EDUP-203)                //
    // ================================================================== //

    /**
     * Mỗi 10 s:
     * <ol>
     *   <li>Đánh dấu EXPIRED các phiên giữ chỗ đã hết hạn trong DB.</li>
     *   <li>Broadcast SEAT_UPDATE cho các lớp bị ảnh hưởng.</li>
     * </ol>
     */
    @Scheduled(fixedRate = 10_000)
    @Transactional
    public void cleanupExpiredReservations() {
        LocalDateTime now = LocalDateTime.now();
        List<SlotReservation> expired = reservationRepo.findExpiredReservations(now);
        if (expired.isEmpty()) return;

        Set<Long> affectedSections = new HashSet<>();
        for (SlotReservation r : expired) {
            r.setStatus("EXPIRED");
            reservationRepo.save(r);
            affectedSections.add(r.getClassSection().getId());
        }

        log.debug("AUTO_RECLAIM: expired {} slot reservations, sections={}", expired.size(), affectedSections);

        for (Long secId : affectedSections) {
            broadcastSeatUpdate(secId);
        }
    }

    /**
     * Mỗi 10 s: Đẩy sự kiện SSE cá nhân hoá về trạng thái phiên giữ chỗ:
     * <ul>
     *   <li>{@code RESERVATION_EXPIRING} — khi còn ≤ 60 s (cảnh báo màu cam trên UI).</li>
     *   <li>{@code RESERVATION_EXPIRED}  — khi đã hết hạn (tự động loại chỗ, UI cập nhật).</li>
     * </ul>
     * Chỉ gửi đến sinh viên có kết nối SSE authenticated đang mở.
     */
    @Scheduled(fixedRate = 10_000)
    @Transactional(readOnly = true)
    public void pushReservationExpiryEvents() {
        if (studentEmitters.isEmpty()) return;

        LocalDateTime now = LocalDateTime.now();
        // Chỉ xử lý những sinh viên đang có kết nối SSE
        for (Map.Entry<Long, CopyOnWriteArrayList<SseEmitter>> entry : studentEmitters.entrySet()) {
            Long studentId = entry.getKey();
            CopyOnWriteArrayList<SseEmitter> emitters = entry.getValue();
            if (emitters.isEmpty()) continue;

            List<SlotReservation> active = reservationRepo.findActiveByStudentId(studentId, now);
            // Tìm thêm các reservation ACTIVE mà đã hết hạn (expiresAt <= now, chưa cleanup kịp)
            List<SlotReservation> expiredForStudent = reservationRepo.findExpiredReservationsByStudent(studentId, now);

            // Gửi EXPIRING_SOON cho các chỗ sắp hết hạn
            for (SlotReservation r : active) {
                long remaining = Duration.between(now, r.getExpiresAt()).getSeconds();
                if (remaining <= EXPIRING_WARN_THRESHOLD_SECONDS) {
                    ReservationExpiryEvent event = buildExpiryEvent(r, remaining, "EXPIRING_SOON");
                    pushToStudent(studentId, "RESERVATION_EXPIRING", event);
                    log.debug("EXPIRING_SOON pushed studentId={} reservationId={} remaining={}s",
                            studentId, r.getId(), remaining);
                }
            }

            // Gửi EXPIRED cho các chỗ đã quá hạn (scheduler cleanupExpiredReservations chưa kịp chạy)
            for (SlotReservation r : expiredForStudent) {
                ReservationExpiryEvent event = buildExpiryEvent(r, 0L, "EXPIRED");
                pushToStudent(studentId, "RESERVATION_EXPIRED", event);
                log.info("RESERVATION_EXPIRED pushed studentId={} reservationId={} sectionId={}",
                        studentId, r.getId(), r.getClassSection().getId());
            }
        }
    }

    // ================================================================== //
    //  Private Helpers                                                    //
    // ================================================================== //

    /** Tạo SseEmitter với timeout chuẩn. */
    private SseEmitter createEmitter() {
        return new SseEmitter(SSE_TIMEOUT_MS);
    }

    /** Gửi sự kiện chào mừng khi kết nối SSE được thiết lập. */
    private void sendWelcomeEvent(SseEmitter emitter) {
        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data("Kết nối luồng cập nhật sĩ số thời gian thực thành công"));
        } catch (IOException e) {
            // Nếu gửi lỗi ngay, emitter sẽ được dọn bởi callback onError
            log.debug("Failed to send CONNECTED event: {}", e.getMessage());
        }
    }

    /**
     * Xóa emitter khỏi map studentEmitters theo studentId.
     * Dọn key rỗng để tránh memory leak.
     */
    private void removeStudentEmitter(Long studentId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> list = studentEmitters.get(studentId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                studentEmitters.remove(studentId, list);
            }
        }
    }

    /**
     * Kết thúc emitter một cách yên tĩnh (không ném ngoại lệ).
     * Gọi trước khi xóa khỏi map, tránh leak thread Tomcat async.
     */
    private void completeQuietly(SseEmitter emitter) {
        try {
            emitter.complete();
        } catch (Exception ignored) {
            // Emitter có thể đã complete trước đó
        }
    }

    /**
     * Broadcast một sự kiện SSE đến toàn bộ emitter (anonymous + authenticated).
     * Dead emitter bị loại bỏ.
     */
    private void broadcastToAll(SseEmitter.SseEventBuilder event, String eventLabel) {
        List<SseEmitter> dead = new ArrayList<>();

        // Anonymous emitters
        for (SseEmitter e : anonymousEmitters) {
            if (!sendEvent(e, event)) dead.add(e);
        }
        anonymousEmitters.removeAll(dead);

        // Authenticated emitters (tất cả sinh viên)
        for (CopyOnWriteArrayList<SseEmitter> list : studentEmitters.values()) {
            List<SseEmitter> deadInList = new ArrayList<>();
            for (SseEmitter e : list) {
                if (!sendEvent(e, event)) deadInList.add(e);
            }
            list.removeAll(deadInList);
        }

        if (!dead.isEmpty()) {
            log.debug("Removed {} dead emitters during broadcast [{}]", dead.size(), eventLabel);
        }
    }

    /**
     * Gửi sự kiện SSE đến danh sách emitter của một sinh viên cụ thể.
     *
     * @param studentId   ID sinh viên nhận sự kiện
     * @param eventName   Tên sự kiện SSE (e.g. "RESERVATION_EXPIRING")
     * @param payload     Dữ liệu gửi kèm (sẽ được serialize JSON bởi Spring)
     */
    private void pushToStudent(Long studentId, String eventName, Object payload) {
        CopyOnWriteArrayList<SseEmitter> list = studentEmitters.get(studentId);
        if (list == null || list.isEmpty()) return;

        SseEmitter.SseEventBuilder event = SseEmitter.event().name(eventName).data(payload);
        List<SseEmitter> dead = new ArrayList<>();
        for (SseEmitter e : list) {
            if (!sendEvent(e, event)) dead.add(e);
        }
        list.removeAll(dead);
    }

    /**
     * Gửi sự kiện đến một emitter. Trả về {@code false} nếu emitter đã chết.
     */
    private boolean sendEvent(SseEmitter emitter, SseEmitter.SseEventBuilder event) {
        try {
            emitter.send(event);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    private ReservationExpiryEvent buildExpiryEvent(SlotReservation r, long remainingSeconds, String eventType) {
        String courseName = (r.getClassSection().getCourse() != null)
                ? r.getClassSection().getCourse().getName() : "";
        return new ReservationExpiryEvent(
                r.getId(),
                r.getClassSection().getId(),
                r.getClassSection().getSectionCode(),
                courseName,
                r.getExpiresAt(),
                remainingSeconds,
                eventType
        );
    }

    private SlotReservationResponse toReservationResponse(SlotReservation r, long remainingSeconds, String message) {
        return new SlotReservationResponse(
                r.getId(),
                r.getClassSection().getId(),
                r.getClassSection().getSectionCode(),
                r.getClassSection().getCourse() != null ? r.getClassSection().getCourse().getName() : "",
                r.getReservedAt(),
                r.getExpiresAt(),
                remainingSeconds,
                r.getStatus(),
                message
        );
    }
}
