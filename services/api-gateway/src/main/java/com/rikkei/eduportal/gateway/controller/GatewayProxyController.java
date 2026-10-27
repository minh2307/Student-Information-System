package com.rikkei.eduportal.gateway.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
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

    public GatewayProxyController(
            @Value("${gateway.timeout.connect:5000}") int connectTimeout,
            @Value("${gateway.timeout.read:30000}") int readTimeout) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeout);
        factory.setReadTimeout(readTimeout);
        this.restTemplate = new RestTemplate(factory);
    }


    @RequestMapping("/api/v1/**")
    public ResponseEntity<?> proxyRequest(HttpServletRequest request, HttpEntity<byte[]> requestEntity) {
        String path = request.getRequestURI();
        String queryString = request.getQueryString();
        String targetBaseUrl = determineTargetService(path);

        if (targetBaseUrl == null) {
            log.warn("No target service found for path: {}", path);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("{\"status\": 404, \"message\": \"Service route not found for path: " + path + "\"}");
        }

        String targetUrl = targetBaseUrl + path + (queryString != null ? "?" + queryString : "");
        log.info("Proxying {} {} -> {}", request.getMethod(), path, targetUrl);

        HttpHeaders headers = new HttpHeaders();
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            if ("host".equalsIgnoreCase(headerName) || "content-length".equalsIgnoreCase(headerName)) {
                continue;
            }
            List<String> values = Collections.list(request.getHeaders(headerName));
            headers.put(headerName, values);
        }

        HttpEntity<byte[]> entity = new HttpEntity<>(requestEntity.getBody(), headers);

        try {
            HttpMethod method = HttpMethod.valueOf(request.getMethod());
            ResponseEntity<byte[]> response = restTemplate.exchange(URI.create(targetUrl), method, entity, byte[].class);
            return ResponseEntity.status(response.getStatusCode())
                    .headers(cleanResponseHeaders(response.getHeaders()))
                    .body(response.getBody());
        } catch (HttpStatusCodeException ex) {
            log.error("Downstream service error: {} on {}, body: '{}'", ex.getStatusCode(), targetUrl, ex.getResponseBodyAsString());
            byte[] body = ex.getResponseBodyAsByteArray();
            if (body == null || body.length == 0) {
                String fallbackJson = "{\"status\":" + ex.getStatusCode().value() + ",\"message\":\"" + 
                    (ex.getStatusCode().value() == 401 ? "Tên đăng nhập hoặc mật khẩu không chính xác" : ex.getStatusText()) + "\"}";
                body = fallbackJson.getBytes(StandardCharsets.UTF_8);
            }
            return ResponseEntity.status(ex.getStatusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body);
        } catch (ResourceAccessException ex) {
            log.error("Downstream service unreachable: {} - {}", targetUrl, ex.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"status\": 503, \"message\": \"Downstream service is currently unavailable: " + targetBaseUrl + "\"}".getBytes());
        } catch (Exception ex) {
            log.error("Internal gateway error while calling: {}", targetUrl, ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .contentType(MediaType.APPLICATION_JSON)
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

        // Module Auth & User Profiles
        if (path.startsWith("/api/v1/auth") ||
            path.startsWith("/api/v1/profile") ||
            path.startsWith("/api/v1/admin/users")) {
            return authServiceUrl;
        }

        // Module Student Enrollment, Portal & Calendar
        if (path.startsWith("/api/v1/student") || path.startsWith("/api/v1/calendar")) {
            return enrollmentServiceUrl;
        }

        // Module Announcements & Notifications
        if (path.startsWith("/api/v1/announcements") ||
            path.startsWith("/api/v1/notifications")) {
            return enrollmentServiceUrl;
        }

        // Module Lecturer Portal
        if (path.startsWith("/api/v1/lecturer")) {
            return lecturerServiceUrl;
        }

        // Module AI Integration
        if (path.startsWith("/api/v1/ai")) {
            return aiServiceUrl;
        }

        return null;
    }
}
