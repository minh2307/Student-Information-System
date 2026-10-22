package com.rikkei.eduportal.ai.controller;

import com.rikkei.eduportal.ai.dto.GenerateSyllabusRequest;
import com.rikkei.eduportal.ai.dto.GenerateSyllabusResponse;
import com.rikkei.eduportal.ai.security.RequireRoles;
import com.rikkei.eduportal.ai.service.SyllabusService;
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
public class AiSyllabusController {

    private static final Logger log = LoggerFactory.getLogger(AiSyllabusController.class);

    private final SyllabusService syllabusService;

    public AiSyllabusController(SyllabusService syllabusService) {
        this.syllabusService = syllabusService;
    }

    /**
     * API POST /api/v1/ai/generate-syllabus
     * Restricted to Roles: ADMIN, LECTURER
     *
     * Generates a comprehensive academic syllabus and Course Learning Outcomes (CLOs)
     * using Spring AI ChatClient with prompt engineering and resilient fallback.
     */
    @PostMapping("/generate-syllabus")
    @RequireRoles({Role.ADMIN, Role.LECTURER})
    public ResponseEntity<ApiResponse<GenerateSyllabusResponse>> generateSyllabus(
            @Valid @RequestBody GenerateSyllabusRequest request) {

        log.info("REST request to generate syllabus for course: '{}' (credits: {})",
                request.getCourseName(), request.getCredits());

        GenerateSyllabusResponse response = syllabusService.generateSyllabus(request);

        String message = response.isFallbackUsed()
                ? "Sinh đề cương học phần thành công qua bộ sinh thích ứng dự phòng"
                : "Sinh đề cương chi tiết học phần thành công bằng Spring AI";

        return ResponseEntity.ok(ApiResponse.success(message, response));
    }
}
