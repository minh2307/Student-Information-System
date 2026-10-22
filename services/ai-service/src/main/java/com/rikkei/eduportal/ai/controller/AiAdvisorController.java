package com.rikkei.eduportal.ai.controller;

import com.rikkei.eduportal.ai.dto.AcademicAdvisorRequest;
import com.rikkei.eduportal.ai.dto.AcademicAdvisorResponse;
import com.rikkei.eduportal.ai.security.RequireRoles;
import com.rikkei.eduportal.ai.service.AcademicAdvisorService;
import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.common.Role;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai")
public class AiAdvisorController {

    private static final Logger log = LoggerFactory.getLogger(AiAdvisorController.class);

    private final AcademicAdvisorService advisorService;

    public AiAdvisorController(AcademicAdvisorService advisorService) {
        this.advisorService = advisorService;
    }

    /**
     * API POST /api/v1/ai/academic-advisor
     * Restricted to Roles: STUDENT (and ADMIN, LECTURER)
     *
     * Provides academic advising consultation for course registrations,
     * credit regulations, prerequisite dependencies, and schedule conflict resolution.
     */
    @PostMapping("/academic-advisor")
    @RequireRoles({Role.STUDENT, Role.ADMIN, Role.LECTURER})
    public ResponseEntity<ApiResponse<AcademicAdvisorResponse>> getAcademicAdvice(
            @Valid @RequestBody AcademicAdvisorRequest request) {

        log.info("REST request to academic advisor: '{}' (student: {})",
                request.getMessage(), request.getStudentCode());

        AcademicAdvisorResponse response = advisorService.advise(request);

        String message = response.isFallbackUsed()
                ? "Tư vấn học tập thành công qua bộ quy chế dự phòng"
                : "Tư vấn học tập thành công từ Cố vấn AI";

        return ResponseEntity.ok(ApiResponse.success(message, response));
    }
}
