package com.rikkei.eduportal.enrollment.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.enrollment.entity.StudentProfile;
import com.rikkei.eduportal.enrollment.service.CalendarSyncService;
import com.rikkei.eduportal.enrollment.service.StudentDashboardService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/student/calendar")
public class CalendarSyncController {

    private static final Logger log = LoggerFactory.getLogger(CalendarSyncController.class);

    private final CalendarSyncService calendarSyncService;
    private final StudentDashboardService dashboardService;
    private final ObjectMapper objectMapper;

    public CalendarSyncController(CalendarSyncService calendarSyncService,
                                  StudentDashboardService dashboardService) {
        this.calendarSyncService = calendarSyncService;
        this.dashboardService = dashboardService;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * GET /api/v1/student/calendar/export.ics
     * Tải file .ics lịch học và lịch thi của sinh viên để import vào Calendar
     */
    @GetMapping(value = "/export.ics", produces = "text/calendar; charset=utf-8")
    public ResponseEntity<byte[]> exportIcsFile(
            @RequestParam(required = false) String semester,
            HttpServletRequest request) {

        String studentIdentifier = extractStudentIdentifier(request);
        log.info("Generating ICS calendar export for student: {}", studentIdentifier);

        String icsContent = calendarSyncService.generateIcsCalendar(studentIdentifier, semester);
        byte[] bytes = icsContent.getBytes(StandardCharsets.UTF_8);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/calendar; charset=utf-8"));
        headers.setContentDispositionFormData("attachment", "rikkei_calendar_" + studentIdentifier + ".ics");
        headers.setCacheControl("no-cache, no-store, must-revalidate");

        return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
    }

    /**
     * GET /api/v1/student/calendar/feed/{studentCode}?token=...
     * Public Subscription feed URL cho Google Calendar / Apple Calendar
     */
    @GetMapping(value = "/feed/{studentCode}", produces = "text/calendar; charset=utf-8")
    public ResponseEntity<byte[]> getCalendarSubscriptionFeed(
            @PathVariable String studentCode,
            @RequestParam(required = false) String token,
            @RequestParam(required = false) String semester) {

        if (!calendarSyncService.validateCalendarFeedToken(studentCode, token)) {
            log.warn("Unauthorized calendar feed subscription attempt for: {}", studentCode);
            String errorMsg = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Rikkei EduPortal//EN\r\n" +
                    "X-WR-CALNAME:Lỗi Xác thực Token\r\nEND:VCALENDAR\r\n";
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .contentType(MediaType.parseMediaType("text/calendar; charset=utf-8"))
                    .body(errorMsg.getBytes(StandardCharsets.UTF_8));
        }

        log.info("Serving valid calendar subscription feed for student: {}", studentCode);
        String icsContent = calendarSyncService.generateIcsCalendar(studentCode, semester);
        byte[] bytes = icsContent.getBytes(StandardCharsets.UTF_8);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/calendar; charset=utf-8"));
        headers.set("Content-Disposition", "inline; filename=\"rikkei_feed_" + studentCode + ".ics\"");
        headers.setCacheControl("max-age=1800, must-revalidate"); // Cache 30 phút

        return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
    }

    /**
     * GET /api/v1/student/calendar/subscription-info
     * Lấy đường dẫn subscribe và hướng dẫn tích hợp vào Google/Apple Calendar
     */
    @GetMapping("/subscription-info")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSubscriptionInfo(HttpServletRequest request) {
        String studentIdentifier = extractStudentIdentifier(request);
        StudentProfile student = dashboardService.resolveStudent(studentIdentifier);
        String studentCode = student.getStudentCode();
        String token = calendarSyncService.generateCalendarFeedToken(studentCode);

        // Lấy scheme và host hiện tại từ request header
        String scheme = request.getScheme();
        String host = request.getHeader("Host");
        if (host == null) host = "localhost:8080";

        String feedUrl = scheme + "://" + host + "/api/v1/student/calendar/feed/" + studentCode + "?token=" + token;
        String webcalUrl = "webcal://" + host + "/api/v1/student/calendar/feed/" + studentCode + "?token=" + token;

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("studentCode", studentCode);
        data.put("feedToken", token);
        data.put("subscriptionUrl", feedUrl);
        data.put("webcalUrl", webcalUrl);
        data.put("exportUrl", scheme + "://" + host + "/api/v1/student/calendar/export.ics");

        Map<String, String> instructions = new LinkedHashMap<>();
        instructions.put("googleCalendar", "Mở Google Calendar trên máy tính > Cài đặt > Thêm lịch > Từ URL > Dán đường link Subscription URL.");
        instructions.put("appleCalendar", "Trên iPhone hoặc Mac, mở ứng dụng Lịch > Tệp > Đăng ký Lịch Mới > Dán Webcal URL.");
        instructions.put("outlook", "Vào Outlook Calendar > Add Calendar > Subscribe from web > Dán Subscription URL.");
        data.put("instructions", instructions);

        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin đồng bộ lịch thành công", data));
    }

    private String extractStudentIdentifier(HttpServletRequest request) {
        String studentCodeHeader = request.getHeader("X-Student-Code");
        if (studentCodeHeader != null && !studentCodeHeader.trim().isEmpty()) {
            return studentCodeHeader.trim();
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            String[] parts = token.split("\\.");
            if (parts.length >= 2) {
                try {
                    byte[] decoded = Base64.getUrlDecoder().decode(parts[1]);
                    JsonNode claims = objectMapper.readTree(new String(decoded, StandardCharsets.UTF_8));
                    if (claims.has("sub")) {
                        return claims.get("sub").asText();
                    } else if (claims.has("username")) {
                        return claims.get("username").asText();
                    }
                } catch (Exception ex) {
                    log.debug("Could not decode JWT payload: {}", ex.getMessage());
                }
            }
        }
        return "sv2024001";
    }
}
