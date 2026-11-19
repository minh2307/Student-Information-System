package com.rikkei.eduportal.gateway.filter;

import com.rikkei.eduportal.gateway.config.WebMvcConfig;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.filter.ShallowEtagHeaderFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Test Suite: Conditional Requests & ETag Caching (B-04.1)")
class ConditionalRequestAndEtagTest {

    @Test
    @DisplayName("ETAG-01: Generates valid ETag header on HTTP 200 response")
    void getRequest_GeneratesEtagHeader() throws ServletException, IOException {
        WebMvcConfig config = new WebMvcConfig();
        FilterRegistrationBean<ShallowEtagHeaderFilter> registration = config.shallowEtagHeaderFilter();
        ShallowEtagHeaderFilter filter = registration.getFilter();

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/student/timetable");
        MockHttpServletResponse response = new MockHttpServletResponse();

        String payload = "{\"items\":[{\"courseCode\":\"CS201\",\"name\":\"Data Structures\"}]}";
        MockFilterChain chain = new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res) throws IOException {
                res.getOutputStream().write(payload.getBytes(StandardCharsets.UTF_8));
                res.setContentType("application/json");
            }
        };

        filter.doFilter(request, response, chain);

        String etag = response.getHeader("ETag");
        assertNotNull(etag, "ETag header must be generated");
        assertTrue(etag.startsWith("\"") && etag.endsWith("\""), "ETag should be quoted string");
        assertEquals(200, response.getStatus());
        assertEquals(payload, response.getContentAsString());
    }

    @Test
    @DisplayName("ETAG-02: Matching If-None-Match returns HTTP 304 Not Modified with empty body")
    void matchingIfNoneMatch_Returns304NotModified() throws ServletException, IOException {
        WebMvcConfig config = new WebMvcConfig();
        FilterRegistrationBean<ShallowEtagHeaderFilter> registration = config.shallowEtagHeaderFilter();
        ShallowEtagHeaderFilter filter = registration.getFilter();

        String payload = "{\"items\":[{\"courseCode\":\"CS201\",\"name\":\"Data Structures\"}]}";

        // 1. First request to discover ETag
        MockHttpServletRequest req1 = new MockHttpServletRequest("GET", "/api/v1/student/timetable");
        MockHttpServletResponse resp1 = new MockHttpServletResponse();
        filter.doFilter(req1, resp1, new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res) throws IOException {
                res.getOutputStream().write(payload.getBytes(StandardCharsets.UTF_8));
                res.setContentType("application/json");
            }
        });
        String etag = resp1.getHeader("ETag");
        assertNotNull(etag);

        // 2. Conditional request with matching If-None-Match
        MockHttpServletRequest req2 = new MockHttpServletRequest("GET", "/api/v1/student/timetable");
        req2.addHeader("If-None-Match", etag);
        MockHttpServletResponse resp2 = new MockHttpServletResponse();

        filter.doFilter(req2, resp2, new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res) throws IOException {
                res.getOutputStream().write(payload.getBytes(StandardCharsets.UTF_8));
                res.setContentType("application/json");
            }
        });

        assertEquals(HttpStatus.NOT_MODIFIED.value(), resp2.getStatus());
        assertEquals(0, resp2.getContentLength());
        assertEquals(etag, resp2.getHeader("ETag"));
    }

    @Test
    @DisplayName("ETAG-03: Mismatched If-None-Match returns HTTP 200 with full payload")
    void mismatchedIfNoneMatch_Returns200WithFullBody() throws ServletException, IOException {
        WebMvcConfig config = new WebMvcConfig();
        FilterRegistrationBean<ShallowEtagHeaderFilter> registration = config.shallowEtagHeaderFilter();
        ShallowEtagHeaderFilter filter = registration.getFilter();

        String payload = "{\"items\":[{\"courseCode\":\"CS201\",\"name\":\"Data Structures\"}]}";

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/student/timetable");
        request.addHeader("If-None-Match", "\"outdated-hash-0000000000000000\"");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res) throws IOException {
                res.getOutputStream().write(payload.getBytes(StandardCharsets.UTF_8));
                res.setContentType("application/json");
            }
        });

        assertEquals(HttpStatus.OK.value(), response.getStatus());
        assertEquals(payload, response.getContentAsString());
        assertNotNull(response.getHeader("ETag"));
    }
}
