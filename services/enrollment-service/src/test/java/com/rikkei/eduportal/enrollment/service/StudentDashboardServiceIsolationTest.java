package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.entity.StudentProfile;
import com.rikkei.eduportal.enrollment.entity.User;
import com.rikkei.eduportal.enrollment.exception.ResourceNotFoundException;
import com.rikkei.eduportal.enrollment.exception.UnauthorizedException;
import com.rikkei.eduportal.enrollment.repository.AnnouncementRepository;
import com.rikkei.eduportal.enrollment.repository.EnrollmentRepository;
import com.rikkei.eduportal.enrollment.repository.GradeRepository;
import com.rikkei.eduportal.enrollment.repository.NotificationRepository;
import com.rikkei.eduportal.enrollment.repository.StudentProfileRepository;
import com.rikkei.eduportal.enrollment.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudentDashboardServiceIsolationTest {

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private GradeRepository gradeRepository;

    @Mock
    private AnnouncementRepository announcementRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    private StudentDashboardService dashboardService;
    private AnnouncementAndNotificationService notificationService;

    private StudentProfile studentA;
    private StudentProfile studentB;
    private User userA;

    @BeforeEach
    void setUp() {
        dashboardService = new StudentDashboardService(studentProfileRepository, enrollmentRepository, gradeRepository);
        notificationService = new AnnouncementAndNotificationService(
                announcementRepository, notificationRepository, userRepository);

        userA = new User();
        userA.setId(1L);
        userA.setUsername("sv2024001");
        userA.setFullName("Nguyen Van A");

        studentA = new StudentProfile();
        studentA.setId(1L);
        studentA.setStudentCode("SV2024001");
        studentA.setUser(userA);

        User userB = new User();
        userB.setId(2L);
        userB.setUsername("sv2024002");
        userB.setFullName("Le Thi B");

        studentB = new StudentProfile();
        studentB.setId(2L);
        studentB.setStudentCode("SV2024002");
        studentB.setUser(userB);
    }

    @Test
    @DisplayName("P0-03: resolveStudent(null) phải ném UnauthorizedException (Fail Closed)")
    void testResolveStudent_NullIdentifier_ThrowsUnauthorizedException() {
        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () ->
                dashboardService.resolveStudent(null));
        assertTrue(ex.getMessage().contains("Yêu cầu xác thực"));
        verifyNoInteractions(studentProfileRepository);
    }

    @Test
    @DisplayName("P0-03: resolveStudent('') hoặc khoảng trắng phải ném UnauthorizedException")
    void testResolveStudent_BlankIdentifier_ThrowsUnauthorizedException() {
        UnauthorizedException ex1 = assertThrows(UnauthorizedException.class, () ->
                dashboardService.resolveStudent(""));
        assertTrue(ex1.getMessage().contains("Yêu cầu xác thực"));

        UnauthorizedException ex2 = assertThrows(UnauthorizedException.class, () ->
                dashboardService.resolveStudent("   "));
        assertTrue(ex2.getMessage().contains("Yêu cầu xác thực"));
        verifyNoInteractions(studentProfileRepository);
    }

    @Test
    @DisplayName("P0-03: resolveStudent với mã sinh viên không tồn tại phải ném ResourceNotFoundException (Không được fallback về sv2024001)")
    void testResolveStudent_NonExistentIdentifier_ThrowsResourceNotFoundException() {
        when(studentProfileRepository.findByUsernameOrStudentCode("sv_unknown"))
                .thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class, () ->
                dashboardService.resolveStudent("sv_unknown"));

        assertTrue(ex.getMessage().contains("sv_unknown"));
        // Đảm bảo không bao giờ gọi findAll().findFirst() để trả về sinh viên khác
        verify(studentProfileRepository, never()).findAll();
    }

    @Test
    @DisplayName("P0-03: resolveStudent với mã sinh viên hợp lệ chỉ trả về đúng sinh viên đó (No Cross-Student Leakage)")
    void testResolveStudent_ValidIdentifier_ReturnsCorrectStudentOnly() {
        when(studentProfileRepository.findByUsernameOrStudentCode("SV2024002"))
                .thenReturn(Optional.of(studentB));

        StudentProfile resolved = dashboardService.resolveStudent("SV2024002");

        assertNotNull(resolved);
        assertEquals("SV2024002", resolved.getStudentCode());
        assertEquals(2L, resolved.getId());
        assertNotEquals("SV2024001", resolved.getStudentCode());
        verify(studentProfileRepository, never()).findAll();
    }

    @Test
    @DisplayName("P0-03: AnnouncementAndNotificationService.resolveUser với user null ném UnauthorizedException")
    void testNotificationService_NullUser_ThrowsUnauthorizedException() {
        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () ->
                notificationService.getUserNotifications(null));
        assertTrue(ex.getMessage().contains("Yêu cầu xác thực"));
        verifyNoInteractions(userRepository);
    }

    @Test
    @DisplayName("P0-03: AnnouncementAndNotificationService.resolveUser với user không tồn tại ném ResourceNotFoundException")
    void testNotificationService_UnknownUser_ThrowsResourceNotFoundException() {
        when(userRepository.findByUsername("user_non_existent")).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class, () ->
                notificationService.getUserNotifications("user_non_existent"));
        assertTrue(ex.getMessage().contains("user_non_existent"));
        verify(userRepository, never()).findAll();
    }
}
