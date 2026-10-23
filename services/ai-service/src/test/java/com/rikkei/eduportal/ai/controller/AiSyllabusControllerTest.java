package com.rikkei.eduportal.ai.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.ai.dto.GenerateSyllabusRequest;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AiSyllabusControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String SECRET = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
    private SecretKey key;

    @BeforeEach
    void setUp() {
        byte[] keyBytes = Decoders.BASE64.decode(SECRET);
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    private String createToken(String role) {
        return Jwts.builder()
                .subject("testuser")
                .claims(Map.of("role", role))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 3600000))
                .signWith(key)
                .compact();
    }

    @Test
    @DisplayName("ADMIN role can generate syllabus successfully (HTTP 200)")
    void generateSyllabus_adminRole_shouldReturn200() throws Exception {
        String token = createToken("ADMIN");
        GenerateSyllabusRequest request = new GenerateSyllabusRequest(
                "Trí tuệ nhân tạo (Artificial Intelligence)",
                3,
                "Bao gồm Machine Learning, Deep Learning và Generative AI"
        );

        mockMvc.perform(post("/api/v1/ai/generate-syllabus")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.courseName").value("Trí tuệ nhân tạo (Artificial Intelligence)"))
                .andExpect(jsonPath("$.data.credits").value(3))
                .andExpect(jsonPath("$.data.syllabus").isNotEmpty())
                .andExpect(jsonPath("$.data.learningOutcomes").isArray())
                .andExpect(jsonPath("$.data.weeklyTopics").isArray())
                .andExpect(jsonPath("$.data.assessmentScheme.attendanceRate").value(10))
                .andExpect(jsonPath("$.data.assessmentScheme.midtermRate").value(30))
                .andExpect(jsonPath("$.data.assessmentScheme.finalRate").value(60));
    }

    @Test
    @DisplayName("LECTURER role can generate syllabus successfully (HTTP 200)")
    void generateSyllabus_lecturerRole_shouldReturn200() throws Exception {
        String token = createToken("LECTURER");
        GenerateSyllabusRequest request = new GenerateSyllabusRequest(
                "Kiến trúc Phần mềm và Microservices",
                4,
                "Spring Boot, Docker, Spring AI"
        );

        mockMvc.perform(post("/api/v1/ai/generate-syllabus")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.courseName").value("Kiến trúc Phần mềm và Microservices"))
                .andExpect(jsonPath("$.data.credits").value(4))
                .andExpect(jsonPath("$.data.syllabus").isNotEmpty());
    }

    @Test
    @DisplayName("STUDENT role is forbidden from generating syllabus (HTTP 403)")
    void generateSyllabus_studentRole_shouldReturn403() throws Exception {
        String token = createToken("STUDENT");
        GenerateSyllabusRequest request = new GenerateSyllabusRequest(
                "Nhập môn An toàn Thông tin",
                3,
                null
        );

        mockMvc.perform(post("/api/v1/ai/generate-syllabus")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value(containsString("Truy cập bị từ chối")));
    }

    @Test
    @DisplayName("Unauthenticated request without token should return 401 Unauthorized")
    void generateSyllabus_unauthenticated_shouldReturn401() throws Exception {
        GenerateSyllabusRequest request = new GenerateSyllabusRequest(
                "Hệ Điều Hành",
                3,
                null
        );

        mockMvc.perform(post("/api/v1/ai/generate-syllabus")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value(containsString("Yêu cầu đăng nhập")));
    }

    @Test
    @DisplayName("Invalid request with empty course name should return 400 Bad Request")
    void generateSyllabus_emptyCourseName_shouldReturn400() throws Exception {
        String token = createToken("ADMIN");
        GenerateSyllabusRequest request = new GenerateSyllabusRequest(
                "",
                3,
                null
        );

        mockMvc.perform(post("/api/v1/ai/generate-syllabus")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(containsString("Tên môn học không được để trống")));
    }

    @Test
    @DisplayName("Dev mock token with ADMIN role header should be accepted (HTTP 200)")
    void generateSyllabus_devMockToken_shouldReturn200() throws Exception {
        GenerateSyllabusRequest request = new GenerateSyllabusRequest(
                "Lập trình Web với React và Spring Boot",
                3,
                "Fullstack web app"
        );

        mockMvc.perform(post("/api/v1/ai/generate-syllabus")
                        .header("Authorization", "Bearer mock-jwt-token-sprint-7-days")
                        .header("X-User-Role", "ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.courseName").value("Lập trình Web với React và Spring Boot"));
    }
}
