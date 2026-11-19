package com.rikkei.eduportal.gateway.filter;

import com.rikkei.eduportal.gateway.security.JwtGatewayValidator;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@DisplayName("Test Suite: Gateway Rate Limiter Filter (B-05.2)")
class RateLimiterFilterTest {

    private RateLimiterFilter filter;

    @BeforeEach
    void setUp() {
        filter = new RateLimiterFilter();
        filter.setRateLimitEnabled(true);
        filter.reset();
    }

    @Test
    @DisplayName("RATE-01: Requests within threshold pass through successfully")
    void requestsWithinLimit_PassThrough() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        request.setRemoteAddr("192.168.1.100");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertEquals(HttpStatus.OK.value(), response.getStatus());
    }

    @Test
    @DisplayName("RATE-02: Burst requests exceeding limit on auth endpoint receive HTTP 429 and Retry-After header")
    void burstRequestsExceedingAuthLimit_Returns429TooManyRequests() throws ServletException, IOException {
        String clientIp = "10.0.0.50";
        int authLimit = RateLimiterFilter.AUTH_LIMIT_PER_MINUTE;

        // Exhaust allowed tokens
        for (int i = 0; i < authLimit; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/auth/login");
            req.setRemoteAddr(clientIp);
            MockHttpServletResponse resp = new MockHttpServletResponse();
            filter.doFilter(req, resp, new MockFilterChain());
            assertEquals(200, resp.getStatus(), "Request " + (i + 1) + " should pass");
        }

        // Request #16 should be blocked
        MockHttpServletRequest blockedReq = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        blockedReq.setRemoteAddr(clientIp);
        MockHttpServletResponse blockedResp = new MockHttpServletResponse();

        filter.doFilter(blockedReq, blockedResp, new MockFilterChain());

        assertEquals(HttpStatus.TOO_MANY_REQUESTS.value(), blockedResp.getStatus());
        assertEquals("60", blockedResp.getHeader("Retry-After"));
        assertTrue(blockedResp.getContentAsString().contains("429"));
        assertTrue(blockedResp.getContentAsString().contains("Too Many Requests"));
    }

    @Test
    @DisplayName("RATE-03: Different client IPs maintain independent rate limit counters")
    void differentClientIps_AreIsolated() throws ServletException, IOException {
        int authLimit = RateLimiterFilter.AUTH_LIMIT_PER_MINUTE;

        // Exhaust IP 1
        for (int i = 0; i < authLimit; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/auth/login");
            req.setRemoteAddr("10.0.0.1");
            filter.doFilter(req, new MockHttpServletResponse(), new MockFilterChain());
        }

        // IP 2 should still be allowed
        MockHttpServletRequest reqIp2 = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        reqIp2.setRemoteAddr("10.0.0.2");
        MockHttpServletResponse respIp2 = new MockHttpServletResponse();

        filter.doFilter(reqIp2, respIp2, new MockFilterChain());

        assertEquals(HttpStatus.OK.value(), respIp2.getStatus());
    }

    @Test
    @DisplayName("RATE-04: Path limit resolution correctly maps specific tiers")
    void pathLimitResolution_MapsCorrectThresholds() {
        assertEquals(RateLimiterFilter.AUTH_LIMIT_PER_MINUTE, filter.resolveLimitForPath("/api/v1/auth/login"));
        assertEquals(RateLimiterFilter.AUTH_LIMIT_PER_MINUTE, filter.resolveLimitForPath("/api/v1/auth/refresh"));
        assertEquals(RateLimiterFilter.ATTENDANCE_LIMIT_PER_MINUTE, filter.resolveLimitForPath("/api/v1/attendance/check-in"));
        assertEquals(RateLimiterFilter.TOKEN_LIMIT_PER_MINUTE, filter.resolveLimitForPath("/api/v1/notifications/tokens"));
        assertEquals(RateLimiterFilter.GENERAL_LIMIT_PER_MINUTE, filter.resolveLimitForPath("/api/v1/student/timetable"));
    }

    @Test
    @DisplayName("RATE-05: Authenticated requests are rate-limited by User identity instead of shared IP (Campus NAT isolation)")
    void authenticatedUsersOnSameIp_AreIsolatedIndependently() throws ServletException, IOException {
        JwtGatewayValidator mockValidator = mock(JwtGatewayValidator.class);
        RateLimiterFilter userFilter = new RateLimiterFilter(mockValidator);
        userFilter.setRateLimitEnabled(true);

        Claims claimsUserA = mock(Claims.class);
        when(claimsUserA.getSubject()).thenReturn("sv2024001");
        when(mockValidator.validateAndGetClaims("token-sv2024001")).thenReturn(claimsUserA);

        Claims claimsUserB = mock(Claims.class);
        when(claimsUserB.getSubject()).thenReturn("sv2024002");
        when(mockValidator.validateAndGetClaims("token-sv2024002")).thenReturn(claimsUserB);

        String campusSharedIp = "14.162.145.20"; // Shared NAT IP on campus WiFi
        int attendanceLimit = RateLimiterFilter.ATTENDANCE_LIMIT_PER_MINUTE;

        // Student A exhausts their attendance limit
        for (int i = 0; i < attendanceLimit; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/attendance/check-in");
            req.setRemoteAddr(campusSharedIp);
            req.addHeader("Authorization", "Bearer token-sv2024001");
            userFilter.doFilter(req, new MockHttpServletResponse(), new MockFilterChain());
        }

        // Student A's next request is blocked 429
        MockHttpServletRequest reqA = new MockHttpServletRequest("POST", "/api/v1/attendance/check-in");
        reqA.setRemoteAddr(campusSharedIp);
        reqA.addHeader("Authorization", "Bearer token-sv2024001");
        MockHttpServletResponse respA = new MockHttpServletResponse();
        userFilter.doFilter(reqA, respA, new MockFilterChain());
        assertEquals(HttpStatus.TOO_MANY_REQUESTS.value(), respA.getStatus());

        // Student B on the exact same shared IP is NOT blocked
        MockHttpServletRequest reqB = new MockHttpServletRequest("POST", "/api/v1/attendance/check-in");
        reqB.setRemoteAddr(campusSharedIp);
        reqB.addHeader("Authorization", "Bearer token-sv2024002");
        MockHttpServletResponse respB = new MockHttpServletResponse();
        userFilter.doFilter(reqB, respB, new MockFilterChain());
        assertEquals(HttpStatus.OK.value(), respB.getStatus());
    }

    @Test
    @DisplayName("RATE-06: Memory ceiling protection: Hard capacity limit strictly bounds map size under flood")
    void floodTraffic_StrictlyBoundsMapSizeUnderCeiling() throws ServletException, IOException {
        RateLimiterFilter floodFilter = new RateLimiterFilter();
        floodFilter.setRateLimitEnabled(true);

        // Generate 5,500 distinct IPs (exceeding MAX_MAP_CAPACITY of 5,000)
        for (int i = 0; i < 5500; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/courses");
            req.setRemoteAddr("10.100." + (i / 256) + "." + (i % 256));
            floodFilter.doFilter(req, new MockHttpServletResponse(), new MockFilterChain());
        }

        assertTrue(floodFilter.getBucketCount() <= RateLimiterFilter.MAX_MAP_CAPACITY,
                "Bucket count must never exceed MAX_MAP_CAPACITY (actual: " + floodFilter.getBucketCount() + ")");
    }
}
