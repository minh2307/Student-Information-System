package com.rikkei.eduportal.auth.controller;

import com.rikkei.eduportal.auth.dto.CreateUserRequest;
import com.rikkei.eduportal.auth.dto.UpdateUserRequest;
import com.rikkei.eduportal.auth.dto.UserProfileResponse;
import com.rikkei.eduportal.auth.service.AdminUserService;
import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.common.Role;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserProfileResponse>>> getUsers(
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) String keyword) {
        List<UserProfileResponse> users = adminUserService.getAllUsers(role, keyword);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách người dùng thành công", users));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getUserById(@PathVariable Long id) {
        UserProfileResponse user = adminUserService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserProfileResponse>> createUser(
            @Valid @RequestBody CreateUserRequest request) {
        UserProfileResponse user = adminUserService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(201, "Tạo tài khoản người dùng thành công", user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request) {
        UserProfileResponse user = adminUserService.updateUser(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật tài khoản thành công", user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        adminUserService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa tài khoản thành công", null));
    }
}
