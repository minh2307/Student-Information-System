package com.rikkei.eduportal.course.controller;

import com.rikkei.eduportal.common.EnrollmentStatus;
import com.rikkei.eduportal.course.dto.response.PendingEnrollmentResponse;
import com.rikkei.eduportal.course.exception.GlobalExceptionHandler;
import com.rikkei.eduportal.course.exception.SectionCapacityFullException;
import com.rikkei.eduportal.course.service.AdminEnrollmentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminEnrollmentControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AdminEnrollmentService adminEnrollmentService;

    @InjectMocks
    private AdminEnrollmentController adminEnrollmentController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(adminEnrollmentController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void testGetPendingEnrollments() throws Exception {
        PendingEnrollmentResponse item = new PendingEnrollmentResponse();
        item.setEnrollmentId(3L);
        item.setStudentCode("SV2024001");
        item.setSectionCode("CS401-2025-01");
        item.setStatus(EnrollmentStatus.PENDING);

        when(adminEnrollmentService.getPendingEnrollments()).thenReturn(List.of(item));

        mockMvc.perform(get("/api/v1/admin/enrollments/pending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data[0].studentCode").value("SV2024001"));
    }

    @Test
    void testApproveEnrollment_Success() throws Exception {
        PendingEnrollmentResponse item = new PendingEnrollmentResponse();
        item.setEnrollmentId(3L);
        item.setStatus(EnrollmentStatus.REGISTERED);

        when(adminEnrollmentService.approveEnrollment(3L)).thenReturn(item);

        mockMvc.perform(put("/api/v1/admin/enrollments/3/approve"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.status").value("REGISTERED"));
    }

    @Test
    void testApproveEnrollment_CapacityFull_ReturnsBadRequest() throws Exception {
        when(adminEnrollmentService.approveEnrollment(3L))
                .thenThrow(new SectionCapacityFullException("Lớp đã đầy"));

        mockMvc.perform(put("/api/v1/admin/enrollments/3/approve"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }
}
