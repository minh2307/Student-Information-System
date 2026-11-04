package com.rikkei.eduportal.enrollment.controller;

import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.enrollment.dto.PayOSWebhookPayload;
import com.rikkei.eduportal.enrollment.service.PayOSService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
public class PayOSWebhookController {

    private static final Logger log = LoggerFactory.getLogger(PayOSWebhookController.class);

    private final PayOSService payOSService;

    public PayOSWebhookController(PayOSService payOSService) {
        this.payOSService = payOSService;
    }

    /**
     * Endpoint công khai tiếp nhận Webhook từ PayOS (IPN - Instant Payment Notification)
     * Khi sinh viên chuyển khoản thành công, PayOS sẽ tự động gọi vào endpoint này kèm chữ ký mật mã.
     */
    @PostMapping({"/api/v1/public/tuition/payos-webhook", "/api/v1/public/payos/webhook"})
    public ResponseEntity<?> handlePayOSWebhook(@RequestBody PayOSWebhookPayload payload) {
        log.info("Received PayOS webhook request with code: {}, desc: {}", payload.getCode(), payload.getDesc());

        try {
            Map<String, Object> result = payOSService.processWebhook(payload);
            return ResponseEntity.ok(ApiResponse.success("Xử lý Webhook PayOS thành công", result));
        } catch (SecurityException secEx) {
            log.error("PayOS webhook signature verification failed: {}", secEx.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(401, "Chữ ký bảo mật Webhook PayOS không hợp lệ"));
        } catch (IllegalArgumentException argEx) {
            log.error("PayOS webhook payload invalid: {}", argEx.getMessage());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, argEx.getMessage()));
        } catch (Exception ex) {
            log.error("PayOS webhook processing error: {}", ex.getMessage(), ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(500, "Lỗi nội bộ khi quyết toán giao dịch PayOS: " + ex.getMessage()));
        }
    }
}
