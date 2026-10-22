package com.rikkei.eduportal.auth.controller;

import com.rikkei.eduportal.auth.dto.UpdateProfileRequest;
import com.rikkei.eduportal.auth.dto.UserProfileResponse;
import com.rikkei.eduportal.auth.service.ProfileService;
import com.rikkei.eduportal.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getMyProfile(Principal principal) {
        String username = resolveUsername(principal);
        UserProfileResponse response = profileService.getProfile(username);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin hồ sơ thành công", response));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateMyProfile(
            Principal principal,
            @Valid @RequestBody UpdateProfileRequest request) {
        String username = resolveUsername(principal);
        UserProfileResponse response = profileService.updateProfile(username, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin hồ sơ thành công", response));
    }

    private String resolveUsername(Principal principal) {
        if (principal != null) {
            return principal.getName();
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            return auth.getName();
        }
        throw new IllegalStateException("Không xác định được danh tính người dùng đang đăng nhập");
    }
}
