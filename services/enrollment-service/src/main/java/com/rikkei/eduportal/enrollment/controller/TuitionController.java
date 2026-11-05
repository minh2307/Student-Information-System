package com.rikkei.eduportal.enrollment.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.enrollment.dto.PayOSPaymentLinkResponse;
import com.rikkei.eduportal.enrollment.dto.TuitionDto;
import com.rikkei.eduportal.enrollment.exception.UnauthorizedException;
import com.rikkei.eduportal.enrollment.service.PayOSService;
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
    private final PayOSService payOSService;
    private final ObjectMapper objectMapper;

    public TuitionController(TuitionService tuitionService, PayOSService payOSService) {
        this.tuitionService = tuitionService;
        this.payOSService = payOSService;
        this.objectMapper = new ObjectMapper();
    }

    @GetMapping
    public ResponseEntity<ApiResponse<TuitionDto>> getTuition(
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) String bank,
            HttpServletRequest request) {
        String studentIdentifier = extractUser(request);
        TuitionDto dto = tuitionService.getStudentTuition(studentIdentifier, semester, bank);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin học phí thành công", dto));
    }

    @PostMapping("/pay")
    public ResponseEntity<ApiResponse<TuitionDto>> payTuition(
            @RequestBody(required = false) Map<String, String> body,
            HttpServletRequest request) {
        String studentIdentifier = extractUser(request);
        String semester = body != null ? body.get("semester") : null;
        String paymentMethod = body != null ? body.get("paymentMethod") : "VietQR Napas247";
        TuitionDto dto = tuitionService.payTuition(studentIdentifier, semester, paymentMethod);
        return ResponseEntity.ok(ApiResponse.success("Thanh toán học phí thành công", dto));
    }

    /**
     * Tạo liên kết thanh toán trực tuyến qua cổng PayOS kèm mã QR động & checkoutUrl
     */
    @PostMapping("/payos/create-payment-link")
    public ResponseEntity<ApiResponse<PayOSPaymentLinkResponse>> createPayOSPaymentLink(
            @RequestBody(required = false) Map<String, String> body,
            @RequestParam(required = false) String semester,
            HttpServletRequest request) {
        String studentIdentifier = extractUser(request);
        String targetSemester = (body != null && body.containsKey("semester")) ? body.get("semester") : semester;
        String returnUrl = (body != null && body.containsKey("returnUrl")) ? body.get("returnUrl") : null;
        String cancelUrl = (body != null && body.containsKey("cancelUrl")) ? body.get("cancelUrl") : null;
        PayOSPaymentLinkResponse response = payOSService.createPaymentLink(studentIdentifier, targetSemester, returnUrl, cancelUrl);
        return ResponseEntity.ok(ApiResponse.success("Tạo liên kết thanh toán PayOS thành công", response));
    }

    /**
     * Tra cứu trạng thái quyết toán PayOS cho giao dịch gần nhất
     */
    @GetMapping("/payos/status")
    public ResponseEntity<ApiResponse<TuitionDto>> checkPayOSStatus(
            @RequestParam(required = false) String semester,
            HttpServletRequest request) {
        String studentIdentifier = extractUser(request);
        TuitionDto dto = tuitionService.getStudentTuition(studentIdentifier, semester);
        return ResponseEntity.ok(ApiResponse.success("Trạng thái quyết toán học phí", dto));
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
        throw new UnauthorizedException("Yêu cầu xác thực tài khoản sinh viên hợp lệ để truy cập thông tin học phí.");
    }
}
