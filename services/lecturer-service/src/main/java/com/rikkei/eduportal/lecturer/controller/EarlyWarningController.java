package com.rikkei.eduportal.lecturer.controller;

import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.lecturer.dto.request.DispatchWarningRequest;
import com.rikkei.eduportal.lecturer.dto.response.DispatchWarningResponse;
import com.rikkei.eduportal.lecturer.dto.response.EarlyWarningSummaryResponse;
import com.rikkei.eduportal.lecturer.dto.response.StudentRiskDto;
import com.rikkei.eduportal.lecturer.service.EarlyWarningService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/lecturer/early-warnings")
public class EarlyWarningController {

    private final EarlyWarningService earlyWarningService;

    public EarlyWarningController(EarlyWarningService earlyWarningService) {
        this.earlyWarningService = earlyWarningService;
    }

    /**
     * GET /api/v1/lecturer/early-warnings/section/{sectionId}
     * Báo cáo cảnh báo học vụ sớm (chuyên cần < 80%, điểm < 4.0) cho lớp học phần
     */
    @GetMapping("/section/{sectionId}")
    @PreAuthorize("hasAnyRole('LECTURER', 'ADMIN')")
    public ResponseEntity<ApiResponse<EarlyWarningSummaryResponse>> getSectionRisks(
            Authentication authentication,
            @PathVariable Long sectionId) {

        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        EarlyWarningSummaryResponse response = earlyWarningService.evaluateSectionRisksByUsername(
                authentication.getName(), sectionId, isAdmin);
        return ResponseEntity.ok(ApiResponse.success("Báo cáo cảnh báo sớm học vụ", response));
    }

    /**
     * POST /api/v1/lecturer/early-warnings/dispatch
     * Giảng viên / Ban Đào tạo bắn thông báo cảnh báo sớm 1-chạm tới sinh viên nguy cơ
     */
    @PostMapping("/dispatch")
    @PreAuthorize("hasAnyRole('LECTURER', 'ADMIN')")
    public ResponseEntity<ApiResponse<DispatchWarningResponse>> dispatchWarnings(
            Authentication authentication,
            @RequestBody DispatchWarningRequest request) {

        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        DispatchWarningResponse response = earlyWarningService.dispatchWarningsByUsername(
                authentication.getName(), request, isAdmin);
        return ResponseEntity.ok(ApiResponse.success("Đã bắn cảnh báo học vụ thành công", response));
    }

    /**
     * GET /api/v1/lecturer/early-warnings/my-alerts
     * Dành cho sinh viên tra cứu các cảnh báo học vụ của bản thân
     */
    @GetMapping("/my-alerts")
    public ResponseEntity<ApiResponse<List<StudentRiskDto>>> getMyAlerts(Authentication authentication) {
        List<StudentRiskDto> alerts = earlyWarningService.getStudentSelfWarningsByUsername(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Cảnh báo học vụ cá nhân", alerts));
    }
}
