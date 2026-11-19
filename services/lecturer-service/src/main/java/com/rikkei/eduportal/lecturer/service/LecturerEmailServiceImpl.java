package com.rikkei.eduportal.lecturer.service;

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
import java.util.List;

@Service
public class LecturerEmailServiceImpl implements LecturerEmailService {

    private static final Logger log = LoggerFactory.getLogger(LecturerEmailServiceImpl.class);

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
    public LecturerEmailServiceImpl(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public LecturerEmailServiceImpl(JavaMailSender mailSender, boolean mailEnabled, String mailFrom, String portalUrl, String mailPassword) {
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
    public void sendAcademicWarningEmail(String toEmail,
                                        String studentName,
                                        String studentCode,
                                        String sectionCode,
                                        String courseName,
                                        String riskLevel,
                                        List<String> reasons,
                                        List<String> suggestions) {
        if (!StringUtils.hasText(toEmail)) {
            log.warn("Bỏ qua gửi email cảnh báo học vụ: email người nhận trống cho sinh viên {}", studentCode);
            return;
        }

        boolean isCritical = "CRITICAL".equalsIgnoreCase(riskLevel);
        String subject = (isCritical ? "🚨 [CẢNH BÁO NGUY CẤP] " : "⚠️ [NHẮC NHỞ HỌC VỤ] ")
                + "Cảnh báo học tập lớp " + sectionCode + " (" + courseName + ")";

        if (!isMailConfigured()) {
            log.info("[EMAIL DRY-RUN / SIMULATED] Warning email tới: {} ({}) | Lớp: {} | Mức độ: {}",
                    toEmail, studentCode, sectionCode, riskLevel);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());

            helper.setFrom(mailFrom);
            helper.setTo(toEmail);
            helper.setSubject(subject);

            String dashboardUrl = portalUrl.replaceAll("/+$", "") + "/student/dashboard";

            StringBuilder reasonsHtml = new StringBuilder();
            if (reasons != null && !reasons.isEmpty()) {
                for (String r : reasons) {
                    reasonsHtml.append("<li style=\"margin-bottom: 6px;\">").append(r).append("</li>");
                }
            } else {
                reasonsHtml.append("<li>Cần chú ý chuyên cần và hoàn thành đầy đủ bài tập theo quy chế đào tạo.</li>");
            }

            StringBuilder suggestionsHtml = new StringBuilder();
            if (suggestions != null && !suggestions.isEmpty()) {
                for (String s : suggestions) {
                    suggestionsHtml.append("<li style=\"margin-bottom: 6px;\">").append(s).append("</li>");
                }
            } else {
                suggestionsHtml.append("<li>Chủ động gặp giảng viên phụ trách học phần để được hướng dẫn cải thiện.</li>");
            }

            String bannerColor = isCritical ? "#dc2626" : "#f59e0b";
            String badgeBg = isCritical ? "#fef2f2" : "#fffbeb";
            String badgeColor = isCritical ? "#991b1b" : "#b45309";
            String levelText = isCritical ? "NGUY CƠ BỊ CẤM THI / TRƯỢT MÔN (CRITICAL)" : "CẦN CHÚ Ý KẾT QUẢ HỌC TẬP (WARNING)";

            String htmlBody = """
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
                        .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
                        .banner { background: %s; padding: 24px; text-align: center; color: #ffffff; }
                        .banner h1 { margin: 0; font-size: 20px; font-weight: 700; }
                        .body { padding: 32px 28px; line-height: 1.6; }
                        .badge { display: inline-block; background: %s; color: %s; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; margin-bottom: 20px; }
                        .info-grid { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 20px 0; font-size: 14px; }
                        .box-reasons { background: #fff5f5; border-left: 4px solid #ef4444; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
                        .box-suggest { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
                        .btn-wrap { text-align: center; margin: 32px 0 16px; }
                        .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 30px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 14px; }
                        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="banner">
                            <h1>HỆ THỐNG CẢNH BÁO SỚM HỌC VỤ</h1>
                            <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.95;">Rikkei EduPortal - Thông báo khẩn cấp</p>
                        </div>
                        <div class="body">
                            <div style="text-align: center;">
                                <span class="badge">%s</span>
                            </div>
                            <p>Kính gửi sinh viên: <strong>%s</strong> (Mã SV: <strong>%s</strong>),</p>
                            <p>Hệ thống học vụ ghi nhận kết quả học tập và chuyên cần của bạn tại lớp học phần sau đang rơi vào diện cảnh báo:</p>

                            <div class="info-grid">
                                <div><strong>Lớp học phần:</strong> %s</div>
                                <div style="margin-top: 6px;"><strong>Học phần:</strong> %s</div>
                            </div>

                            <div class="box-reasons">
                                <strong style="color: #991b1b;">Nguyên nhân cảnh báo:</strong>
                                <ul style="margin: 8px 0 0; padding-left: 20px; color: #7f1d1d;">
                                    %s
                                </ul>
                            </div>

                            <div class="box-suggest">
                                <strong style="color: #166534;">Khuyến nghị từ Giảng viên & Ban Đào tạo:</strong>
                                <ul style="margin: 8px 0 0; padding-left: 20px; color: #14532d;">
                                    %s
                                </ul>
                            </div>

                            <div class="btn-wrap">
                                <a href="%s" class="btn">Kiểm tra Dashboard Sinh viên</a>
                            </div>
                        </div>
                        <div class="footer">
                            <p>Email này được phát tự động từ hệ thống Cảnh báo Sớm EduPortal. Vui lòng liên hệ Văn phòng Đào tạo nếu cần hỗ trợ phúc khảo hoặc giải trình phép chuyên cần.</p>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(bannerColor, badgeBg, badgeColor, levelText, studentName, studentCode,
                    sectionCode, courseName, reasonsHtml.toString(), suggestionsHtml.toString(), dashboardUrl);

            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Đã gửi email cảnh báo học vụ thành công tới sinh viên {} ({})", studentCode, toEmail);
        } catch (Exception e) {
            log.error("Lỗi khi gửi email cảnh báo tới {}: {}", toEmail, e.getMessage(), e);
        }
    }

    @Override
    @Async
    public void sendLecturerMessageEmail(String toEmail,
                                        String studentName,
                                        String studentCode,
                                        String sectionCode,
                                        String courseName,
                                        String lecturerName,
                                        String title,
                                        String message) {
        if (!StringUtils.hasText(toEmail)) {
            log.warn("Bỏ qua gửi email dặn dò: email người nhận trống cho sinh viên {}", studentCode);
            return;
        }

        String subject = "📢 [" + sectionCode + "] " + title;

        if (!isMailConfigured()) {
            log.info("[EMAIL DRY-RUN / SIMULATED] Lecturer message tới: {} ({}) | Lớp: {} | GV: {} | Tiêu đề: {}",
                    toEmail, studentCode, sectionCode, lecturerName, title);
            return;
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());

            helper.setFrom(mailFrom);
            helper.setTo(toEmail);
            helper.setSubject(subject);

            String dashboardUrl = portalUrl.replaceAll("/+$", "") + "/student/dashboard";

            String htmlBody = """
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
                        .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
                        .header { background: linear-gradient(135deg, #0f766e, #115e59); padding: 26px; text-align: center; color: #ffffff; }
                        .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
                        .body { padding: 32px 28px; line-height: 1.6; }
                        .msg-box { background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 12px; padding: 20px; margin: 20px 0; }
                        .btn-wrap { text-align: center; margin: 32px 0 16px; }
                        .btn { display: inline-block; background: #0f766e; color: #ffffff !important; padding: 12px 30px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 14px; }
                        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div class="header">
                            <h1>THÔNG BÁO TỪ GIẢNG VIÊN</h1>
                            <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.95;">%s - %s</p>
                        </div>
                        <div class="body">
                            <p>Chào em <strong>%s</strong> (Mã SV: <strong>%s</strong>),</p>
                            <p>Giảng viên <strong>%s</strong> vừa gửi một thông báo dặn dò mới tới bạn:</p>

                            <div class="msg-box">
                                <h3 style="margin: 0 0 10px; color: #134e4a;">📢 %s</h3>
                                <div style="white-space: pre-line; color: #1e293b; font-size: 15px;">%s</div>
                            </div>

                            <div class="btn-wrap">
                                <a href="%s" class="btn">Vào Cổng Thông Tin Học Vụ</a>
                            </div>
                        </div>
                        <div class="footer">
                            <p>Email này được gửi tự động từ lớp học phần %s trên Rikkei EduPortal.</p>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(sectionCode, courseName, studentName, studentCode, lecturerName,
                    title, message, dashboardUrl, sectionCode);

            helper.setText(htmlBody, true);
            mailSender.send(mimeMessage);
            log.info("Đã gửi email thông báo từ giảng viên tới {} ({})", studentCode, toEmail);
        } catch (Exception e) {
            log.error("Lỗi khi gửi email dặn dò tới {}: {}", toEmail, e.getMessage(), e);
        }
    }
}
