package com.rikkei.eduportal.lecturer.service;

import com.rikkei.eduportal.common.EnrollmentStatus;
import com.rikkei.eduportal.lecturer.dto.request.GradeUpdateRequest;
import com.rikkei.eduportal.lecturer.entity.*;
import com.rikkei.eduportal.lecturer.exception.AccessDeniedException;
import com.rikkei.eduportal.lecturer.exception.GradeLockedConflictException;
import com.rikkei.eduportal.lecturer.grade.GradeCalculator;
import com.rikkei.eduportal.lecturer.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LecturerServiceTest {

    @Mock private LecturerProfileRepository lecturerProfileRepo;
    @Mock private ClassSectionRepository classSectionRepo;
    @Mock private EnrollmentRepository enrollmentRepo;
    @Mock private GradeRepository gradeRepo;
    @Mock private StudentProfileRepository studentProfileRepo;

    // Dùng instance thật để tránh mock logic nghiệp vụ
    private final GradeCalculator gradeCalculator = new GradeCalculator();

    @InjectMocks
    private LecturerService lecturerService;

    @BeforeEach
    void injectCalculator() {
        // @InjectMocks tự động inject mock nhưng gradeCalculator là real instance
        // → tạo lại lecturerService thủ công
        lecturerService = new LecturerService(
                lecturerProfileRepo,
                classSectionRepo,
                enrollmentRepo,
                gradeRepo,
                studentProfileRepo,
                gradeCalculator
        );
    }

    // =========================================================================
    // Ownership check
    // =========================================================================

    @Test
    @DisplayName("updateGrade: giảng viên khác sectionId → 403 AccessDeniedException")
    void updateGrade_wrongLecturer_throws403() {
        // Setup: lecturer profile của user "other_lecturer" (lecturerId=99)
        LecturerProfile otherLecturer = buildLecturerProfile(99L, "other_lecturer");
        when(lecturerProfileRepo.findByUsername("other_lecturer"))
                .thenReturn(Optional.of(otherLecturer));

        // Enrollment thuộc section 1
        Enrollment enrollment = buildEnrollment(10L, 1L);
        when(enrollmentRepo.findById(10L)).thenReturn(Optional.of(enrollment));

        // checkOwnership trả empty → 403
        when(classSectionRepo.findByIdAndLecturerId(1L, 99L))
                .thenReturn(Optional.empty());

        GradeUpdateRequest req = new GradeUpdateRequest(null, new BigDecimal("8.0"), null);

        assertThatThrownBy(() ->
                lecturerService.updateGrade("other_lecturer", 10L, req))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("1");
    }

    // =========================================================================
    // Grade locked check
    // =========================================================================

    @Test
    @DisplayName("updateGrade: grade đã locked → 409 GradeLockedConflictException")
    void updateGrade_locked_throws409() {
        LecturerProfile lecturer = buildLecturerProfile(1L, "gv001");
        when(lecturerProfileRepo.findByUsername("gv001")).thenReturn(Optional.of(lecturer));

        Enrollment enrollment = buildEnrollment(10L, 1L);
        when(enrollmentRepo.findById(10L)).thenReturn(Optional.of(enrollment));

        ClassSection section = buildSection(1L, 1L);
        when(classSectionRepo.findByIdAndLecturerId(1L, 1L)).thenReturn(Optional.of(section));

        // Grade đã lock
        Grade lockedGrade = new Grade();
        lockedGrade.setIsLocked(true);
        when(gradeRepo.findByEnrollmentId(10L)).thenReturn(Optional.of(lockedGrade));

        GradeUpdateRequest req = new GradeUpdateRequest(null, new BigDecimal("8.0"), null);

        assertThatThrownBy(() ->
                lecturerService.updateGrade("gv001", 10L, req))
                .isInstanceOf(GradeLockedConflictException.class)
                .hasMessageContaining("đã bị khóa");
    }

    @Test
    @DisplayName("updateAttendance: grade đã locked → 409 GradeLockedConflictException")
    void updateAttendance_locked_throws409() {
        LecturerProfile lecturer = buildLecturerProfile(1L, "gv001");
        when(lecturerProfileRepo.findByUsername("gv001")).thenReturn(Optional.of(lecturer));

        Enrollment enrollment = buildEnrollment(10L, 1L);
        when(enrollmentRepo.findById(10L)).thenReturn(Optional.of(enrollment));

        when(classSectionRepo.findByIdAndLecturerId(1L, 1L))
                .thenReturn(Optional.of(buildSection(1L, 1L)));

        Grade lockedGrade = new Grade();
        lockedGrade.setIsLocked(true);
        when(gradeRepo.findByEnrollmentId(10L)).thenReturn(Optional.of(lockedGrade));

        var req = new com.rikkei.eduportal.lecturer.dto.request.AttendanceUpdateRequest(
                new BigDecimal("80.0"));

        assertThatThrownBy(() ->
                lecturerService.updateAttendance("gv001", 10L, req))
                .isInstanceOf(GradeLockedConflictException.class);
    }

    // =========================================================================
    // Builder helpers
    // =========================================================================

    private LecturerProfile buildLecturerProfile(Long id, String username) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setFullName("GV Test");

        LecturerProfile lp = new LecturerProfile();
        lp.setId(id);
        lp.setUser(user);
        lp.setLecturerCode("GV00" + id);
        return lp;
    }

    private Enrollment buildEnrollment(Long enrollmentId, Long sectionId) {
        ClassSection section = buildSection(sectionId, 1L);

        User svUser = new User();
        svUser.setId(100L);
        svUser.setFullName("SV Test");

        StudentProfile student = new StudentProfile();
        student.setId(100L);
        student.setStudentCode("SV2024001");
        student.setUser(svUser);
        student.setCurrentCgpa(BigDecimal.ZERO);
        student.setPreviousCgpa(BigDecimal.ZERO);

        Enrollment e = new Enrollment();
        e.setId(enrollmentId);
        e.setClassSection(section);
        e.setStudent(student);
        e.setStatus(EnrollmentStatus.REGISTERED);
        e.setAttendanceRate(new BigDecimal("90.00"));
        return e;
    }

    private ClassSection buildSection(Long sectionId, Long lecturerId) {
        Course course = new Course();
        course.setId(1L);
        course.setCourseCode("CS201");
        course.setName("DSA");
        course.setCredits(3);

        LecturerProfile lp = new LecturerProfile();
        lp.setId(lecturerId);

        ClassSection cs = new ClassSection();
        cs.setId(sectionId);
        cs.setSectionCode("CS201-2025-01");
        cs.setCourse(course);
        cs.setLecturer(lp);
        cs.setCurrentEnrolled(2);
        cs.setMaxCapacity(40);
        return cs;
    }
}
