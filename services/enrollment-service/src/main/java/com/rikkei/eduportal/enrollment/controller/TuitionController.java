package com.rikkei.eduportal.enrollment.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.enrollment.dto.TuitionDto;
import com.rikkei.eduportal.enrollment.service.TuitionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/student/tuition")
public class TuitionController {

    private final TuitionService tuitionService;
    private final ObjectMapper objectMapper;

    public TuitionController(TuitionService tuitionService) {
        this.tuitionService = tuitionService;
        this.objectMapper = new ObjectMapper();
    }

    @GetMapping
    public ResponseEntity<ApiResponse<TuitionDto>> getTuition(
            @RequestParam(required = false) String semester,
            HttpServletRequest request) {
        String studentIdentifier = extractUser(request);
        TuitionDto dto = tuitionService.getStudentTuition(studentIdentifier, semester);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin học phí thành công", dto));
    }

    @PostMapping("/pay")
    public ResponseEntity<ApiResponse<TuitionDto>> payTuition(
            @RequestBody(required = false) Map<String, String> body,
            HttpServletRequest request) {
        String studentIdentifier = extractUser(request);
        String semester = body != null ? body.get("semester") : null;
        String paymentMethod = body != null ? body.get("paymentMethod") : "VietQR";
        TuitionDto dto = tuitionService.payTuition(studentIdentifier, semester, paymentMethod);
        return ResponseEntity.ok(ApiResponse.success("Thanh toán học phí thành công", dto));
    }

    private String extractUser(HttpServletRequest request) {
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
                    if (claims.has("sub")) return claims.get("sub").asText();
                    if (claims.has("username")) return claims.get("username").asText();
                } catch (Exception ignored) {}
            }
        }
        return "sv2024001";
    }
}
