package com.rikkei.eduportal.lecturer.service;

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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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

    public LecturerService(LecturerProfileRepository lecturerProfileRepo,
                           ClassSectionRepository classSectionRepo,
                           EnrollmentRepository enrollmentRepo,
                           GradeRepository gradeRepo,
                           StudentProfileRepository studentProfileRepo,
                           GradeCalculator gradeCalculator) {
        this.lecturerProfileRepo = lecturerProfileRepo;
        this.classSectionRepo = classSectionRepo;
        this.enrollmentRepo = enrollmentRepo;
        this.gradeRepo = gradeRepo;
        this.studentProfileRepo = studentProfileRepo;
        this.gradeCalculator = gradeCalculator;
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

        // Cập nhật credits_earned cho SV đạt (letter != F)
        for (Enrollment e : registered) {
            Grade g = gradeMap.get(e.getId());
            if (g != null && !"F".equals(g.getLetterGrade())) {
                StudentProfile student = e.getStudent();
                int currentCredits = student.getCreditsEarned() != null ? student.getCreditsEarned() : 0;
                int courseCredits = e.getClassSection().getCourse().getCredits();
                student.setCreditsEarned(currentCredits + courseCredits);
                studentProfileRepo.save(student);
            }
        }

        log.info("LOCK_GRADES lecturerId={} sectionId={} lockedCount={}",
                lecturer.getId(), sectionId, locked);

        return new LockGradesResponse(sectionId, locked, "Chốt điểm thành công cho " + locked + " sinh viên.");
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

    private void checkOwnership(Long sectionId, Long lecturerId) {
        classSectionRepo.findByIdAndLecturerId(sectionId, lecturerId)
                .orElseThrow(() -> new AccessDeniedException(
                        "Giảng viên không có quyền thao tác trên lớp id: " + sectionId));
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
        return new StudentGradeResponse(
                e.getId(),
                e.getStudent().getStudentCode(),
                e.getStudent().getUser().getFullName(),
                e.getAttendanceRate(),
                grade != null ? grade.getMidtermScore() : null,
                grade != null ? grade.getFinalScore() : null,
                grade != null ? grade.getTotalScore() : null,
                grade != null ? grade.getLetterGrade() : null,
                grade != null && Boolean.TRUE.equals(grade.getIsLocked())
        );
    }
}
