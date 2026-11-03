package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.ClassSectionDto;
import com.rikkei.eduportal.enrollment.dto.EnrollmentResponse;
import com.rikkei.eduportal.enrollment.entity.*;
import com.rikkei.eduportal.enrollment.exception.BusinessException;
import com.rikkei.eduportal.enrollment.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Test Suite: Course Registration & Anti-Slot-Theft Protection")
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

    @Mock
    private SlotReservationRepository reservationRepository;

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
        when(reservationRepository.findFirstByStudentIdAndClassSectionIdAndStatus(eq(1L), eq(100L), eq("ACTIVE")))
                .thenReturn(Optional.empty());
        when(reservationRepository.countActiveReservations(eq(100L), any(LocalDateTime.class))).thenReturn(0L);

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
        verify(realtimeSeatService).markCommitted(1L, 100L);
        verify(realtimeSeatService).broadcastSeatUpdate(100L);
    }

    @Test
    void testEnroll_FailsWhenSectionIsFull() {
        section.setCurrentEnrolled(40);
        section.setMaxCapacity(40);

        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(classSectionRepository.findByIdWithLock(100L)).thenReturn(Optional.of(section));
        when(reservationRepository.findFirstByStudentIdAndClassSectionIdAndStatus(eq(1L), eq(100L), eq("ACTIVE")))
                .thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class, () ->
                registrationService.enroll("SV2024001", 100L)
        );

        assertTrue(ex.getMessage().contains("hết chỗ"));
        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    void testEnroll_AntiSlotTheft_FailsWhenSlotsHeldByOthers() {
        // Capacity 40, enrolled 38, active holds by others = 2 -> available = 0
        section.setCurrentEnrolled(38);
        section.setMaxCapacity(40);

        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(classSectionRepository.findByIdWithLock(100L)).thenReturn(Optional.of(section));
        when(reservationRepository.findFirstByStudentIdAndClassSectionIdAndStatus(eq(1L), eq(100L), eq("ACTIVE")))
                .thenReturn(Optional.empty());
        when(reservationRepository.countActiveReservations(eq(100L), any(LocalDateTime.class))).thenReturn(2L);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                registrationService.enroll("SV2024001", 100L)
        );

        assertTrue(ex.getMessage().contains("tạm giữ trong 5 phút"));
        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    void testEnroll_SucceedsWhenHoldingReservationEvenIfSeatsExhaustedForPublic() {
        // Capacity 40, enrolled 39, active hold = 1 (held by SV2024001)
        section.setCurrentEnrolled(39);
        section.setMaxCapacity(40);

        SlotReservation myHold = new SlotReservation(student, section, 5);
        myHold.setExpiresAt(LocalDateTime.now().plusMinutes(4));

        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(classSectionRepository.findByIdWithLock(100L)).thenReturn(Optional.of(section));
        when(reservationRepository.findFirstByStudentIdAndClassSectionIdAndStatus(eq(1L), eq(100L), eq("ACTIVE")))
                .thenReturn(Optional.of(myHold));
        when(enrollmentRepository.findByStudentIdAndClassSectionId(1L, 100L)).thenReturn(Optional.empty());
        when(enrollmentRepository.findActiveEnrollmentsByStudentAndSemester(1L, "2024-25_SEM2"))
                .thenReturn(Collections.emptyList());

        Enrollment savedEnrollment = new Enrollment();
        savedEnrollment.setId(501L);
        savedEnrollment.setStudent(student);
        savedEnrollment.setClassSection(section);
        savedEnrollment.setStatus("REGISTERED");

        when(enrollmentRepository.save(any(Enrollment.class))).thenReturn(savedEnrollment);

        EnrollmentResponse response = registrationService.enroll("SV2024001", 100L);

        assertNotNull(response);
        assertEquals(501L, response.getEnrollmentId());
        assertEquals(40, section.getCurrentEnrolled());
        verify(realtimeSeatService).markCommitted(1L, 100L);
    }

    @Test
    void testEnroll_FailsWhenExceedsMaxCredits() {
        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(classSectionRepository.findByIdWithLock(100L)).thenReturn(Optional.of(section));
        when(enrollmentRepository.findByStudentIdAndClassSectionId(1L, 100L)).thenReturn(Optional.empty());
        when(reservationRepository.findFirstByStudentIdAndClassSectionIdAndStatus(eq(1L), eq(100L), eq("ACTIVE")))
                .thenReturn(Optional.empty());
        when(reservationRepository.countActiveReservations(eq(100L), any(LocalDateTime.class))).thenReturn(0L);

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

        BusinessException ex = assertThrows(BusinessException.class, () ->
                registrationService.enroll("SV2024001", 100L)
        );

        assertTrue(ex.getMessage().contains("Vượt quá giới hạn đăng ký tối đa 24 tín chỉ"));
    }

    @Test
    void testGetAvailableSections_ContractUnification() {
        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(classSectionRepository.searchSections(null, null)).thenReturn(List.of(section));
        when(enrollmentRepository.findAllByStudentId(1L)).thenReturn(Collections.emptyList());
        when(reservationRepository.findActiveByStudentId(eq(1L), any(LocalDateTime.class))).thenReturn(Collections.emptyList());
        
        List<Object[]> mockGrouped = Collections.singletonList(new Object[]{100L, 3L});
        when(reservationRepository.countActiveReservationsGrouped(any(LocalDateTime.class))).thenReturn(mockGrouped);

        List<ClassSectionDto> dtos = registrationService.getAvailableSections("SV2024001", null, null);

        assertNotNull(dtos);
        assertEquals(1, dtos.size());
        ClassSectionDto dto = dtos.get(0);
        assertEquals(100L, dto.getId());
        assertEquals(3, dto.getReservedCount());
        // max 40 - enrolled 10 - reserved 3 = 27
        assertEquals(27, dto.getAvailableSeats());
        assertFalse(dto.getIsReservedByMe());
    }
}
