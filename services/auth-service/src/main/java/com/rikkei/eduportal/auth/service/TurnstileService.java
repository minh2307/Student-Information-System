package com.rikkei.eduportal.auth.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TurnstileService {

    private static final Logger log = LoggerFactory.getLogger(TurnstileService.class);

    private final String secret;
    private final Set<String> expectedHostnames;
    private final String verifyUrl;
    private final boolean enabled;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    @Autowired
    public TurnstileService(
            @Value("${turnstile.secret:${TURNSTILE_SECRET:}}") String secret,
            @Value("${turnstile.hostnames:${TURNSTILE_HOSTNAMES:localhost,127.0.0.1}}") String hostnamesConfig,
            @Value("${turnstile.verify-url:https://challenges.cloudflare.com/turnstile/v0/siteverify}") String verifyUrl,
            @Value("${turnstile.enabled:true}") boolean enabled,
            ObjectMapper objectMapper) {
        this(secret, hostnamesConfig, verifyUrl, enabled, objectMapper, HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build());
    }

    public TurnstileService() {
        this("", "localhost,127.0.0.1", "https://challenges.cloudflare.com/turnstile/v0/siteverify", false, new ObjectMapper());
    }

    public TurnstileService(
            String secret,
            String hostnamesConfig,
            String verifyUrl,
            boolean enabled,
            ObjectMapper objectMapper,
            HttpClient httpClient) {
        this.secret = secret != null ? secret.trim() : "";
        this.expectedHostnames = (hostnamesConfig != null ? Arrays.stream(hostnamesConfig.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet()) : Collections.emptySet());
        this.verifyUrl = verifyUrl != null ? verifyUrl : "https://challenges.cloudflare.com/turnstile/v0/siteverify";
        this.enabled = enabled;
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
    }

    public void verify(String token, String clientIp, String expectedAction) {
        if (!enabled) {
            log.debug("Turnstile verification is disabled by configuration");
            return;
        }

        if (secret.isEmpty()) {
            log.warn("Turnstile secret is not configured; rejecting request");
            throw new AccessDeniedException("Turnstile secret chưa được cấu hình");
        }

        if (token == null || token.isBlank() || token.length() > 2048 || expectedHostnames.isEmpty()) {
            log.warn("Turnstile token invalid or missing: len={}, hostnamesCount={}",
                    token != null ? token.length() : 0, expectedHostnames.size());
            throw new AccessDeniedException("Xác thực bot thất bại: Turnstile token không hợp lệ hoặc thiếu");
        }

        TurnstileVerifyResponse result;
        try {
            Map<String, String> formData = new LinkedHashMap<>();
            formData.put("secret", secret);
            formData.put("response", token.trim());
            if (clientIp != null && !clientIp.isBlank()) {
                formData.put("remoteip", clientIp.trim());
            }

            String formBody = formData.entrySet().stream()
                    .map(e -> URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8) + "=" +
                              URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8))
                    .collect(Collectors.joining("&"));

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(verifyUrl))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(formBody))
                    .build();

            HttpResponse<String> httpResponse = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (httpResponse.statusCode() < 200 || httpResponse.statusCode() >= 300) {
                log.error("Turnstile siteverify HTTP error: {}", httpResponse.statusCode());
                throw new AccessDeniedException("Xác thực Turnstile thất bại từ máy chủ Cloudflare");
            }

            result = objectMapper.readValue(httpResponse.body(), TurnstileVerifyResponse.class);
        } catch (AccessDeniedException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error during Turnstile siteverify: {}", e.getMessage(), e);
            throw new AccessDeniedException("Lỗi xác thực bảo mật Turnstile: " + e.getMessage());
        }

        if (result == null || !Boolean.TRUE.equals(result.getSuccess())) {
            log.warn("Turnstile siteverify rejected token: errorCodes={}", result != null ? result.getErrorCodes() : null);
            throw new AccessDeniedException("Xác thực bot thất bại: Mã xác thực Turnstile không hợp lệ hoặc đã hết hạn");
        }

        if (expectedAction != null && !expectedAction.equalsIgnoreCase(result.getAction())) {
            log.warn("Turnstile action mismatch: expected='{}', actual='{}'", expectedAction, result.getAction());
            throw new AccessDeniedException("Xác thực bot thất bại: Action không khớp");
        }

        if (result.getHostname() != null && !expectedHostnames.contains(result.getHostname())) {
            log.warn("Turnstile hostname mismatch: hostname='{}', expected={}", result.getHostname(), expectedHostnames);
            throw new AccessDeniedException("Xác thực bot thất bại: Hostname không hợp lệ");
        }

        log.debug("Turnstile verification passed for action='{}', hostname='{}'",
                result.getAction(), result.getHostname());
    }

    public static class TurnstileVerifyResponse {
        private Boolean success;
        private String action;
        private String hostname;
        @JsonProperty("challenge_ts")
        private String challengeTs;
        @JsonProperty("error-codes")
        private List<String> errorCodes;

        public Boolean getSuccess() { return success; }
        public void setSuccess(Boolean success) { this.success = success; }

        public String getAction() { return action; }
        public void setAction(String action) { this.action = action; }

        public String getHostname() { return hostname; }
        public void setHostname(String hostname) { this.hostname = hostname; }

        public String getChallengeTs() { return challengeTs; }
        public void setChallengeTs(String challengeTs) { this.challengeTs = challengeTs; }

        public List<String> getErrorCodes() { return errorCodes; }
        public void setErrorCodes(List<String> errorCodes) { this.errorCodes = errorCodes; }
    }
}
