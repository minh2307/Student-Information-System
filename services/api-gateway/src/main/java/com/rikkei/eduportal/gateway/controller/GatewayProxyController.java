package com.rikkei.eduportal.gateway.controller;

import com.rikkei.eduportal.gateway.security.JwtGatewayValidator;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;

@RestController
public class GatewayProxyController {

    private static final Logger log = LoggerFactory.getLogger(GatewayProxyController.class);

    @Value("${gateway.services.auth:http://localhost:8081}")
    private String authServiceUrl;

    @Value("${gateway.services.course:http://localhost:8082}")
    private String courseServiceUrl;

    @Value("${gateway.services.enrollment:http://localhost:8083}")
    private String enrollmentServiceUrl;

    @Value("${gateway.services.lecturer:http://localhost:8085}")
    private String lecturerServiceUrl;

    @Value("${gateway.services.ai:http://localhost:8084}")
    private String aiServiceUrl;

    private final RestTemplate restTemplate;
    private final JwtGatewayValidator jwtValidator;

    public GatewayProxyController(
            @Value("${gateway.timeout.connect:5000}") int connectTimeout,
            @Value("${gateway.timeout.read:30000}") int readTimeout,
            JwtGatewayValidator jwtValidator) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory() {
            @Override
            protected void prepareConnection(java.net.HttpURLConnection connection, String httpMethod) throws java.io.IOException {
                super.prepareConnection(connection, httpMethod);
                connection.setInstanceFollowRedirects(false);
            }
        };
        factory.setConnectTimeout(connectTimeout);
        factory.setReadTimeout(readTimeout);
        this.restTemplate = new RestTemplate(factory);
        this.jwtValidator = jwtValidator;
    }

    /**
     * Gateway Health Endpoint for Docker & Orchestration healthchecks
     */
    @GetMapping({"/actuator/health", "/health"})
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Collections.singletonMap("status", "UP"));
    }

    /**
     * Non-blocking SSE stream proxy for live seats counter to prevent RestTemplate thread pool starvation.
     */
    @GetMapping(value = "/api/v1/student/class-sections/live-seats", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public StreamingResponseBody proxyLiveSeatsStream(HttpServletResponse response) {
        response.setContentType(MediaType.TEXT_EVENT_STREAM_VALUE);
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Connection", "keep-alive");
        return outputStream -> {
            try {
                java.net.URI uri = java.net.URI.create(enrollmentServiceUrl + "/api/v1/student/class-sections/live-seats");
                java.net.HttpURLConnection conn = (java.net.HttpURLConnection) uri.toURL().openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Accept", "text/event-stream");
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(0); // Stream indefinitely
                try (java.io.InputStream in = conn.getInputStream()) {
                    byte[] buffer = new byte[1024];
                    int len;
                    while ((len = in.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, len);
                        outputStream.flush();
                    }
                }
            } catch (Exception e) {
                log.debug("SSE client disconnected from gateway: {}", e.getMessage());
            }
        };
    }

    @RequestMapping({"/api/v1/**", "/attendance/**"})
    public ResponseEntity<?> proxyRequest(HttpServletRequest request, HttpEntity<byte[]> requestEntity) {
        String path = request.getRequestURI();
        String method = request.getMethod();
        String queryString = request.getQueryString();

        // 1. Gateway Security & Access Control
        boolean isPublic = jwtValidator.isPublicPath(path, method);
        Claims claims = null;
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            claims = jwtValidator.validateAndGetClaims(token);
        }

        if (!isPublic) {
            if (claims == null) {
                log.warn("Unauthorized request blocked at Gateway: {} {}", method, path);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"status\":401,\"message\":\"Yêu cầu xác thực: Phiên đăng nhập không hợp lệ hoặc đã hết hạn.\"}".getBytes(StandardCharsets.UTF_8));
            }

            String role = claims.get("role", String.class);
            if (!jwtValidator.hasRequiredRole(path, role)) {
                log.warn("Forbidden request blocked at Gateway: {} {} by user {} (role={})", method, path, claims.getSubject(), role);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"status\":403,\"message\":\"Từ chối truy cập: Bạn không có quyền thực hiện thao tác này.\"}".getBytes(StandardCharsets.UTF_8));
            }
        }

        String targetBaseUrl = determineTargetService(path);
        if (targetBaseUrl == null) {
            log.warn("No target service found for path: {}", path);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("{\"status\": 404, \"message\": \"Service route not found for path: " + path + "\"}");
        }

        String targetUrl = targetBaseUrl + path + (queryString != null ? "?" + queryString : "");
        log.info("Proxying {} {} -> {}", method, path, targetUrl);

        // 2. Strip untrusted client headers and inject verified user credentials
        HttpHeaders headers = new HttpHeaders();
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            String lower = headerName.toLowerCase();
            // Discard client-spoofed headers & connection hop headers
            if ("host".equalsIgnoreCase(headerName) ||
                "content-length".equalsIgnoreCase(headerName) ||
                lower.startsWith("x-user-") ||
                lower.startsWith("x-student-")) {
                continue;
            }
            List<String> values = Collections.list(request.getHeaders(headerName));
            headers.put(headerName, values);
        }

        // Forward Host and Scheme for correct reverse-proxy downstream link generation
        String incomingHost = request.getHeader("Host");
        if (incomingHost != null && !incomingHost.isBlank()) {
            headers.set("X-Forwarded-Host", incomingHost);
        }
        String incomingScheme = request.getScheme();
        if (incomingScheme != null && !incomingScheme.isBlank()) {
            headers.set("X-Forwarded-Proto", incomingScheme);
        }

        // Forward Correlation ID to downstream services
        String correlationId = (String) request.getAttribute("X-Correlation-Id");
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = request.getHeader("X-Correlation-Id");
        }
        if (correlationId != null && !correlationId.isBlank()) {
            headers.set("X-Correlation-Id", correlationId);
        }

        // Inject verified identity headers from signed JWT claims
        if (claims != null) {
            headers.set("X-User-Username", claims.getSubject());
            if (claims.get("role") != null) {
                headers.set("X-User-Role", claims.get("role", String.class));
            }
            if (claims.get("userId") != null) {
                headers.set("X-User-Id", String.valueOf(claims.get("userId")));
            }
        }

        HttpEntity<byte[]> entity = new HttpEntity<>(requestEntity.getBody(), headers);

        try {
            HttpMethod httpMethod = HttpMethod.valueOf(method);
            ResponseEntity<byte[]> response = restTemplate.exchange(URI.create(targetUrl), httpMethod, entity, byte[].class);
            HttpHeaders cleanedHeaders = cleanResponseHeaders(response.getHeaders());
            if (correlationId != null && !cleanedHeaders.containsKey("X-Correlation-Id")) {
                cleanedHeaders.set("X-Correlation-Id", correlationId);
            }
            // Ensure Cache-Control: private, no-cache for private user endpoints (B-04.1)
            if (claims != null || path.startsWith("/api/v1/student") || path.startsWith("/api/v1/lecturer") || path.startsWith("/api/v1/profile")) {
                if (!cleanedHeaders.containsKey(HttpHeaders.CACHE_CONTROL)) {
                    cleanedHeaders.set(HttpHeaders.CACHE_CONTROL, "private, no-cache");
                }
            }
            return ResponseEntity.status(response.getStatusCode())
                    .headers(cleanedHeaders)
                    .body(response.getBody());
        } catch (HttpStatusCodeException ex) {
            log.error("Downstream service error: {} on {}, body: '{}'", ex.getStatusCode(), targetUrl, ex.getResponseBodyAsString());
            byte[] body = ex.getResponseBodyAsByteArray();
            if (body == null || body.length == 0) {
                String fallbackJson = "{\"status\":" + ex.getStatusCode().value() + ",\"message\":\"" + 
                    (ex.getStatusCode().value() == 401 ? "Tên đăng nhập hoặc mật khẩu không chính xác" : ex.getStatusText()) + "\"}";
                body = fallbackJson.getBytes(StandardCharsets.UTF_8);
            }
            HttpHeaders errHeaders = new HttpHeaders();
            errHeaders.setContentType(MediaType.APPLICATION_JSON);
            if (correlationId != null) {
                errHeaders.set("X-Correlation-Id", correlationId);
            }
            return ResponseEntity.status(ex.getStatusCode())
                    .headers(errHeaders)
                    .body(body);
        } catch (ResourceAccessException ex) {
            log.error("Downstream service unreachable: {} - {}", targetUrl, ex.getMessage());
            HttpHeaders errHeaders = new HttpHeaders();
            errHeaders.setContentType(MediaType.APPLICATION_JSON);
            if (correlationId != null) {
                errHeaders.set("X-Correlation-Id", correlationId);
            }
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .headers(errHeaders)
                    .body("{\"status\": 503, \"message\": \"Downstream service is currently unavailable: " + targetBaseUrl + "\"}".getBytes());
        } catch (Exception ex) {
            log.error("Internal gateway error while calling: {}", targetUrl, ex);
            HttpHeaders errHeaders = new HttpHeaders();
            errHeaders.setContentType(MediaType.APPLICATION_JSON);
            if (correlationId != null) {
                errHeaders.set("X-Correlation-Id", correlationId);
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .headers(errHeaders)
                    .body(("{\"status\": 500, \"message\": \"Gateway error: " + ex.getMessage() + "\"}").getBytes());
        }
    }

    private HttpHeaders cleanResponseHeaders(HttpHeaders original) {
        HttpHeaders cleaned = new HttpHeaders();
        if (original == null) {
            return cleaned;
        }
        original.forEach((key, values) -> {
            String lower = key.toLowerCase();
            if (!lower.equals("transfer-encoding") &&
                !lower.equals("content-length") &&
                !lower.equals("connection") &&
                !lower.equals("keep-alive") &&
                !lower.equals("upgrade")) {
                cleaned.put(key, values);
            }
        });
        return cleaned;
    }

    private String determineTargetService(String path) {
        // Module Admin Exam Schedules
        if (path.startsWith("/api/v1/admin/exam-schedules") || path.startsWith("/api/v1/admin/exams")) {
            return enrollmentServiceUrl;
        }

        // Module Course & Section & Admin Enrollment Approval & Semesters
        if (path.startsWith("/api/v1/admin/courses") ||
            path.startsWith("/api/v1/admin/class-sections") ||
            path.startsWith("/api/v1/admin/enrollments") ||
            path.startsWith("/api/v1/admin/lecturers") ||
            path.startsWith("/api/v1/admin/semesters") ||
            path.startsWith("/api/v1/semesters") ||
            path.startsWith("/api/v1/courses")) {
            return courseServiceUrl;
        }

        // Module Auth & User Profiles & Admin Audit Trail
        if (path.startsWith("/api/v1/auth") ||
            path.startsWith("/api/v1/profile") ||
            path.startsWith("/api/v1/admin/users") ||
            path.startsWith("/api/v1/admin/audit-logs")) {
            return authServiceUrl;
        }

        // Module Lecturer Portal & Attendance (bao gồm cả các route alias điểm danh của SV)
        if (path.startsWith("/api/v1/student/attendance") ||
            path.startsWith("/attendance") ||
            path.startsWith("/api/v1/attendance") ||
            path.startsWith("/api/v1/lecturer")) {
            return lecturerServiceUrl;
        }

        // Module Student Enrollment, Portal, Calendar & Public Verification
        if (path.startsWith("/api/v1/student") || path.startsWith("/api/v1/calendar") || path.startsWith("/api/v1/public")) {
            return enrollmentServiceUrl;
        }

        // Module Announcements & Notifications
        if (path.startsWith("/api/v1/announcements") ||
            path.startsWith("/api/v1/notifications")) {
            return enrollmentServiceUrl;
        }

        // Module AI Integration
        if (path.startsWith("/api/v1/ai")) {
            return aiServiceUrl;
        }

        return null;
    }
}
