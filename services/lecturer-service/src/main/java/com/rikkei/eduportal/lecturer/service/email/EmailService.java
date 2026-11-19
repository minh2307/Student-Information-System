package com.rikkei.eduportal.lecturer.service.email;

import java.util.List;

public interface EmailService {

    /**
     * Gửi email cảnh báo sớm nguy cơ học vụ (Async non-blocking)
     */
    void sendEarlyWarningEmail(
            String toEmail,
            String studentName,
            String studentCode,
            Long userId,
            String courseName,
            String sectionCode,
            String riskLevel,
            List<String> reasons,
            List<String> suggestions
    );

    /**
     * Gửi email dặn dò / tin nhắn riêng hoặc thông báo chung từ giảng viên (Async non-blocking)
     */
    void sendCustomNotificationEmail(
            String toEmail,
            String studentName,
            String studentCode,
            Long userId,
            String lecturerName,
            String courseName,
            String sectionCode,
            String title,
            String messageContent,
            String type
    );

    /**
     * Gửi email HTML trực tiếp
     */
    void sendRawHtmlEmail(String toEmail, String subject, String htmlBody, String type, Long userId, String recipientName);

    /**
     * Kiểm tra cấu hình mail có sẵn sàng hoạt động hay không
     */
    boolean isMailConfigured();
}
