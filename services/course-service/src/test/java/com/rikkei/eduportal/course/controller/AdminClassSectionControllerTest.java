package com.rikkei.eduportal.course.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.rikkei.eduportal.common.SectionStatus;
import com.rikkei.eduportal.course.dto.request.ClassSectionCreateRequest;
import com.rikkei.eduportal.course.dto.response.ClassSectionResponse;
import com.rikkei.eduportal.course.exception.GlobalExceptionHandler;
import com.rikkei.eduportal.course.exception.RoomConflictException;
import com.rikkei.eduportal.course.service.ClassSectionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminClassSectionControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ClassSectionService classSectionService;

    @InjectMocks
    private AdminClassSectionController adminClassSectionController;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        mockMvc = MockMvcBuilders.standaloneSetup(adminClassSectionController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void testCreateSection_Success() throws Exception {
        ClassSectionCreateRequest req = new ClassSectionCreateRequest();
        req.setSectionCode("CS201-2025-01");
        req.setCourseId(2L);
        req.setLecturerId(1L);
        req.setSemesterName("2024-25_SEM2");
        req.setDayOfWeek("MON");
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(10, 30));
        req.setRoomName("Room A-204");
        req.setMaxCapacity(40);

        ClassSectionResponse resp = new ClassSectionResponse();
        resp.setId(1L);
        resp.setSectionCode("CS201-2025-01");
        resp.setRoomName("Room A-204");
        resp.setStatus(SectionStatus.OPEN);

        when(classSectionService.createSection(any())).thenReturn(resp);

        mockMvc.perform(post("/api/v1/admin/class-sections")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.sectionCode").value("CS201-2025-01"));
    }

    @Test
    void testCreateSection_RoomConflict_ReturnsConflict409() throws Exception {
        ClassSectionCreateRequest req = new ClassSectionCreateRequest();
        req.setSectionCode("CS201-2025-02");
        req.setCourseId(2L);
        req.setLecturerId(2L);
        req.setSemesterName("2024-25_SEM2");
        req.setDayOfWeek("MON");
        req.setStartTime(LocalTime.of(9, 0));
        req.setEndTime(LocalTime.of(10, 30));
        req.setRoomName("Room A-204");
        req.setMaxCapacity(40);

        when(classSectionService.createSection(any()))
                .thenThrow(new RoomConflictException("Xung đột phòng học: Phòng Room A-204 đã có lớp khác"));

        mockMvc.perform(post("/api/v1/admin/class-sections")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }
}
