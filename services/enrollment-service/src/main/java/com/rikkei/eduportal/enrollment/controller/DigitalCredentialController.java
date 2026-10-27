package com.rikkei.eduportal.enrollment.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.enrollment.dto.CredentialVerificationResult;
import com.rikkei.eduportal.enrollment.dto.DigitalCredentialDto;
import com.rikkei.eduportal.enrollment.service.DigitalCredentialService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@RestController
public class DigitalCredentialController {

    private static final Logger log = LoggerFactory.getLogger(DigitalCredentialController.class);

    private final DigitalCredentialService credentialService;
    private final ObjectMapper objectMapper;

    public DigitalCredentialController(DigitalCredentialService credentialService) {
        this.credentialService = credentialService;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * GET /api/v1/student/credentials/transcript
     * Sinh bảng điểm số có gắn chữ ký mật mã cho sinh viên đang đăng nhập
     */
    @GetMapping("/api/v1/student/credentials/transcript")
    public ResponseEntity<ApiResponse<DigitalCredentialDto>> getMyTranscriptCredential(HttpServletRequest request) {
        String studentIdentifier = extractStudentIdentifier(request);
        log.info("Generating digital transcript credential for student: {}", studentIdentifier);

        DigitalCredentialDto credential = credentialService.generateTranscriptCredential(studentIdentifier);
        return ResponseEntity.ok(ApiResponse.success("Sinh bảng điểm số xác thực thành công", credential));
    }

    /**
     * GET /api/v1/public/credentials/verify?serial=...&sig=...
     * Cổng đối soát công khai bảng điểm số chống giả mạo (Không yêu cầu đăng nhập)
     */
    @GetMapping("/api/v1/public/credentials/verify")
    public ResponseEntity<ApiResponse<CredentialVerificationResult>> verifyCredential(
            @RequestParam String serial,
            @RequestParam String sig) {

        log.info("Public verification requested for serial: {}", serial);
        CredentialVerificationResult result = credentialService.verifyTranscriptCredential(serial, sig);
        return ResponseEntity.ok(ApiResponse.success("Kết quả xác thực bảng điểm số", result));
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
