package com.rikkei.eduportal.ai.controller;

import com.rikkei.eduportal.ai.dto.AcademicAdvisorRequest;
import com.rikkei.eduportal.ai.dto.AcademicAdvisorResponse;
import com.rikkei.eduportal.ai.security.JwtTokenValidator;
import com.rikkei.eduportal.ai.security.RequireRoles;
import com.rikkei.eduportal.ai.service.AcademicAdvisorService;
import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.common.Role;
import jakarta.servlet.http.HttpServletRequest;
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
    private final JwtTokenValidator tokenValidator;

    public AiAdvisorController(AcademicAdvisorService advisorService, JwtTokenValidator tokenValidator) {
        this.advisorService = advisorService;
        this.tokenValidator = tokenValidator;
    }

    /**
     * API POST /api/v1/ai/academic-advisor
     * Restricted strictly to Role: STUDENT
     *
     * Provides personalized academic advising consultation for course registrations,
     * credit regulations, prerequisite dependencies, and schedule conflict resolution.
     */
    @PostMapping("/academic-advisor")
    @RequireRoles({Role.STUDENT})
    public ResponseEntity<ApiResponse<AcademicAdvisorResponse>> getAcademicAdvice(
            @Valid @RequestBody AcademicAdvisorRequest request,
            HttpServletRequest httpRequest) {

        String authHeader = httpRequest.getHeader("Authorization");
        String token = (authHeader != null && authHeader.startsWith("Bearer "))
                ? authHeader.substring(7).trim() : null;

        String authenticatedStudent = (String) httpRequest.getAttribute("authenticatedUser");
        if (authenticatedStudent == null || authenticatedStudent.isBlank()) {
            authenticatedStudent = tokenValidator.extractUsername(token, httpRequest.getHeader("X-User-Username"));
        }
        if (authenticatedStudent == null || authenticatedStudent.isBlank()) {
            authenticatedStudent = httpRequest.getHeader("X-Student-Code");
        }
        if (authenticatedStudent == null || authenticatedStudent.isBlank()) {
            authenticatedStudent = request.getStudentCode();
        }
        if (authenticatedStudent == null || authenticatedStudent.isBlank()) {
            authenticatedStudent = "sv2024001";
        }

        log.info("REST request to academic advisor: '{}' (authenticated student: {})",
                request.getMessage(), authenticatedStudent);

        AcademicAdvisorResponse response = advisorService.advise(request, authenticatedStudent, authHeader);

        String message = response.isFallbackUsed()
                ? "Tư vấn học tập thành công qua bộ quy chế dự phòng"
                : "Tư vấn học tập thành công từ Cố vấn AI";

        return ResponseEntity.ok(ApiResponse.success(message, response));
    }
}
