package com.rikkei.eduportal.course.controller;

import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.common.SectionStatus;
import com.rikkei.eduportal.course.dto.request.ClassSectionCreateRequest;
import com.rikkei.eduportal.course.dto.request.ClassSectionUpdateRequest;
import com.rikkei.eduportal.course.dto.response.ClassSectionResponse;
import com.rikkei.eduportal.course.service.ClassSectionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/class-sections")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class AdminClassSectionController {

    private final ClassSectionService classSectionService;

    public AdminClassSectionController(ClassSectionService classSectionService) {
        this.classSectionService = classSectionService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ClassSectionResponse>>> getSections(
            @RequestParam(value = "semester", required = false) String semester,
            @RequestParam(value = "status", required = false) SectionStatus status,
            @RequestParam(value = "keyword", required = false) String keyword) {
        List<ClassSectionResponse> sections = classSectionService.searchSections(semester, status, keyword);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách lớp học phần thành công", sections));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ClassSectionResponse>> getSectionById(@PathVariable("id") Long id) {
        ClassSectionResponse section = classSectionService.getSectionById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết lớp học phần thành công", section));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ClassSectionResponse>> createSection(
            @Valid @RequestBody ClassSectionCreateRequest request) {
        ClassSectionResponse created = classSectionService.createSection(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Mở lớp học phần thành công", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ClassSectionResponse>> updateSection(
            @PathVariable("id") Long id,
            @Valid @RequestBody ClassSectionUpdateRequest request) {
        ClassSectionResponse updated = classSectionService.updateSection(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật lớp học phần thành công", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSection(@PathVariable("id") Long id) {
        classSectionService.deleteSection(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa lớp học phần thành công", null));
    }
}
