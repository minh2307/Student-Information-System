package com.rikkei.eduportal.course.controller;

import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.course.dto.response.PendingEnrollmentResponse;
import com.rikkei.eduportal.course.service.AdminEnrollmentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/enrollments")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class AdminEnrollmentController {

    private final AdminEnrollmentService adminEnrollmentService;

    public AdminEnrollmentController(AdminEnrollmentService adminEnrollmentService) {
        this.adminEnrollmentService = adminEnrollmentService;
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<PendingEnrollmentResponse>>> getPendingEnrollments() {
        List<PendingEnrollmentResponse> list = adminEnrollmentService.getPendingEnrollments();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách yêu cầu đăng ký chờ duyệt thành công", list));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<PendingEnrollmentResponse>> approveEnrollment(@PathVariable("id") Long id) {
        PendingEnrollmentResponse approved = adminEnrollmentService.approveEnrollment(id);
        return ResponseEntity.ok(ApiResponse.success("Phê duyệt yêu cầu đăng ký học phần thành công", approved));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<PendingEnrollmentResponse>> rejectEnrollment(@PathVariable("id") Long id) {
        PendingEnrollmentResponse rejected = adminEnrollmentService.rejectEnrollment(id);
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối yêu cầu đăng ký học phần", rejected));
    }
}
