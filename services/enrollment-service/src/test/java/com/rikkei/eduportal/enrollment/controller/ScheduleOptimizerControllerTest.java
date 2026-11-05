package com.rikkei.eduportal.enrollment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.common.ApiResponse;
import com.rikkei.eduportal.enrollment.dto.*;
import com.rikkei.eduportal.enrollment.service.SmartScheduleOptimizerService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ScheduleOptimizerControllerTest {

    @Mock
    private SmartScheduleOptimizerService scheduleOptimizerService;

    @InjectMocks
    private ScheduleOptimizerController scheduleOptimizerController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("API POST /solve: Gọi dịch vụ CSP Solver và trả về Top 3 phương án 200 OK")
    void testSolveOptimalSchedules_Returns200() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-User-Username", "sv2024001");

        ScheduleOptimizerRequest optRequest = new ScheduleOptimizerRequest();
        optRequest.setCourseIds(List.of(101L, 102L));
        optRequest.setPreferredShift("MORNING");

        SchedulePlanOption p1 = new SchedulePlanOption(1, "Phương án 1", 96, 6, 2, List.of("MON", "WED"),
                List.of("100% Ca Sáng"), Collections.emptyList());
        ScheduleOptimizerResponse expectedResponse = new ScheduleOptimizerResponse(
                "2024-25_SEM2", 2, 4, 1, List.of(p1), "AI CSP Solver hoàn tất"
        );

        when(scheduleOptimizerService.optimizeSchedule(eq("sv2024001"), any(ScheduleOptimizerRequest.class)))
                .thenReturn(expectedResponse);

        ResponseEntity<ApiResponse<ScheduleOptimizerResponse>> responseEntity =
                scheduleOptimizerController.solveOptimalSchedules(optRequest, request);

        assertNotNull(responseEntity);
        assertEquals(HttpStatus.OK, responseEntity.getStatusCode());
        assertNotNull(responseEntity.getBody());
        assertEquals("AI đã tối ưu hóa thời khóa biểu thành công", responseEntity.getBody().getMessage());
        assertEquals(1, responseEntity.getBody().getData().getPlans().size());
        assertEquals(96, responseEntity.getBody().getData().getPlans().get(0).getMatchPercentage());

        verify(scheduleOptimizerService).optimizeSchedule(eq("sv2024001"), any(ScheduleOptimizerRequest.class));
    }

    @Test
    @DisplayName("API POST /batch-reserve: 1-Chạm giữ chỗ gói lớp học phần trả về 200 OK")
    void testBatchReservePlan_Returns200() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-User-Username", "sv2024001");

        BatchReserveRequest reserveRequest = new BatchReserveRequest(List.of(10L, 20L));
        SlotReservationResponse r1 = new SlotReservationResponse(1L, 10L, "CS101-01", "Mon 1",
                LocalDateTime.now(), LocalDateTime.now().plusMinutes(5), 300, "ACTIVE", "Giữ chỗ thành công");

        BatchReserveResponse expectedResponse = new BatchReserveResponse(
                1, 0, List.of("Giữ chỗ thành công lớp CS101-01"), List.of(r1)
        );

        when(scheduleOptimizerService.batchReserveSlots(eq("sv2024001"), any(BatchReserveRequest.class)))
                .thenReturn(expectedResponse);

        ResponseEntity<ApiResponse<BatchReserveResponse>> responseEntity =
                scheduleOptimizerController.batchReservePlan(reserveRequest, request);

        assertNotNull(responseEntity);
        assertEquals(HttpStatus.OK, responseEntity.getStatusCode());
        assertNotNull(responseEntity.getBody());
        assertEquals("Xử lý giữ chỗ theo gói hoàn tất", responseEntity.getBody().getMessage());
        assertEquals(1, responseEntity.getBody().getData().getSuccessCount());

        verify(scheduleOptimizerService).batchReserveSlots(eq("sv2024001"), any(BatchReserveRequest.class));
    }

    @Test
    @DisplayName("API POST /solve: Khi bài toán không có nghiệm, trả về status NO_SOLUTION")
    void testSolveOptimalSchedules_NoSolution_Returns200WithNoSolutionStatus() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-User-Username", "sv2024001");

        ScheduleOptimizerRequest optRequest = new ScheduleOptimizerRequest();
        optRequest.setCourseIds(List.of(101L, 102L));

        ScheduleOptimizerResponse expectedResponse = new ScheduleOptimizerResponse(
                OptimizationStatus.NO_SOLUTION,
                "Không thể ghép được phương án nào không bị trùng lịch.",
                "2024-25_SEM2", 2, 0, 15, 25L, "Xung đột thời gian", Collections.emptyList()
        );

        when(scheduleOptimizerService.optimizeSchedule(eq("sv2024001"), any(ScheduleOptimizerRequest.class)))
                .thenReturn(expectedResponse);

        ResponseEntity<ApiResponse<ScheduleOptimizerResponse>> responseEntity =
                scheduleOptimizerController.solveOptimalSchedules(optRequest, request);

        assertNotNull(responseEntity);
        assertEquals(HttpStatus.OK, responseEntity.getStatusCode());
        assertNotNull(responseEntity.getBody());
        assertEquals("Không thể ghép được phương án nào không bị trùng lịch.", responseEntity.getBody().getMessage());
        assertEquals(OptimizationStatus.NO_SOLUTION, responseEntity.getBody().getData().getStatus());
        assertEquals(0, responseEntity.getBody().getData().getTotalSolutions());
    }

    @Test
    @DisplayName("API POST /solve: Khi timeout, trả về TIME_LIMIT_EXCEEDED")
    void testSolveOptimalSchedules_TimeLimitExceeded() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-User-Username", "sv2024001");

        ScheduleOptimizerRequest optRequest = new ScheduleOptimizerRequest();
        optRequest.setCourseIds(List.of(101L, 102L));

        ScheduleOptimizerResponse expectedResponse = new ScheduleOptimizerResponse(
                OptimizationStatus.TIME_LIMIT_EXCEEDED,
                "Thời gian tìm kiếm đã vượt quá giới hạn tối đa (3000ms).",
                "2024-25_SEM2", 2, 0, 500, 3010L, null, Collections.emptyList()
        );

        when(scheduleOptimizerService.optimizeSchedule(eq("sv2024001"), any(ScheduleOptimizerRequest.class)))
                .thenReturn(expectedResponse);

        ResponseEntity<ApiResponse<ScheduleOptimizerResponse>> responseEntity =
                scheduleOptimizerController.solveOptimalSchedules(optRequest, request);

        assertNotNull(responseEntity);
        assertEquals(HttpStatus.OK, responseEntity.getStatusCode());
        assertEquals(OptimizationStatus.TIME_LIMIT_EXCEEDED, responseEntity.getBody().getData().getStatus());
        assertNotEquals(OptimizationStatus.NO_SOLUTION, responseEntity.getBody().getData().getStatus());
    }

    @Test
    @DisplayName("API JSON Serialization: Đảm bảo cả trường chuẩn hóa (schedules, status, totalSolutions) và trường cũ (plans, validOptionsCount)")
    void testResponse_JsonSerialization_Compatibility() throws Exception {
        SchedulePlanOption p1 = new SchedulePlanOption(1, "Phương án 1", 96, 6, 2, List.of("MON", "WED"),
                List.of("100% Ca Sáng"), Collections.emptyList());
        ScheduleOptimizerResponse resp = new ScheduleOptimizerResponse(
                OptimizationStatus.SUCCESS,
                "AI hoàn tất tối ưu",
                "2024-25_SEM2",
                2,
                1,
                10,
                15L,
                null,
                List.of(p1)
        );

        ApiResponse<ScheduleOptimizerResponse> apiResp = ApiResponse.success("Thành công", resp);
        String json = objectMapper.writeValueAsString(apiResp);

        // FE cũ đọc data.plans, data.validOptionsCount, data.statusMessage
        assertTrue(json.contains("\"plans\""), "Phải chứa 'plans' cho FE hiện tại");
        assertTrue(json.contains("\"validOptionsCount\":1"), "Phải chứa 'validOptionsCount'");
        assertTrue(json.contains("\"statusMessage\""), "Phải chứa 'statusMessage'");

        // REST contract mới đọc data.status, data.schedules, data.totalSolutions, data.executionTimeMs
        assertTrue(json.contains("\"status\":\"SUCCESS\""), "Phải chứa enum status");
        assertTrue(json.contains("\"schedules\""), "Phải chứa 'schedules'");
        assertTrue(json.contains("\"totalSolutions\":1"), "Phải chứa 'totalSolutions'");
        assertTrue(json.contains("\"nodesExplored\":10"), "Phải chứa 'nodesExplored'");
        assertTrue(json.contains("\"executionTimeMs\":15"), "Phải chứa 'executionTimeMs'");
    }
}
