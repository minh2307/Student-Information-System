package com.rikkei.eduportal.course.controller;

import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.course.dto.request.CourseCreateRequest;
import com.rikkei.eduportal.course.dto.request.CourseUpdateRequest;
import com.rikkei.eduportal.course.dto.response.CourseResponse;
import com.rikkei.eduportal.course.service.CourseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/courses")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class AdminCourseController {

    private final CourseService courseService;

    public AdminCourseController(CourseService courseService) {
        this.courseService = courseService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CourseResponse>>> getAllCourses(
            @RequestParam(value = "keyword", required = false) String keyword) {
        List<CourseResponse> courses = courseService.getAllCourses(keyword);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách môn học thành công", courses));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CourseResponse>> getCourseById(@PathVariable("id") Long id) {
        CourseResponse course = courseService.getCourseById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết môn học thành công", course));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<CourseResponse>> createCourse(
            @Valid @RequestBody CourseCreateRequest request) {
        CourseResponse created = courseService.createCourse(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo mới môn học thành công", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CourseResponse>> updateCourse(
            @PathVariable("id") Long id,
            @Valid @RequestBody CourseUpdateRequest request) {
        CourseResponse updated = courseService.updateCourse(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật môn học thành công", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCourse(@PathVariable("id") Long id) {
        courseService.deleteCourse(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa môn học thành công", null));
    }
}
