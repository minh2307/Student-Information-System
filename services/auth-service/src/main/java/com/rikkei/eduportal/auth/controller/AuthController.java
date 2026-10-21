package com.rikkei.eduportal.auth.controller;

import com.rikkei.eduportal.auth.dto.AuthResponse;
import com.rikkei.eduportal.auth.dto.LoginRequest;
import com.rikkei.eduportal.auth.service.AuthService;
import com.rikkei.eduportal.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", response));
    }
}
