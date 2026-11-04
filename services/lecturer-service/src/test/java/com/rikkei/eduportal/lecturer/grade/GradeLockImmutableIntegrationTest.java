package com.rikkei.eduportal.lecturer.grade;

import com.rikkei.eduportal.lecturer.config.SecurityConfig;
import com.rikkei.eduportal.lecturer.controller.LecturerController;
import com.rikkei.eduportal.lecturer.dto.request.AttendanceUpdateRequest;
import com.rikkei.eduportal.lecturer.dto.request.GradeUpdateRequest;
import com.rikkei.eduportal.lecturer.exception.GlobalExceptionHandler;
import com.rikkei.eduportal.lecturer.exception.GradeLockedConflictException;
import com.rikkei.eduportal.lecturer.security.*;
import com.rikkei.eduportal.lecturer.service.LecturerService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [TASK-D03-LUONG] Test Suite: Chốt Khóa Bảng Điểm Bất Biến Vĩnh Viễn (HTTP 409 Conflict).
 * Kiểm thử tự động chặn 100% quyền sửa điểm khi bảng điểm đã bị khóa (is_locked = true).
 */
@WebMvcTest(controllers = LecturerController.class)
@Import({
        SecurityConfig.class,
        JwtAuthenticationFilter.class,
        JwtAuthEntryPoint.class,
        JwtAccessDeniedHandler.class,
        JwtTokenProvider.class,
        GlobalExceptionHandler.class
})
@DisplayName("Integration Test: Grade Immutability & Lock Enforcement (HTTP 409 Conflict)")
class GradeLockImmutableIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private LecturerService lecturerService;

    @Test
    @WithMockUser(username = "gv_hoangluong", roles = {"LECTURER"})
    @DisplayName("TC-LOCK-01: Chặn sửa điểm khi bảng điểm đã bị khóa → Trả về HTTP 409 Conflict")
    void updateGrade_whenLocked_returnsHttp409Conflict() throws Exception {
        when(lecturerService.updateGrade(eq("gv_hoangluong"), eq(100L), any(GradeUpdateRequest.class)))
                .thenThrow(new GradeLockedConflictException(
                        "Điểm của enrollment 100 đã bị khóa, không thể sửa."));

        mockMvc.perform(put("/api/v1/lecturer/grades/100")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "midtermScore": 9.0,
                                  "finalScore": 9.5
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Điểm của enrollment 100 đã bị khóa, không thể sửa."));
    }

    @Test
    @WithMockUser(username = "gv_hoangluong", roles = {"LECTURER"})
    @DisplayName("TC-LOCK-02: Chặn sửa điểm chuyên cần khi bảng điểm đã bị khóa → Trả về HTTP 409 Conflict")
    void updateAttendance_whenLocked_returnsHttp409Conflict() throws Exception {
        when(lecturerService.updateAttendance(eq("gv_hoangluong"), eq(100L), any(AttendanceUpdateRequest.class)))
                .thenThrow(new GradeLockedConflictException(
                        "Điểm của enrollment 100 đã bị khóa, không thể sửa chuyên cần."));

        mockMvc.perform(put("/api/v1/lecturer/enrollments/100/attendance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "attendanceRate": 100.0
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Điểm của enrollment 100 đã bị khóa, không thể sửa chuyên cần."));
    }
}
