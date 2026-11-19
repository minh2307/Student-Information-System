package com.rikkei.eduportal.lecturer.service;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.List;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LecturerEmailServiceImplTest {

    @Mock
    private JavaMailSender mailSender;

    private LecturerEmailServiceImpl emailService;

    @BeforeEach
    void setUp() {
        emailService = new LecturerEmailServiceImpl(
                mailSender,
                true,
                "Rikkei EduPortal <workspacegateos@gmail.com>",
                "http://localhost:3000",
                "test-app-password"
        );
    }

    @Test
    @DisplayName("TC-LES-01: Gửi email cảnh báo sớm học vụ thành công")
    void testSendAcademicWarningEmail_Success() {
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        assertDoesNotThrow(() ->
                emailService.sendAcademicWarningEmail(
                        "sv2024001@rikkei.edu.vn",
                        "Nguyen Van A",
                        "SV2024001",
                        "CS101-01",
                        "Lập trình Java căn bản",
                        "CRITICAL",
                        List.of("Vắng 4/15 buổi (27%)"),
                        List.of("Cần gặp trực tiếp giảng viên để kiểm tra lại điểm danh")
                )
        );

        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("TC-LES-02: Bỏ qua gửi email khi email sinh viên bị trống")
    void testSendAcademicWarningEmail_BlankEmail() {
        assertDoesNotThrow(() ->
                emailService.sendAcademicWarningEmail(
                        "",
                        "Nguyen Van A",
                        "SV2024001",
                        "CS101-01",
                        "Lập trình Java căn bản",
                        "WARNING",
                        List.of("Điểm giữa kỳ 3.5"),
                        List.of("Cần ôn thi cuối kỳ")
                )
        );

        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("TC-LES-03: Dry-run mô phỏng khi tắt cấu hình mailEnabled")
    void testSendAcademicWarningEmail_DryRunWhenDisabled() {
        LecturerEmailServiceImpl disabledService = new LecturerEmailServiceImpl(
                mailSender,
                false,
                "Rikkei EduPortal <workspacegateos@gmail.com>",
                "http://localhost:3000",
                "test-app-password"
        );

        assertDoesNotThrow(() ->
                disabledService.sendAcademicWarningEmail(
                        "sv2024001@rikkei.edu.vn",
                        "Nguyen Van A",
                        "SV2024001",
                        "CS101-01",
                        "Lập trình Java",
                        "CRITICAL",
                        List.of("Vắng 5 buổi"),
                        List.of()
                )
        );

        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("TC-LES-04: Giảng viên gửi email thông báo riêng thành công")
    void testSendLecturerMessageEmail_Success() {
        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        assertDoesNotThrow(() ->
                emailService.sendLecturerMessageEmail(
                        "sv2024001@rikkei.edu.vn",
                        "Nguyen Van A",
                        "SV2024001",
                        "CS101-01",
                        "Lập trình Java",
                        "ThS. Nguyen Van B",
                        "Nhắc nộp bài tập lớn",
                        "Hạn nộp bài là 23h59 hôm nay."
                )
        );

        verify(mailSender, times(1)).send(any(MimeMessage.class));
    }
}
