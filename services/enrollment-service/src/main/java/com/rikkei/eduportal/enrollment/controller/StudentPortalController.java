package com.rikkei.eduportal.enrollment.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.enrollment.dto.*;
import com.rikkei.eduportal.enrollment.service.CourseRegistrationService;
import com.rikkei.eduportal.enrollment.service.RealtimeSeatService;
import com.rikkei.eduportal.enrollment.service.StudentDashboardService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;

@RestController
@RequestMapping("/api/v1/student")
public class StudentPortalController {

    private static final Logger log = LoggerFactory.getLogger(StudentPortalController.class);

    private final StudentDashboardService dashboardService;
    private final CourseRegistrationService registrationService;
    private final com.rikkei.eduportal.enrollment.service.ExamScheduleService examScheduleService;
    private final RealtimeSeatService realtimeSeatService;
    private final com.rikkei.eduportal.enrollment.service.AcademicContextService academicContextService;
    private final ObjectMapper objectMapper;

    public StudentPortalController(StudentDashboardService dashboardService,
                                   CourseRegistrationService registrationService,
                                   com.rikkei.eduportal.enrollment.service.ExamScheduleService examScheduleService,
                                   RealtimeSeatService realtimeSeatService,
                                   com.rikkei.eduportal.enrollment.service.AcademicContextService academicContextService) {
        this.dashboardService = dashboardService;
        this.registrationService = registrationService;
        this.examScheduleService = examScheduleService;
        this.realtimeSeatService = realtimeSeatService;
        this.academicContextService = academicContextService;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * GET /api/v1/student/academic-context
     * Tổng hợp hồ sơ học vụ toàn diện phục vụ AI Academic Advisor và tra cứu cá nhân
     */
    @GetMapping("/academic-context")
    public ResponseEntity<ApiResponse<StudentAcademicContextDto>> getAcademicContext(HttpServletRequest request) {
        String studentIdentifier = extractStudentIdentifier(request);
        StudentAcademicContextDto context = academicContextService.getStudentAcademicContext(studentIdentifier);
        return ResponseEntity.ok(ApiResponse.success("Lấy dữ liệu học vụ tổng hợp thành công", context));
    }

    /**
     * GET /api/v1/student/dashboard
     * Dữ liệu cho màn hình Student Dashboard (FR-02)
     */
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<StudentDashboardResponse>> getDashboard(HttpServletRequest request) {
        String studentIdentifier = extractStudentIdentifier(request);
        StudentDashboardResponse response = dashboardService.getStudentDashboard(studentIdentifier);
        return ResponseEntity.ok(ApiResponse.success("Lấy dữ liệu dashboard thành công", response));
    }

    /**
     * GET /api/v1/student/timetable?semester=...
     * Lấy thời khóa biểu học phần theo kỳ
     */
    @GetMapping("/timetable")
    public ResponseEntity<ApiResponse<List<UpcomingClassDto>>> getTimetable(
            @RequestParam(required = false) String semester,
            HttpServletRequest request) {
        String studentIdentifier = extractStudentIdentifier(request);
        List<UpcomingClassDto> timetable = dashboardService.getStudentTimetable(studentIdentifier, semester);
        return ResponseEntity.ok(ApiResponse.success("Lấy thời khóa biểu thành công", timetable));
    }

    /**
     * GET /api/v1/student/exams?semester=...
     * Tra cứu lịch thi cá nhân theo kỳ
     */
    @GetMapping("/exams")
    public ResponseEntity<ApiResponse<List<com.rikkei.eduportal.enrollment.dto.ExamScheduleDto>>> getExams(
            @RequestParam(required = false) String semester,
            HttpServletRequest request) {
        String studentIdentifier = extractStudentIdentifier(request);
        List<com.rikkei.eduportal.enrollment.dto.ExamScheduleDto> exams = examScheduleService.getStudentExams(studentIdentifier, semester);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch thi thành công", exams));
    }

    /**
     * GET /api/v1/student/class-sections?semester=...&keyword=...
     * GET /api/v1/student/registration/sections?semester=...&keyword=...
     * Tra cứu danh sách các lớp học phần đang mở (FR-03)
     */
    @GetMapping({"/class-sections", "/registration/sections"})
    public ResponseEntity<ApiResponse<List<ClassSectionDto>>> getAvailableSections(
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) String keyword,
            HttpServletRequest request) {
        String studentIdentifier = extractStudentIdentifier(request);
        List<ClassSectionDto> sections = registrationService.getAvailableSections(studentIdentifier, semester, keyword);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách lớp học phần thành công", sections));
    }

    /**
     * GET /api/v1/student/class-sections/live-seats
     * GET /api/v1/student/live-seats
     * Luồng SSE nhận cập nhật sĩ số thời gian thực (Real-time Live Seat Counter - EDUP-204, F-05).
     */
    @GetMapping(value = {"/class-sections/live-seats", "/live-seats"}, produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamLiveSeats() {
        return realtimeSeatService.subscribeLiveSeats();
    }

    /**
     * POST /api/v1/student/class-sections/{sectionId}/reserve
     * Cơ chế Giữ chỗ 5 phút (5-Minute Slot Reservation - EDUP-203, F-06).
     */
    @PostMapping("/class-sections/{sectionId}/reserve")
    public ResponseEntity<ApiResponse<SlotReservationResponse>> reserveSlot(
            @PathVariable Long sectionId,
            HttpServletRequest request) {
        String studentIdentifier = extractStudentIdentifier(request);
        SlotReservationResponse response = realtimeSeatService.reserveSlot(studentIdentifier, sectionId);
        return ResponseEntity.ok(ApiResponse.success("Giữ chỗ thành công", response));
    }

    /**
     * DELETE /api/v1/student/class-sections/{sectionId}/reserve
     * Hủy giữ chỗ theo mã lớp học phần.
     */
    @DeleteMapping("/class-sections/{sectionId}/reserve")
    public ResponseEntity<ApiResponse<Void>> cancelReservation(
            @PathVariable Long sectionId,
            HttpServletRequest request) {
        String studentIdentifier = extractStudentIdentifier(request);
        realtimeSeatService.cancelReservation(studentIdentifier, sectionId);
        return ResponseEntity.ok(ApiResponse.success("Hủy giữ chỗ thành công", null));
    }

    /**
     * GET /api/v1/student/class-sections/my-reservations
     * Danh sách các lớp học phần đang được sinh viên giữ chỗ.
     */
    @GetMapping("/class-sections/my-reservations")
    public ResponseEntity<ApiResponse<List<SlotReservationResponse>>> getMyReservations(
            HttpServletRequest request) {
        String studentIdentifier = extractStudentIdentifier(request);
        List<SlotReservationResponse> reservations = realtimeSeatService.getMyActiveReservations(studentIdentifier);
        return ResponseEntity.ok(ApiResponse.success("Danh sách các lớp đang giữ chỗ", reservations));
    }

    /**
     * DELETE /api/v1/student/class-sections/my-reservations
     * Hủy toàn bộ các phiên giữ chỗ đang có của sinh viên (1-Chạm).
     */
    @DeleteMapping("/class-sections/my-reservations")
    public ResponseEntity<ApiResponse<Void>> cancelAllMyReservations(HttpServletRequest request) {
        String studentIdentifier = extractStudentIdentifier(request);
        int count = realtimeSeatService.cancelAllMyReservations(studentIdentifier);
        return ResponseEntity.ok(ApiResponse.success("Đã hủy toàn bộ " + count + " phiên giữ chỗ", null));
    }

    /**
     * POST /api/v1/student/class-sections/batch-enroll-reservations
     * POST /api/v1/student/enrollments/batch-held
     * 1-Chạm xác nhận toàn bộ các lớp đang giữ chỗ thành đăng ký chính thức.
     */
    @PostMapping({"/class-sections/batch-enroll-reservations", "/enrollments/batch-held"})
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> batchEnrollHeldReservations(HttpServletRequest request) {
        String studentIdentifier = extractStudentIdentifier(request);
        List<EnrollmentResponse> responses = registrationService.batchEnrollHeldReservations(studentIdentifier);
        return ResponseEntity.ok(ApiResponse.success("Đã xác nhận đăng ký thành công các môn đang giữ chỗ", responses));
    }

    /**
     * POST /api/v1/student/enrollments
     * Đăng ký học phần (FR-03, NFR-03)
     */
    @PostMapping("/enrollments")
    public ResponseEntity<ApiResponse<EnrollmentResponse>> enroll(
            @Valid @RequestBody EnrollmentRequest requestBody,
            HttpServletRequest request) {
        String studentIdentifier = extractStudentIdentifier(request);
        EnrollmentResponse response = registrationService.enroll(studentIdentifier, requestBody.getClassSectionId());
        return ResponseEntity.ok(ApiResponse.success("Đăng ký học phần thành công", response));
    }

    /**
     * DELETE /api/v1/student/enrollments/{enrollmentId}
     * Hủy đăng ký học phần (FR-03)
     */
    @DeleteMapping("/enrollments/{enrollmentId}")
    public ResponseEntity<ApiResponse<Void>> cancelEnrollment(
            @PathVariable Long enrollmentId,
            HttpServletRequest request) {
        String studentIdentifier = extractStudentIdentifier(request);
        registrationService.cancelEnrollment(studentIdentifier, enrollmentId);
        return ResponseEntity.ok(ApiResponse.success("Hủy đăng ký học phần thành công", null));
    }

    /**
     * GET /api/v1/student/grades
     * Tra cứu bảng điểm cá nhân qua các kỳ
     */
    @GetMapping("/grades")
    public ResponseEntity<ApiResponse<List<StudentGradeDto>>> getGrades(HttpServletRequest request) {
        String studentIdentifier = extractStudentIdentifier(request);
        List<StudentGradeDto> grades = registrationService.getStudentGrades(studentIdentifier);
        return ResponseEntity.ok(ApiResponse.success("Lấy bảng điểm thành công", grades));
    }

    /**
     * Trích xuất danh tính sinh viên từ Headers (Gateway/JWT/X-User-Username) hoặc fallback sv2024001
     */
    private String extractStudentIdentifier(HttpServletRequest request) {
        // 1. Kiểm tra header chuyển tiếp từ Gateway / Auth
        String usernameHeader = request.getHeader("X-User-Username");
        if (usernameHeader != null && !usernameHeader.trim().isEmpty()) {
            return usernameHeader.trim();
        }

        String studentCodeHeader = request.getHeader("X-Student-Code");
        if (studentCodeHeader != null && !studentCodeHeader.trim().isEmpty()) {
            return studentCodeHeader.trim();
        }

        // 2. Phân tích JWT Bearer Token nếu có
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
                    log.debug("Could not decode JWT payload, using fallback: {}", ex.getMessage());
                }
            }
        }

        // 3. Không có thông tin xác thực hợp lệ -> Từ chối truy cập (401)
        throw new com.rikkei.eduportal.enrollment.exception.UnauthorizedException(
                "Yêu cầu xác thực: Vui lòng đăng nhập để truy cập cổng thông tin sinh viên.");
    }
}
