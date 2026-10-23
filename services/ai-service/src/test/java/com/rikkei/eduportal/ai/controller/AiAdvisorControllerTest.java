package com.rikkei.eduportal.ai.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.ai.dto.AcademicAdvisorRequest;
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
class AiAdvisorControllerTest {

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
    @DisplayName("STUDENT role can consult Academic Advisor successfully (HTTP 200)")
    void getAcademicAdvice_studentRole_shouldReturn200() throws Exception {
        String token = createToken("STUDENT");
        AcademicAdvisorRequest request = new AcademicAdvisorRequest("Mình bị trùng lịch học môn CS201 và CS301 thì giải quyết thế nào?");
        request.setStudentCode("SV2024001");
        request.setCurrentSemester(4);

        mockMvc.perform(post("/api/v1/ai/academic-advisor")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.reply").isNotEmpty())
                .andExpect(jsonPath("$.data.suggestions").isArray())
                .andExpect(jsonPath("$.data.reply").value(containsString("Trùng thời khóa biểu")));
    }

    @Test
    @DisplayName("ADMIN role is forbidden from accessing Academic Advisor (HTTP 403)")
    void getAcademicAdvice_adminRole_shouldReturn403() throws Exception {
        String token = createToken("ADMIN");
        AcademicAdvisorRequest request = new AcademicAdvisorRequest("Quy chế đăng ký tối đa bao nhiêu tín chỉ?");

        mockMvc.perform(post("/api/v1/ai/academic-advisor")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("LECTURER role is forbidden from accessing Academic Advisor (HTTP 403)")
    void getAcademicAdvice_lecturerRole_shouldReturn403() throws Exception {
        String token = createToken("LECTURER");
        AcademicAdvisorRequest request = new AcademicAdvisorRequest("Môn CS401 có điều kiện tiên quyết là gì?");

        mockMvc.perform(post("/api/v1/ai/academic-advisor")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("Unauthenticated request without token should return 401 Unauthorized")
    void getAcademicAdvice_unauthenticated_shouldReturn401() throws Exception {
        AcademicAdvisorRequest request = new AcademicAdvisorRequest("Xin chào cố vấn");

        mockMvc.perform(post("/api/v1/ai/academic-advisor")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value(containsString("Yêu cầu đăng nhập")));
    }

    @Test
    @DisplayName("Empty message should return 400 Bad Request")
    void getAcademicAdvice_emptyMessage_shouldReturn400() throws Exception {
        String token = createToken("STUDENT");
        AcademicAdvisorRequest request = new AcademicAdvisorRequest("");

        mockMvc.perform(post("/api/v1/ai/academic-advisor")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(containsString("Nội dung câu hỏi không được để trống")));
    }

    @Test
    @DisplayName("Dev mock token with STUDENT role header should be accepted (HTTP 200)")
    void getAcademicAdvice_devMockToken_shouldReturn200() throws Exception {
        AcademicAdvisorRequest request = new AcademicAdvisorRequest("Gợi ý lộ trình học tập ngành CNTT");

        mockMvc.perform(post("/api/v1/ai/academic-advisor")
                        .header("Authorization", "Bearer mock-jwt-token-sprint-7-days")
                        .header("X-User-Role", "STUDENT")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.reply").value(containsString("Lộ trình Học tập")));
    }
}
