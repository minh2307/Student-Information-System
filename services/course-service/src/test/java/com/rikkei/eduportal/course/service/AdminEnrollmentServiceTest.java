package com.rikkei.eduportal.course.service;

import com.rikkei.eduportal.common.EnrollmentStatus;
import com.rikkei.eduportal.common.Role;
import com.rikkei.eduportal.common.SectionStatus;
import com.rikkei.eduportal.course.dto.response.PendingEnrollmentResponse;
import com.rikkei.eduportal.course.entity.*;
import com.rikkei.eduportal.course.exception.InvalidOperationException;
import com.rikkei.eduportal.course.exception.ResourceNotFoundException;
import com.rikkei.eduportal.course.exception.SectionCapacityFullException;
import com.rikkei.eduportal.course.repository.ClassSectionRepository;
import com.rikkei.eduportal.course.repository.EnrollmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminEnrollmentServiceTest {

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private ClassSectionRepository classSectionRepository;

    @InjectMocks
    private AdminEnrollmentServiceImpl adminEnrollmentService;

    private Enrollment pendingEnrollment;
    private ClassSection section;
    private StudentProfile student;

    @BeforeEach
    void setUp() {
        User studentUser = new User();
        studentUser.setId(4L);
        studentUser.setFullName("Nguyen Van C");

        student = new StudentProfile();
        student.setId(1L);
        student.setUser(studentUser);
        student.setStudentCode("SV2024001");
        student.setMajor("Computer Science");

        Course course = new Course("CS401", "Web Development", 3, 4, "Web Syllabus", null);
        course.setId(4L);

        User lecturerUser = new User();
        lecturerUser.setId(2L);
        lecturerUser.setFullName("TS. Nguyen Van A");

        LecturerProfile lecturer = new LecturerProfile();
        lecturer.setId(1L);
        lecturer.setUser(lecturerUser);

        section = new ClassSection();
        section.setId(3L);
        section.setSectionCode("CS401-2025-01");
        section.setCourse(course);
        section.setLecturer(lecturer);
        section.setSemesterName("2024-25_SEM2");
        section.setDayOfWeek("WED");
        section.setStartTime(LocalTime.of(13, 30));
        section.setEndTime(LocalTime.of(15, 0));
        section.setRoomName("Lab 3");
        section.setMaxCapacity(35);
        section.setCurrentEnrolled(1);
        section.setStatus(SectionStatus.OPEN);

        pendingEnrollment = new Enrollment();
        pendingEnrollment.setId(100L);
        pendingEnrollment.setStudent(student);
        pendingEnrollment.setClassSection(section);
        pendingEnrollment.setStatus(EnrollmentStatus.PENDING);
        pendingEnrollment.setRegisteredAt(LocalDateTime.now());
    }

    @Test
    void testGetPendingEnrollments() {
        when(enrollmentRepository.findByStatusWithDetails(EnrollmentStatus.PENDING))
                .thenReturn(List.of(pendingEnrollment));

        List<PendingEnrollmentResponse> list = adminEnrollmentService.getPendingEnrollments();

        assertEquals(1, list.size());
        assertEquals("SV2024001", list.get(0).getStudentCode());
        assertEquals("CS401-2025-01", list.get(0).getSectionCode());
        assertEquals(EnrollmentStatus.PENDING, list.get(0).getStatus());
    }

    @Test
    void testApproveEnrollment_Success() {
        when(enrollmentRepository.findById(100L)).thenReturn(Optional.of(pendingEnrollment));
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(inv -> inv.getArgument(0));

        PendingEnrollmentResponse response = adminEnrollmentService.approveEnrollment(100L);

        assertNotNull(response);
        assertEquals(EnrollmentStatus.REGISTERED, response.getStatus());
        assertEquals(2, section.getCurrentEnrolled()); // Incremented from 1 to 2
        verify(classSectionRepository, times(1)).save(section);
        verify(enrollmentRepository, times(1)).save(pendingEnrollment);
    }

    @Test
    void testApproveEnrollment_CapacityFull_ThrowsException() {
        section.setCurrentEnrolled(35);
        section.setMaxCapacity(35);
        when(enrollmentRepository.findById(100L)).thenReturn(Optional.of(pendingEnrollment));

        assertThrows(SectionCapacityFullException.class, () -> adminEnrollmentService.approveEnrollment(100L));
        verify(enrollmentRepository, never()).save(any());
    }

    @Test
    void testApproveEnrollment_NotPending_ThrowsException() {
        pendingEnrollment.setStatus(EnrollmentStatus.REGISTERED);
        when(enrollmentRepository.findById(100L)).thenReturn(Optional.of(pendingEnrollment));

        assertThrows(InvalidOperationException.class, () -> adminEnrollmentService.approveEnrollment(100L));
    }

    @Test
    void testRejectEnrollment_Success() {
        when(enrollmentRepository.findById(100L)).thenReturn(Optional.of(pendingEnrollment));
        when(enrollmentRepository.save(any(Enrollment.class))).thenAnswer(inv -> inv.getArgument(0));

        PendingEnrollmentResponse response = adminEnrollmentService.rejectEnrollment(100L);

        assertNotNull(response);
        assertEquals(EnrollmentStatus.REJECTED, response.getStatus());
        assertEquals(1, section.getCurrentEnrolled()); // currentEnrolled remains unchanged
        verify(enrollmentRepository, times(1)).save(pendingEnrollment);
    }
}
