package com.rikkei.eduportal.course.controller;

import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.common.SectionStatus;
import com.rikkei.eduportal.course.dto.response.ClassSectionResponse;
import com.rikkei.eduportal.course.dto.response.CourseResponse;
import com.rikkei.eduportal.course.service.ClassSectionService;
import com.rikkei.eduportal.course.service.CourseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class PublicCourseController {

    private final CourseService courseService;
    private final ClassSectionService classSectionService;

    public PublicCourseController(CourseService courseService, ClassSectionService classSectionService) {
        this.courseService = courseService;
        this.classSectionService = classSectionService;
    }

    @GetMapping("/api/v1/courses")
    public ResponseEntity<ApiResponse<List<CourseResponse>>> getCourses(
            @RequestParam(value = "keyword", required = false) String keyword) {
        List<CourseResponse> courses = courseService.getAllCourses(keyword);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh mục môn học thành công", courses));
    }

    @GetMapping("/api/v1/student/class-sections")
    public ResponseEntity<ApiResponse<List<ClassSectionResponse>>> getStudentOpenSections(
            @RequestParam(value = "semester", required = false) String semester,
            @RequestParam(value = "keyword", required = false) String keyword) {
        // Sinh viên chỉ tra cứu các lớp đang mở (OPEN)
        List<ClassSectionResponse> sections = classSectionService.searchSections(semester, SectionStatus.OPEN, keyword);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách lớp học phần đang mở thành công", sections));
    }
}
