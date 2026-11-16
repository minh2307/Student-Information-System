package com.rikkei.eduportal.auth.controller;

import com.rikkei.eduportal.auth.dto.AuthResponse;
import com.rikkei.eduportal.auth.dto.LoginRequest;
import com.rikkei.eduportal.auth.dto.RefreshTokenRequest;
import com.rikkei.eduportal.auth.service.AuthService;
import com.rikkei.eduportal.auth.service.TurnstileService;
import com.rikkei.eduportal.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final TurnstileService turnstileService;

    @Autowired
    public AuthController(AuthService authService, TurnstileService turnstileService) {
        this.authService = authService;
        this.turnstileService = turnstileService;
    }

    public AuthController(AuthService authService) {
        this(authService, null);
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        if (turnstileService != null) {
            String clientIp = extractClientIp(httpRequest);
            turnstileService.verify(request.getTurnstileToken(), clientIp, "login");
        }
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.success("Làm mới token thành công", response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@RequestBody(required = false) RefreshTokenRequest request) {
        if (request != null && request.getRefreshToken() != null) {
            authService.logout(request.getRefreshToken());
        }
        return ResponseEntity.ok(ApiResponse.success("Đăng xuất thành công", null));
    }

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) return null;
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
