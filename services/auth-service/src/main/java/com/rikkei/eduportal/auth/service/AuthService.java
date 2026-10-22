package com.rikkei.eduportal.auth.service;

import com.rikkei.eduportal.auth.dto.*;
import com.rikkei.eduportal.auth.entity.LecturerProfile;
import com.rikkei.eduportal.auth.entity.StudentProfile;
import com.rikkei.eduportal.auth.entity.User;
import com.rikkei.eduportal.auth.exception.BadRequestException;
import com.rikkei.eduportal.auth.repository.LecturerProfileRepository;
import com.rikkei.eduportal.auth.repository.StudentProfileRepository;
import com.rikkei.eduportal.auth.repository.UserRepository;
import com.rikkei.eduportal.auth.security.JwtTokenProvider;
import com.rikkei.eduportal.common.Role;
import com.rikkei.eduportal.common.UserStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final LecturerProfileRepository lecturerProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(UserRepository userRepository,
                       StudentProfileRepository studentProfileRepository,
                       LecturerProfileRepository lecturerProfileRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.lecturerProfileRepository = lecturerProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsernameOrEmail(request.getUsername(), request.getUsername())
                .orElseThrow(() -> new BadCredentialsException("Tên đăng nhập hoặc mật khẩu không chính xác"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Tên đăng nhập hoặc mật khẩu không chính xác");
        }

        if (user.getStatus() == UserStatus.LOCKED) {
            throw new BadRequestException("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Ban Đào tạo!");
        }

        String token = jwtTokenProvider.generateToken(user);
        UserDto userDto = toUserDto(user);

        AuthResponse response = new AuthResponse(token, userDto);

        if (user.getRole() == Role.STUDENT) {
            studentProfileRepository.findByUserId(user.getId())
                    .ifPresent(sp -> response.setStudentProfile(toStudentProfileDto(sp)));
        } else if (user.getRole() == Role.LECTURER) {
            lecturerProfileRepository.findByUserId(user.getId())
                    .ifPresent(lp -> response.setLecturerProfile(toLecturerProfileDto(lp)));
        }

        return response;
    }

    public static UserDto toUserDto(User user) {
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setFullName(user.getFullName());
        dto.setRole(user.getRole());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setStatus(user.getStatus());
        dto.setCreatedAt(user.getCreatedAt());
        return dto;
    }

    public static StudentProfileDto toStudentProfileDto(StudentProfile sp) {
        StudentProfileDto dto = new StudentProfileDto();
        dto.setStudentCode(sp.getStudentCode());
        dto.setMajor(sp.getMajor());
        dto.setCurrentSemester(sp.getCurrentSemester());
        dto.setCreditsEarned(sp.getCreditsEarned());
        dto.setTotalRequiredCredits(sp.getTotalRequiredCredits());
        dto.setCurrentCgpa(sp.getCurrentCgpa());
        dto.setPreviousCgpa(sp.getPreviousCgpa());
        return dto;
    }

    public static LecturerProfileDto toLecturerProfileDto(LecturerProfile lp) {
        LecturerProfileDto dto = new LecturerProfileDto();
        dto.setLecturerCode(lp.getLecturerCode());
        dto.setDepartment(lp.getDepartment());
        dto.setDegree(lp.getDegree());
        return dto;
    }
}
