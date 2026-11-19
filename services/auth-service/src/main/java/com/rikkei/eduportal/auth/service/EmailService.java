package com.rikkei.eduportal.auth.service;

import com.rikkei.eduportal.common.Role;

/**
 * Service interface for dispatching transaction and notification emails.
 */
public interface EmailService {

    /**
     * Gửi email chào mừng kèm thông tin tài khoản và mật khẩu khởi tạo cho người dùng mới
     */
    void sendWelcomeEmail(String toEmail, String fullName, String username, String initialPassword, Role role);

    /**
     * Gửi email thông báo khi quản trị viên đặt lại mật khẩu cho tài khoản
     */
    void sendPasswordResetEmail(String toEmail, String fullName, String newPassword);

    /**
     * Gửi email thông báo chung
     */
    void sendGenericNotification(String toEmail, String subject, String title, String message);
}
