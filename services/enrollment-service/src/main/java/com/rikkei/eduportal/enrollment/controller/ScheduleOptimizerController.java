package com.rikkei.eduportal.enrollment.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.enrollment.dto.*;
import com.rikkei.eduportal.enrollment.service.SmartScheduleOptimizerService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@RestController
@RequestMapping("/api/v1/student/schedule-optimizer")
public class ScheduleOptimizerController {

    private static final Logger log = LoggerFactory.getLogger(ScheduleOptimizerController.class);

    private final SmartScheduleOptimizerService scheduleOptimizerService;
    private final ObjectMapper objectMapper;

    public ScheduleOptimizerController(SmartScheduleOptimizerService scheduleOptimizerService) {
        this.scheduleOptimizerService = scheduleOptimizerService;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * POST /api/v1/student/schedule-optimizer/solve
     * Tự động giải bài toán xếp thời khóa biểu không trùng lặp và tối ưu theo sở thích của sinh viên
     */
    @PostMapping("/solve")
    public ResponseEntity<ApiResponse<ScheduleOptimizerResponse>> solveOptimalSchedules(
            @RequestBody ScheduleOptimizerRequest request,
            HttpServletRequest httpRequest) {

        String studentCode = extractStudentIdentifier(httpRequest);
        log.info("Solving optimal schedules for student '{}' with {} target courses",
                studentCode, request.getCourseIds() != null ? request.getCourseIds().size() : 0);

        ScheduleOptimizerResponse response = scheduleOptimizerService.optimizeSchedule(studentCode, request);
        return ResponseEntity.ok(ApiResponse.success("AI đã tối ưu hóa thời khóa biểu thành công", response));
    }

    /**
     * POST /api/v1/student/schedule-optimizer/batch-reserve
     * Giữ chỗ hàng loạt 1-chạm (1-Click Batch Reserve) cho toàn bộ phương án đã chọn trong 5 phút
     */
    @PostMapping("/batch-reserve")
    public ResponseEntity<ApiResponse<BatchReserveResponse>> batchReservePlan(
            @RequestBody BatchReserveRequest request,
            HttpServletRequest httpRequest) {

        String studentCode = extractStudentIdentifier(httpRequest);
        log.info("Batch reserving {} sections for student '{}'",
                request.getSectionIds() != null ? request.getSectionIds().size() : 0, studentCode);

        BatchReserveResponse response = scheduleOptimizerService.batchReserveSlots(studentCode, request);
        return ResponseEntity.ok(ApiResponse.success("Xử lý giữ chỗ theo gói hoàn tất", response));
    }

    private String extractStudentIdentifier(HttpServletRequest request) {
        String usernameHeader = request.getHeader("X-User-Username");
        if (usernameHeader != null && !usernameHeader.trim().isEmpty()) {
            return usernameHeader.trim();
        }

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
                    log.debug("Could not decode JWT payload, using fallback: {}", ex.getMessage());
                }
            }
        }

        return "sv2024001";
    }
}
