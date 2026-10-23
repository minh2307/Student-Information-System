package com.rikkei.eduportal.enrollment.controller;

import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.enrollment.dto.AnnouncementDto;
import com.rikkei.eduportal.enrollment.service.AnnouncementAndNotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/announcements")
public class AnnouncementController {

    private final AnnouncementAndNotificationService service;

    public AnnouncementController(AnnouncementAndNotificationService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AnnouncementDto>>> getAnnouncements(
            @RequestParam(required = false) String category) {
        List<AnnouncementDto> list = service.getAnnouncements(category);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách thông báo thành công", list));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AnnouncementDto>> createAnnouncement(
            @RequestBody AnnouncementDto dto) {
        AnnouncementDto created = service.createAnnouncement(dto);
        return ResponseEntity.ok(ApiResponse.success("Tạo thông báo thành công", created));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAnnouncement(@PathVariable Long id) {
        service.deleteAnnouncement(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa thông báo thành công", null));
    }
}
