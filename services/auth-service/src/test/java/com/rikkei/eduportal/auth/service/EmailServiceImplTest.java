package com.rikkei.eduportal.auth.service;

import com.rikkei.eduportal.common.Role;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceImplTest {

    @Mock
    private JavaMailSender mailSender;

    private EmailServiceImpl emailService;

    @BeforeEach
    void setUp() {
        emailService = new EmailServiceImpl(
                mailSender,
                true,
                "Rikkei EduPortal <workspacegateos@gmail.com>",
                "http://localhost:3000",
                "test-app-password"
        );
    }

    @Test
    @DisplayName("Gửi email chào mừng thành công khi đã cấu hình đầy đủ SMTP")
    void testSendWelcomeEmail_Success() {
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        assertDoesNotThrow(() ->
                emailService.sendWelcomeEmail("student@rikkei.edu.vn", "Nguyen Van A", "sv2024001", "P@ss1234", Role.STUDENT)
        );

        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Dry-Run: Không gửi email thật khi tắt cờ mailEnabled")
    void testSendWelcomeEmail_DryRunWhenDisabled() {
        EmailServiceImpl dryRunService = new EmailServiceImpl(
                mailSender,
                false, // mail disabled
                "Rikkei EduPortal <workspacegateos@gmail.com>",
                "http://localhost:3000",
                "test-app-password"
        );

        assertDoesNotThrow(() ->
                dryRunService.sendWelcomeEmail("student@rikkei.edu.vn", "Nguyen Van A", "sv2024001", "P@ss1234", Role.STUDENT)
        );

        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Bỏ qua gửi email khi địa chỉ người nhận rỗng")
    void testSendWelcomeEmail_BlankRecipient() {
        assertDoesNotThrow(() ->
                emailService.sendWelcomeEmail("", "Nguyen Van A", "sv2024001", "P@ss1234", Role.STUDENT)
        );

        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Gửi email đặt lại mật khẩu thành công")
    void testSendPasswordResetEmail_Success() {
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        assertDoesNotThrow(() ->
                emailService.sendPasswordResetEmail("user@rikkei.edu.vn", "Tran Thi B", "NewSecretPass123")
        );

        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Gửi email thông báo chung thành công")
    void testSendGenericNotification_Success() {
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        assertDoesNotThrow(() ->
                emailService.sendGenericNotification("user@rikkei.edu.vn", "Thông báo học vụ", "Lịch nghỉ lễ", "Toàn trường nghỉ lễ...")
        );

        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }
}
