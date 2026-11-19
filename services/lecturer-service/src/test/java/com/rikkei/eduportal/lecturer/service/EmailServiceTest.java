package com.rikkei.eduportal.lecturer.service;

import com.rikkei.eduportal.lecturer.entity.EmailDispatchLog;
import com.rikkei.eduportal.lecturer.repository.EmailDispatchLogRepository;
import com.rikkei.eduportal.lecturer.service.email.EmailServiceImpl;
import com.rikkei.eduportal.lecturer.service.email.EmailTemplateBuilder;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @Mock
    private EmailDispatchLogRepository emailLogRepo;

    private EmailTemplateBuilder templateBuilder;
    private EmailServiceImpl emailService;

    @BeforeEach
    void setUp() {
        templateBuilder = new EmailTemplateBuilder();
        emailService = new EmailServiceImpl(mailSender, emailLogRepo, templateBuilder);

        ReflectionTestUtils.setField(emailService, "mailUsername", "workspacegateos@gmail.com");
        ReflectionTestUtils.setField(emailService, "mailEnabled", true);
        ReflectionTestUtils.setField(emailService, "fromName", "EduPortal - Cổng Đào Tạo");
        ReflectionTestUtils.setField(emailService, "portalBaseUrl", "https://portal.rikkei.edu.vn");
    }

    @Test
    @DisplayName("TC-MAIL-01: Template Builder tạo HTML cảnh báo sớm chính xác và an toàn XSS")
    void testBuildEarlyWarningHtml() {
        String html = templateBuilder.buildEarlyWarningHtml(
                "Nguyen Van A",
                "SV001",
                "Cau truc Du lieu",
                "CS102-01",
                "CRITICAL",
                List.of("Vang 4/10 buoi (40%)", "Diem GK < 3.0"),
                List.of("Gap truc tiep giang vien de giai trinh"),
                "https://portal.rikkei.edu.vn"
        );

        assertNotNull(html);
        assertTrue(html.contains("CẢNH BÁO NGUY CƠ HỌC VỤ"));
        assertTrue(html.contains("Nguyen Van A"));
        assertTrue(html.contains("SV001"));
        assertTrue(html.contains("CS102-01"));
        assertTrue(html.contains("Vang 4/10 buoi (40%)"));
        assertTrue(html.contains("Gap truc tiep giang vien"));
    }

    @Test
    @DisplayName("TC-MAIL-02: Template Builder tạo HTML tin nhắn riêng giảng viên chính xác")
    void testBuildLecturerMessageHtml() {
        String html = templateBuilder.buildLecturerMessageHtml(
                "Tran Thi B",
                "SV002",
                "TS. Le Hoang Long",
                "Lap trinh Java",
                "CS201-01",
                "Luu y nop bai tap lon",
                "Han chot nop bai la 23:59 ngay mai.\nNop file zip tren portal.",
                "https://portal.rikkei.edu.vn"
        );

        assertNotNull(html);
        assertTrue(html.contains("THÔNG BÁO TỪ GIẢNG VIÊN"));
        assertTrue(html.contains("TS. Le Hoang Long"));
        assertTrue(html.contains("CS201-01"));
        assertTrue(html.contains("Luu y nop bai tap lon"));
        assertTrue(html.contains("Han chot nop bai la 23:59 ngay mai.<br>Nop file zip tren portal."));
    }

    @Test
    @DisplayName("TC-MAIL-03: Gửi email cảnh báo sớm thành công và lưu log SENT")
    void testSendEarlyWarningEmail_Success() {
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        emailService.sendEarlyWarningEmail(
                "student@rikkei.edu.vn",
                "Nguyen Van A",
                "SV001",
                101L,
                "CS101",
                "CS101-01",
                "CRITICAL",
                List.of("Vắng 3 buổi"),
                List.of("Cần đi học đầy đủ")
        );

        verify(mailSender, times(1)).send(mimeMessage);

        ArgumentCaptor<EmailDispatchLog> logCaptor = ArgumentCaptor.forClass(EmailDispatchLog.class);
        verify(emailLogRepo, times(1)).save(logCaptor.capture());

        EmailDispatchLog savedLog = logCaptor.getValue();
        assertEquals("student@rikkei.edu.vn", savedLog.getRecipientEmail());
        assertEquals("SENT", savedLog.getStatus());
        assertEquals("EARLY_WARNING", savedLog.getType());
        assertNull(savedLog.getErrorMessage());
    }

    @Test
    @DisplayName("TC-MAIL-04: Xử lý lỗi SMTP mượt mà (ghi log FAILED, không văng lỗi sập luồng)")
    void testSendEarlyWarningEmail_WhenMailFails_LogsFailedWithoutThrowing() {
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        doThrow(new MailSendException("SMTP connection refused")).when(mailSender).send(mimeMessage);

        assertDoesNotThrow(() -> {
            emailService.sendEarlyWarningEmail(
                    "student@rikkei.edu.vn",
                    "Nguyen Van A",
                    "SV001",
                    101L,
                    "CS101",
                    "CS101-01",
                    "WARNING",
                    List.of("Điểm thấp"),
                    List.of("Cần ôn tập")
            );
        });

        ArgumentCaptor<EmailDispatchLog> logCaptor = ArgumentCaptor.forClass(EmailDispatchLog.class);
        verify(emailLogRepo, times(1)).save(logCaptor.capture());

        EmailDispatchLog savedLog = logCaptor.getValue();
        assertEquals("FAILED", savedLog.getStatus());
        assertTrue(savedLog.getErrorMessage().contains("SMTP connection refused"));
    }
}
