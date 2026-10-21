package com.rikkei.eduportal.auth.dto;

import com.rikkei.eduportal.common.Role;
import com.rikkei.eduportal.common.UserStatus;
import jakarta.validation.constraints.Email;

public class UpdateUserRequest {

    private String fullName;

    @Email(message = "Email không hợp lệ")
    private String email;

    private Role role;

    private UserStatus status;

    private String avatarUrl;

    private String password;

    // Sinh viên
    private String studentCode;
    private String major;
    private Integer currentSemester;

    // Giảng viên
    private String lecturerCode;
    private String department;
    private String degree;

    public UpdateUserRequest() {}

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getStudentCode() { return studentCode; }
    public void setStudentCode(String studentCode) { this.studentCode = studentCode; }

    public String getMajor() { return major; }
    public void setMajor(String major) { this.major = major; }

    public Integer getCurrentSemester() { return currentSemester; }
    public void setCurrentSemester(Integer currentSemester) { this.currentSemester = currentSemester; }

    public String getLecturerCode() { return lecturerCode; }
    public void setLecturerCode(String lecturerCode) { this.lecturerCode = lecturerCode; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getDegree() { return degree; }
    public void setDegree(String degree) { this.degree = degree; }
}
