package com.rikkei.eduportal.enrollment.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.enrollment.exception.UnauthorizedException;
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
@CrossOrigin(origins = "*")
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

        String customBaseUrl = resolveBaseUrl(request);
        DigitalCredentialDto credential = credentialService.generateTranscriptCredential(studentIdentifier, customBaseUrl);
        return ResponseEntity.ok(ApiResponse.success("Sinh bảng điểm số xác thực thành công", credential));
    }

    private String resolveBaseUrl(HttpServletRequest request) {
        if (request == null) return null;
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank() && !origin.contains("localhost")) {
            return origin.trim();
        }
        String referer = request.getHeader("Referer");
        if (referer != null && !referer.isBlank() && !referer.contains("localhost")) {
            try {
                java.net.URI uri = java.net.URI.create(referer.trim());
                return uri.getScheme() + "://" + uri.getAuthority();
            } catch (Exception ignored) {}
        }
        String forwardedHost = request.getHeader("X-Forwarded-Host");
        String forwardedProto = request.getHeader("X-Forwarded-Proto");
        if (forwardedHost != null && !forwardedHost.isBlank()) {
            String proto = (forwardedProto != null && !forwardedProto.isBlank()) ? forwardedProto : "http";
            return proto + "://" + forwardedHost.split(",")[0].trim();
        }
        String host = request.getHeader("Host");
        if (host != null && !host.isBlank() && !host.startsWith("localhost")) {
            return request.getScheme() + "://" + host;
        }
        return null;
    }

    /**
     * GET /api/v1/public/credentials/verify?serial=...&sig=...
     * Cổng đối soát công khai bảng điểm số chống giả mạo (Không yêu cầu đăng nhập).
     * Hỗ trợ đồng thời cả alias: /api/v1/public/verify/transcript và query param signature/sig.
     */
    @GetMapping({"/api/v1/public/credentials/verify", "/api/v1/public/verify/transcript"})
    public ResponseEntity<ApiResponse<CredentialVerificationResult>> verifyCredential(
            @RequestParam(name = "serial", required = false) String serial,
            @RequestParam(name = "sig", required = false) String sig,
            @RequestParam(name = "signature", required = false) String signatureParam) {

        String effectiveSig = (sig != null && !sig.isBlank()) ? sig : signatureParam;
        log.info("Public verification requested for serial: {}, hasSignature: {}", serial, effectiveSig != null);

        CredentialVerificationResult result = credentialService.verifyTranscriptCredential(serial, effectiveSig);
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
                    log.debug("Could not decode JWT payload: {}", ex.getMessage());
                }
            }
        }

        throw new UnauthorizedException("Yêu cầu xác thực: Vui lòng đăng nhập để truy cập chứng chỉ số.");
    }
}
