package com.rikkei.eduportal.enrollment.controller;

import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.enrollment.dto.DeviceTokenRegisterRequest;
import com.rikkei.eduportal.enrollment.dto.DeviceTokenResponse;
import com.rikkei.eduportal.enrollment.dto.DeviceTokenRevokeRequest;
import com.rikkei.eduportal.enrollment.exception.UnauthorizedException;
import com.rikkei.eduportal.enrollment.security.JwtTokenProvider;
import com.rikkei.eduportal.enrollment.service.DeviceTokenService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for FCM Device Token Management (Task B-02).
 * Handles registration and revocation of mobile device push tokens.
 */
@RestController
@RequestMapping("/api/v1/notifications/tokens")
public class DeviceTokenController {

    private final DeviceTokenService deviceTokenService;
    private final JwtTokenProvider jwtTokenProvider;

    public DeviceTokenController(
            DeviceTokenService deviceTokenService,
            JwtTokenProvider jwtTokenProvider) {
        this.deviceTokenService = deviceTokenService;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DeviceTokenResponse>> registerDeviceToken(
            @Valid @RequestBody DeviceTokenRegisterRequest request,
            HttpServletRequest httpRequest) {
        String username = extractUser(httpRequest);
        DeviceTokenResponse response = deviceTokenService.registerToken(username, request);
        return ResponseEntity.ok(ApiResponse.success("Đăng ký device token thành công", response));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> revokeDeviceToken(
            @Valid @RequestBody DeviceTokenRevokeRequest request,
            HttpServletRequest httpRequest) {
        String username = extractUser(httpRequest);
        deviceTokenService.revokeToken(username, request.getToken());
        return ResponseEntity.ok(ApiResponse.success("Thu hồi device token thành công", null));
    }

    private String extractUser(HttpServletRequest request) {
        // 1. Header forwarded by API Gateway
        String usernameHeader = request.getHeader("X-User-Username");
        if (usernameHeader != null && !usernameHeader.trim().isEmpty()) {
            return usernameHeader.trim();
        }

        // 2. Cryptographic JWT Bearer Token verification (Defense-in-depth)
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            if (jwtTokenProvider != null) {
                return jwtTokenProvider.validateAndGetSubject(token);
            }
        }

        throw new UnauthorizedException("Yêu cầu xác thực: Vui lòng đăng nhập để quản lý device token.");
    }
}
