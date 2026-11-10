package com.rikkei.eduportal.enrollment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.rikkei.eduportal.enrollment.dto.ExamScheduleDto;
import com.rikkei.eduportal.enrollment.dto.ExamScheduleRequest;
import com.rikkei.eduportal.enrollment.service.ExamScheduleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class AdminExamScheduleControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ExamScheduleService examScheduleService;

    @InjectMocks
    private AdminExamScheduleController controller;

    private ObjectMapper objectMapper;
    private ExamScheduleDto sampleExam;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        sampleExam = new ExamScheduleDto();
        sampleExam.setId(1L);
        sampleExam.setClassSectionId(10L);
        sampleExam.setSectionCode("CS101-01");
        sampleExam.setCourseCode("CS101");
        sampleExam.setCourseName("Lập trình căn bản");
        sampleExam.setExamDate(LocalDate.of(2025, 6, 20));
        sampleExam.setStartTime(LocalTime.of(8, 0));
        sampleExam.setEndTime(LocalTime.of(9, 30));
        sampleExam.setRoomName("LAB-201");
        sampleExam.setExamType("THI MÁY");
        sampleExam.setCurrentEnrolled(35);
        sampleExam.setMaxCapacity(40);
        sampleExam.setLecturerName("TS. Nguyen Van A");
    }

    @Test
    @DisplayName("GET /api/v1/admin/exam-schedules: Lấy danh sách lịch thi thành công")
    void testGetExamSchedules() throws Exception {
        when(examScheduleService.getAllAdminExams("2024-25_SEM2", "CS101")).thenReturn(List.of(sampleExam));

        mockMvc.perform(get("/api/v1/admin/exam-schedules")
                        .param("semester", "2024-25_SEM2")
                        .param("keyword", "CS101")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is(200)))
                .andExpect(jsonPath("$.data[0].id", is(1)))
                .andExpect(jsonPath("$.data[0].courseCode", is("CS101")))
                .andExpect(jsonPath("$.data[0].examType", is("THI MÁY")));

        verify(examScheduleService, times(1)).getAllAdminExams("2024-25_SEM2", "CS101");
    }

    @Test
    @DisplayName("GET /api/v1/admin/exams: Route alias lấy danh sách lịch thi thành công")
    void testGetExamSchedules_Alias() throws Exception {
        when(examScheduleService.getAllAdminExams(null, null)).thenReturn(List.of(sampleExam));

        mockMvc.perform(get("/api/v1/admin/exams")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is(200)))
                .andExpect(jsonPath("$.data[0].id", is(1)));

        verify(examScheduleService, times(1)).getAllAdminExams(null, null);
    }

    @Test
    @DisplayName("GET /api/v1/admin/exam-schedules/{id}: Lấy chi tiết lịch thi theo ID")
    void testGetExamScheduleById() throws Exception {
        when(examScheduleService.getExamScheduleById(1L)).thenReturn(sampleExam);

        mockMvc.perform(get("/api/v1/admin/exam-schedules/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is(200)))
                .andExpect(jsonPath("$.data.id", is(1)))
                .andExpect(jsonPath("$.data.roomName", is("LAB-201")));

        verify(examScheduleService, times(1)).getExamScheduleById(1L);
    }

    @Test
    @DisplayName("POST /api/v1/admin/exam-schedules: Tạo mới lịch thi thành công")
    void testCreateExamSchedule() throws Exception {
        ExamScheduleRequest req = new ExamScheduleRequest();
        req.setClassSectionId(10L);
        req.setExamDate(LocalDate.of(2025, 6, 25));
        req.setStartTime(LocalTime.of(8, 0));
        req.setEndTime(LocalTime.of(9, 30));
        req.setRoomName("LAB-201");
        req.setExamType("THI MÁY");

        when(examScheduleService.createExamSchedule(any(ExamScheduleRequest.class))).thenReturn(sampleExam);

        mockMvc.perform(post("/api/v1/admin/exam-schedules")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is(200)))
                .andExpect(jsonPath("$.data.id", is(1)));

        verify(examScheduleService, times(1)).createExamSchedule(any(ExamScheduleRequest.class));
    }

    @Test
    @DisplayName("PUT /api/v1/admin/exam-schedules/{id}: Cập nhật lịch thi thành công")
    void testUpdateExamSchedule() throws Exception {
        ExamScheduleRequest req = new ExamScheduleRequest();
        req.setRoomName("HALL-B");

        when(examScheduleService.updateExamSchedule(eq(1L), any(ExamScheduleRequest.class))).thenReturn(sampleExam);

        mockMvc.perform(put("/api/v1/admin/exam-schedules/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is(200)))
                .andExpect(jsonPath("$.data.id", is(1)));

        verify(examScheduleService, times(1)).updateExamSchedule(eq(1L), any(ExamScheduleRequest.class));
    }

    @Test
    @DisplayName("DELETE /api/v1/admin/exam-schedules/{id}: Xóa lịch thi thành công")
    void testDeleteExamSchedule() throws Exception {
        doNothing().when(examScheduleService).deleteExamSchedule(1L);

        mockMvc.perform(delete("/api/v1/admin/exam-schedules/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is(200)));

        verify(examScheduleService, times(1)).deleteExamSchedule(1L);
    }

    @Test
    @DisplayName("POST /api/v1/admin/exam-schedules/auto-generate: Tự động lập lịch thi")
    void testAutoGenerate() throws Exception {
        when(examScheduleService.autoGenerateExamSchedules("2024-25_SEM2")).thenReturn(5);

        mockMvc.perform(post("/api/v1/admin/exam-schedules/auto-generate")
                        .param("semester", "2024-25_SEM2")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is(200)))
                .andExpect(jsonPath("$.data.createdCount", is(5)))
                .andExpect(jsonPath("$.data.semester", is("2024-25_SEM2")));

        verify(examScheduleService, times(1)).autoGenerateExamSchedules("2024-25_SEM2");
    }
}
