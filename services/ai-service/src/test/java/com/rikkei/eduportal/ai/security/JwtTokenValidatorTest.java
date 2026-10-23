package com.rikkei.eduportal.ai.security;

import com.rikkei.eduportal.common.Role;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenValidatorTest {

    private static final String TEST_SECRET = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
    private JwtTokenValidator validator;
    private SecretKey secretKey;

    @BeforeEach
    void setUp() {
        validator = new JwtTokenValidator(TEST_SECRET);
        byte[] keyBytes = Decoders.BASE64.decode(TEST_SECRET);
        secretKey = Keys.hmacShaKeyFor(keyBytes);
    }

    private String createToken(String role) {
        return Jwts.builder()
                .subject("testuser")
                .claims(Map.of("role", role))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 3600000))
                .signWith(secretKey)
                .compact();
    }

    @Test
    @DisplayName("Should extract Role.ADMIN from valid JWT")
    void extractRole_validAdminJwt() {
        String token = createToken("ADMIN");
        Role role = validator.extractRole(token, null);
        assertEquals(Role.ADMIN, role);
    }

    @Test
    @DisplayName("Should extract Role.LECTURER from valid JWT")
    void extractRole_validLecturerJwt() {
        String token = createToken("LECTURER");
        Role role = validator.extractRole(token, null);
        assertEquals(Role.LECTURER, role);
    }

    @Test
    @DisplayName("Should extract Role.STUDENT from valid JWT")
    void extractRole_validStudentJwt() {
        String token = createToken("STUDENT");
        Role role = validator.extractRole(token, null);
        assertEquals(Role.STUDENT, role);
    }

    @Test
    @DisplayName("Should support dev mock token with header")
    void extractRole_devMockTokenWithHeader() {
        Role role = validator.extractRole("mock-jwt-token-sprint-7-days", "LECTURER");
        assertEquals(Role.LECTURER, role);
    }

    @Test
    @DisplayName("Should return null for missing token and header")
    void extractRole_missingToken() {
        Role role = validator.extractRole(null, null);
        assertNull(role);
    }
}
