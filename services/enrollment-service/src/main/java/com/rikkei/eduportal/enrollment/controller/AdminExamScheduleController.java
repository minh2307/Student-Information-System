package com.rikkei.eduportal.enrollment.controller;

import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.enrollment.dto.ExamScheduleDto;
import com.rikkei.eduportal.enrollment.dto.ExamScheduleRequest;
import com.rikkei.eduportal.enrollment.service.ExamScheduleService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/v1/admin/exam-schedules", "/api/v1/admin/exams"})
public class AdminExamScheduleController {

    private final ExamScheduleService examScheduleService;

    public AdminExamScheduleController(ExamScheduleService examScheduleService) {
        this.examScheduleService = examScheduleService;
    }

    /**
     * GET /api/v1/admin/exam-schedules
     * Tra cứu toàn bộ lịch thi có hỗ trợ lọc theo học kỳ và từ khóa tìm kiếm
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ExamScheduleDto>>> getExamSchedules(
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) String keyword) {
        List<ExamScheduleDto> exams = examScheduleService.getAllAdminExams(semester, keyword);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách lịch thi thành công", exams));
    }

    /**
     * POST /api/v1/admin/exam-schedules
     * Thêm mới một lịch thi cho lớp học phần
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ExamScheduleDto>> createExamSchedule(@RequestBody ExamScheduleRequest request) {
        ExamScheduleDto created = examScheduleService.createExamSchedule(request);
        return ResponseEntity.ok(ApiResponse.success("Tạo lịch thi mới thành công", created));
    }

    /**
     * PUT /api/v1/admin/exam-schedules/{id}
     * Cập nhật thời gian, phòng thi, hình thức thi của ca thi
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ExamScheduleDto>> updateExamSchedule(
            @PathVariable Long id,
            @RequestBody ExamScheduleRequest request) {
        ExamScheduleDto updated = examScheduleService.updateExamSchedule(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật lịch thi thành công", updated));
    }

    /**
     * DELETE /api/v1/admin/exam-schedules/{id}
     * Hủy bỏ / Xóa lịch thi
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteExamSchedule(@PathVariable Long id) {
        examScheduleService.deleteExamSchedule(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa lịch thi thành công", null));
    }

    /**
     * POST /api/v1/admin/exam-schedules/auto-generate?semester=...
     * Tự động khởi tạo lịch thi dự thảo cho các lớp học phần chưa có lịch thi trong học kỳ
     */
    @PostMapping("/auto-generate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> autoGenerate(
            @RequestParam(required = false) String semester) {
        int count = examScheduleService.autoGenerateExamSchedules(semester);
        return ResponseEntity.ok(ApiResponse.success("Tự động tạo lịch thi thành công", Map.of(
                "createdCount", count,
                "semester", semester != null ? semester : "2024-25_SEM2"
        )));
    }
}
