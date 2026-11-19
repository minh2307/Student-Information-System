package com.rikkei.eduportal.gateway.filter;

import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Test Suite: Correlation ID & Observability Filter (B-05.3)")
class CorrelationIdFilterTest {

    private CorrelationIdFilter filter;

    @BeforeEach
    void setUp() {
        filter = new CorrelationIdFilter();
    }

    @Test
    @DisplayName("CORR-01: Auto-generates UUID correlation ID when missing from client request")
    void missingCorrelationId_GeneratesAndInjectsUuid() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/student/dashboard");
        MockHttpServletResponse response = new MockHttpServletResponse();

        MockFilterChain chain = new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res) {
                // Verify MDC contains correlationId during filter chain execution
                String mdcValue = MDC.get(CorrelationIdFilter.MDC_KEY);
                assertNotNull(mdcValue);
                assertFalse(mdcValue.isBlank());
            }
        };

        filter.doFilter(request, response, chain);

        String headerInResponse = response.getHeader(CorrelationIdFilter.CORRELATION_ID_HEADER);
        assertNotNull(headerInResponse);
        assertFalse(headerInResponse.isBlank());
        // Verify MDC cleaned up after execution (prevent thread leak)
        assertNull(MDC.get(CorrelationIdFilter.MDC_KEY));
    }

    @Test
    @DisplayName("CORR-02: Preserves incoming X-Correlation-Id across request lifecycle")
    void incomingCorrelationId_PreservedExactly() throws ServletException, IOException {
        String existingId = "client-trace-custom-uuid-12345";
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/student/dashboard");
        request.addHeader(CorrelationIdFilter.CORRELATION_ID_HEADER, existingId);
        MockHttpServletResponse response = new MockHttpServletResponse();

        MockFilterChain chain = new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res) {
                assertEquals(existingId, MDC.get(CorrelationIdFilter.MDC_KEY));
            }
        };

        filter.doFilter(request, response, chain);

        assertEquals(existingId, response.getHeader(CorrelationIdFilter.CORRELATION_ID_HEADER));
        assertNull(MDC.get(CorrelationIdFilter.MDC_KEY));
    }
}
