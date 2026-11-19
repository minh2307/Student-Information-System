package com.rikkei.eduportal.gateway.filter;

import com.rikkei.eduportal.gateway.security.JwtGatewayValidator;
import io.jsonwebtoken.Claims;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RateLimiterFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(RateLimiterFilter.class);

    @Value("${gateway.rate-limit.enabled:true}")
    private boolean rateLimitEnabled = true;

    private final JwtGatewayValidator jwtValidator;

    public RateLimiterFilter() {
        this(null);
    }

    @Autowired
    public RateLimiterFilter(@Autowired(required = false) JwtGatewayValidator jwtValidator) {
        this.jwtValidator = jwtValidator;
    }

    // Route-specific limits (requests per minute per client IP/User)
    public static final int AUTH_LIMIT_PER_MINUTE = 15;
    public static final int ATTENDANCE_LIMIT_PER_MINUTE = 30;
    public static final int TOKEN_LIMIT_PER_MINUTE = 30;
    public static final int GENERAL_LIMIT_PER_MINUTE = 180;
    public static final int MAX_MAP_CAPACITY = 5000;

    // Sliding 1-minute window counters: key -> RequestCounter
    private final Map<String, RequestCounter> requestCounts = new ConcurrentHashMap<>();

    public void setRateLimitEnabled(boolean rateLimitEnabled) {
        this.rateLimitEnabled = rateLimitEnabled;
    }

    public void reset() {
        requestCounts.clear();
    }

    public int getBucketCount() {
        return requestCounts.size();
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (!rateLimitEnabled || !(request instanceof HttpServletRequest httpRequest) || !(response instanceof HttpServletResponse httpResponse)) {
            chain.doFilter(request, response);
            return;
        }

        String path = httpRequest.getRequestURI();
        if (path == null) {
            chain.doFilter(request, response);
            return;
        }

        String clientKey = resolveClientKey(httpRequest);
        int limit = resolveLimitForPath(path);

        String key = clientKey + ":" + resolveBucketKey(path);
        long now = System.currentTimeMillis();

        // Strictly bounded memory protection: Prune expired entries, then oldest entries if still exceeding limit
        if (requestCounts.size() >= MAX_MAP_CAPACITY) {
            long cutoff = now - 60_000L;
            requestCounts.entrySet().removeIf(entry -> entry.getValue().windowStart < cutoff);
            if (requestCounts.size() >= MAX_MAP_CAPACITY) {
                // Hard ceiling: Evict oldest 20% of entries to prevent unbounded memory growth during flood attacks
                requestCounts.entrySet().stream()
                        .sorted(java.util.Comparator.comparingLong(e -> e.getValue().windowStart))
                        .limit(requestCounts.size() - (MAX_MAP_CAPACITY * 4 / 5))
                        .map(Map.Entry::getKey)
                        .toList()
                        .forEach(requestCounts::remove);
            }
        }

        RequestCounter counter = requestCounts.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStart > 60_000L) {
                return new RequestCounter(now, new AtomicInteger(1));
            }
            existing.count.incrementAndGet();
            return existing;
        });

        if (counter.count.get() > limit) {
            log.warn("Rate limit exceeded for client {} on path {} (count: {}, limit: {}/min)",
                    clientKey, path, counter.count.get(), limit);
            httpResponse.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            httpResponse.setContentType(MediaType.APPLICATION_JSON_VALUE);
            httpResponse.setCharacterEncoding(StandardCharsets.UTF_8.name());
            httpResponse.setHeader("Retry-After", "60");
            httpResponse.getWriter().write("{\"status\":429,\"error\":\"Too Many Requests\",\"message\":\"Bạn đang gửi quá nhiều yêu cầu. Vui lòng thử lại sau giây lát.\"}");
            return;
        }

        chain.doFilter(request, response);
    }

    private String resolveClientKey(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ") && jwtValidator != null) {
            String token = authHeader.substring(7).trim();
            Claims claims = jwtValidator.validateAndGetClaims(token);
            if (claims != null && claims.getSubject() != null && !claims.getSubject().isBlank()) {
                return "user:" + claims.getSubject().trim();
            }
        }
        return "ip:" + resolveClientIp(request);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }

    public int resolveLimitForPath(String path) {
        if (path == null) return GENERAL_LIMIT_PER_MINUTE;
        if (path.startsWith("/api/v1/auth/login") ||
            path.startsWith("/api/v1/auth/refresh") ||
            path.startsWith("/api/v1/auth/forgot-password")) {
            return AUTH_LIMIT_PER_MINUTE;
        }
        if (path.contains("/attendance/check-in")) {
            return ATTENDANCE_LIMIT_PER_MINUTE;
        }
        if (path.startsWith("/api/v1/notifications/tokens")) {
            return TOKEN_LIMIT_PER_MINUTE;
        }
        return GENERAL_LIMIT_PER_MINUTE;
    }

    private String resolveBucketKey(String path) {
        if (path == null) return "general";
        if (path.startsWith("/api/v1/auth")) return "auth";
        if (path.contains("/attendance")) return "attendance";
        if (path.startsWith("/api/v1/notifications")) return "notifications";
        return "general";
    }

    private static class RequestCounter {
        final long windowStart;
        final AtomicInteger count;

        RequestCounter(long windowStart, AtomicInteger count) {
            this.windowStart = windowStart;
            this.count = count;
        }
    }
}
