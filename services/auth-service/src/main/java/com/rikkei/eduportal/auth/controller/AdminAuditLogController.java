package com.rikkei.eduportal.auth.controller;

import com.rikkei.eduportal.auth.dto.AuditLogResponse;
import com.rikkei.eduportal.auth.dto.CreateAuditLogRequest;
import com.rikkei.eduportal.auth.entity.AuditLog;
import com.rikkei.eduportal.auth.service.AuditLogService;
import com.rikkei.eduportal.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
public class AdminAuditLogController {

    private final AuditLogService auditLogService;

    public AdminAuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    /**
     * GET /api/v1/admin/audit-logs
     * Danh sách nhật ký kiểm toán hệ thống kèm bộ lọc.
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> getAuditLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String actorUsername,
            @RequestParam(required = false) String targetEntity) {

        List<AuditLogResponse> logs = auditLogService.getAuditLogs(action, actorUsername, targetEntity);
        return ResponseEntity.ok(ApiResponse.success("Danh sách nhật ký kiểm toán hệ thống", logs));
    }

    /**
     * POST /api/v1/admin/audit-logs
     * Ghi nhận một sự kiện nhật ký kiểm toán mới (hỗ trợ JSON Delta).
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AuditLogResponse>> createAuditLog(
            @Valid @RequestBody CreateAuditLogRequest request,
            HttpServletRequest httpRequest) {

        String ipAddress = extractClientIp(httpRequest);
        AuditLog saved = auditLogService.recordFromRequest(request, ipAddress);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Ghi nhận nhật ký kiểm toán thành công", auditLogService.toResponse(saved)));
    }

    /**
     * GET /api/v1/admin/audit-logs/{id}
     * Chi tiết một bản ghi kiểm toán.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AuditLogResponse>> getAuditLogById(@PathVariable Long id) {
        AuditLogResponse log = auditLogService.getAuditLogById(id);
        return ResponseEntity.ok(ApiResponse.success(log));
    }

    /**
     * GET /api/v1/admin/audit-logs/entity/{targetEntity}/{targetId}
     * Lịch sử kiểm toán của một đối tượng cụ thể.
     */
    @GetMapping("/entity/{targetEntity}/{targetId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<AuditLogResponse>>> getEntityHistory(
            @PathVariable String targetEntity,
            @PathVariable String targetId) {

        List<AuditLogResponse> logs = auditLogService.getEntityHistory(targetEntity, targetId);
        return ResponseEntity.ok(ApiResponse.success("Lịch sử biến động đối tượng", logs));
    }

    private String extractClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
