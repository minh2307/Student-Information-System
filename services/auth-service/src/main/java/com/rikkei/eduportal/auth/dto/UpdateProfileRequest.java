package com.rikkei.eduportal.auth.dto;

import jakarta.validation.constraints.Email;

public class UpdateProfileRequest {

    private String fullName;

    @Email(message = "Email không đúng định dạng")
    private String email;

    private String avatarUrl;

    private String oldPassword;

    private String newPassword;

    public UpdateProfileRequest() {}

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public String getOldPassword() { return oldPassword; }
    public void setOldPassword(String oldPassword) { this.oldPassword = oldPassword; }

    public String getNewPassword() { return newPassword; }
    public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
}
