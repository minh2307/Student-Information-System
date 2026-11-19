package com.rikkei.eduportal.auth.service;

import com.rikkei.eduportal.common.Role;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);

    private final JavaMailSender mailSender;

    @Value("${app.mail.enabled:true}")
    private boolean mailEnabled;

    @Value("${app.mail.from:Rikkei EduPortal <workspacegateos@gmail.com>}")
    private String mailFrom;

    @Value("${app.mail.portal-url:http://localhost:3000}")
    private String portalUrl;

    @Value("${spring.mail.password:#{null}}")
    private String mailPassword;

    @Autowired
    public EmailServiceImpl(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // Constructor phục vụ unit testing
    public EmailServiceImpl(JavaMailSender mailSender, boolean mailEnabled, String mailFrom, String portalUrl, String mailPassword) {
        this.mailSender = mailSender;
        this.mailEnabled = mailEnabled;
        this.mailFrom = mailFrom;
        this.portalUrl = portalUrl;
        this.mailPassword = mailPassword;
    }

    private boolean isMailConfigured() {
        return mailEnabled && mailSender != null && StringUtils.hasText(mailPassword);
    }

    @Override
    @Async
    public void sendWelcomeEmail(String toEmail, String fullName, String username, String initialPassword, Role role) {
        if (!StringUtils.hasText(toEmail)) {
            log.warn("Bỏ qua gửi email chào mừng: địa chỉ email người nhận trống");
            return;
        }

        String roleLabel = role == Role.STUDENT ? "Sinh viên" : (role == Role.LECTURER ? "Giảng viên" : "Quản trị viên");
        String subject = "🎓 Chào mừng bạn đến với Cổng thông tin học vụ Rikkei EduPortal";

        if (!isMailConfigured()) {
            log.info("[EMAIL DRY-RUN / SIMULATED] Welcome email gửi tới: {} ({}) | User: {} | Role: {}",
                    toEmail, fullName, username, roleLabel);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());

            helper.setFrom(mailFrom);
            helper.setTo(toEmail);
            helper.setSubject(subject);

            String loginUrl = portalUrl.replaceAll("/+$", "") + "/login";

            String htmlBody = """
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
                        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); }
                        .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px 24px; text-align: center; color: #ffffff; }
                        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
                        .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
                        .body { padding: 32px 28px; line-height: 1.6; }
                        .welcome-text { font-size: 16px; margin-bottom: 20px; }
                        .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0; }
                        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #cbd5e1; font-size: 14px; }
                        .info-row:last-child { border-bottom: none; }
                        .info-label { color: #64748b; font-weight: 500; }
                        .info-val { font-weight: 600; color: #0f172a; }
                        .pass-badge { background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-size: 14px; }
                        .btn-wrap { text-align: center; margin: 32px 0 16px; }
                        .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 14px 32px; border-radius: 10px; font-weight: 600; text-decoration: none; font-size: 15px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
                        .warning { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 24px 0; border-radius: 0 8px 8px 0; font-size: 13px; color: #92400e; }
                        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="header">
                            <h1>Rikkei EduPortal</h1>
                            <p>Hệ thống Cổng Thông tin Quản lý Học vụ Trực tuyến</p>
                        </div>
                        <div class="body">
                            <p class="welcome-text">Xin chào <strong>%s</strong>,</p>
                            <p>Tài khoản của bạn trên hệ thống EduPortal đã được khởi tạo thành công với vai trò <strong>%s</strong>. Dưới đây là thông tin đăng nhập cá nhân của bạn:</p>
                            
                            <div class="info-box">
                                <div class="info-row">
                                    <span class="info-label">Tên đăng nhập:</span>
                                    <span class="info-val">%s</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Email tài khoản:</span>
                                    <span class="info-val">%s</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Mật khẩu khởi tạo:</span>
                                    <span class="info-val"><code class="pass-badge">%s</code></span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">Vai trò:</span>
                                    <span class="info-val">%s</span>
                                </div>
                            </div>

                            <div class="warning">
                                <strong>Lưu ý bảo mật:</strong> Để đảm bảo an toàn cho dữ liệu học vụ, vui lòng đổi mật khẩu ngay sau khi đăng nhập lần đầu tiên tại mục Hồ sơ cá nhân.
                            </div>

                            <div class="btn-wrap">
                                <a href="%s" class="btn">Đăng nhập vào EduPortal</a>
                            </div>
                        </div>
                        <div class="footer">
                            <p>Email này được gửi tự động từ hệ thống quản lý học vụ Rikkei EduPortal (%s). Vui lòng không trả lời trực tiếp email này.</p>
                            <p>&copy; 2026 Rikkei Academy / EduPortal. Mọi quyền được bảo lưu.</p>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(fullName, roleLabel, username, toEmail, initialPassword, roleLabel, loginUrl, mailFrom);

            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Đã gửi email chào mừng và thông tin tài khoản thành công tới: {}", toEmail);
        } catch (Exception e) {
            log.error("Không thể gửi email chào mừng tới {}: {}", toEmail, e.getMessage(), e);
        }
    }

    @Override
    @Async
    public void sendPasswordResetEmail(String toEmail, String fullName, String newPassword) {
        if (!StringUtils.hasText(toEmail)) {
            log.warn("Bỏ qua gửi email đổi mật khẩu: địa chỉ email người nhận trống");
            return;
        }

        String subject = "🔒 Thông báo đặt lại mật khẩu tài khoản EduPortal";

        if (!isMailConfigured()) {
            log.info("[EMAIL DRY-RUN / SIMULATED] Password reset email gửi tới: {} ({}) | Mật khẩu mới: {}",
                    toEmail, fullName, newPassword);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());

            helper.setFrom(mailFrom);
            helper.setTo(toEmail);
            helper.setSubject(subject);

            String loginUrl = portalUrl.replaceAll("/+$", "") + "/login";

            String htmlBody = """
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
                        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); }
                        .header { background: linear-gradient(135deg, #0284c7, #0369a1); padding: 32px 24px; text-align: center; color: #ffffff; }
                        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
                        .body { padding: 32px 28px; line-height: 1.6; }
                        .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0; }
                        .pass-badge { background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 6px; font-family: monospace; font-size: 16px; font-weight: 700; }
                        .btn-wrap { text-align: center; margin: 32px 0 16px; }
                        .btn { display: inline-block; background: #0284c7; color: #ffffff !important; padding: 14px 32px; border-radius: 10px; font-weight: 600; text-decoration: none; font-size: 15px; }
                        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="header">
                            <h1>Rikkei EduPortal</h1>
                            <p>Thông báo Cập nhật & Đặt lại Mật khẩu</p>
                        </div>
                        <div class="body">
                            <p>Xin chào <strong>%s</strong>,</p>
                            <p>Quản trị viên hệ thống đã đặt lại mật khẩu cho tài khoản EduPortal của bạn. Thông tin mật khẩu mới như sau:</p>
                            
                            <div class="info-box" style="text-align: center;">
                                <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">MẬT KHẨU MỚI</p>
                                <span class="pass-badge">%s</span>
                            </div>

                            <p style="color: #64748b; font-size: 14px;">Nếu bạn không yêu cầu thay đổi này, vui lòng liên hệ ngay với phòng đào tạo / quản trị hệ thống để bảo vệ tài khoản.</p>

                            <div class="btn-wrap">
                                <a href="%s" class="btn">Đăng nhập ngay</a>
                            </div>
                        </div>
                        <div class="footer">
                            <p>Email này được gửi tự động từ hệ thống quản lý học vụ Rikkei EduPortal. Vui lòng không trả lời email này.</p>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(fullName, newPassword, loginUrl);

            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Đã gửi email thông báo đặt lại mật khẩu tới: {}", toEmail);
        } catch (Exception e) {
            log.error("Không thể gửi email đổi mật khẩu tới {}: {}", toEmail, e.getMessage(), e);
        }
    }

    @Override
    @Async
    public void sendGenericNotification(String toEmail, String subject, String title, String message) {
        if (!StringUtils.hasText(toEmail)) {
            return;
        }

        if (!isMailConfigured()) {
            log.info("[EMAIL DRY-RUN / SIMULATED] Notification tới: {} | Subject: {} | Title: {}", toEmail, subject, title);
            return;
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());

            helper.setFrom(mailFrom);
            helper.setTo(toEmail);
            helper.setSubject(subject);

            String htmlBody = """
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
                        .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); }
                        .header { background: #1e293b; padding: 24px; text-align: center; color: #ffffff; }
                        .body { padding: 32px 28px; line-height: 1.6; }
                        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="header">
                            <h2 style="margin: 0;">%s</h2>
                        </div>
                        <div class="body">
                            <h3 style="margin-top: 0;">%s</h3>
                            <p style="white-space: pre-line;">%s</p>
                        </div>
                        <div class="footer">
                            <p>&copy; 2026 Rikkei EduPortal</p>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(subject, title, message);

            helper.setText(htmlBody, true);
            mailSender.send(mimeMessage);
            log.info("Đã gửi email thông báo thành công tới: {}", toEmail);
        } catch (Exception e) {
            log.error("Lỗi khi gửi email thông báo tới {}: {}", toEmail, e.getMessage(), e);
        }
    }
}
