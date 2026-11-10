package com.rikkei.eduportal.gateway.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

@Component
public class JwtGatewayValidator {

    private static final Logger log = LoggerFactory.getLogger(JwtGatewayValidator.class);

    private final SecretKey key;

    public JwtGatewayValidator(
            @Value("${jwt.secret:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}") String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public Claims validateAndGetClaims(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        try {
            return Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token.trim())
                    .getPayload();
        } catch (JwtException | IllegalArgumentException ex) {
            log.debug("Invalid or expired JWT token at Gateway: {}", ex.getMessage());
            return null;
        }
    }

    public boolean isPublicPath(String path, String method) {
        if (path == null) return false;

        // 1. Completely public paths
        if (path.startsWith("/api/v1/auth") ||
            path.startsWith("/api/v1/public") ||
            path.startsWith("/actuator") ||
            path.equals("/error") ||
            path.equals("/api/v1/student/class-sections/live-seats") ||
            path.startsWith("/api/v1/student/calendar/feed") ||
            path.startsWith("/api/v1/calendar/feed")) {
            return true;
        }

        // 2. Public catalog read-only (GET only) & Attendance Fallback for mobile camera QR scans
        if ("GET".equalsIgnoreCase(method)) {
            if (path.equals("/api/v1/courses") || path.startsWith("/api/v1/courses/") ||
                path.equals("/api/v1/semesters") || path.startsWith("/api/v1/semesters/") ||
                path.equals("/api/v1/student/class-sections") ||
                path.startsWith("/api/v1/announcements") ||
                path.startsWith("/api/v1/attendance") ||
                path.startsWith("/attendance") ||
                path.startsWith("/api/v1/student/attendance")) {
                return true;
            }
        }

        return false;
    }

    public boolean hasRequiredRole(String path, String userRole) {
        if (userRole == null) return false;
        String normalizedRole = userRole.toUpperCase().replace("ROLE_", "");

        if (path.startsWith("/api/v1/admin") || path.startsWith("/api/v1/announcements")) {
            return "ADMIN".equals(normalizedRole);
        }
        if (path.startsWith("/api/v1/lecturer/early-warnings/my-alerts")) {
            return "STUDENT".equals(normalizedRole) || "LECTURER".equals(normalizedRole) || "ADMIN".equals(normalizedRole);
        }
        if (path.startsWith("/api/v1/attendance") || path.startsWith("/attendance") || path.startsWith("/api/v1/student/attendance")) {
            return "STUDENT".equals(normalizedRole) || "ADMIN".equals(normalizedRole);
        }
        if (path.startsWith("/api/v1/lecturer")) {
            return "LECTURER".equals(normalizedRole) || "ADMIN".equals(normalizedRole);
        }
        if (path.startsWith("/api/v1/student") || path.startsWith("/api/v1/calendar") || path.startsWith("/api/v1/tuition")) {
            return "STUDENT".equals(normalizedRole) || "ADMIN".equals(normalizedRole);
        }
        if (path.startsWith("/api/v1/ai")) {
            return "STUDENT".equals(normalizedRole) || "LECTURER".equals(normalizedRole) || "ADMIN".equals(normalizedRole);
        }
        return true;
    }
}
