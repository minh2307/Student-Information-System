package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.ClassSectionDto;
import com.rikkei.eduportal.enrollment.dto.EnrollmentResponse;
import com.rikkei.eduportal.enrollment.dto.StudentGradeDto;
import com.rikkei.eduportal.enrollment.entity.*;
import com.rikkei.eduportal.enrollment.exception.BusinessException;
import com.rikkei.eduportal.enrollment.exception.ResourceNotFoundException;
import com.rikkei.eduportal.enrollment.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Service
public class CourseRegistrationService {

    private static final Logger log = LoggerFactory.getLogger(CourseRegistrationService.class);
    private static final int MAX_CREDITS_PER_SEMESTER = 24;

    private final StudentProfileRepository studentProfileRepository;
    private final ClassSectionRepository classSectionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final GradeRepository gradeRepository;
    private final CourseRepository courseRepository;
    private final StudentDashboardService dashboardService;
    private final RealtimeSeatService realtimeSeatService;
    private final SlotReservationRepository reservationRepository;

    public CourseRegistrationService(StudentProfileRepository studentProfileRepository,
                                   ClassSectionRepository classSectionRepository,
                                   EnrollmentRepository enrollmentRepository,
                                   GradeRepository gradeRepository,
                                   CourseRepository courseRepository,
                                   StudentDashboardService dashboardService,
                                   RealtimeSeatService realtimeSeatService,
                                   SlotReservationRepository reservationRepository) {
        this.studentProfileRepository = studentProfileRepository;
        this.classSectionRepository = classSectionRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.gradeRepository = gradeRepository;
        this.courseRepository = courseRepository;
        this.dashboardService = dashboardService;
        this.realtimeSeatService = realtimeSeatService;
        this.reservationRepository = reservationRepository;
    }

    /**
     * Tra cứu danh sách các lớp học phần đang mở (GET /api/v1/student/class-sections)
     * Thống nhất Contract với số chỗ khả dụng, số slot giữ chỗ và trạng thái giữ chỗ của sinh viên.
     */
    @Transactional(readOnly = true)
    public List<ClassSectionDto> getAvailableSections(String studentIdentifier, String semester, String keyword) {
        StudentProfile student = dashboardService.resolveStudent(studentIdentifier);
        List<ClassSection> sections = classSectionRepository.searchSections(
                (semester != null && !semester.trim().isEmpty()) ? semester.trim() : null,
                (keyword != null && !keyword.trim().isEmpty()) ? keyword.trim() : null
        );

        LocalDateTime now = LocalDateTime.now();

        // 1. Lấy danh sách lớp sinh viên đã đăng ký
        List<Enrollment> allStudentEnrollments = enrollmentRepository.findAllByStudentId(student.getId());
        Map<Long, Enrollment> enrolledSectionMap = new HashMap<>();
        for (Enrollment e : allStudentEnrollments) {
            if (e.getClassSection() != null && !"CANCELLED".equalsIgnoreCase(e.getStatus()) && !"REJECTED".equalsIgnoreCase(e.getStatus())) {
                enrolledSectionMap.put(e.getClassSection().getId(), e);
            }
        }

        // 2. Lấy danh sách các slot đang giữ chỗ của riêng sinh viên này
        List<SlotReservation> myReservations = reservationRepository.findActiveByStudentId(student.getId(), now);
        Map<Long, SlotReservation> myResMap = new HashMap<>();
        for (SlotReservation r : myReservations) {
            myResMap.put(r.getClassSection().getId(), r);
        }

        // 3. Đếm số lượng giữ chỗ ACTIVE theo từng lớp học phần (1 query tối ưu)
        List<Object[]> groupedCounts = reservationRepository.countActiveReservationsGrouped(now);
        Map<Long, Integer> resCountMap = new HashMap<>();
        for (Object[] row : groupedCounts) {
            Long secId = (Long) row[0];
            Long cnt = (Long) row[1];
            resCountMap.put(secId, cnt != null ? cnt.intValue() : 0);
        }

        List<ClassSectionDto> result = new ArrayList<>();
        for (ClassSection sec : sections) {
            ClassSectionDto dto = new ClassSectionDto();
            dto.setId(sec.getId());
            dto.setSectionCode(sec.getSectionCode());
            dto.setDayOfWeek(sec.getDayOfWeek());
            dto.setStartTime(sec.getStartTime() != null ? sec.getStartTime().toString().substring(0, 5) : "");
            dto.setEndTime(sec.getEndTime() != null ? sec.getEndTime().toString().substring(0, 5) : "");
            dto.setRoomName(sec.getRoomName());
            dto.setMaxCapacity(sec.getMaxCapacity());
            dto.setCurrentEnrolled(sec.getCurrentEnrolled());
            dto.setStatus(sec.getStatus());

            // Contract chỗ trống thời gian thực thống nhất với SSE:
            int reservedCount = resCountMap.getOrDefault(sec.getId(), 0);
            int availableSeats = Math.max(0, sec.getMaxCapacity() - sec.getCurrentEnrolled() - reservedCount);
            dto.setReservedCount(reservedCount);
            dto.setAvailableSeats(availableSeats);

            // Kiểm tra xem sinh viên này có đang giữ chỗ lớp này không:
            SlotReservation myRes = myResMap.get(sec.getId());
            if (myRes != null) {
                dto.setIsReservedByMe(true);
                dto.setMyReservationId(myRes.getId());
                long remaining = Duration.between(now, myRes.getExpiresAt()).getSeconds();
                dto.setMyReservationRemainingSeconds(Math.max(0, remaining));
            } else {
                dto.setIsReservedByMe(false);
                dto.setMyReservationRemainingSeconds(null);
                dto.setMyReservationId(null);
            }

            if (sec.getCourse() != null) {
                dto.setCourseId(sec.getCourse().getId());
                dto.setCourseCode(sec.getCourse().getCourseCode());
                dto.setCourseName(sec.getCourse().getName());
                dto.setCredits(sec.getCourse().getCredits());
                dto.setWeeklyHours(sec.getCourse().getWeeklyHours());
            }

            if (sec.getLecturer() != null && sec.getLecturer().getUser() != null) {
                String degree = sec.getLecturer().getDegree();
                dto.setLecturerName((degree != null ? degree + " " : "") + sec.getLecturer().getUser().getFullName());
            }

            Enrollment enrolled = enrolledSectionMap.get(sec.getId());
            if (enrolled != null) {
                dto.setEnrollmentId(enrolled.getId());
                dto.setEnrollmentStatus(enrolled.getStatus());
                if ("COMPLETED".equalsIgnoreCase(enrolled.getStatus())) {
                    dto.setIsCompleted(true);
                    dto.setIsEnrolled(false);
                } else {
                    dto.setIsCompleted(false);
                    dto.setIsEnrolled(true);
                }
                dto.setHasConflict(Boolean.TRUE.equals(enrolled.getHasConflict()));
            } else {
                dto.setIsEnrolled(false);
                dto.setIsCompleted(false);
                dto.setEnrollmentStatus(null);
            }

            result.add(dto);
        }

        return result;
    }

    /**
     * Engine Đăng ký học phần (POST /api/v1/student/enrollments)
     * Áp dụng Transaction & Database Row Locking để chống Race Condition (NFR-03).
     * Tích hợp bảo vệ phiên giữ chỗ 5 phút (EDUP-203, F-06):
     * Nếu sinh viên có giữ chỗ -> vị trí được bảo đảm 100%.
     * Nếu sinh viên không có giữ chỗ -> không được chiếm vị trí đang được người khác giữ.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public EnrollmentResponse enroll(String studentIdentifier, Long classSectionId) {
        if (classSectionId == null) {
            throw new BusinessException("Mã lớp học phần không được để trống");
        }

        StudentProfile student = dashboardService.resolveStudent(studentIdentifier);

        // Lock row class_sections để tránh race condition khi nhiều sinh viên đăng ký cùng lúc (NFR-03)
        ClassSection section = classSectionRepository.findByIdWithLock(classSectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp học phần với ID: " + classSectionId));

        if (!"OPEN".equalsIgnoreCase(section.getStatus())) {
            throw new BusinessException("Lớp học phần hiện không mở cho đăng ký (Trạng thái: " + section.getStatus() + ")");
        }

        LocalDateTime now = LocalDateTime.now();

        // Kiểm tra xem sinh viên có đang giữ chỗ hợp lệ cho lớp này không
        Optional<SlotReservation> myActiveHold = reservationRepository
                .findFirstByStudentIdAndClassSectionIdAndStatus(student.getId(), section.getId(), "ACTIVE")
                .filter(r -> r.getExpiresAt().isAfter(now));

        // Rule 1: Kiểm tra sĩ số & chống cướp suất giữ chỗ
        if (myActiveHold.isEmpty()) {
            // Sinh viên KHÔNG có phiên giữ chỗ:
            // Sĩ số khả dụng = maxCapacity - currentEnrolled - activeReservationsCount
            long activeHolds = reservationRepository.countActiveReservations(section.getId(), now);
            if (section.getCurrentEnrolled() + (int) activeHolds >= section.getMaxCapacity()) {
                throw new BusinessException(String.format(
                        "Lớp học phần đã hết chỗ khả dụng! (Hiện có %d chỗ đã chốt và %d chỗ đang được sinh viên khác tạm giữ trong 5 phút).",
                        section.getCurrentEnrolled(), activeHolds
                ));
            }
        } else {
            // Sinh viên CÓ phiên giữ chỗ hợp lệ:
            if (section.getCurrentEnrolled() >= section.getMaxCapacity()) {
                throw new BusinessException("Lớp học phần đã đầy sĩ số (" + section.getMaxCapacity() + "/" + section.getMaxCapacity() + "). Vui lòng chọn lớp khác.");
            }
        }

        // Rule 1b: Kiểm tra điều kiện môn học tiên quyết (Prerequisite Check - FR-01, FR-06)
        if (section.getCourse() != null && section.getCourse().getPrerequisiteCourseId() != null) {
            Long prereqId = section.getCourse().getPrerequisiteCourseId();
            boolean hasCompletedPrereq = enrollmentRepository.findAllByStudentId(student.getId()).stream()
                    .anyMatch(e -> e.getClassSection() != null
                            && e.getClassSection().getCourse() != null
                            && prereqId.equals(e.getClassSection().getCourse().getId())
                            && "COMPLETED".equalsIgnoreCase(e.getStatus()));

            if (!hasCompletedPrereq) {
                Course prereq = courseRepository.findById(prereqId).orElse(null);
                String prereqInfo = prereq != null ? (prereq.getCourseCode() + " - " + prereq.getName()) : ("ID " + prereqId);
                throw new BusinessException(String.format(
                        "Không đủ điều kiện đăng ký! Bạn chưa hoàn thành môn học tiên quyết bắt buộc: %s",
                        prereqInfo
                ));
            }
        }

        // Rule 1c: Kiểm tra sinh viên đã từng hoàn thành môn học này ở bất kỳ học kỳ nào chưa
        boolean alreadyCompleted = enrollmentRepository.findAllByStudentId(student.getId()).stream()
                .anyMatch(e -> e.getClassSection() != null
                        && e.getClassSection().getCourse() != null
                        && section.getCourse() != null
                        && Objects.equals(section.getCourse().getId(), e.getClassSection().getCourse().getId())
                        && "COMPLETED".equalsIgnoreCase(e.getStatus()));
        if (alreadyCompleted) {
            throw new BusinessException(String.format(
                    "Bạn đã tích lũy và hoàn thành môn học này rồi (%s - %s) với kết quả đạt.",
                    section.getCourse().getCourseCode(), section.getCourse().getName()
            ));
        }

        // Rule 2: Kiểm tra sinh viên đã đăng ký lớp này chưa
        Optional<Enrollment> existingEnrollmentOpt = enrollmentRepository.findByStudentIdAndClassSectionId(student.getId(), section.getId());
        Enrollment enrollmentToSave;

        if (existingEnrollmentOpt.isPresent()) {
            Enrollment existing = existingEnrollmentOpt.get();
            if ("REGISTERED".equalsIgnoreCase(existing.getStatus()) || "PENDING".equalsIgnoreCase(existing.getStatus())) {
                throw new BusinessException("Bạn đã đăng ký lớp học phần này rồi (Mã lớp: " + section.getSectionCode() + ")");
            }
            if ("COMPLETED".equalsIgnoreCase(existing.getStatus())) {
                throw new BusinessException("Bạn đã hoàn thành môn học này rồi với kết quả đạt (Mã lớp: " + section.getSectionCode() + ")");
            }
            // Tái sử dụng bản ghi cũ nếu trước đó đã từng CANCELLED hoặc REJECTED
            enrollmentToSave = existing;
        } else {
            enrollmentToSave = new Enrollment();
            enrollmentToSave.setStudent(student);
            enrollmentToSave.setClassSection(section);
        }

        // Rule 3: Kiểm tra giới hạn tín chỉ (tối đa 24 tín chỉ trong kỳ)
        List<Enrollment> currentSemesterEnrollments = enrollmentRepository.findActiveEnrollmentsByStudentAndSemester(
                student.getId(), section.getSemesterName()
        );

        int currentCredits = currentSemesterEnrollments.stream()
                .filter(e -> !Objects.equals(e.getClassSection().getId(), section.getId()))
                .mapToInt(e -> (e.getClassSection() != null && e.getClassSection().getCourse() != null)
                        ? e.getClassSection().getCourse().getCredits() : 0)
                .sum();

        int newCredits = (section.getCourse() != null && section.getCourse().getCredits() != null)
                ? section.getCourse().getCredits() : 3;

        if (currentCredits + newCredits > MAX_CREDITS_PER_SEMESTER) {
            throw new BusinessException(String.format(
                    "Vượt quá giới hạn đăng ký tối đa %d tín chỉ trong học kỳ! (Hiện tại: %d TC + Môn này: %d TC = %d TC)",
                    MAX_CREDITS_PER_SEMESTER, currentCredits, newCredits, (currentCredits + newCredits)
            ));
        }

        // Rule 4: Kiểm tra xung đột lịch học (Schedule Conflict)
        boolean hasConflict = checkScheduleConflict(section, currentSemesterEnrollments);

        // Cập nhật tăng current_enrolled
        section.setCurrentEnrolled(section.getCurrentEnrolled() + 1);
        classSectionRepository.save(section);

        // Lưu thông tin Enrollment
        enrollmentToSave.setStatus("REGISTERED");
        enrollmentToSave.setHasConflict(hasConflict);
        enrollmentToSave.setAttendanceRate(new BigDecimal("100.00"));
        enrollmentToSave.setRegisteredAt(LocalDateTime.now());
        Enrollment saved = enrollmentRepository.save(enrollmentToSave);

        log.info("Student {} registered successfully for section {}. Conflict status: {}",
                student.getStudentCode(), section.getSectionCode(), hasConflict);

        // Chuyển trạng thái giữ chỗ sang COMMITTED và broadcast cập nhật sĩ số
        realtimeSeatService.markCommitted(student.getId(), section.getId());
        realtimeSeatService.broadcastSeatUpdate(section.getId());

        return new EnrollmentResponse(
                saved.getId(),
                section.getId(),
                section.getSectionCode(),
                section.getCourse() != null ? section.getCourse().getCourseCode() : "",
                section.getCourse() != null ? section.getCourse().getName() : "",
                newCredits,
                saved.getStatus(),
                saved.getHasConflict(),
                saved.getRegisteredAt()
        );
    }

    /**
     * Xác nhận toàn bộ các lớp đang giữ chỗ trong 1 lần bấm (Batch Enroll All Held Slots).
     */
    @Transactional
    public List<EnrollmentResponse> batchEnrollHeldReservations(String studentIdentifier) {
        StudentProfile student = dashboardService.resolveStudent(studentIdentifier);
        LocalDateTime now = LocalDateTime.now();
        List<SlotReservation> activeHolds = reservationRepository.findActiveByStudentId(student.getId(), now);
        if (activeHolds.isEmpty()) {
            throw new BusinessException("Bạn hiện không có lớp học phần nào đang trong phiên giữ chỗ.");
        }

        List<EnrollmentResponse> enrolledList = new ArrayList<>();
        for (SlotReservation hold : activeHolds) {
            EnrollmentResponse response = enroll(studentIdentifier, hold.getClassSection().getId());
            enrolledList.add(response);
        }
        return enrolledList;
    }

    /**
     * Hủy đăng ký học phần (DELETE /api/v1/student/enrollments/{enrollmentId})
     */
    @Transactional
    public void cancelEnrollment(String studentIdentifier, Long enrollmentId) {
        StudentProfile student = dashboardService.resolveStudent(studentIdentifier);

        Enrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đăng ký học phần với ID: " + enrollmentId));

        if (!enrollment.getStudent().getId().equals(student.getId())) {
            throw new BusinessException(403, "Bạn không có quyền thao tác trên đăng ký học phần này");
        }

        if ("CANCELLED".equalsIgnoreCase(enrollment.getStatus())) {
            return; // Đã hủy từ trước
        }

        ClassSection section = enrollment.getClassSection();
        if (section != null) {
            // Giảm current_enrolled
            int updatedCount = Math.max(0, section.getCurrentEnrolled() - 1);
            section.setCurrentEnrolled(updatedCount);
            classSectionRepository.save(section);
        }

        // Chuyển status thành CANCELLED
        enrollment.setStatus("CANCELLED");
        enrollment.setHasConflict(false);
        enrollmentRepository.save(enrollment);

        if (section != null) {
            realtimeSeatService.broadcastSeatUpdate(section.getId());
        }

        log.info("Student {} cancelled enrollment ID: {}", student.getStudentCode(), enrollmentId);
    }

    /**
     * Xem bảng điểm cá nhân qua các kỳ (GET /api/v1/student/grades)
     */
    @Transactional(readOnly = true)
    public List<StudentGradeDto> getStudentGrades(String studentIdentifier) {
        StudentProfile student = dashboardService.resolveStudent(studentIdentifier);
        List<Grade> grades = gradeRepository.findByStudentId(student.getId());

        List<StudentGradeDto> dtoList = new ArrayList<>();
        for (Grade g : grades) {
            StudentGradeDto dto = new StudentGradeDto();
            dto.setEnrollmentId(g.getEnrollment().getId());
            dto.setAttendanceScore(g.getAttendanceScore());
            dto.setMidtermScore(g.getMidtermScore());
            dto.setFinalScore(g.getTotalScore());
            dto.setTotalScore(g.getTotalScore());
            dto.setLetterGrade(g.getLetterGrade());
            dto.setIsLocked(g.getIsLocked());

            if (g.getEnrollment() != null && g.getEnrollment().getClassSection() != null) {
                ClassSection cs = g.getEnrollment().getClassSection();
                dto.setSemesterName(cs.getSemesterName());
                if (cs.getCourse() != null) {
                    dto.setCourseCode(cs.getCourse().getCourseCode());
                    dto.setCourseName(cs.getCourse().getName());
                    dto.setCredits(cs.getCourse().getCredits());
                }
            }

            dtoList.add(dto);
        }
        return dtoList;
    }

    /**
     * Kiểm tra trùng thứ và giờ học với các lớp đã đăng ký
     */
    private boolean checkScheduleConflict(ClassSection target, List<Enrollment> activeEnrollments) {
        if (target.getDayOfWeek() == null || target.getStartTime() == null || target.getEndTime() == null) {
            return false;
        }

        for (Enrollment e : activeEnrollments) {
            ClassSection registered = e.getClassSection();
            if (registered == null || registered.getId().equals(target.getId())) {
                continue;
            }

            if (target.getDayOfWeek().equalsIgnoreCase(registered.getDayOfWeek())) {
                LocalTime startA = target.getStartTime();
                LocalTime endA = target.getEndTime();
                LocalTime startB = registered.getStartTime();
                LocalTime endB = registered.getEndTime();

                if (startB != null && endB != null) {
                    // Condition for overlapping intervals: startA < endB && endA > startB
                    if (startA.isBefore(endB) && endA.isAfter(startB)) {
                        log.warn("Schedule conflict detected between new section {} and registered section {} on {}",
                                target.getSectionCode(), registered.getSectionCode(), target.getDayOfWeek());
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
