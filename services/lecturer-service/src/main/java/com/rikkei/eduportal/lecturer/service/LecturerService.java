package com.rikkei.eduportal.lecturer.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.common.AuditDeltaPayload;
import com.rikkei.eduportal.common.EnrollmentStatus;
import com.rikkei.eduportal.lecturer.dto.request.AttendanceUpdateRequest;
import com.rikkei.eduportal.lecturer.dto.request.GradeUpdateRequest;
import com.rikkei.eduportal.lecturer.dto.response.ClassSectionResponse;
import com.rikkei.eduportal.lecturer.dto.response.LockGradesResponse;
import com.rikkei.eduportal.lecturer.dto.response.StudentGradeResponse;
import com.rikkei.eduportal.lecturer.entity.*;
import com.rikkei.eduportal.lecturer.exception.*;
import com.rikkei.eduportal.lecturer.grade.GradeCalculator;
import com.rikkei.eduportal.lecturer.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class LecturerService {

    private static final Logger log = LoggerFactory.getLogger(LecturerService.class);

    private final LecturerProfileRepository lecturerProfileRepo;
    private final ClassSectionRepository classSectionRepo;
    private final EnrollmentRepository enrollmentRepo;
    private final GradeRepository gradeRepo;
    private final StudentProfileRepository studentProfileRepo;
    private final GradeCalculator gradeCalculator;
    private final AuditLogRepository auditLogRepo;
    private final ObjectMapper objectMapper;

    @Autowired
    public LecturerService(LecturerProfileRepository lecturerProfileRepo,
                           ClassSectionRepository classSectionRepo,
                           EnrollmentRepository enrollmentRepo,
                           GradeRepository gradeRepo,
                           StudentProfileRepository studentProfileRepo,
                           GradeCalculator gradeCalculator,
                           AuditLogRepository auditLogRepo,
                           ObjectMapper objectMapper) {
        this.lecturerProfileRepo = lecturerProfileRepo;
        this.classSectionRepo = classSectionRepo;
        this.enrollmentRepo = enrollmentRepo;
        this.gradeRepo = gradeRepo;
        this.studentProfileRepo = studentProfileRepo;
        this.gradeCalculator = gradeCalculator;
        this.auditLogRepo = auditLogRepo;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    public LecturerService(LecturerProfileRepository lecturerProfileRepo,
                           ClassSectionRepository classSectionRepo,
                           EnrollmentRepository enrollmentRepo,
                           GradeRepository gradeRepo,
                           StudentProfileRepository studentProfileRepo,
                           GradeCalculator gradeCalculator) {
        this(lecturerProfileRepo, classSectionRepo, enrollmentRepo, gradeRepo, studentProfileRepo, gradeCalculator, null, new ObjectMapper());
    }

    // =========================================================================
    // 1. GET /classes — danh sách lớp của giảng viên
    // =========================================================================

    public List<ClassSectionResponse> getMyClasses(String username, String semesterName) {
        LecturerProfile lecturer = resolveLecturer(username);
        List<ClassSection> sections = classSectionRepo
                .findByLecturerIdAndSemester(lecturer.getId(), semesterName);
        return sections.stream().map(this::toClassSectionResponse).toList();
    }

    // =========================================================================
    // 2. GET /classes/{sectionId}/students — SV REGISTERED của lớp
    // =========================================================================

    public List<StudentGradeResponse> getStudentsOfSection(String username, Long sectionId) {
        LecturerProfile lecturer = resolveLecturer(username);
        checkOwnership(sectionId, lecturer.getId());

        List<Enrollment> enrollments = enrollmentRepo
                .findBySectionIdAndStatus(sectionId, EnrollmentStatus.REGISTERED);

        // Fetch all grades for this section in one query → map by enrollmentId
        Map<Long, Grade> gradeMap = gradeRepo.findBySectionId(sectionId)
                .stream().collect(Collectors.toMap(g -> g.getEnrollment().getId(), Function.identity()));

        return enrollments.stream()
                .map(e -> toStudentGradeResponse(e, gradeMap.get(e.getId())))
                .toList();
    }

    // =========================================================================
    // 3. PUT /enrollments/{enrollmentId}/attendance
    // =========================================================================

    @Transactional
    public StudentGradeResponse updateAttendance(String username,
                                                 Long enrollmentId,
                                                 AttendanceUpdateRequest request) {
        Enrollment enrollment = resolveEnrollment(enrollmentId);
        LecturerProfile lecturer = resolveLecturer(username);
        checkOwnership(enrollment.getClassSection().getId(), lecturer.getId());

        // Lấy hoặc tạo grade
        Grade grade = gradeRepo.findByEnrollmentId(enrollmentId)
                .orElseGet(() -> {
                    Grade g = new Grade();
                    g.setEnrollment(enrollment);
                    return g;
                });

        if (Boolean.TRUE.equals(grade.getIsLocked())) {
            throw new GradeLockedConflictException(
                    "Điểm của enrollment " + enrollmentId + " đã bị khóa, không thể sửa chuyên cần.");
        }

        BigDecimal oldAtt = grade.getAttendanceScore();
        BigDecimal oldMid = grade.getMidtermScore();
        BigDecimal oldFinal = grade.getFinalScore();
        BigDecimal oldTotal = grade.getTotalScore();
        String oldLetter = grade.getLetterGrade();

        BigDecimal oldRate = enrollment.getAttendanceRate();
        enrollment.setAttendanceRate(request.attendanceRate());

        BigDecimal newAttScore = gradeCalculator.attendanceScoreFromRate(request.attendanceRate());
        grade.setAttendanceScore(newAttScore);

        // Tính lại total nếu đủ midterm và final
        BigDecimal newTotal = gradeCalculator.calculateTotal(
                newAttScore, grade.getMidtermScore(), grade.getFinalScore());
        grade.setTotalScore(newTotal);
        grade.setLetterGrade(gradeCalculator.calculateLetterGrade(newTotal));

        enrollmentRepo.save(enrollment);
        Grade saved = gradeRepo.save(grade);

        if (newTotal != null) {
            recalculateCgpa(enrollment.getStudent());
        }

        // Ghi Audit Log biến động điểm
        recordGradeAuditLog(username, enrollment, oldAtt, oldMid, oldFinal, oldTotal, oldLetter, saved, "chuyên cần");

        log.info("UPDATE_ATTENDANCE lecturerId={} enrollmentId={} oldRate={} newRate={}",
                lecturer.getId(), enrollmentId, oldRate, request.attendanceRate());

        return toStudentGradeResponse(enrollment, saved);
    }

    // =========================================================================
    // 4. PUT /grades/{enrollmentId}
    // =========================================================================

    @Transactional
    public StudentGradeResponse updateGrade(String username,
                                            Long enrollmentId,
                                            GradeUpdateRequest request) {
        Enrollment enrollment = resolveEnrollment(enrollmentId);
        LecturerProfile lecturer = resolveLecturer(username);
        checkOwnership(enrollment.getClassSection().getId(), lecturer.getId());

        Grade grade = gradeRepo.findByEnrollmentId(enrollmentId)
                .orElseGet(() -> {
                    Grade g = new Grade();
                    g.setEnrollment(enrollment);
                    return g;
                });

        if (Boolean.TRUE.equals(grade.getIsLocked())) {
            throw new GradeLockedConflictException(
                    "Điểm của enrollment " + enrollmentId + " đã bị khóa, không thể sửa.");
        }

        // Lưu lại trạng thái cũ
        BigDecimal oldAtt = grade.getAttendanceScore();
        BigDecimal oldMid = grade.getMidtermScore();
        BigDecimal oldFinal = grade.getFinalScore();
        BigDecimal oldTotal = grade.getTotalScore();
        String oldLetter = grade.getLetterGrade();

        // Log giá trị cũ
        log.info("UPDATE_GRADE lecturerId={} enrollmentId={} " +
                        "oldAtt={} oldMid={} oldFinal={} | " +
                        "newAtt={} newMid={} newFinal={}",
                lecturer.getId(), enrollmentId,
                grade.getAttendanceScore(), grade.getMidtermScore(), grade.getFinalScore(),
                request.attendanceScore(), request.midtermScore(), request.finalScore());

        // Chỉ ghi đè field nào được gửi lên (null = giữ nguyên)
        if (request.attendanceScore() != null) {
            grade.setAttendanceScore(request.attendanceScore());
            // Đồng bộ ngược attendance_rate trên enrollment
            enrollment.setAttendanceRate(
                    request.attendanceScore().multiply(BigDecimal.TEN));
            enrollmentRepo.save(enrollment);
        }
        if (request.midtermScore() != null) grade.setMidtermScore(request.midtermScore());
        if (request.finalScore() != null)   grade.setFinalScore(request.finalScore());

        // Tính lại total
        BigDecimal newTotal = gradeCalculator.calculateTotal(
                grade.getAttendanceScore(), grade.getMidtermScore(), grade.getFinalScore());
        grade.setTotalScore(newTotal);
        grade.setLetterGrade(gradeCalculator.calculateLetterGrade(newTotal));

        Grade saved = gradeRepo.save(grade);

        // Cập nhật CGPA của sinh viên nếu có total mới
        if (newTotal != null) {
            recalculateCgpa(enrollment.getStudent());
        }

        // Ghi nhận Audit Log biến động điểm
        recordGradeAuditLog(username, enrollment, oldAtt, oldMid, oldFinal, oldTotal, oldLetter, saved, "điểm số");

        return toStudentGradeResponse(enrollment, saved);
    }

    // =========================================================================
    // 5. POST /classes/{sectionId}/lock-grades
    // =========================================================================

    @Transactional
    public LockGradesResponse lockGrades(String username, Long sectionId) {
        LecturerProfile lecturer = resolveLecturer(username);
        checkOwnership(sectionId, lecturer.getId());

        List<Enrollment> registered = enrollmentRepo.findRegisteredBySectionId(sectionId);

        // Kiểm tra tất cả SV đã có total_score
        Map<Long, Grade> gradeMap = gradeRepo.findBySectionId(sectionId)
                .stream().collect(Collectors.toMap(g -> g.getEnrollment().getId(), Function.identity()));

        List<String> missing = new ArrayList<>();
        for (Enrollment e : registered) {
            Grade g = gradeMap.get(e.getId());
            if (g == null || g.getTotalScore() == null) {
                missing.add(e.getStudent().getStudentCode());
            }
        }

        if (!missing.isEmpty()) {
            throw new MissingGradesException(
                    "Vẫn còn " + missing.size() + " sinh viên chưa có đủ điểm.", missing);
        }

        // Lock tất cả grade của lớp
        int locked = gradeRepo.lockAllBySectionId(sectionId);

        // Cập nhật credits_earned cho SV đạt (letter != F) và chuyển status thành COMPLETED
        for (Enrollment e : registered) {
            Grade g = gradeMap.get(e.getId());
            if (g != null && !"F".equals(g.getLetterGrade())) {
                StudentProfile student = e.getStudent();
                int currentCredits = student.getCreditsEarned() != null ? student.getCreditsEarned() : 0;
                int courseCredits = e.getClassSection().getCourse().getCredits();
                student.setCreditsEarned(currentCredits + courseCredits);
                studentProfileRepo.save(student);

                // Đánh dấu môn học đã hoàn thành
                e.setStatus(EnrollmentStatus.COMPLETED);
                enrollmentRepo.save(e);
            }
        }

        // Ghi nhận Audit Log cho hành động chốt điểm lớp
        recordLockGradesAuditLog(username, sectionId, locked);

        log.info("LOCK_GRADES lecturerId={} sectionId={} lockedCount={}",
                lecturer.getId(), sectionId, locked);

        return new LockGradesResponse(sectionId, locked, true, "Chốt điểm thành công cho " + locked + " sinh viên.");
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    private LecturerProfile resolveLecturer(String username) {
        return lecturerProfileRepo.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy hồ sơ giảng viên cho username: " + username));
    }

    private Enrollment resolveEnrollment(Long enrollmentId) {
        return enrollmentRepo.findById(enrollmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy enrollment id: " + enrollmentId));
    }

    void checkOwnership(Long sectionId, Long lecturerId) {
        if (classSectionRepo.findByIdAndLecturerId(sectionId, lecturerId).isEmpty()) {
            throw new AccessDeniedException(
                    "Giảng viên không được phân công giảng dạy (không có quyền thao tác) trên lớp id: " + sectionId);
        }
    }

    /**
     * Tính lại CGPA cho sinh viên dựa trên tất cả grade đã có total_score.
     * Gán previous_cgpa = current_cgpa trước khi cập nhật.
     */
    private void recalculateCgpa(StudentProfile student) {
        List<Grade> gradesWithTotal = gradeRepo.findGradesWithTotalByStudentId(student.getId());

        List<GradeCalculator.GradeCredit> gradeCredits = gradesWithTotal.stream()
                .map(g -> new GradeCalculator.GradeCredit(
                        g.getTotalScore(),
                        g.getEnrollment().getClassSection().getCourse().getCredits()))
                .toList();

        BigDecimal newCgpa = gradeCalculator.calculateCgpa(gradeCredits);
        if (newCgpa != null) {
            student.setPreviousCgpa(student.getCurrentCgpa());
            student.setCurrentCgpa(newCgpa);
            studentProfileRepo.save(student);
            log.info("CGPA_UPDATED studentId={} previous={} current={}",
                    student.getId(), student.getPreviousCgpa(), newCgpa);
        }
    }

    // =========================================================================
    // Mappers thủ công
    // =========================================================================

    private ClassSectionResponse toClassSectionResponse(ClassSection cs) {
        return new ClassSectionResponse(
                cs.getId(),
                cs.getSectionCode(),
                cs.getCourse().getName(),
                cs.getCourse().getCourseCode(),
                cs.getCourse().getCredits(),
                cs.getSemesterName(),
                cs.getDayOfWeek(),
                cs.getStartTime(),
                cs.getEndTime(),
                cs.getRoomName(),
                cs.getCurrentEnrolled(),
                cs.getMaxCapacity(),
                cs.getStatus() != null ? cs.getStatus().name() : null
        );
    }

    private StudentGradeResponse toStudentGradeResponse(Enrollment e, Grade grade) {
        BigDecimal attendanceScore = null;
        if (grade != null && grade.getAttendanceScore() != null) {
            attendanceScore = grade.getAttendanceScore();
        } else if (e.getAttendanceRate() != null) {
            attendanceScore = gradeCalculator.attendanceScoreFromRate(e.getAttendanceRate());
        }

        return new StudentGradeResponse(
                e.getId(),
                e.getStudent().getStudentCode(),
                e.getStudent().getUser().getFullName(),
                e.getAttendanceRate(),
                attendanceScore,
                grade != null ? grade.getMidtermScore() : null,
                grade != null ? grade.getFinalScore() : null,
                grade != null ? grade.getTotalScore() : null,
                grade != null ? grade.getLetterGrade() : null,
                grade != null && Boolean.TRUE.equals(grade.getIsLocked())
        );
    }

    private void recordGradeAuditLog(String username,
                                     Enrollment enrollment,
                                     BigDecimal oldAtt,
                                     BigDecimal oldMid,
                                     BigDecimal oldFinal,
                                     BigDecimal oldTotal,
                                     String oldLetter,
                                     Grade saved,
                                     String note) {
        if (auditLogRepo == null) return;
        try {
            AuditDeltaPayload delta = new AuditDeltaPayload("StudentGrade", String.valueOf(enrollment.getId()));

            if (saved.getAttendanceScore() != null && !Objects.equals(oldAtt, saved.getAttendanceScore())) {
                delta.addDiff("attendanceScore", oldAtt, saved.getAttendanceScore());
            }
            if (saved.getMidtermScore() != null && !Objects.equals(oldMid, saved.getMidtermScore())) {
                delta.addDiff("midtermScore", oldMid, saved.getMidtermScore());
            }
            if (saved.getFinalScore() != null && !Objects.equals(oldFinal, saved.getFinalScore())) {
                delta.addDiff("finalScore", oldFinal, saved.getFinalScore());
            }
            if (saved.getTotalScore() != null && !Objects.equals(oldTotal, saved.getTotalScore())) {
                delta.addDiff("totalScore", oldTotal, saved.getTotalScore());
            }
            if (saved.getLetterGrade() != null && !Objects.equals(oldLetter, saved.getLetterGrade())) {
                delta.addDiff("letterGrade", oldLetter, saved.getLetterGrade());
            }

            if (!delta.getChangedFields().isEmpty()) {
                String studentCode = (enrollment.getStudent() != null) ? enrollment.getStudent().getStudentCode() : "N/A";
                String studentName = (enrollment.getStudent() != null && enrollment.getStudent().getUser() != null)
                        ? enrollment.getStudent().getUser().getFullName() : studentCode;
                String sectionCode = (enrollment.getClassSection() != null) ? enrollment.getClassSection().getSectionCode() : "N/A";
                String courseName = (enrollment.getClassSection() != null && enrollment.getClassSection().getCourse() != null)
                        ? enrollment.getClassSection().getCourse().getName() : "N/A";

                delta.addMetadata("studentCode", studentCode);
                delta.addMetadata("studentName", studentName);
                delta.addMetadata("sectionCode", sectionCode);
                delta.addMetadata("courseName", courseName);
                delta.addMetadata("type", note);

                String deltaJson = objectMapper != null ? objectMapper.writeValueAsString(delta) : "";
                String summary = "Giảng viên " + username + " cập nhật " + note + " môn " + courseName + " cho SV " + studentName + " (" + studentCode + ")";

                AuditLog auditLog = new AuditLog(
                        "GRADE_UPDATED",
                        username,
                        "ROLE_LECTURER",
                        "StudentGrade",
                        String.valueOf(enrollment.getId()),
                        summary,
                        null,
                        deltaJson,
                        "127.0.0.1"
                );
                auditLogRepo.save(auditLog);
                log.info("Recorded audit log for grade update on enrollment {}: {}", enrollment.getId(), delta.getChangedFields());
            }
        } catch (Exception ex) {
            log.error("Failed to record grade audit log for enrollment {}", enrollment.getId(), ex);
        }
    }

    private void recordLockGradesAuditLog(String username, Long sectionId, int lockedCount) {
        if (auditLogRepo == null) return;
        try {
            ClassSection section = classSectionRepo.findById(sectionId).orElse(null);
            String sectionCode = section != null ? section.getSectionCode() : String.valueOf(sectionId);
            String courseName = (section != null && section.getCourse() != null)
                    ? section.getCourse().getName() : "N/A";

            AuditDeltaPayload delta = new AuditDeltaPayload("ClassSection", String.valueOf(sectionId));
            delta.addDiff("isLocked", false, true);
            delta.addMetadata("sectionId", sectionId);
            delta.addMetadata("sectionCode", sectionCode);
            delta.addMetadata("courseName", courseName);
            delta.addMetadata("lockedCount", lockedCount);

            String deltaJson = objectMapper != null ? objectMapper.writeValueAsString(delta) : "";
            String summary = "Giảng viên " + username + " chốt sổ điểm lớp học phần " + sectionCode + " (" + courseName + ") cho " + lockedCount + " sinh viên";

            AuditLog auditLog = new AuditLog(
                    "GRADE_LOCKED",
                    username,
                    "ROLE_LECTURER",
                    "ClassSection",
                    String.valueOf(sectionId),
                    summary,
                    null,
                    deltaJson,
                    "127.0.0.1"
            );
            auditLogRepo.save(auditLog);
            log.info("Recorded audit log for lock grades on section {}: {} students locked", sectionId, lockedCount);
        } catch (Exception ex) {
            log.error("Failed to record lock grades audit log for section {}", sectionId, ex);
        }
    }
}
