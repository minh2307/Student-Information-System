package com.rikkei.eduportal.auth.security;

import com.rikkei.eduportal.auth.entity.User;
import com.rikkei.eduportal.common.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() {
        String secret = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
        long expirationMs = 3600000; // 1 hour
        jwtTokenProvider = new JwtTokenProvider(secret, expirationMs);
    }

    @Test
    void testGenerateAndValidateToken() {
        User user = new User("testuser", "test@edu.vn", "hashed", "Nguyen Van Test", Role.STUDENT);
        user.setId(10L);

        String token = jwtTokenProvider.generateToken(user);
        assertNotNull(token);
        assertTrue(jwtTokenProvider.validateToken(token));

        String username = jwtTokenProvider.getUsernameFromToken(token);
        assertEquals("testuser", username);

        String role = jwtTokenProvider.getRoleFromToken(token);
        assertEquals("STUDENT", role);
    }

    @Test
    void testInvalidToken() {
        assertFalse(jwtTokenProvider.validateToken("invalid.jwt.token"));
    }
}
