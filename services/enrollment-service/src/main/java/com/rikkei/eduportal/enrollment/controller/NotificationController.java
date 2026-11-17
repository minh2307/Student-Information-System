package com.rikkei.eduportal.enrollment.controller;

import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.enrollment.dto.NotificationDto;
import com.rikkei.eduportal.enrollment.exception.UnauthorizedException;
import com.rikkei.eduportal.enrollment.security.JwtTokenProvider;
import com.rikkei.eduportal.enrollment.service.AnnouncementAndNotificationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final AnnouncementAndNotificationService service;
    private final JwtTokenProvider jwtTokenProvider;

    public NotificationController(
            AnnouncementAndNotificationService service,
            JwtTokenProvider jwtTokenProvider) {
        this.service = service;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationDto>>> getNotifications(HttpServletRequest request) {
        String username = extractUser(request);
        List<NotificationDto> list = service.getUserNotifications(username);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông báo thành công", list));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @PathVariable Long id,
            HttpServletRequest request) {
        String username = extractUser(request);
        service.markAsRead(id, username);
        return ResponseEntity.ok(ApiResponse.success("Đánh dấu đã đọc thành công", null));
    }

    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(HttpServletRequest request) {
        String username = extractUser(request);
        service.markAllAsRead(username);
        return ResponseEntity.ok(ApiResponse.success("Đánh dấu tất cả đã đọc thành công", null));
    }

    private String extractUser(HttpServletRequest request) {
        // Cryptographic JWT Bearer Token verification (Primary active defense)
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            return jwtTokenProvider.validateAndGetSubject(token);
        }

        // Do not blindly trust unverified headers without cryptographic token
        throw new UnauthorizedException("Yêu cầu xác thực: Vui lòng cung cấp mã xác thực JWT hợp lệ để truy cập thông báo.");
    }
}
