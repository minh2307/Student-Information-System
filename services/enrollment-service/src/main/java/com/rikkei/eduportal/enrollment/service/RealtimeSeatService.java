package com.rikkei.eduportal.enrollment.service;

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
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class RealtimeSeatService {

    private static final Logger log = LoggerFactory.getLogger(RealtimeSeatService.class);
    private static final int RESERVATION_DURATION_MINUTES = 5;
    private static final Long SSE_TIMEOUT = 30 * 60 * 1000L; // 30 mins

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

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

    /**
     * Sinh viên đăng ký luồng Server-Sent Events (SSE) để nhận cập nhật sĩ số thời gian thực.
     */
    public SseEmitter subscribeLiveSeats() {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);
        emitters.add(emitter);

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> {
            emitter.complete();
            emitters.remove(emitter);
        });
        emitter.onError((e) -> emitters.remove(emitter));

        // Gửi sự kiện chào mừng / kết nối thành công
        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data("Kết nối luồng cập nhật sĩ số thời gian thực thành công"));
        } catch (IOException e) {
            emitters.remove(emitter);
        }

        return emitter;
    }

    /**
     * Phát sóng (Broadcast) biến động sĩ số của một lớp học phần tới tất cả người dùng đang mở trang.
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

        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("SEAT_UPDATE")
                        .data(update));
            } catch (Exception ex) {
                deadEmitters.add(emitter);
            }
        }
        emitters.removeAll(deadEmitters);
    }

    /**
     * Cơ chế Giữ chỗ Phân tán trong 5 phút (Distributed Slot Reservation).
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

        // 1. Kiểm tra đã có giữ chỗ ACTIVE chưa
        Optional<SlotReservation> existingActive = reservationRepo
                .findFirstByStudentIdAndClassSectionIdAndStatus(student.getId(), sectionId, "ACTIVE");
        if (existingActive.isPresent() && existingActive.get().getExpiresAt().isAfter(now)) {
            SlotReservation res = existingActive.get();
            long remaining = Duration.between(now, res.getExpiresAt()).getSeconds();
            return toReservationResponse(res, remaining, "Bạn đã có phiên giữ chỗ cho lớp này.");
        }

        // 2. Kiểm tra sinh viên đã đăng ký chính thức chưa
        enrollmentRepo.findByStudentIdAndClassSectionId(student.getId(), sectionId)
                .ifPresent(e -> {
                    if ("REGISTERED".equalsIgnoreCase(e.getStatus()) || "PENDING".equalsIgnoreCase(e.getStatus())) {
                        throw new BusinessException("Bạn đã đăng ký lớp học phần này rồi.");
                    }
                });

        // 3. Tính toán sĩ số khả dụng (Sĩ số đã chốt + Các chỗ đang giữ)
        long activeReservations = reservationRepo.countActiveReservations(sectionId, now);
        int totalOccupied = section.getCurrentEnrolled() + (int) activeReservations;
        if (totalOccupied >= section.getMaxCapacity()) {
            throw new BusinessException("Lớp học phần đã hết chỗ (Bao gồm " + activeReservations + " vị trí đang được sinh viên khác giữ tạm thời).");
        }

        // 4. Tạo phiên giữ chỗ 5 phút
        SlotReservation reservation = new SlotReservation(student, section, RESERVATION_DURATION_MINUTES);
        SlotReservation saved = reservationRepo.save(reservation);

        log.info("SLOT_RESERVED studentId={} sectionId={} expiresAt={}",
                student.getId(), sectionId, saved.getExpiresAt());

        // Phát sóng cập nhật sĩ số ngay lập tức
        broadcastSeatUpdate(sectionId);

        long remainingSeconds = Duration.between(now, saved.getExpiresAt()).getSeconds();
        return toReservationResponse(saved, remainingSeconds, "Giữ chỗ thành công trong 5 phút. Vui lòng bấm Đăng ký để chốt chỗ.");
    }

    /**
     * Hủy giữ chỗ.
     */
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

    /**
     * Lấy danh sách các chỗ đang được sinh viên giữ tạm thời.
     */
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

    /**
     * Đánh dấu chỗ giữ đã chuyển thành đăng ký chính thức (COMMITTED).
     */
    @Transactional
    public void markCommitted(Long studentId, Long sectionId) {
        reservationRepo.findFirstByStudentIdAndClassSectionIdAndStatus(studentId, sectionId, "ACTIVE")
                .ifPresent(r -> {
                    r.setStatus("COMMITTED");
                    reservationRepo.save(r);
                });
    }

    /**
     * Dọn dẹp các phiên giữ chỗ đã hết hạn mỗi 10 giây.
     */
    @Scheduled(fixedRate = 10000)
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

        log.debug("Cleaned up {} expired slot reservations", expired.size());
        for (Long secId : affectedSections) {
            broadcastSeatUpdate(secId);
        }
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
