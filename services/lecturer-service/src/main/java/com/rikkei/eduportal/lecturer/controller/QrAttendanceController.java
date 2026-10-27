package com.rikkei.eduportal.lecturer.controller;

import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.lecturer.dto.request.AttendanceCheckInRequest;
import com.rikkei.eduportal.lecturer.dto.request.StartAttendanceSessionRequest;
import com.rikkei.eduportal.lecturer.dto.response.AttendanceCheckInResponse;
import com.rikkei.eduportal.lecturer.dto.response.AttendanceSessionResponse;
import com.rikkei.eduportal.lecturer.dto.response.DynamicQrResponse;
import com.rikkei.eduportal.lecturer.service.QrAttendanceService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
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
     * Sinh viên quét mã QR điểm danh.
     * POST /api/v1/attendance/check-in
     */
    @PostMapping("/api/v1/attendance/check-in")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<AttendanceCheckInResponse>> checkIn(
            Authentication authentication,
            @Valid @RequestBody AttendanceCheckInRequest request) {

        AttendanceCheckInResponse response = qrAttendanceService.studentCheckIn(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Điểm danh thành công", response));
    }
}
