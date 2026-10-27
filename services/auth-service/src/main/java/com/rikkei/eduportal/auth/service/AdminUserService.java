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
import com.rikkei.eduportal.common.UserStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminUserService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final LecturerProfileRepository lecturerProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    public AdminUserService(UserRepository userRepository,
                            StudentProfileRepository studentProfileRepository,
                            LecturerProfileRepository lecturerProfileRepository,
                            PasswordEncoder passwordEncoder,
                            AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.lecturerProfileRepository = lecturerProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
    }

    private String getCurrentActor() {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null && !auth.getName().isBlank()) {
                return auth.getName();
            }
        } catch (Exception ignored) {}
        return "admin";
    }

    @Transactional(readOnly = true)
    public List<UserProfileResponse> getAllUsers(Role role, String keyword) {
        List<User> users = userRepository.searchUsers(role, StringUtils.hasText(keyword) ? keyword.trim() : null);
        return users.stream().map(this::buildProfileResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng có ID: " + id));
        return buildProfileResponse(user);
    }

    @Transactional
    public UserProfileResponse createUser(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Tên đăng nhập đã tồn tại: " + request.getUsername());
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email đã được sử dụng: " + request.getEmail());
        }

        User user = new User(
                request.getUsername().trim(),
                request.getEmail().trim().toLowerCase(),
                passwordEncoder.encode(request.getPassword()),
                request.getFullName().trim(),
                request.getRole()
        );
        if (StringUtils.hasText(request.getAvatarUrl())) {
            user.setAvatarUrl(request.getAvatarUrl().trim());
        } else {
            user.setAvatarUrl("https://api.dicebear.com/7.x/bottts/svg?seed=" + user.getUsername());
        }

        User savedUser = userRepository.save(user);

        // Tạo profile tương ứng
        if (request.getRole() == Role.STUDENT) {
            String studentCode = StringUtils.hasText(request.getStudentCode())
                    ? request.getStudentCode().trim()
                    : "SV" + savedUser.getId();
            if (studentProfileRepository.existsByStudentCode(studentCode)) {
                throw new BadRequestException("Mã sinh viên đã tồn tại: " + studentCode);
            }
            String major = StringUtils.hasText(request.getMajor()) ? request.getMajor().trim() : "Chưa cập nhật";
            StudentProfile profile = new StudentProfile(savedUser.getId(), studentCode, major);
            studentProfileRepository.save(profile);
        } else if (request.getRole() == Role.LECTURER) {
            String lecturerCode = StringUtils.hasText(request.getLecturerCode())
                    ? request.getLecturerCode().trim()
                    : "GV" + savedUser.getId();
            if (lecturerProfileRepository.existsByLecturerCode(lecturerCode)) {
                throw new BadRequestException("Mã giảng viên đã tồn tại: " + lecturerCode);
            }
            String department = StringUtils.hasText(request.getDepartment()) ? request.getDepartment().trim() : "Khoa CNTT";
            String degree = StringUtils.hasText(request.getDegree()) ? request.getDegree().trim() : "Thạc sĩ";
            LecturerProfile profile = new LecturerProfile(savedUser.getId(), lecturerCode, department, degree);
            lecturerProfileRepository.save(profile);
        }

        auditLogService.recordLog(
                "USER_CREATED",
                getCurrentActor(),
                "ROLE_ADMIN",
                "User",
                String.valueOf(savedUser.getId()),
                "Tạo mới tài khoản người dùng: " + savedUser.getUsername() + " (" + savedUser.getRole() + ")",
                null,
                "username=" + savedUser.getUsername() + ", email=" + savedUser.getEmail() + ", role=" + savedUser.getRole(),
                null
        );

        return buildProfileResponse(savedUser);
    }

    @Transactional
    public UserProfileResponse updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng có ID: " + id));

        // Bảo vệ tài khoản Quản trị viên (Admin): Không được phép khóa hoặc hạ cấp vai trò
        if (user.getRole() == Role.ADMIN) {
            if (request.getStatus() != null && request.getStatus() != UserStatus.ACTIVE) {
                throw new BadRequestException("Không thể khóa tài khoản Quản trị viên (Admin)!");
            }
            if (request.getRole() != null && request.getRole() != Role.ADMIN) {
                throw new BadRequestException("Không thể thay đổi vai trò của tài khoản Quản trị viên (Admin)!");
            }
        }

        String oldStatusStr = String.valueOf(user.getStatus());
        boolean statusChanged = request.getStatus() != null && request.getStatus() != user.getStatus();
        boolean passwordReset = StringUtils.hasText(request.getPassword());

        if (StringUtils.hasText(request.getFullName())) {
            user.setFullName(request.getFullName().trim());
        }
        if (StringUtils.hasText(request.getEmail()) && !request.getEmail().equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new BadRequestException("Email đã được sử dụng: " + request.getEmail());
            }
            user.setEmail(request.getEmail().trim().toLowerCase());
        }
        if (request.getStatus() != null) {
            user.setStatus(request.getStatus());
        }
        if (StringUtils.hasText(request.getAvatarUrl())) {
            user.setAvatarUrl(request.getAvatarUrl().trim());
        }
        if (StringUtils.hasText(request.getPassword())) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        // Cập nhật profile tương ứng nếu có
        if (user.getRole() == Role.STUDENT) {
            studentProfileRepository.findByUserId(user.getId()).ifPresent(sp -> {
                if (StringUtils.hasText(request.getStudentCode()) && !request.getStudentCode().equalsIgnoreCase(sp.getStudentCode())) {
                    if (studentProfileRepository.existsByStudentCode(request.getStudentCode())) {
                        throw new BadRequestException("Mã sinh viên đã tồn tại: " + request.getStudentCode());
                    }
                    sp.setStudentCode(request.getStudentCode().trim());
                }
                if (StringUtils.hasText(request.getMajor())) {
                    sp.setMajor(request.getMajor().trim());
                }
                if (request.getCurrentSemester() != null) {
                    sp.setCurrentSemester(request.getCurrentSemester());
                }
                studentProfileRepository.save(sp);
            });
        } else if (user.getRole() == Role.LECTURER) {
            lecturerProfileRepository.findByUserId(user.getId()).ifPresent(lp -> {
                if (StringUtils.hasText(request.getLecturerCode()) && !request.getLecturerCode().equalsIgnoreCase(lp.getLecturerCode())) {
                    if (lecturerProfileRepository.existsByLecturerCode(request.getLecturerCode())) {
                        throw new BadRequestException("Mã giảng viên đã tồn tại: " + request.getLecturerCode());
                    }
                    lp.setLecturerCode(request.getLecturerCode().trim());
                }
                if (StringUtils.hasText(request.getDepartment())) {
                    lp.setDepartment(request.getDepartment().trim());
                }
                if (StringUtils.hasText(request.getDegree())) {
                    lp.setDegree(request.getDegree().trim());
                }
                lecturerProfileRepository.save(lp);
            });
        }

        userRepository.save(user);

        // Ghi nhận Audit Log
        if (statusChanged) {
            String action = (user.getStatus() == UserStatus.LOCKED) ? "USER_LOCKED" : "USER_STATUS_CHANGED";
            auditLogService.recordLog(
                    action,
                    getCurrentActor(),
                    "ROLE_ADMIN",
                    "User",
                    String.valueOf(user.getId()),
                    "Thay đổi trạng thái tài khoản " + user.getUsername() + ": " + oldStatusStr + " -> " + user.getStatus(),
                    oldStatusStr,
                    String.valueOf(user.getStatus()),
                    null
            );
        } else if (passwordReset) {
            auditLogService.recordLog(
                    "PASSWORD_RESET",
                    getCurrentActor(),
                    "ROLE_ADMIN",
                    "User",
                    String.valueOf(user.getId()),
                    "Đặt lại mật khẩu tài khoản người dùng: " + user.getUsername(),
                    "***",
                    "***",
                    null
            );
        } else {
            auditLogService.recordLog(
                    "USER_UPDATED",
                    getCurrentActor(),
                    "ROLE_ADMIN",
                    "User",
                    String.valueOf(user.getId()),
                    "Cập nhật thông tin tài khoản người dùng: " + user.getUsername(),
                    null,
                    "fullName=" + user.getFullName() + ", email=" + user.getEmail(),
                    null
            );
        }

        return buildProfileResponse(user);
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng có ID: " + id));

        // Bảo vệ tài khoản Quản trị viên (Admin): Không thể xóa
        if (user.getRole() == Role.ADMIN) {
            throw new BadRequestException("Không thể xóa tài khoản Quản trị viên (Admin)!");
        }

        if (user.getRole() == Role.STUDENT) {
            studentProfileRepository.deleteByUserId(user.getId());
        } else if (user.getRole() == Role.LECTURER) {
            lecturerProfileRepository.deleteByUserId(user.getId());
        }

        userRepository.delete(user);

        auditLogService.recordLog(
                "USER_DELETED",
                getCurrentActor(),
                "ROLE_ADMIN",
                "User",
                String.valueOf(id),
                "Xóa tài khoản người dùng ID: " + id + " (" + user.getUsername() + ", role=" + user.getRole() + ")",
                "username=" + user.getUsername() + ", role=" + user.getRole(),
                null,
                null
        );
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
