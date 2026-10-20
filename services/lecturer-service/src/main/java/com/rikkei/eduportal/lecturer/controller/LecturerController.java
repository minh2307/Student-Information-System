package com.rikkei.eduportal.lecturer.controller;

import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.lecturer.dto.request.AttendanceUpdateRequest;
import com.rikkei.eduportal.lecturer.dto.request.GradeUpdateRequest;
import com.rikkei.eduportal.lecturer.dto.response.ClassSectionResponse;
import com.rikkei.eduportal.lecturer.dto.response.LockGradesResponse;
import com.rikkei.eduportal.lecturer.dto.response.StudentGradeResponse;
import com.rikkei.eduportal.lecturer.service.LecturerService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/lecturer")
@PreAuthorize("hasRole('LECTURER')")
public class LecturerController {

    private final LecturerService lecturerService;

    public LecturerController(LecturerService lecturerService) {
        this.lecturerService = lecturerService;
    }

    /**
     * GET /api/v1/lecturer/classes?semester={semesterName}
     * Danh sách lớp học phần của giảng viên đang đăng nhập.
     * Filter ?semester= là tuỳ chọn.
     */
    @GetMapping("/classes")
    public ResponseEntity<ApiResponse<List<ClassSectionResponse>>> getMyClasses(
            Authentication authentication,
            @RequestParam(required = false) String semester) {

        List<ClassSectionResponse> data =
                lecturerService.getMyClasses(authentication.getName(), semester);
        return ResponseEntity.ok(ApiResponse.success("Danh sách lớp học phần", data));
    }

    /**
     * GET /api/v1/lecturer/classes/{sectionId}/students
     * Danh sách SV REGISTERED kèm điểm.
     */
    @GetMapping("/classes/{sectionId}/students")
    public ResponseEntity<ApiResponse<List<StudentGradeResponse>>> getStudentsOfSection(
            Authentication authentication,
            @PathVariable Long sectionId) {

        List<StudentGradeResponse> data =
                lecturerService.getStudentsOfSection(authentication.getName(), sectionId);
        return ResponseEntity.ok(ApiResponse.success("Danh sách sinh viên và điểm", data));
    }

    /**
     * PUT /api/v1/lecturer/enrollments/{enrollmentId}/attendance
     * Cập nhật chuyên cần của sinh viên.
     */
    @PutMapping("/enrollments/{enrollmentId}/attendance")
    public ResponseEntity<ApiResponse<StudentGradeResponse>> updateAttendance(
            Authentication authentication,
            @PathVariable Long enrollmentId,
            @Valid @RequestBody AttendanceUpdateRequest request) {

        StudentGradeResponse data =
                lecturerService.updateAttendance(authentication.getName(), enrollmentId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật chuyên cần thành công", data));
    }

    /**
     * PUT /api/v1/lecturer/grades/{enrollmentId}
     * Nhập/sửa điểm; tự tính total_score + letter_grade + CGPA.
     */
    @PutMapping("/grades/{enrollmentId}")
    public ResponseEntity<ApiResponse<StudentGradeResponse>> updateGrade(
            Authentication authentication,
            @PathVariable Long enrollmentId,
            @Valid @RequestBody GradeUpdateRequest request) {

        StudentGradeResponse data =
                lecturerService.updateGrade(authentication.getName(), enrollmentId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật điểm thành công", data));
    }

    /**
     * POST /api/v1/lecturer/classes/{sectionId}/lock-grades
     * Chốt điểm toàn bộ lớp.
     */
    @PostMapping("/classes/{sectionId}/lock-grades")
    public ResponseEntity<ApiResponse<LockGradesResponse>> lockGrades(
            Authentication authentication,
            @PathVariable Long sectionId) {

        LockGradesResponse data =
                lecturerService.lockGrades(authentication.getName(), sectionId);
        return ResponseEntity.ok(ApiResponse.success("Chốt điểm thành công", data));
    }
}
