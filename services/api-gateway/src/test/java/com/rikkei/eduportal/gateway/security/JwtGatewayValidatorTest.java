package com.rikkei.eduportal.gateway.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtGatewayValidatorTest {

    private JwtGatewayValidator validator;

    @BeforeEach
    void setUp() {
        validator = new JwtGatewayValidator("404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");
    }

    @Test
    @DisplayName("Student role should have access to /api/v1/lecturer/early-warnings/my-alerts")
    void studentCanAccessMyAlerts() {
        assertTrue(validator.hasRequiredRole("/api/v1/lecturer/early-warnings/my-alerts", "STUDENT"));
        assertTrue(validator.hasRequiredRole("/api/v1/lecturer/early-warnings/my-alerts", "ROLE_STUDENT"));
    }

    @Test
    @DisplayName("Lecturer and Admin roles can also access /api/v1/lecturer/early-warnings/my-alerts")
    void lecturerAndAdminCanAccessMyAlerts() {
        assertTrue(validator.hasRequiredRole("/api/v1/lecturer/early-warnings/my-alerts", "LECTURER"));
        assertTrue(validator.hasRequiredRole("/api/v1/lecturer/early-warnings/my-alerts", "ADMIN"));
    }

    @Test
    @DisplayName("Student role should NOT have access to lecturer section early-warnings or general lecturer endpoints")
    void studentCannotAccessLecturerEndpoints() {
        assertFalse(validator.hasRequiredRole("/api/v1/lecturer/early-warnings/section/1", "STUDENT"));
        assertFalse(validator.hasRequiredRole("/api/v1/lecturer/classes", "STUDENT"));
    }

    @Test
    @DisplayName("Lecturer and Admin have access to lecturer endpoints")
    void lecturerAndAdminCanAccessLecturerEndpoints() {
        assertTrue(validator.hasRequiredRole("/api/v1/lecturer/early-warnings/section/1", "LECTURER"));
        assertTrue(validator.hasRequiredRole("/api/v1/lecturer/early-warnings/section/1", "ADMIN"));
    }
}
