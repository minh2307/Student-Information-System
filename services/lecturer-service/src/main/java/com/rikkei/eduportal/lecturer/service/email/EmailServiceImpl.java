package com.rikkei.eduportal.lecturer.service.email;

import com.rikkei.eduportal.lecturer.entity.EmailDispatchLog;
import com.rikkei.eduportal.lecturer.repository.EmailDispatchLogRepository;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);

    private final JavaMailSender mailSender;
    private final EmailDispatchLogRepository emailLogRepo;
    private final EmailTemplateBuilder templateBuilder;

    @Value("${spring.mail.username:workspacegateos@gmail.com}")
    private String mailUsername;

    @Value("${app.mail.enabled:true}")
    private boolean mailEnabled;

    @Value("${app.mail.from-name:EduPortal - Cổng Thông Tin Đào Tạo}")
    private String fromName;

    @Value("${app.mail.portal-base-url:http://localhost:5173}")
    private String portalBaseUrl;

    @Value("${app.mail.test-override-email:}")
    private String testOverrideEmail;

    @Autowired
    public EmailServiceImpl(
            @Autowired(required = false) JavaMailSender mailSender,
            EmailDispatchLogRepository emailLogRepo,
            EmailTemplateBuilder templateBuilder
    ) {
        this.mailSender = mailSender;
        this.emailLogRepo = emailLogRepo;
        this.templateBuilder = templateBuilder;
    }

    @Override
    public boolean isMailConfigured() {
        return mailEnabled && mailSender != null && mailUsername != null && !mailUsername.isBlank();
    }

    @Async("mailTaskExecutor")
    @Override
    public void sendEarlyWarningEmail(
            String toEmail,
            String studentName,
            String studentCode,
            Long userId,
            String courseName,
            String sectionCode,
            String riskLevel,
            List<String> reasons,
            List<String> suggestions
    ) {
        if (!isMailConfigured()) {
            log.warn("Mail service is disabled or JavaMailSender is not configured. Skipping early warning email to {}", toEmail);
            return;
        }

        String recipient = resolveRecipient(toEmail);
        if (recipient == null || recipient.isBlank()) {
            log.warn("Target student {} ({}) has no valid email address. Skipping email dispatch.", studentName, studentCode);
            return;
        }

        String subject = "⚠️ [CẢNH BÁO HỌC VỤ] Lớp " + sectionCode + " - " + courseName;
        String htmlBody = templateBuilder.buildEarlyWarningHtml(
                studentName, studentCode, courseName, sectionCode, riskLevel, reasons, suggestions, portalBaseUrl
        );

        dispatchMimeMessage(recipient, studentName, userId, subject, htmlBody, "EARLY_WARNING");
    }

    @Async("mailTaskExecutor")
    @Override
    public void sendCustomNotificationEmail(
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
    ) {
        if (!isMailConfigured()) {
            log.warn("Mail service is disabled or JavaMailSender is not configured. Skipping notification email to {}", toEmail);
            return;
        }

        String recipient = resolveRecipient(toEmail);
        if (recipient == null || recipient.isBlank()) {
            log.warn("Target recipient {} has no valid email address. Skipping notification email.", studentName);
            return;
        }

        String subject = "📢 [" + sectionCode + "] " + title;
        String htmlBody = templateBuilder.buildLecturerMessageHtml(
                studentName, studentCode, lecturerName, courseName, sectionCode, title, messageContent, portalBaseUrl
        );

        dispatchMimeMessage(recipient, studentName, userId, subject, htmlBody, type != null ? type : "LECTURER_MESSAGE");
    }

    @Async("mailTaskExecutor")
    @Override
    public void sendRawHtmlEmail(String toEmail, String subject, String htmlBody, String type, Long userId, String recipientName) {
        if (!isMailConfigured()) {
            log.warn("Mail service is disabled or JavaMailSender is not configured. Skipping email to {}", toEmail);
            return;
        }

        String recipient = resolveRecipient(toEmail);
        if (recipient == null || recipient.isBlank()) return;

        dispatchMimeMessage(recipient, recipientName, userId, subject, htmlBody, type != null ? type : "GENERAL");
    }

    private String resolveRecipient(String originalEmail) {
        if (testOverrideEmail != null && !testOverrideEmail.trim().isEmpty()) {
            log.info("Test override email is active: redirecting email from '{}' to '{}'", originalEmail, testOverrideEmail.trim());
            return testOverrideEmail.trim();
        }
        return originalEmail != null ? originalEmail.trim() : null;
    }

    private void dispatchMimeMessage(
            String recipient,
            String recipientName,
            Long userId,
            String subject,
            String htmlBody,
            String type
    ) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());

            helper.setFrom(new InternetAddress(mailUsername, fromName, StandardCharsets.UTF_8.name()));
            helper.setTo(recipient);
            helper.setSubject(subject);
            helper.setText(htmlBody, true); // true = HTML content

            mailSender.send(message);

            log.info("✅ Dispatched email successfully to '{}' with subject '{}'", recipient, subject);
            emailLogRepo.save(new EmailDispatchLog(recipient, recipientName, userId, subject, type, "SENT", null));
        } catch (Exception ex) {
            log.error("❌ Failed to dispatch email to '{}' with subject '{}': {}", recipient, subject, ex.getMessage(), ex);
            emailLogRepo.save(new EmailDispatchLog(recipient, recipientName, userId, subject, type, "FAILED", ex.getMessage()));
        }
    }
}
