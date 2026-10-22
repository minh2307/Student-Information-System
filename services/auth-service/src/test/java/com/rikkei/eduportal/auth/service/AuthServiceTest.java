package com.rikkei.eduportal.auth.service;

import com.rikkei.eduportal.auth.dto.AuthResponse;
import com.rikkei.eduportal.auth.dto.LoginRequest;
import com.rikkei.eduportal.auth.entity.StudentProfile;
import com.rikkei.eduportal.auth.entity.User;
import com.rikkei.eduportal.auth.exception.BadRequestException;
import com.rikkei.eduportal.auth.repository.LecturerProfileRepository;
import com.rikkei.eduportal.auth.repository.StudentProfileRepository;
import com.rikkei.eduportal.auth.repository.UserRepository;
import com.rikkei.eduportal.auth.security.JwtTokenProvider;
import com.rikkei.eduportal.common.Role;
import com.rikkei.eduportal.common.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private LecturerProfileRepository lecturerProfileRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @InjectMocks
    private AuthService authService;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = new User("sv2024001", "student@rikkei.edu.vn", "hashedPass", "Nguyen Van C", Role.STUDENT);
        sampleUser.setId(4L);
        sampleUser.setStatus(UserStatus.ACTIVE);
    }

    @Test
    void testLoginSuccess() {
        LoginRequest request = new LoginRequest("sv2024001", "123456");

        when(userRepository.findByUsernameOrEmail("sv2024001", "sv2024001"))
                .thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("123456", "hashedPass")).thenReturn(true);
        when(jwtTokenProvider.generateToken(sampleUser)).thenReturn("sample.jwt.token");

        StudentProfile profile = new StudentProfile(4L, "SV2024001", "Computer Science");
        when(studentProfileRepository.findByUserId(4L)).thenReturn(Optional.of(profile));

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("sample.jwt.token", response.getAccessToken());
        assertEquals("sv2024001", response.getUser().getUsername());
        assertNotNull(response.getStudentProfile());
        assertEquals("SV2024001", response.getStudentProfile().getStudentCode());
    }

    @Test
    void testLoginWrongPassword_ThrowsBadCredentialsException() {
        LoginRequest request = new LoginRequest("sv2024001", "wrongPass");

        when(userRepository.findByUsernameOrEmail("sv2024001", "sv2024001"))
                .thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("wrongPass", "hashedPass")).thenReturn(false);

        assertThrows(BadCredentialsException.class, () -> authService.login(request));
    }

    @Test
    void testLoginLockedUser_ThrowsBadRequestException() {
        sampleUser.setStatus(UserStatus.LOCKED);
        LoginRequest request = new LoginRequest("sv2024001", "123456");

        when(userRepository.findByUsernameOrEmail("sv2024001", "sv2024001"))
                .thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("123456", "hashedPass")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> authService.login(request));
    }

    @Test
    void testLoginUserNotFound_ThrowsBadCredentialsException() {
        LoginRequest request = new LoginRequest("unknown", "123456");

        when(userRepository.findByUsernameOrEmail("unknown", "unknown"))
                .thenReturn(Optional.empty());

        assertThrows(BadCredentialsException.class, () -> authService.login(request));
    }
}
