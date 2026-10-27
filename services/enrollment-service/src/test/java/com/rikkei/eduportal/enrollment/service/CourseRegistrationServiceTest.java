package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.EnrollmentResponse;
import com.rikkei.eduportal.enrollment.entity.*;
import com.rikkei.eduportal.enrollment.exception.BusinessException;
import com.rikkei.eduportal.enrollment.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CourseRegistrationServiceTest {

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private ClassSectionRepository classSectionRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private GradeRepository gradeRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private StudentDashboardService dashboardService;

    @Mock
    private RealtimeSeatService realtimeSeatService;

    @InjectMocks
    private CourseRegistrationService registrationService;

    private StudentProfile student;
    private Course course;
    private ClassSection section;

    @BeforeEach
    void setUp() {
        student = new StudentProfile();
        student.setId(1L);
        student.setStudentCode("SV2024001");

        course = new Course();
        course.setId(10L);
        course.setCourseCode("CS201");
        course.setName("Data Structures");
        course.setCredits(3);
        course.setWeeklyHours(4);

        section = new ClassSection();
        section.setId(100L);
        section.setSectionCode("CS201-2025-01");
        section.setCourse(course);
        section.setSemesterName("2024-25_SEM2");
        section.setDayOfWeek("MON");
        section.setStartTime(LocalTime.of(9, 0));
        section.setEndTime(LocalTime.of(10, 30));
        section.setMaxCapacity(40);
        section.setCurrentEnrolled(10);
        section.setStatus("OPEN");
    }

    @Test
    void testEnroll_Success() {
        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(classSectionRepository.findByIdWithLock(100L)).thenReturn(Optional.of(section));
        when(enrollmentRepository.findByStudentIdAndClassSectionId(1L, 100L)).thenReturn(Optional.empty());
        when(enrollmentRepository.findActiveEnrollmentsByStudentAndSemester(1L, "2024-25_SEM2"))
                .thenReturn(Collections.emptyList());

        Enrollment savedEnrollment = new Enrollment();
        savedEnrollment.setId(500L);
        savedEnrollment.setStudent(student);
        savedEnrollment.setClassSection(section);
        savedEnrollment.setStatus("REGISTERED");
        savedEnrollment.setHasConflict(false);

        when(enrollmentRepository.save(any(Enrollment.class))).thenReturn(savedEnrollment);

        EnrollmentResponse response = registrationService.enroll("SV2024001", 100L);

        assertNotNull(response);
        assertEquals(500L, response.getEnrollmentId());
        assertEquals(100L, response.getClassSectionId());
        assertEquals("REGISTERED", response.getStatus());
        assertFalse(response.getHasConflict());
        assertEquals(11, section.getCurrentEnrolled());
        verify(classSectionRepository).save(section);
    }

    @Test
    void testEnroll_FailsWhenSectionIsFull() {
        section.setCurrentEnrolled(40);
        section.setMaxCapacity(40);

        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(classSectionRepository.findByIdWithLock(100L)).thenReturn(Optional.of(section));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                registrationService.enroll("SV2024001", 100L)
        );

        assertTrue(ex.getMessage().contains("đầy sĩ số"));
        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    void testEnroll_FailsWhenExceedsMaxCredits() {
        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(classSectionRepository.findByIdWithLock(100L)).thenReturn(Optional.of(section));
        when(enrollmentRepository.findByStudentIdAndClassSectionId(1L, 100L)).thenReturn(Optional.empty());

        // Create mock enrollments with 22 credits already
        Course heavyCourse = new Course();
        heavyCourse.setCredits(22);
        ClassSection existingSection = new ClassSection();
        existingSection.setId(99L);
        existingSection.setCourse(heavyCourse);
        Enrollment existingEnrollment = new Enrollment();
        existingEnrollment.setClassSection(existingSection);

        when(enrollmentRepository.findActiveEnrollmentsByStudentAndSemester(1L, "2024-25_SEM2"))
                .thenReturn(List.of(existingEnrollment));

        // Adding 3 credits to 22 credits = 25 credits > 24 credits limit
        BusinessException ex = assertThrows(BusinessException.class, () ->
                registrationService.enroll("SV2024001", 100L)
        );

        assertTrue(ex.getMessage().contains("Vượt quá giới hạn đăng ký tối đa 24 tín chỉ"));
        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    void testEnroll_DetectsScheduleConflict() {
        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(classSectionRepository.findByIdWithLock(100L)).thenReturn(Optional.of(section));
        when(enrollmentRepository.findByStudentIdAndClassSectionId(1L, 100L)).thenReturn(Optional.empty());

        // Conflicting section on MON from 09:30 to 11:00 (overlaps with 09:00 - 10:30)
        Course conflictCourse = new Course();
        conflictCourse.setCredits(3);
        ClassSection conflictSection = new ClassSection();
        conflictSection.setId(200L);
        conflictSection.setSectionCode("CS301-2025-01");
        conflictSection.setDayOfWeek("MON");
        conflictSection.setStartTime(LocalTime.of(9, 30));
        conflictSection.setEndTime(LocalTime.of(11, 0));
        conflictSection.setCourse(conflictCourse);

        Enrollment activeConflicting = new Enrollment();
        activeConflicting.setClassSection(conflictSection);

        when(enrollmentRepository.findActiveEnrollmentsByStudentAndSemester(1L, "2024-25_SEM2"))
                .thenReturn(List.of(activeConflicting));

        Enrollment savedEnrollment = new Enrollment();
        savedEnrollment.setId(501L);
        savedEnrollment.setClassSection(section);
        savedEnrollment.setStatus("REGISTERED");
        savedEnrollment.setHasConflict(true);

        when(enrollmentRepository.save(any(Enrollment.class))).thenReturn(savedEnrollment);

        EnrollmentResponse response = registrationService.enroll("SV2024001", 100L);

        assertNotNull(response);
        assertTrue(response.getHasConflict());
    }

    @Test
    void testCancelEnrollment_Success() {
        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);

        Enrollment enrollment = new Enrollment();
        enrollment.setId(777L);
        enrollment.setStudent(student);
        enrollment.setClassSection(section);
        enrollment.setStatus("REGISTERED");

        when(enrollmentRepository.findById(777L)).thenReturn(Optional.of(enrollment));

        registrationService.cancelEnrollment("SV2024001", 777L);

        assertEquals("CANCELLED", enrollment.getStatus());
        assertEquals(9, section.getCurrentEnrolled());
        verify(classSectionRepository).save(section);
        verify(enrollmentRepository).save(enrollment);
    }
}
