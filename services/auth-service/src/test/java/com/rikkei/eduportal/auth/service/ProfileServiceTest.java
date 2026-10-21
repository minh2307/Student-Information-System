package com.rikkei.eduportal.auth.service;

import com.rikkei.eduportal.auth.dto.StudentProfileDto;
import com.rikkei.eduportal.auth.dto.UpdateProfileRequest;
import com.rikkei.eduportal.auth.dto.UserProfileResponse;
import com.rikkei.eduportal.auth.entity.StudentProfile;
import com.rikkei.eduportal.auth.entity.User;
import com.rikkei.eduportal.auth.exception.BadRequestException;
import com.rikkei.eduportal.auth.repository.LecturerProfileRepository;
import com.rikkei.eduportal.auth.repository.StudentProfileRepository;
import com.rikkei.eduportal.auth.repository.UserRepository;
import com.rikkei.eduportal.common.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private LecturerProfileRepository lecturerProfileRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private ProfileService profileService;

    private User sampleUser;
    private StudentProfile sampleProfile;

    @BeforeEach
    void setUp() {
        sampleUser = new User("sv2024001", "student@rikkei.edu.vn", "oldHashed", "Nguyen Van C", Role.STUDENT);
        sampleUser.setId(4L);

        sampleProfile = new StudentProfile(4L, "SV2024001", "Computer Science");
    }

    @Test
    void testGetProfileSuccess() {
        when(userRepository.findByUsername("sv2024001")).thenReturn(Optional.of(sampleUser));
        when(studentProfileRepository.findByUserId(4L)).thenReturn(Optional.of(sampleProfile));

        UserProfileResponse response = profileService.getProfile("sv2024001");

        assertNotNull(response);
        assertEquals("sv2024001", response.getUser().getUsername());
        assertNotNull(response.getStudentProfile());
        assertEquals("SV2024001", response.getStudentProfile().getStudentCode());
    }

    @Test
    void testUpdateProfileSuccess() {
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setFullName("Nguyen Van C Updated");
        request.setEmail("c.new@rikkei.edu.vn");

        when(userRepository.findByUsername("sv2024001")).thenReturn(Optional.of(sampleUser));
        when(userRepository.existsByEmail("c.new@rikkei.edu.vn")).thenReturn(false);
        when(studentProfileRepository.findByUserId(4L)).thenReturn(Optional.of(sampleProfile));

        UserProfileResponse response = profileService.updateProfile("sv2024001", request);

        assertEquals("Nguyen Van C Updated", response.getUser().getFullName());
        assertEquals("c.new@rikkei.edu.vn", response.getUser().getEmail());
        verify(userRepository, times(1)).save(sampleUser);
    }

    @Test
    void testUpdateProfileWithPasswordSuccess() {
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setOldPassword("currentPass");
        request.setNewPassword("newPass123");

        when(userRepository.findByUsername("sv2024001")).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("currentPass", "oldHashed")).thenReturn(true);
        when(passwordEncoder.encode("newPass123")).thenReturn("newHashed");
        when(studentProfileRepository.findByUserId(4L)).thenReturn(Optional.of(sampleProfile));

        UserProfileResponse response = profileService.updateProfile("sv2024001", request);

        assertNotNull(response);
        verify(passwordEncoder, times(1)).encode("newPass123");
        verify(userRepository, times(1)).save(sampleUser);
    }

    @Test
    void testUpdateProfileWrongOldPassword_ThrowsBadRequestException() {
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setOldPassword("wrongOldPass");
        request.setNewPassword("newPass123");

        when(userRepository.findByUsername("sv2024001")).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("wrongOldPass", "oldHashed")).thenReturn(false);

        assertThrows(BadRequestException.class, () -> profileService.updateProfile("sv2024001", request));
    }
}
