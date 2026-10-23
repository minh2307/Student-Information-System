package com.rikkei.eduportal.auth.service;

import com.rikkei.eduportal.auth.dto.*;
import com.rikkei.eduportal.auth.entity.LecturerProfile;
import com.rikkei.eduportal.auth.entity.StudentProfile;
import com.rikkei.eduportal.auth.entity.User;
import com.rikkei.eduportal.auth.exception.BadRequestException;
import com.rikkei.eduportal.auth.exception.ResourceNotFoundException;
import com.rikkei.eduportal.auth.repository.LecturerProfileRepository;
import com.rikkei.eduportal.auth.repository.StudentProfileRepository;
import com.rikkei.eduportal.auth.repository.UserRepository;
import com.rikkei.eduportal.common.Role;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class ProfileService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final LecturerProfileRepository lecturerProfileRepository;
    private final PasswordEncoder passwordEncoder;

    public ProfileService(UserRepository userRepository,
                          StudentProfileRepository studentProfileRepository,
                          LecturerProfileRepository lecturerProfileRepository,
                          PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.lecturerProfileRepository = lecturerProfileRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng: " + username));

        return buildProfileResponse(user);
    }

    @Transactional
    public UserProfileResponse updateProfile(String username, UpdateProfileRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng: " + username));

        if (StringUtils.hasText(request.getFullName())) {
            user.setFullName(request.getFullName().trim());
        }

        if (StringUtils.hasText(request.getEmail()) && !request.getEmail().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new BadRequestException("Email đã được sử dụng bởi tài khoản khác: " + request.getEmail());
            }
            user.setEmail(request.getEmail().trim().toLowerCase());
        }

        if (StringUtils.hasText(request.getAvatarUrl())) {
            user.setAvatarUrl(request.getAvatarUrl().trim());
        }

        // Change password if requested
        if (StringUtils.hasText(request.getNewPassword())) {
            if (!StringUtils.hasText(request.getOldPassword())) {
                throw new BadRequestException("Vui lòng nhập mật khẩu hiện tại để xác nhận đổi mật khẩu");
            }
            if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
                throw new BadRequestException("Mật khẩu hiện tại không chính xác");
            }
            if (request.getNewPassword().length() < 6) {
                throw new BadRequestException("Mật khẩu mới phải có tối thiểu 6 ký tự");
            }
            user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        }

        userRepository.save(user);
        return buildProfileResponse(user);
    }

    private UserProfileResponse buildProfileResponse(User user) {
        UserDto userDto = AuthService.toUserDto(user);
        StudentProfileDto studentProfileDto = null;
        LecturerProfileDto lecturerProfileDto = null;

        if (user.getRole() == Role.STUDENT) {
            studentProfileDto = studentProfileRepository.findByUserId(user.getId())
                    .map(AuthService::toStudentProfileDto)
                    .orElse(null);
        } else if (user.getRole() == Role.LECTURER) {
            lecturerProfileDto = lecturerProfileRepository.findByUserId(user.getId())
                    .map(AuthService::toLecturerProfileDto)
                    .orElse(null);
        }

        return new UserProfileResponse(userDto, studentProfileDto, lecturerProfileDto);
    }
}
