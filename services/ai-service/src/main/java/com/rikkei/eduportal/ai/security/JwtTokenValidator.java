package com.rikkei.eduportal.ai.security;

import com.rikkei.eduportal.common.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Component
public class JwtTokenValidator {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenValidator.class);

    private final SecretKey rawKey;
    private final SecretKey base64Key;

    public JwtTokenValidator(@Value("${jwt.secret:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}") String secret) {
        this.rawKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        SecretKey b64 = null;
        try {
            byte[] keyBytes = Decoders.BASE64.decode(secret);
            b64 = Keys.hmacShaKeyFor(keyBytes);
        } catch (Exception ignored) {
            b64 = this.rawKey;
        }
        this.base64Key = b64;
    }

    public Role extractRole(String token, String fallbackRoleHeader) {
        if (token == null || token.isBlank()) {
            return parseFallbackRole(fallbackRoleHeader);
        }

        // Handle frontend dev/mock token
        if (token.equals("mock-jwt-token-sprint-7-days") || token.startsWith("mock-")) {
            log.debug("Dev mock token detected.");
            if (fallbackRoleHeader != null && !fallbackRoleHeader.isBlank()) {
                return parseFallbackRole(fallbackRoleHeader);
            }
            return Role.ADMIN; // Default role for dev testing mock token
        }

        Claims claims = null;
        try {
            claims = Jwts.parser()
                    .verifyWith(rawKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (Exception e1) {
            try {
                claims = Jwts.parser()
                        .verifyWith(base64Key)
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();
            } catch (Exception e2) {
                log.warn("JWT validation failed: {}. Checking fallback header.", e2.getMessage());
                return parseFallbackRole(fallbackRoleHeader);
            }
        }

        try {
            Object roleObj = claims.get("role");
            if (roleObj == null) {
                roleObj = claims.get("roles");
            }

            if (roleObj != null) {
                return Role.valueOf(roleObj.toString().toUpperCase());
            }

            return parseFallbackRole(fallbackRoleHeader);

        } catch (Exception e) {
            log.warn("Role parsing failed: {}", e.getMessage());
            return parseFallbackRole(fallbackRoleHeader);
        }
    }

    private Role parseFallbackRole(String roleStr) {
        if (roleStr != null && !roleStr.isBlank()) {
            try {
                return Role.valueOf(roleStr.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid role string: {}", roleStr);
            }
        }
        return null;
    }
}
