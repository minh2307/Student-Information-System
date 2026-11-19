package com.rikkei.eduportal.lecturer.service.email;

import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
public class EmailTemplateBuilder {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("HH:mm - dd/MM/yyyy");

    /**
     * Thoát các ký tự đặc biệt HTML chống XSS trong email
     */
    public String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    /**
     * Mẫu Email Cảnh báo sớm Nguy cơ Học vụ (Early Warning)
     */
    public String buildEarlyWarningHtml(
            String studentName,
            String studentCode,
            String courseName,
            String sectionCode,
            String riskLevel,
            List<String> reasons,
            List<String> suggestions,
            String portalUrl
    ) {
        boolean isCritical = "CRITICAL".equalsIgnoreCase(riskLevel);
        String badgeColor = isCritical ? "#dc2626" : "#d97706";
        String badgeBg = isCritical ? "#fee2e2" : "#fef3c7";
        String badgeText = isCritical ? "CẢNH BÁO NGUY CẤP: NGUY CƠ CẤM THI" : "CHÚ Ý HỌC VỤ: CẦN CẢI THIỆN";
        String headerBg = isCritical ? "#991b1b" : "#b45309";
        String nowStr = LocalDateTime.now().format(DATE_FORMATTER);

        StringBuilder reasonsHtml = new StringBuilder();
        if (reasons != null && !reasons.isEmpty()) {
            for (String r : reasons) {
                reasonsHtml.append("<li style=\"margin-bottom: 6px; color: #1e293b;\">")
                        .append(escapeHtml(r))
                        .append("</li>");
            }
        } else {
            reasonsHtml.append("<li style=\"color: #1e293b;\">Cần theo dõi sát chuyên cần và kết quả kiểm tra định kỳ.</li>");
        }

        StringBuilder suggestionsHtml = new StringBuilder();
        if (suggestions != null && !suggestions.isEmpty()) {
            for (String s : suggestions) {
                suggestionsHtml.append("<li style=\"margin-bottom: 6px; color: #047857;\">")
                        .append(escapeHtml(s))
                        .append("</li>");
            }
        }

        String targetUrl = (portalUrl != null && !portalUrl.isBlank()) ? portalUrl : "http://localhost:5173/student/dashboard";

        return "<!DOCTYPE html>"
                + "<html>"
                + "<head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"></head>"
                + "<body style=\"margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #0f172a;\">"
                + "  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background-color: #f1f5f9; padding: 24px 12px;\">"
                + "    <tr><td align=\"center\">"
                + "      <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;\">"
                + "        <!-- Header -->"
                + "        <tr><td style=\"background: linear-gradient(135deg, " + headerBg + " 0%, #0f172a 100%); padding: 28px 24px; text-align: left;\">"
                + "          <div style=\"color: #f8fafc; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;\">EduPortal · Cổng Thông Tin Đào Tạo</div>"
                + "          <div style=\"color: #ffffff; font-size: 20px; font-weight: 800; line-height: 1.3;\">CẢNH BÁO NGUY CƠ HỌC VỤ</div>"
                + "        </td></tr>"
                + "        <!-- Body -->"
                + "        <tr><td style=\"padding: 24px;\">"
                + "          <div style=\"display: inline-block; background-color: " + badgeBg + "; color: " + badgeColor + "; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 16px;\">" + badgeText + "</div>"
                + "          <p style=\"font-size: 15px; margin: 0 0 16px 0; line-height: 1.5;\">Xin chào <strong>" + escapeHtml(studentName) + "</strong> (Mã SV: <span style=\"font-family: monospace; font-weight: 700;\">" + escapeHtml(studentCode) + "</span>),</p>"
                + "          <p style=\"font-size: 14px; margin: 0 0 20px 0; line-height: 1.6; color: #334155;\">Hệ thống Giám sát &amp; Cảnh báo học vụ tự động thông báo bạn đang thuộc diện cảnh báo đối với lớp học phần sau:</p>"
                + "          <!-- Course Card -->"
                + "          <div style=\"background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;\">"
                + "            <div style=\"font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;\">Lớp học phần</div>"
                + "            <div style=\"font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;\">" + escapeHtml(sectionCode) + " · " + escapeHtml(courseName) + "</div>"
                + "          </div>"
                + "          <!-- Reasons -->"
                + "          <div style=\"background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 16px; margin-bottom: 20px;\">"
                + "            <div style=\"font-size: 13px; font-weight: 800; color: #be123c; margin-bottom: 8px;\">⚠️ Nguyên nhân cảnh báo:</div>"
                + "            <ul style=\"margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.5;\">"
                + reasonsHtml.toString()
                + "            </ul>"
                + "          </div>"
                + (suggestionsHtml.length() > 0 ? (
                    "          <!-- Suggestions -->"
                    + "          <div style=\"background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; margin-bottom: 24px;\">"
                    + "            <div style=\"font-size: 13px; font-weight: 800; color: #047857; margin-bottom: 8px;\">💡 Hướng dẫn &amp; Khuyến nghị can thiệp:</div>"
                    + "            <ul style=\"margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.5;\">"
                    + suggestionsHtml.toString()
                    + "            </ul>"
                    + "          </div>"
                ) : "")
                + "          <!-- Button -->"
                + "          <div style=\"text-align: center; margin: 28px 0 16px 0;\">"
                + "            <a href=\"" + escapeHtml(targetUrl) + "\" target=\"_blank\" style=\"display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 14px; font-weight: 700; border-radius: 10px; box-shadow: 0 2px 4px rgba(220,38,38,0.25);\">Xem Chi Tiết Tại Cổng Đào Tạo &rarr;</a>"
                + "          </div>"
                + "          <p style=\"font-size: 12px; color: #64748b; text-align: center; margin: 0;\">Được gửi tự động lúc " + nowStr + " từ Hệ thống Cảnh báo Sớm EduPortal.</p>"
                + "        </td></tr>"
                + "        <!-- Footer -->"
                + "        <tr><td style=\"background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5;\">"
                + "          Trường Đại học Công nghệ &amp; Đào tạo · Phòng Quản lý Đào tạo &amp; Công tác Sinh viên<br>"
                + "          Email này được gửi tự động, vui lòng liên hệ trực tiếp giảng viên phụ trách nếu có thắc mắc."
                + "        </td></tr>"
                + "      </table>"
                + "    </td></tr>"
                + "  </table>"
                + "</body>"
                + "</html>";
    }

    /**
     * Mẫu Email Giảng viên Nhắn tin / Dặn dò riêng hoặc Thông báo chung lớp
     */
    public String buildLecturerMessageHtml(
            String studentName,
            String studentCode,
            String lecturerName,
            String courseName,
            String sectionCode,
            String title,
            String messageContent,
            String portalUrl
    ) {
        String nowStr = LocalDateTime.now().format(DATE_FORMATTER);
        String targetUrl = (portalUrl != null && !portalUrl.isBlank()) ? portalUrl : "http://localhost:5173/student/dashboard";
        String formattedMessage = escapeHtml(messageContent).replace("\n", "<br>");

        return "<!DOCTYPE html>"
                + "<html>"
                + "<head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"></head>"
                + "<body style=\"margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #0f172a;\">"
                + "  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background-color: #f1f5f9; padding: 24px 12px;\">"
                + "    <tr><td align=\"center\">"
                + "      <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;\">"
                + "        <!-- Header -->"
                + "        <tr><td style=\"background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); padding: 28px 24px; text-align: left;\">"
                + "          <div style=\"color: #93c5fd; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;\">EduPortal · Tin Nhắn Học Vụ</div>"
                + "          <div style=\"color: #ffffff; font-size: 20px; font-weight: 800; line-height: 1.3;\">THÔNG BÁO TỪ GIẢNG VIÊN</div>"
                + "        </td></tr>"
                + "        <!-- Body -->"
                + "        <tr><td style=\"padding: 24px;\">"
                + "          <p style=\"font-size: 15px; margin: 0 0 16px 0; line-height: 1.5;\">Xin chào <strong>" + escapeHtml(studentName) + "</strong>" + (studentCode != null && !studentCode.isBlank() ? " (Mã SV: " + escapeHtml(studentCode) + ")" : "") + ",</p>"
                + "          <p style=\"font-size: 14px; margin: 0 0 16px 0; line-height: 1.6; color: #334155;\">Giảng viên <strong>" + escapeHtml(lecturerName) + "</strong> vừa gửi thông báo đến bạn đối với lớp học phần:</p>"
                + "          <!-- Class Info -->"
                + "          <div style=\"background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 4px; padding: 12px 16px; margin-bottom: 20px;\">"
                + "            <div style=\"font-size: 12px; color: #64748b; font-weight: 600;\">Lớp học phần</div>"
                + "            <div style=\"font-size: 15px; font-weight: 800; color: #1e3a8a; margin-top: 2px;\">" + escapeHtml(sectionCode) + " · " + escapeHtml(courseName) + "</div>"
                + "          </div>"
                + "          <!-- Title & Content -->"
                + "          <div style=\"background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 18px; margin-bottom: 24px;\">"
                + "            <div style=\"font-size: 14px; font-weight: 800; color: #0369a1; margin-bottom: 10px;\">📢 " + escapeHtml(title) + "</div>"
                + "            <div style=\"font-size: 13.5px; color: #1e293b; line-height: 1.6;\">" + formattedMessage + "</div>"
                + "          </div>"
                + "          <!-- Button -->"
                + "          <div style=\"text-align: center; margin: 24px 0 16px 0;\">"
                + "            <a href=\"" + escapeHtml(targetUrl) + "\" target=\"_blank\" style=\"display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 14px; font-weight: 700; border-radius: 10px; box-shadow: 0 2px 4px rgba(37,99,235,0.25);\">Đăng Nhập Cổng Đào Tạo &rarr;</a>"
                + "          </div>"
                + "          <p style=\"font-size: 12px; color: #64748b; text-align: center; margin: 0;\">Gửi lúc " + nowStr + " bởi giảng viên " + escapeHtml(lecturerName) + ".</p>"
                + "        </td></tr>"
                + "        <!-- Footer -->"
                + "        <tr><td style=\"background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5;\">"
                + "          Trường Đại học Công nghệ &amp; Đào tạo · Cổng Thông tin Quản lý Đào tạo (EduPortal)<br>"
                + "          Email này được gửi tới sinh viên đang theo học tại trường."
                + "        </td></tr>"
                + "      </table>"
                + "    </td></tr>"
                + "  </table>"
                + "</body>"
                + "</html>";
    }
}
