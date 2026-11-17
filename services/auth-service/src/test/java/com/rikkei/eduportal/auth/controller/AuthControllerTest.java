package com.rikkei.eduportal.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.auth.dto.AuthResponse;
import com.rikkei.eduportal.auth.dto.ChallengeResponse;
import com.rikkei.eduportal.auth.dto.LoginRequest;
import com.rikkei.eduportal.auth.dto.UserDto;
import com.rikkei.eduportal.auth.security.JwtAuthenticationEntryPoint;
import com.rikkei.eduportal.auth.security.JwtAuthenticationFilter;
import com.rikkei.eduportal.auth.security.JwtTokenProvider;
import com.rikkei.eduportal.auth.service.AuthService;
import com.rikkei.eduportal.auth.service.TurnstileService;
import com.rikkei.eduportal.common.Role;
import com.rikkei.eduportal.common.UserStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private TurnstileService turnstileService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("POST /login: Đăng nhập thành công trả về 200 OK kèm JWT")
    void testLoginEndpoint() throws Exception {
        LoginRequest request = new LoginRequest("admin", "123456");

        UserDto userDto = new UserDto();
        userDto.setId(1L);
        userDto.setUsername("admin");
        userDto.setRole(Role.ADMIN);
        userDto.setStatus(UserStatus.ACTIVE);

        AuthResponse authResponse = new AuthResponse("mock.jwt.token", userDto);

        when(authService.login(any(LoginRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.accessToken").value("mock.jwt.token"))
                .andExpect(jsonPath("$.data.user.username").value("admin"));

        verify(turnstileService).verifyLoginProtection(any(LoginRequest.class), any());
    }

    @Test
    @DisplayName("P0-01: GET /challenge trả về token, nonce và difficulty cho Native Mobile")
    void testGetChallengeEndpoint() throws Exception {
        ChallengeResponse challenge = new ChallengeResponse("test-challenge-token", "test-nonce-123", 3, System.currentTimeMillis() + 60000L);
        when(turnstileService.generateChallenge(anyString())).thenReturn(challenge);

        mockMvc.perform(get("/api/v1/auth/challenge"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.data.challengeToken").value("test-challenge-token"))
                .andExpect(jsonPath("$.data.nonce").value("test-nonce-123"))
                .andExpect(jsonPath("$.data.difficulty").value(3));
    }

    @Test
    @DisplayName("P0-01: POST /login bị chặn 403 khi turnstileService phát hiện vi phạm bảo mật bot")
    void testLogin_BotProtectionFailed_ThrowsAccessDenied() throws Exception {
        LoginRequest request = new LoginRequest("student", "123456");

        doThrow(new AccessDeniedException("Xác thực bot thất bại: Turnstile token không hợp lệ hoặc thiếu"))
                .when(turnstileService).verifyLoginProtection(any(LoginRequest.class), any());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }
}
