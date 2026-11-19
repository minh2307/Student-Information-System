package com.rikkei.eduportal.enrollment.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.enrollment.dto.DeviceTokenRegisterRequest;
import com.rikkei.eduportal.enrollment.dto.DeviceTokenResponse;
import com.rikkei.eduportal.enrollment.dto.DeviceTokenRevokeRequest;
import com.rikkei.eduportal.enrollment.exception.GlobalExceptionHandler;
import com.rikkei.eduportal.enrollment.security.JwtTokenProvider;
import com.rikkei.eduportal.enrollment.service.DeviceTokenService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Date;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class NotificationControllerDeviceTokenTest {

    private static final String DEFAULT_SECRET = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
    private final SecretKey realKey = Keys.hmacShaKeyFor(DEFAULT_SECRET.getBytes(StandardCharsets.UTF_8));

    @Mock
    private DeviceTokenService deviceTokenService;

    private JwtTokenProvider jwtTokenProvider;
    private DeviceTokenController deviceTokenController;
    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(DEFAULT_SECRET);
        deviceTokenController = new DeviceTokenController(
                deviceTokenService,
                jwtTokenProvider
        );
        mockMvc = MockMvcBuilders.standaloneSetup(deviceTokenController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();
    }

    private String createValidToken(String subject, long ttlMillis) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(subject)
                .claim("username", subject)
                .claim("role", "STUDENT")
                .issuedAt(new Date(now))
                .expiration(new Date(now + ttlMillis))
                .signWith(realKey)
                .compact();
    }

    @Test
    @DisplayName("B02-14: POST /api/v1/notifications/tokens - Header X-User-Username từ Gateway đăng ký thành công (200)")
    void testRegisterDeviceToken_WithGatewayHeader_Success() throws Exception {
        DeviceTokenRegisterRequest request = new DeviceTokenRegisterRequest();
        request.setToken("fcm_token_valid_123");
        request.setPlatform("ANDROID");
        request.setDeviceId("pixel-7");

        DeviceTokenResponse mockResponse = new DeviceTokenResponse(
                1L,
                "fcm_token_valid_123",
                "ANDROID",
                "pixel-7",
                true,
                LocalDateTime.now()
        );

        when(deviceTokenService.registerToken(eq("student1"), any(DeviceTokenRegisterRequest.class)))
                .thenReturn(mockResponse);

        mockMvc.perform(post("/api/v1/notifications/tokens")
                        .header("X-User-Username", "student1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.token", is("fcm_token_valid_123")))
                .andExpect(jsonPath("$.data.platform", is("ANDROID")));

        verify(deviceTokenService).registerToken(eq("student1"), any(DeviceTokenRegisterRequest.class));
    }

    @Test
    @DisplayName("B02-15: POST /api/v1/notifications/tokens - Bearer JWT hợp lệ đăng ký thành công (Defense in Depth)")
    void testRegisterDeviceToken_WithValidBearerJwt_Success() throws Exception {
        String validJwt = createValidToken("sv2024001", 3600000);

        DeviceTokenRegisterRequest request = new DeviceTokenRegisterRequest();
        request.setToken("fcm_token_bearer_456");
        request.setPlatform("ANDROID");

        DeviceTokenResponse mockResponse = new DeviceTokenResponse(
                2L,
                "fcm_token_bearer_456",
                "ANDROID",
                null,
                true,
                LocalDateTime.now()
        );

        when(deviceTokenService.registerToken(eq("sv2024001"), any(DeviceTokenRegisterRequest.class)))
                .thenReturn(mockResponse);

        mockMvc.perform(post("/api/v1/notifications/tokens")
                        .header("Authorization", "Bearer " + validJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.token", is("fcm_token_bearer_456")));

        verify(deviceTokenService).registerToken(eq("sv2024001"), any(DeviceTokenRegisterRequest.class));
    }

    @Test
    @DisplayName("B02-16: POST /api/v1/notifications/tokens - Không có thông tin xác thực bị từ chối 401 Unauthorized")
    void testRegisterDeviceToken_WithoutAuth_Returns401() throws Exception {
        DeviceTokenRegisterRequest request = new DeviceTokenRegisterRequest();
        request.setToken("fcm_token_unauth");

        mockMvc.perform(post("/api/v1/notifications/tokens")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("B02-17: POST /api/v1/notifications/tokens - Token rỗng bị từ chối 400 Bad Request")
    void testRegisterDeviceToken_BlankToken_Returns400() throws Exception {
        DeviceTokenRegisterRequest request = new DeviceTokenRegisterRequest();
        request.setToken(""); // Invalid @NotBlank

        mockMvc.perform(post("/api/v1/notifications/tokens")
                        .header("X-User-Username", "student1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("B02-18: DELETE /api/v1/notifications/tokens - Thu hồi token thành công (200)")
    void testRevokeDeviceToken_WithAuth_Success() throws Exception {
        DeviceTokenRevokeRequest request = new DeviceTokenRevokeRequest();
        request.setToken("fcm_token_to_delete");

        mockMvc.perform(delete("/api/v1/notifications/tokens")
                        .header("X-User-Username", "student1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Thu hồi device token thành công")));

        verify(deviceTokenService).revokeToken("student1", "fcm_token_to_delete");
    }

    @Test
    @DisplayName("B02-19: DELETE /api/v1/notifications/tokens - Không có thông tin xác thực bị từ chối 401")
    void testRevokeDeviceToken_WithoutAuth_Returns401() throws Exception {
        DeviceTokenRevokeRequest request = new DeviceTokenRevokeRequest();
        request.setToken("fcm_token_to_delete");

        mockMvc.perform(delete("/api/v1/notifications/tokens")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }
}
