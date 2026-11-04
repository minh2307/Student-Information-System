package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.StudentAcademicContextDto;
import com.rikkei.eduportal.enrollment.entity.*;
import com.rikkei.eduportal.enrollment.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AcademicContextServiceTest {

    @Mock
    private StudentDashboardService dashboardService;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private GradeRepository gradeRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private ClassSectionRepository classSectionRepository;

    @InjectMocks
    private AcademicContextService academicContextService;

    private StudentProfile student;
    private Course course1;
    private Course course2;
    private Course course3;
    private ClassSection section1;
    private ClassSection section2;
    private ClassSection section3;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setId(1L);
        user.setUsername("sv2024001");
        user.setFullName("Nguyễn Văn C");

        student = new StudentProfile();
        student.setId(10L);
        student.setUser(user);
        student.setStudentCode("SV2024001");
        student.setMajor("B.Tech Computer Science");
        student.setCurrentSemester(6);
        student.setCreditsEarned(84);
        student.setTotalRequiredCredits(160);
        student.setCurrentCgpa(BigDecimal.valueOf(8.74));
        student.setPreviousCgpa(BigDecimal.valueOf(8.62));

        course1 = new Course();
        course1.setId(1L);
        course1.setCourseCode("CS101");
        course1.setName("Introduction to Programming");
        course1.setCredits(3);
        course1.setWeeklyHours(4);

        course2 = new Course();
        course2.setId(2L);
        course2.setCourseCode("CS201");
        course2.setName("Data Structures and Algorithms");
        course2.setCredits(3);
        course2.setWeeklyHours(4);
        course2.setPrerequisiteCourseId(1L);

        course3 = new Course();
        course3.setId(3L);
        course3.setCourseCode("CS401");
        course3.setName("Web Application Development");
        course3.setCredits(3);
        course3.setWeeklyHours(4);
        course3.setPrerequisiteCourseId(2L);

        section1 = new ClassSection();
        section1.setId(101L);
        section1.setSectionCode("CS201-01");
        section1.setCourse(course2);
        section1.setSemesterName("2024-25_SEM2");
        section1.setStatus("OPEN");
        section1.setDayOfWeek("MON");
        section1.setStartTime(LocalTime.of(9, 0));
        section1.setEndTime(LocalTime.of(10, 30));

        section2 = new ClassSection();
        section2.setId(102L);
        section2.setSectionCode("CS401-01");
        section2.setCourse(course3);
        section2.setSemesterName("2024-25_SEM2");
        section2.setStatus("OPEN");
        section2.setDayOfWeek("WED");
        section2.setStartTime(LocalTime.of(13, 30));
        section2.setEndTime(LocalTime.of(15, 0));

        section3 = new ClassSection();
        section3.setId(103L);
        section3.setSectionCode("CS401-02");
        section3.setCourse(course3);
        section3.setSemesterName("2024-25_SEM2");
        section3.setStatus("OPEN");
        section3.setDayOfWeek("MON");
        section3.setStartTime(LocalTime.of(9, 30)); // Overlaps with section1 on MON
        section3.setEndTime(LocalTime.of(11, 0));
    }

    @Test
    @DisplayName("Should aggregate full academic context with completed, current, and prerequisite satisfaction")
    void getStudentAcademicContext_success() {
        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);

        // Grade for CS101 (completed)
        Enrollment pastEnrollment = new Enrollment();
        pastEnrollment.setId(201L);
        pastEnrollment.setStudent(student);
        ClassSection pastSection = new ClassSection();
        pastSection.setCourse(course1);
        pastSection.setSemesterName("2024-25_SEM1");
        pastEnrollment.setClassSection(pastSection);
        pastEnrollment.setStatus("COMPLETED");

        Grade grade = new Grade();
        grade.setId(301L);
        grade.setEnrollment(pastEnrollment);
        grade.setLetterGrade("A");
        grade.setTotalScore(BigDecimal.valueOf(8.8));
        when(gradeRepository.findByStudentId(10L)).thenReturn(List.of(grade));

        // Active enrollment for CS201
        Enrollment activeEnrollment = new Enrollment();
        activeEnrollment.setId(202L);
        activeEnrollment.setStudent(student);
        activeEnrollment.setClassSection(section1);
        activeEnrollment.setStatus("REGISTERED");
        activeEnrollment.setHasConflict(false);
        activeEnrollment.setAttendanceRate(BigDecimal.valueOf(95.0));

        when(enrollmentRepository.findAllByStudentId(10L)).thenReturn(List.of(pastEnrollment, activeEnrollment));
        when(enrollmentRepository.findActiveEnrollmentsByStudent(10L)).thenReturn(List.of(activeEnrollment));

        // Catalog & sections
        when(courseRepository.findAll()).thenReturn(List.of(course1, course2, course3));
        when(classSectionRepository.searchSections(null, null)).thenReturn(List.of(section1, section2, section3));

        StudentAcademicContextDto context = academicContextService.getStudentAcademicContext("SV2024001");

        assertNotNull(context);
        assertEquals("SV2024001", context.getStudentCode());
        assertEquals("Nguyễn Văn C", context.getFullName());
        assertEquals(84, context.getCompletedCredits());
        assertEquals(3, context.getRegisteredCredits());
        assertEquals("Xuất sắc", context.getAcademicStanding());

        // Completed courses
        assertEquals(1, context.getCompletedCourses().size());
        assertEquals("CS101", context.getCompletedCourses().getFirst().getCourseCode());

        // Active enrollments
        assertEquals(1, context.getCurrentEnrollments().size());
        assertEquals("CS201", context.getCurrentEnrollments().getFirst().getCourseCode());

        // Available courses: CS401 prerequisite is CS201, which is in progress (not completed yet)
        assertFalse(context.getAvailableCourses().isEmpty());
        var cs401Opt = context.getAvailableCourses().stream().filter(c -> "CS401".equals(c.getCourseCode())).findFirst();
        assertTrue(cs401Opt.isPresent());
        assertFalse(cs401Opt.get().getPrerequisiteSatisfied()); // CS201 not yet in completedCourses
        assertTrue(cs401Opt.get().getHasScheduleConflict()); // section3 overlaps with active section1
    }
}
