package com.rikkei.eduportal.lecturer.controller;

import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.lecturer.dto.request.AttendanceCheckInRequest;
import com.rikkei.eduportal.lecturer.dto.request.StartAttendanceSessionRequest;
import com.rikkei.eduportal.lecturer.dto.response.AttendanceCheckInResponse;
import com.rikkei.eduportal.lecturer.dto.response.AttendanceSessionResponse;
import com.rikkei.eduportal.lecturer.dto.response.DynamicQrResponse;
import com.rikkei.eduportal.lecturer.service.QrAttendanceService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS})
public class QrAttendanceController {

    private final QrAttendanceService qrAttendanceService;

    public QrAttendanceController(QrAttendanceService qrAttendanceService) {
        this.qrAttendanceService = qrAttendanceService;
    }

    /**
     * Giảng viên khởi tạo phiên điểm danh QR động mới.
     * POST /api/v1/lecturer/classes/{sectionId}/attendance/session
     */
    @PostMapping("/api/v1/lecturer/classes/{sectionId}/attendance/session")
    @PreAuthorize("hasRole('LECTURER')")
    public ResponseEntity<ApiResponse<AttendanceSessionResponse>> startSession(
            Authentication authentication,
            @PathVariable Long sectionId,
            @RequestBody(required = false) StartAttendanceSessionRequest request) {

        AttendanceSessionResponse response = qrAttendanceService.startSession(authentication.getName(), sectionId, request);
        return ResponseEntity.ok(ApiResponse.success("Bắt đầu phiên điểm danh thành công", response));
    }

    /**
     * Giảng viên lấy mã QR động hiện tại (luân chuyển mỗi 15s).
     * GET /api/v1/lecturer/classes/{sectionId}/attendance/qr-code
     */
    @GetMapping("/api/v1/lecturer/classes/{sectionId}/attendance/qr-code")
    @PreAuthorize("hasRole('LECTURER')")
    public ResponseEntity<ApiResponse<DynamicQrResponse>> getRotatingQrCode(
            Authentication authentication,
            @PathVariable Long sectionId) {

        DynamicQrResponse response = qrAttendanceService.getRotatingQrCode(authentication.getName(), sectionId);
        return ResponseEntity.ok(ApiResponse.success("Mã QR động hiện tại", response));
    }

    /**
     * Giảng viên xem chi tiết phiên điểm danh & danh sách SV đã điểm danh realtime.
     * GET /api/v1/lecturer/classes/{sectionId}/attendance/session
     */
    @GetMapping("/api/v1/lecturer/classes/{sectionId}/attendance/session")
    @PreAuthorize("hasRole('LECTURER')")
    public ResponseEntity<ApiResponse<AttendanceSessionResponse>> getCurrentSession(
            Authentication authentication,
            @PathVariable Long sectionId) {

        AttendanceSessionResponse response = qrAttendanceService.getCurrentSession(authentication.getName(), sectionId);
        return ResponseEntity.ok(ApiResponse.success("Thông tin phiên điểm danh", response));
    }

    /**
     * Giảng viên kết thúc phiên điểm danh.
     * POST /api/v1/lecturer/classes/{sectionId}/attendance/close-session
     */
    @PostMapping("/api/v1/lecturer/classes/{sectionId}/attendance/close-session")
    @PreAuthorize("hasRole('LECTURER')")
    public ResponseEntity<ApiResponse<AttendanceSessionResponse>> closeSession(
            Authentication authentication,
            @PathVariable Long sectionId) {

        AttendanceSessionResponse response = qrAttendanceService.closeSession(authentication.getName(), sectionId);
        return ResponseEntity.ok(ApiResponse.success("Kết thúc phiên điểm danh thành công", response));
    }

    /**
     * Sinh viên quét mã QR điểm danh (hỗ trợ cả các biến thể URL routing qua Gateway / Nginx / Direct).
     * POST /api/v1/attendance/check-in
     * POST /api/v1/student/attendance/check-in
     * POST /api/v1/lecturer/attendance/check-in
     * POST /attendance/check-in
     */
    @PostMapping({
            "/api/v1/attendance/check-in",
            "/api/v1/student/attendance/check-in",
            "/api/v1/lecturer/attendance/check-in",
            "/attendance/check-in"
    })
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<AttendanceCheckInResponse>> checkIn(
            Authentication authentication,
            @Valid @RequestBody AttendanceCheckInRequest request) {

        AttendanceCheckInResponse response = qrAttendanceService.studentCheckIn(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Điểm danh thành công", response));
    }

    /**
     * Fallback & GET Support cho trường hợp sinh viên mở trực tiếp link hoặc quét bằng Camera di động ngoài:
     * Hỗ trợ GET trên mọi route alias, tự động chuyển hướng hoặc trả về hướng dẫn thân thiện, không bao giờ gây lỗi HTTP 405.
     */
    @GetMapping({
            "/api/v1/attendance/check-in",
            "/api/v1/student/attendance/check-in",
            "/api/v1/lecturer/attendance/check-in",
            "/attendance/check-in"
    })
    public ResponseEntity<?> checkInGet(
            Authentication authentication,
            @RequestParam(value = "qrToken", required = false) String qrToken,
            @RequestParam(value = "token", required = false) String token,
            @RequestParam(value = "checkInToken", required = false) String checkInToken,
            HttpServletRequest request) {

        String rawToken = qrToken != null ? qrToken : (token != null ? token : checkInToken);

        // Nếu đã có thông tin xác thực sinh viên và có token truyền qua query param -> điểm danh ngay
        if (authentication != null && authentication.isAuthenticated() &&
                !"anonymousUser".equalsIgnoreCase(authentication.getName()) &&
                rawToken != null && !rawToken.isBlank()) {
            AttendanceCheckInRequest checkInRequest = new AttendanceCheckInRequest(
                    rawToken.trim(),
                    request.getHeader("User-Agent"),
                    System.currentTimeMillis()
            );
            AttendanceCheckInResponse response = qrAttendanceService.studentCheckIn(authentication.getName(), checkInRequest);
            return ResponseEntity.ok(ApiResponse.success("Điểm danh thành công", response));
        }

        // Nếu chưa đăng nhập nhưng có token -> điều hướng sang trang Thời khóa biểu để sinh viên đăng nhập và tự động check-in
        if (rawToken != null && !rawToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create("/student/timetable?checkInToken=" + rawToken.trim()))
                    .body(ApiResponse.success("Đang chuyển hướng đến cổng điểm danh sinh viên...", "/student/timetable?checkInToken=" + rawToken.trim()));
        }

        return ResponseEntity.ok(ApiResponse.success(
                "Cổng điểm danh QR Rikkei EduPortal đang hoạt động. Vui lòng sử dụng tính năng 'Điểm danh QR' bên trong ứng dụng sinh viên.",
                null
        ));
    }
}
