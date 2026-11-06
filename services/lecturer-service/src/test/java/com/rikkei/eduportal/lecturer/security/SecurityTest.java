package com.rikkei.eduportal.lecturer.security;

import com.rikkei.eduportal.lecturer.config.SecurityConfig;
import com.rikkei.eduportal.lecturer.controller.EarlyWarningController;
import com.rikkei.eduportal.lecturer.controller.LecturerController;
import com.rikkei.eduportal.lecturer.dto.response.EarlyWarningSummaryResponse;
import com.rikkei.eduportal.lecturer.service.EarlyWarningService;
import com.rikkei.eduportal.lecturer.service.LecturerService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Date;

import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {LecturerController.class, EarlyWarningController.class})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtAuthEntryPoint.class, JwtAccessDeniedHandler.class, JwtTokenProvider.class})
class SecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private LecturerService lecturerService;

    @MockBean
    private EarlyWarningService earlyWarningService;

    @Test
    @WithMockUser(username = "sv2024001", roles = {"STUDENT"})
    void studentRoleShouldGet403ForbiddenOnLecturerGrades() throws Exception {
        mockMvc.perform(put("/api/v1/lecturer/grades/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"midtermScore\": 8.5, \"finalScore\": 9.0}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "sv2024001", roles = {"STUDENT"})
    void studentRoleCanAccessMyAlerts() throws Exception {
        when(earlyWarningService.getStudentSelfWarningsByUsername(anyString()))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/lecturer/early-warnings/my-alerts")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "sv2024001", roles = {"STUDENT"})
    void studentRoleCannotAccessSectionRisks() throws Exception {
        mockMvc.perform(get("/api/v1/lecturer/early-warnings/section/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin_user", roles = {"ADMIN"})
    void adminRoleCanAccessSectionRisks() throws Exception {
        EarlyWarningSummaryResponse summary = new EarlyWarningSummaryResponse();
        summary.setSectionId(1L);
        when(earlyWarningService.evaluateSectionRisksByUsername(anyString(), anyLong(), anyBoolean()))
                .thenReturn(summary);

        mockMvc.perform(get("/api/v1/lecturer/early-warnings/section/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    void unauthenticatedUserCannotAccessMyAlerts() throws Exception {
        mockMvc.perform(get("/api/v1/lecturer/early-warnings/my-alerts")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void studentJwtTokenShouldGet403Forbidden() throws Exception {
        String secret = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
        String token = Jwts.builder()
                .subject("sv2024001")
                .claim("userId", 1L)
                .claim("email", "student1@edu.vn")
                .claim("fullName", "Sinh Vien 1")
                .claim("role", "STUDENT")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 3600000))
                .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)))
                .compact();

        mockMvc.perform(put("/api/v1/lecturer/grades/1")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"midtermScore\": 8.5, \"finalScore\": 9.0}"))
                .andExpect(status().isForbidden());
    }
}
