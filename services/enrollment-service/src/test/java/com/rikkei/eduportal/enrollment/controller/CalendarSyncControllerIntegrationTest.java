package com.rikkei.eduportal.enrollment.controller;

import com.rikkei.eduportal.enrollment.entity.StudentProfile;
import com.rikkei.eduportal.enrollment.entity.User;
import com.rikkei.eduportal.enrollment.service.CalendarSyncService;
import com.rikkei.eduportal.enrollment.service.StudentDashboardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class CalendarSyncControllerIntegrationTest {

    private MockMvc mockMvc;

    @Mock
    private CalendarSyncService calendarSyncService;

    @Mock
    private StudentDashboardService dashboardService;

    @InjectMocks
    private CalendarSyncController calendarSyncController;

    private StudentProfile sampleStudent;
    private final String CRLF = "\r\n";
    private String sampleIcsCalendar;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(calendarSyncController).build();

        User user = new User();
        user.setId(1L);
        user.setFullName("Nguyen Van A");
        user.setEmail("sv2024001@rikkei.edu.vn");

        sampleStudent = new StudentProfile();
        sampleStudent.setId(10L);
        sampleStudent.setStudentCode("SV2024001");
        sampleStudent.setUser(user);

        sampleIcsCalendar = "BEGIN:VCALENDAR" + CRLF +
                "VERSION:2.0" + CRLF +
                "PRODID:-//Rikkei Academy//Rikkei EduPortal SIS//VI" + CRLF +
                "CALSCALE:GREGORIAN" + CRLF +
                "METHOD:PUBLISH" + CRLF +
                "X-WR-CALNAME:Lịch Học & Thi - Nguyen Van A (SV2024001)" + CRLF +
                "X-WR-TIMEZONE:Asia/Ho_Chi_Minh" + CRLF +
                "BEGIN:VTIMEZONE" + CRLF +
                "TZID:Asia/Ho_Chi_Minh" + CRLF +
                "END:VTIMEZONE" + CRLF +
                "BEGIN:VEVENT" + CRLF +
                "UID:class-101-10@rikkei.edu.vn" + CRLF +
                "SUMMARY:CS101 - Lap trinh Java (CS101-01)" + CRLF +
                "RRULE:FREQ=WEEKLY;COUNT=15" + CRLF +
                "LOCATION:Room A-204\\, Rikkei Academy" + CRLF +
                "STATUS:CONFIRMED" + CRLF +
                "END:VEVENT" + CRLF +
                "END:VCALENDAR" + CRLF;
    }

    @Test
    @DisplayName("IT-CAL-01: GET /export.ics trả về file attachment .ics chuẩn RFC 5545 (200 OK)")
    void testExportIcsFile_Success() throws Exception {
        when(calendarSyncService.generateIcsCalendar(eq("SV2024001"), eq("2024-25_SEM2")))
                .thenReturn(sampleIcsCalendar);

        mockMvc.perform(get("/api/v1/student/calendar/export.ics")
                        .header("X-Student-Code", "SV2024001")
                        .param("semester", "2024-25_SEM2"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("text/calendar;charset=UTF-8"))
                .andExpect(header().string("Content-Disposition", "form-data; name=\"attachment\"; filename=\"rikkei_calendar_SV2024001.ics\""))
                .andExpect(content().string(containsString("BEGIN:VCALENDAR")))
                .andExpect(content().string(containsString("VERSION:2.0")))
                .andExpect(content().string(containsString("PRODID:-//Rikkei Academy//Rikkei EduPortal SIS//VI")))
                .andExpect(content().string(containsString("RRULE:FREQ=WEEKLY;COUNT=15")))
                .andExpect(content().string(containsString("END:VCALENDAR")));

        verify(calendarSyncService).generateIcsCalendar("SV2024001", "2024-25_SEM2");
    }

    @Test
    @DisplayName("IT-CAL-02: GET /feed/{studentCode} với token hợp lệ trả về Live WebCal feed 200 OK")
    void testGetCalendarSubscriptionFeed_ValidToken_Returns200() throws Exception {
        String studentCode = "SV2024001";
        String validToken = "valid_hmac_feed_token_xyz";

        when(calendarSyncService.validateCalendarFeedToken(studentCode, validToken)).thenReturn(true);
        when(calendarSyncService.generateIcsCalendar(eq(studentCode), eq(null))).thenReturn(sampleIcsCalendar);

        mockMvc.perform(get("/api/v1/student/calendar/feed/{studentCode}", studentCode)
                        .param("token", validToken))
                .andExpect(status().isOk())
                .andExpect(content().contentType("text/calendar;charset=UTF-8"))
                .andExpect(header().string("Content-Disposition", "inline; filename=\"rikkei_feed_SV2024001.ics\""))
                .andExpect(header().string("Cache-Control", containsString("max-age=1800")))
                .andExpect(content().string(containsString("BEGIN:VCALENDAR")))
                .andExpect(content().string(containsString("X-WR-TIMEZONE:Asia/Ho_Chi_Minh")))
                .andExpect(content().string(containsString("END:VCALENDAR")));

        verify(calendarSyncService).validateCalendarFeedToken(studentCode, validToken);
        verify(calendarSyncService).generateIcsCalendar(studentCode, null);
    }

    @Test
    @DisplayName("IT-CAL-03: GET /feed/{studentCode} với token sai trả về 403 Forbidden")
    void testGetCalendarSubscriptionFeed_InvalidToken_Returns403() throws Exception {
        String studentCode = "SV2024001";
        String invalidToken = "forged_malicious_token";

        when(calendarSyncService.validateCalendarFeedToken(studentCode, invalidToken)).thenReturn(false);

        mockMvc.perform(get("/api/v1/student/calendar/feed/{studentCode}", studentCode)
                        .param("token", invalidToken))
                .andExpect(status().isForbidden())
                .andExpect(content().contentType("text/calendar;charset=UTF-8"))
                .andExpect(content().string(containsString("BEGIN:VCALENDAR")))
                .andExpect(content().string(containsString("X-WR-CALNAME:Lỗi Xác thực Token")))
                .andExpect(content().string(containsString("END:VCALENDAR")));

        verify(calendarSyncService).validateCalendarFeedToken(studentCode, invalidToken);
    }

    @Test
    @DisplayName("IT-CAL-04: GET /feed/{studentCode} khi thiếu tham số token trả về 403 Forbidden")
    void testGetCalendarSubscriptionFeed_MissingToken_Returns403() throws Exception {
        String studentCode = "SV2024001";

        when(calendarSyncService.validateCalendarFeedToken(eq(studentCode), eq(null))).thenReturn(false);

        mockMvc.perform(get("/api/v1/student/calendar/feed/{studentCode}", studentCode))
                .andExpect(status().isForbidden())
                .andExpect(content().contentType("text/calendar;charset=UTF-8"))
                .andExpect(content().string(containsString("X-WR-CALNAME:Lỗi Xác thực Token")));

        verify(calendarSyncService).validateCalendarFeedToken(studentCode, null);
    }

    @Test
    @DisplayName("IT-CAL-05: GET /subscription-info trả về URL webcal và token đồng bộ lịch (200 OK)")
    void testGetSubscriptionInfo_Success() throws Exception {
        when(dashboardService.resolveStudent("sv2024001")).thenReturn(sampleStudent);
        when(calendarSyncService.generateCalendarFeedToken("SV2024001")).thenReturn("hmac_secret_token_123");

        mockMvc.perform(get("/api/v1/student/calendar/subscription-info")
                        .header("X-User-Username", "sv2024001")
                        .header("Host", "sis.rikkei.edu.vn"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status", is(200)))
                .andExpect(jsonPath("$.data.studentCode", is("SV2024001")))
                .andExpect(jsonPath("$.data.feedToken", is("hmac_secret_token_123")))
                .andExpect(jsonPath("$.data.subscriptionUrl", is("http://sis.rikkei.edu.vn/api/v1/student/calendar/feed/SV2024001?token=hmac_secret_token_123")))
                .andExpect(jsonPath("$.data.webcalUrl", is("webcal://sis.rikkei.edu.vn/api/v1/student/calendar/feed/SV2024001?token=hmac_secret_token_123")))
                .andExpect(jsonPath("$.data.instructions.googleCalendar").exists())
                .andExpect(jsonPath("$.data.instructions.appleCalendar").exists());

        verify(dashboardService).resolveStudent("sv2024001");
        verify(calendarSyncService).generateCalendarFeedToken("SV2024001");
    }

    @Test
    @DisplayName("IT-CAL-06: Đường dẫn rút gọn /api/v1/calendar/feed hoạt động đồng nhất")
    void testAlternateBasePath_CalendarFeed() throws Exception {
        String studentCode = "SV2024001";
        String validToken = "valid_hmac_feed_token_xyz";

        when(calendarSyncService.validateCalendarFeedToken(studentCode, validToken)).thenReturn(true);
        when(calendarSyncService.generateIcsCalendar(eq(studentCode), eq(null))).thenReturn(sampleIcsCalendar);

        mockMvc.perform(get("/api/v1/calendar/feed/{studentCode}", studentCode)
                        .param("token", validToken))
                .andExpect(status().isOk())
                .andExpect(content().contentType("text/calendar;charset=UTF-8"))
                .andExpect(content().string(containsString("BEGIN:VCALENDAR")));
    }
}
