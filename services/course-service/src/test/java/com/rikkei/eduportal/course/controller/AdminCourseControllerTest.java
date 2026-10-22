package com.rikkei.eduportal.course.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.course.dto.request.CourseCreateRequest;
import com.rikkei.eduportal.course.dto.response.CourseResponse;
import com.rikkei.eduportal.course.exception.GlobalExceptionHandler;
import com.rikkei.eduportal.course.service.CourseService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class AdminCourseControllerTest {

    private MockMvc mockMvc;

    @Mock
    private CourseService courseService;

    @InjectMocks
    private AdminCourseController adminCourseController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(adminCourseController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void testGetAllCourses() throws Exception {
        CourseResponse resp = new CourseResponse();
        resp.setId(1L);
        resp.setCourseCode("CS101");
        resp.setName("Intro to Programming");
        resp.setCredits(3);
        resp.setWeeklyHours(4);

        when(courseService.getAllCourses("CS")).thenReturn(List.of(resp));

        mockMvc.perform(get("/api/v1/admin/courses")
                        .param("keyword", "CS"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data[0].courseCode").value("CS101"));
    }

    @Test
    void testCreateCourse_Success() throws Exception {
        CourseCreateRequest req = new CourseCreateRequest("CS301", "DBMS", 3, 4, "Syllabus", null);

        CourseResponse resp = new CourseResponse();
        resp.setId(3L);
        resp.setCourseCode("CS301");
        resp.setName("DBMS");
        resp.setCredits(3);
        resp.setWeeklyHours(4);

        when(courseService.createCourse(any())).thenReturn(resp);

        mockMvc.perform(post("/api/v1/admin/courses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.courseCode").value("CS301"));
    }

    @Test
    void testCreateCourse_ValidationError_BlankName() throws Exception {
        CourseCreateRequest req = new CourseCreateRequest("CS301", "", 3, 4, "Syllabus", null);

        mockMvc.perform(post("/api/v1/admin/courses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }
}
