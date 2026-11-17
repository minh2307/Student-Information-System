package com.rikkei.eduportal.gateway.controller;

import com.rikkei.eduportal.gateway.security.JwtGatewayValidator;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

class GatewayProxyControllerTest {

    private static final String SECRET = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
    private final SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));

    private GatewayProxyController controller;
    private JwtGatewayValidator jwtValidator;

    @BeforeEach
    void setUp() {
        jwtValidator = new JwtGatewayValidator(SECRET);
        controller = new GatewayProxyController(5000, 5000, jwtValidator);
    }

    private String createToken(String subject, String role, long ttlMillis) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(subject)
                .claim("username", subject)
                .claim("role", role)
                .claim("userId", 101L)
                .issuedAt(new Date(now))
                .expiration(new Date(now + ttlMillis))
                .signWith(key)
                .compact();
    }

    @Test
    @DisplayName("GATEWAY-SEC-01: Yêu cầu vào protected endpoint không có JWT bị Gateway chặn 401 Unauthorized")
    void unauthenticatedRequestBlockedAtGateway_Returns401() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/student/dashboard");
        // Giả lập hacker cố tình gửi spoofed internal header
        request.addHeader("X-User-Username", "sv2024001");
        request.addHeader("X-User-Role", "STUDENT");

        ResponseEntity<?> response = controller.proxyRequest(request, new HttpEntity<>(new byte[0]));

        assertNotNull(response);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        String body = new String((byte[]) response.getBody(), StandardCharsets.UTF_8);
        assertTrue(body.contains("401"));
        assertTrue(body.contains("Yêu cầu xác thực"));
    }

    @Test
    @DisplayName("GATEWAY-SEC-02: Yêu cầu với JWT có role không đủ quyền bị Gateway chặn 403 Forbidden")
    void insufficientRoleBlockedAtGateway_Returns403() {
        String studentToken = createToken("sv2024001", "STUDENT", 3600000);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/admin/users");
        request.addHeader("Authorization", "Bearer " + studentToken);

        ResponseEntity<?> response = controller.proxyRequest(request, new HttpEntity<>(new byte[0]));

        assertNotNull(response);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertNotNull(response.getBody());
        String body = new String((byte[]) response.getBody(), StandardCharsets.UTF_8);
        assertTrue(body.contains("403"));
        assertTrue(body.contains("Từ chối truy cập"));
    }

    @Test
    @DisplayName("GATEWAY-SEC-03: Token bị thay đổi payload (tampered) bị Gateway coi như không hợp lệ và trả về 401")
    void tamperedTokenBlockedAtGateway_Returns401() {
        String validToken = createToken("sv2024001", "STUDENT", 3600000);
        String[] parts = validToken.split("\\.");
        String payloadJson = new String(java.util.Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
        String tamperedPayload = payloadJson.replace("sv2024001", "sv2024002");
        String tamperedBase64 = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(tamperedPayload.getBytes(StandardCharsets.UTF_8));
        String tamperedToken = parts[0] + "." + tamperedBase64 + "." + parts[2];

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/student/dashboard");
        request.addHeader("Authorization", "Bearer " + tamperedToken);

        ResponseEntity<?> response = controller.proxyRequest(request, new HttpEntity<>(new byte[0]));

        assertNotNull(response);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    @DisplayName("GATEWAY-SEC-04: Token hết hạn bị Gateway từ chối 401")
    void expiredTokenBlockedAtGateway_Returns401() {
        String expiredToken = createToken("sv2024001", "STUDENT", -1000);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/student/dashboard");
        request.addHeader("Authorization", "Bearer " + expiredToken);

        ResponseEntity<?> response = controller.proxyRequest(request, new HttpEntity<>(new byte[0]));

        assertNotNull(response);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }

    @Test
    @DisplayName("GATEWAY-SEC-05: Đường dẫn không hỗ trợ routing trả về 404 Route Not Found")
    void unknownPathRouting_Returns404() {
        String adminToken = createToken("admin_user", "ADMIN", 3600000);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/unknown-service-path/test");
        request.addHeader("Authorization", "Bearer " + adminToken);

        ResponseEntity<?> response = controller.proxyRequest(request, new HttpEntity<>(new byte[0]));

        assertNotNull(response);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }
}
