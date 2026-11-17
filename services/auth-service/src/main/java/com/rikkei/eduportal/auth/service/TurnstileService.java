package com.rikkei.eduportal.auth.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.auth.dto.ChallengeResponse;
import com.rikkei.eduportal.auth.dto.LoginRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class TurnstileService {

    private static final Logger log = LoggerFactory.getLogger(TurnstileService.class);

    private static final int DEFAULT_CHALLENGE_DIFFICULTY = 3;
    private static final long CHALLENGE_TTL_MS = 60_000L; // 60 seconds
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final String secret;
    private final Set<String> expectedHostnames;
    private final String verifyUrl;
    private final boolean enabled;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    // Single-use challenge tracking & replay prevention
    private final Map<String, Long> usedChallenges = new ConcurrentHashMap<>();

    // Rate limiting for challenge generation per IP (max 20 requests per minute)
    private final Map<String, Deque<Long>> challengeRateLimitMap = new ConcurrentHashMap<>();

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

    /**
     * Unified login protection verification.
     * Enforces Turnstile verification for Web and dynamic Cryptographic Proof-of-Work challenge
     * for Native Mobile clients. Simple spoofable client headers alone are rejected.
     */
    public void verifyLoginProtection(LoginRequest request, String clientIp) {
        if (!enabled || secret.isEmpty()) {
            log.debug("Turnstile / Bot verification is disabled or unconfigured; skipping verification");
            return;
        }

        if (request == null) {
            throw new AccessDeniedException("Xác thực bot thất bại: Dữ liệu đăng nhập không hợp lệ");
        }

        String turnstileToken = request.getTurnstileToken();
        if (turnstileToken != null && !turnstileToken.isBlank()) {
            // Web / PWA flow: verified via Cloudflare siteverify API
            verify(turnstileToken, clientIp, "login");
            return;
        }

        String challengeToken = request.getChallengeToken();
        String challengeSolution = request.getChallengeSolution();
        if (challengeToken != null && !challengeToken.isBlank() &&
            challengeSolution != null && !challengeSolution.isBlank()) {
            // Native Mobile flow: verified via Cryptographic Proof-of-Work challenge
            verifyNativeChallenge(challengeToken, challengeSolution, clientIp);
            return;
        }

        // Neither Turnstile token nor valid challenge proof provided -> REJECT
        log.warn("Login attempt blocked: Neither Turnstile token nor Native Challenge proof provided (IP={})", clientIp);
        throw new AccessDeniedException("Xác thực bot thất bại: Yêu cầu mã xác thực Turnstile (Web) hoặc Challenge proof (Native Mobile)");
    }

    /**
     * Generates a dynamic, signed Proof-of-Work challenge for Native Mobile apps.
     * Safe against replay attacks and tamper-proof via HMAC signature.
     */
    public ChallengeResponse generateChallenge(String clientIp) {
        checkChallengeRateLimit(clientIp);
        cleanExpiredChallenges();

        String challengeId = UUID.randomUUID().toString();
        String nonce = UUID.randomUUID().toString().replace("-", "") +
                Long.toHexString(System.nanoTime());
        long now = System.currentTimeMillis();
        int difficulty = DEFAULT_CHALLENGE_DIFFICULTY;

        String payload = challengeId + ":" + nonce + ":" + now + ":" + difficulty;
        String signature = computeHmac(payload);
        String rawToken = payload + "." + signature;
        String challengeToken = Base64.getUrlEncoder().withoutPadding().encodeToString(rawToken.getBytes(StandardCharsets.UTF_8));

        return new ChallengeResponse(challengeToken, nonce, difficulty, now + CHALLENGE_TTL_MS);
    }

    /**
     * Validates Native Mobile Proof-of-Work challenge response.
     */
    public void verifyNativeChallenge(String challengeToken, String challengeSolution, String clientIp) {
        if (challengeToken == null || challengeToken.isBlank()) {
            throw new AccessDeniedException("Xác thực bot thất bại: Challenge token không được để trống");
        }
        if (challengeSolution == null || challengeSolution.isBlank()) {
            throw new AccessDeniedException("Xác thực bot thất bại: Challenge solution không được để trống");
        }

        String decoded;
        try {
            decoded = new String(Base64.getUrlDecoder().decode(challengeToken.trim()), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            log.warn("Invalid Base64 challenge token: {}", ex.getMessage());
            throw new AccessDeniedException("Xác thực bot thất bại: Challenge token không đúng định dạng");
        }

        int dotIdx = decoded.lastIndexOf('.');
        if (dotIdx <= 0 || dotIdx >= decoded.length() - 1) {
            throw new AccessDeniedException("Xác thực bot thất bại: Cấu trúc Challenge token không hợp lệ");
        }

        String payload = decoded.substring(0, dotIdx);
        String signature = decoded.substring(dotIdx + 1);

        // 1. Signature Verification (Anti-Tampering)
        String expectedSignature = computeHmac(payload);
        if (!MessageDigest.isEqual(signature.getBytes(StandardCharsets.UTF_8), expectedSignature.getBytes(StandardCharsets.UTF_8))) {
            log.warn("Tampered challenge token detected from IP: {}", clientIp);
            throw new AccessDeniedException("Xác thực bot thất bại: Chữ ký Challenge token không hợp lệ");
        }

        String[] parts = payload.split(":");
        if (parts.length != 4) {
            throw new AccessDeniedException("Xác thực bot thất bại: Dữ liệu payload Challenge token không hợp lệ");
        }

        String challengeId = parts[0];
        String nonce = parts[1];
        long timestamp;
        int difficulty;
        try {
            timestamp = Long.parseLong(parts[2]);
            difficulty = Integer.parseInt(parts[3]);
        } catch (NumberFormatException nfe) {
            throw new AccessDeniedException("Xác thực bot thất bại: Tham số số học trong Challenge không hợp lệ");
        }

        // 2. Expiration Check (TTL = 60s)
        long now = System.currentTimeMillis();
        if (now - timestamp > CHALLENGE_TTL_MS || timestamp > now + 10_000L) {
            log.warn("Expired challenge token (age={}ms) from IP: {}", now - timestamp, clientIp);
            throw new AccessDeniedException("Xác thực bot thất bại: Challenge token đã hết hạn");
        }

        // 3. Replay Protection (Single-Use)
        if (usedChallenges.putIfAbsent(challengeId, now) != null) {
            log.warn("Replay attack detected for challengeId={} from IP={}", challengeId, clientIp);
            throw new AccessDeniedException("Xác thực bot thất bại: Challenge token đã được sử dụng (Replay Attack)");
        }

        // 4. Mathematical Proof-of-Work Verification
        String hash = computeSha256Hex(nonce + ":" + challengeSolution.trim());
        String targetPrefix = "0".repeat(Math.max(1, difficulty));
        if (!hash.startsWith(targetPrefix)) {
            log.warn("Incorrect PoW solution from IP: {} (hash={}, targetPrefix={})", clientIp, hash, targetPrefix);
            throw new AccessDeniedException("Xác thực bot thất bại: Lời giải Proof-of-Work không chính xác");
        }

        log.debug("Native Mobile PoW challenge verification succeeded for IP: {}", clientIp);
    }

    /**
     * Web Turnstile verification via Cloudflare siteverify endpoint.
     */
    public void verify(String token, String clientIp, String expectedAction) {
        if (!enabled || secret.isEmpty()) {
            log.debug("Turnstile verification is disabled or unconfigured (enabled={}, secretSet={}); skipping verification",
                    enabled, !secret.isEmpty());
            return;
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
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Turnstile siteverify thread was interrupted: {}", e.getMessage(), e);
            throw new AccessDeniedException("Lỗi xác thực bảo mật Turnstile do luồng bị ngắt: " + e.getMessage(), e);
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

    private String computeHmac(String data) {
        try {
            String keyString = !secret.isEmpty() ? secret : "rikkei-eduportal-native-challenge-secret-key-32b";
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec keySpec = new SecretKeySpec(keyString.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
            mac.init(keySpec);
            byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hmacBytes);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to calculate challenge HMAC", ex);
        }
    }

    private String computeSha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to compute SHA-256", ex);
        }
    }

    private void checkChallengeRateLimit(String clientIp) {
        if (clientIp == null || clientIp.isBlank()) {
            return;
        }
        long now = System.currentTimeMillis();
        long windowStart = now - 60_000L;

        Deque<Long> timestamps = challengeRateLimitMap.computeIfAbsent(clientIp, k -> new ArrayDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= 30) {
                log.warn("Challenge rate limit exceeded for IP: {}", clientIp);
                throw new AccessDeniedException("Quá nhiều yêu cầu challenge từ địa chỉ IP này. Vui lòng thử lại sau.");
            }
            timestamps.addLast(now);
        }
    }

    private void cleanExpiredChallenges() {
        long expirationThreshold = System.currentTimeMillis() - (CHALLENGE_TTL_MS * 2);
        usedChallenges.entrySet().removeIf(entry -> entry.getValue() < expirationThreshold);
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
