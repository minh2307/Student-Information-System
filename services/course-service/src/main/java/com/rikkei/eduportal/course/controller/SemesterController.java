package com.rikkei.eduportal.course.controller;

import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.course.dto.request.SemesterCreateRequest;
import com.rikkei.eduportal.course.dto.response.SemesterResponse;
import com.rikkei.eduportal.course.service.SemesterService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class SemesterController {

    private final SemesterService semesterService;

    public SemesterController(SemesterService semesterService) {
        this.semesterService = semesterService;
    }

    /**
     * GET /api/v1/semesters - Public danh sách học kỳ
     */
    @GetMapping("/api/v1/semesters")
    public ResponseEntity<ApiResponse<List<SemesterResponse>>> getAllSemesters() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách học kỳ thành công", semesterService.getAllSemesters()));
    }

    /**
     * GET /api/v1/semesters/active - Lấy học kỳ hiện tại
     */
    @GetMapping("/api/v1/semesters/active")
    public ResponseEntity<ApiResponse<SemesterResponse>> getActiveSemester() {
        return ResponseEntity.ok(ApiResponse.success("Lấy học kỳ hiện tại thành công", semesterService.getActiveSemester()));
    }

    /**
     * POST /api/v1/admin/semesters - Admin thêm học kỳ mới
     */
    @PostMapping("/api/v1/admin/semesters")
    public ResponseEntity<ApiResponse<SemesterResponse>> createSemester(@Valid @RequestBody SemesterCreateRequest request) {
        SemesterResponse created = semesterService.createSemester(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo học kỳ mới thành công", created));
    }

    /**
     * PUT /api/v1/admin/semesters/{id}/registration - Admin đóng/mở đợt đăng ký
     */
    @PutMapping("/api/v1/admin/semesters/{id}/registration")
    public ResponseEntity<ApiResponse<SemesterResponse>> toggleRegistration(
            @PathVariable Long id,
            @RequestParam(required = false) Boolean isOpen) {
        SemesterResponse updated = semesterService.toggleRegistration(id, isOpen);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái đăng ký học kỳ thành công", updated));
    }
}
