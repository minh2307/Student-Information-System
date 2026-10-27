package com.rikkei.eduportal.auth.service;

import com.rikkei.eduportal.auth.dto.CreateUserRequest;
import com.rikkei.eduportal.auth.dto.UpdateUserRequest;
import com.rikkei.eduportal.auth.dto.UserProfileResponse;
import com.rikkei.eduportal.auth.entity.StudentProfile;
import com.rikkei.eduportal.auth.entity.User;
import com.rikkei.eduportal.auth.exception.BadRequestException;
import com.rikkei.eduportal.auth.repository.LecturerProfileRepository;
import com.rikkei.eduportal.auth.repository.StudentProfileRepository;
import com.rikkei.eduportal.auth.repository.UserRepository;
import com.rikkei.eduportal.common.Role;
import com.rikkei.eduportal.common.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private LecturerProfileRepository lecturerProfileRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private AdminUserService adminUserService;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = new User("sv2024003", "student3@rikkei.edu.vn", "hashed", "Nguyen Van E", Role.STUDENT);
        sampleUser.setId(6L);
    }

    @Test
    void testGetAllUsers() {
        when(userRepository.searchUsers(Role.STUDENT, "Nguyen")).thenReturn(Collections.singletonList(sampleUser));
        when(studentProfileRepository.findByUserId(6L)).thenReturn(Optional.of(new StudentProfile(6L, "SV2024003", "CS")));

        List<UserProfileResponse> result = adminUserService.getAllUsers(Role.STUDENT, "Nguyen");

        assertEquals(1, result.size());
        assertEquals("sv2024003", result.get(0).getUser().getUsername());
    }

    @Test
    void testCreateUserStudentSuccess() {
        CreateUserRequest request = new CreateUserRequest();
        request.setUsername("sv2024003");
        request.setEmail("student3@rikkei.edu.vn");
        request.setPassword("123456");
        request.setFullName("Nguyen Van E");
        request.setRole(Role.STUDENT);
        request.setStudentCode("SV2024003");
        request.setMajor("Computer Science");

        when(userRepository.existsByUsername("sv2024003")).thenReturn(false);
        when(userRepository.existsByEmail("student3@rikkei.edu.vn")).thenReturn(false);
        when(passwordEncoder.encode("123456")).thenReturn("hashed123");
        when(userRepository.save(any(User.class))).thenReturn(sampleUser);
        when(studentProfileRepository.existsByStudentCode("SV2024003")).thenReturn(false);

        UserProfileResponse response = adminUserService.createUser(request);

        assertNotNull(response);
        verify(studentProfileRepository, times(1)).save(any(StudentProfile.class));
    }

    @Test
    void testCreateUserDuplicateUsername_ThrowsBadRequestException() {
        CreateUserRequest request = new CreateUserRequest();
        request.setUsername("sv2024003");
        request.setEmail("student3@rikkei.edu.vn");

        when(userRepository.existsByUsername("sv2024003")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> adminUserService.createUser(request));
    }

    @Test
    void testUpdateUserSuccess() {
        UpdateUserRequest request = new UpdateUserRequest();
        request.setFullName("Nguyen Van E Updated");
        request.setStatus(UserStatus.LOCKED);

        when(userRepository.findById(6L)).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(sampleUser)).thenReturn(sampleUser);

        UserProfileResponse response = adminUserService.updateUser(6L, request);

        assertEquals("Nguyen Van E Updated", response.getUser().getFullName());
        assertEquals(UserStatus.LOCKED, response.getUser().getStatus());
    }

    @Test
    void testDeleteUserSuccess() {
        when(userRepository.findById(6L)).thenReturn(Optional.of(sampleUser));

        adminUserService.deleteUser(6L);

        verify(studentProfileRepository, times(1)).deleteByUserId(6L);
        verify(userRepository, times(1)).delete(sampleUser);
    }

    @Test
    void testDeleteAdminUser_ThrowsBadRequestException() {
        User adminUser = new User("admin", "admin@rikkei.edu.vn", "hashed", "Administrator", Role.ADMIN);
        adminUser.setId(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));

        BadRequestException ex = assertThrows(BadRequestException.class, () -> adminUserService.deleteUser(1L));
        assertTrue(ex.getMessage().contains("Không thể xóa tài khoản Quản trị viên"));
        verify(userRepository, never()).delete(any(User.class));
    }

    @Test
    void testLockAdminUser_ThrowsBadRequestException() {
        User adminUser = new User("admin", "admin@rikkei.edu.vn", "hashed", "Administrator", Role.ADMIN);
        adminUser.setId(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));

        UpdateUserRequest request = new UpdateUserRequest();
        request.setStatus(UserStatus.LOCKED);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> adminUserService.updateUser(1L, request));
        assertTrue(ex.getMessage().contains("Không thể khóa tài khoản Quản trị viên"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testChangeRoleAdminUser_ThrowsBadRequestException() {
        User adminUser = new User("admin", "admin@rikkei.edu.vn", "hashed", "Administrator", Role.ADMIN);
        adminUser.setId(1L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));

        UpdateUserRequest request = new UpdateUserRequest();
        request.setRole(Role.STUDENT);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> adminUserService.updateUser(1L, request));
        assertTrue(ex.getMessage().contains("Không thể thay đổi vai trò của tài khoản Quản trị viên"));
        verify(userRepository, never()).save(any(User.class));
    }
}
