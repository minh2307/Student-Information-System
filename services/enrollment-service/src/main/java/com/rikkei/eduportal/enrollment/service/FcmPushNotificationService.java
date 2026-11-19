package com.rikkei.eduportal.enrollment.service;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.*;
import com.rikkei.eduportal.enrollment.entity.DeviceToken;
import com.rikkei.eduportal.enrollment.repository.DeviceTokenRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Enterprise Firebase Cloud Messaging (FCM) Integration Service.
 * Handles device push delivery, token validity lifecycle, and graceful degradation.
 * Features:
 * - Safe Dry-Run fallback mode when credentials are not configured.
 * - Precision error classification: Deactivates tokens on UNREGISTERED or token-specific errors,
 *   never deactivates on payload or temporary server issues.
 * - Exponential backoff with jitter retry policy for transient network/server errors (UNAVAILABLE, INTERNAL).
 * - Full PII protection with token masking in all log channels.
 */
@Service
public class FcmPushNotificationService {

    private static final Logger log = LoggerFactory.getLogger(FcmPushNotificationService.class);

    private static final int MAX_DISPATCH_ATTEMPTS = 3;
    private static final long INITIAL_BACKOFF_MS = 150L;

    private final DeviceTokenRepository deviceTokenRepository;

    @Value("${firebase.credentials-json:#{null}}")
    private String firebaseCredentialsJson;

    @Value("${firebase.credentials-path:#{null}}")
    private String firebaseCredentialsPath;

    @Value("${firebase.enabled:true}")
    private boolean firebaseEnabled;

    private FirebaseApp firebaseApp;
    private boolean isConfigured = false;

    @org.springframework.beans.factory.annotation.Autowired
    public FcmPushNotificationService(DeviceTokenRepository deviceTokenRepository) {
        this(deviceTokenRepository, null, null);
    }

    public FcmPushNotificationService(
            DeviceTokenRepository deviceTokenRepository,
            String firebaseCredentialsJson,
            String firebaseCredentialsPath) {
        this.deviceTokenRepository = deviceTokenRepository;
        this.firebaseCredentialsJson = firebaseCredentialsJson;
        this.firebaseCredentialsPath = firebaseCredentialsPath;
        this.firebaseEnabled = true;
    }

    @PostConstruct
    public void initializeFirebase() {
        if (!firebaseEnabled) {
            log.info("FCM push notification service is explicitly disabled via configuration (firebase.enabled=false).");
            return;
        }

        try {
            // Check if FirebaseApp already initialized in current JVM
            for (FirebaseApp app : FirebaseApp.getApps()) {
                if (FirebaseApp.DEFAULT_APP_NAME.equals(app.getName())) {
                    this.firebaseApp = app;
                    this.isConfigured = true;
                    log.info("Existing FirebaseApp found and reused for FCM notifications.");
                    return;
                }
            }

            InputStream credentialsStream = null;

            if (firebaseCredentialsJson != null && !firebaseCredentialsJson.isBlank()) {
                log.info("Initializing Firebase Admin SDK using FIREBASE_CREDENTIALS_JSON environment variable.");
                credentialsStream = new ByteArrayInputStream(firebaseCredentialsJson.trim().getBytes(StandardCharsets.UTF_8));
            } else if (firebaseCredentialsPath != null && !firebaseCredentialsPath.isBlank()) {
                log.info("Initializing Firebase Admin SDK using FIREBASE_CREDENTIALS_PATH: {}", firebaseCredentialsPath);
                credentialsStream = new FileInputStream(firebaseCredentialsPath.trim());
            }

            if (credentialsStream != null) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(credentialsStream))
                        .build();
                this.firebaseApp = FirebaseApp.initializeApp(options);
                this.isConfigured = true;
                log.info("Firebase Admin SDK successfully initialized for Rikkei EduPortal FCM push delivery.");
            } else {
                log.warn("No Firebase credentials provided (FIREBASE_CREDENTIALS_JSON or FIREBASE_CREDENTIALS_PATH not set). " +
                        "FCM Push Notification Service running in DRY-RUN / SIMULATION MODE.");
            }
        } catch (Exception ex) {
            log.warn("Failed to initialize Firebase Admin SDK: {}. Running in safe DRY-RUN fallback mode.", ex.getMessage());
            this.isConfigured = false;
        }
    }

    /**
     * Send push notification to all active devices of a given user.
     */
    public PushDeliveryResult sendNotificationToUser(Long userId, String title, String body, Map<String, String> data) {
        if (userId == null) {
            return new PushDeliveryResult(0, 0, 0, Collections.emptyList());
        }

        List<DeviceToken> activeTokens = deviceTokenRepository.findByUserIdAndIsActiveTrue(userId);
        if (activeTokens.isEmpty()) {
            log.debug("No active device tokens found for userId: {}", userId);
            return new PushDeliveryResult(0, 0, 0, Collections.emptyList());
        }

        int successCount = 0;
        int failureCount = 0;
        List<String> deactivatedTokens = new ArrayList<>();

        for (DeviceToken dt : activeTokens) {
            boolean sent = sendSingleDeviceNotification(dt.getToken(), title, body, data, deactivatedTokens);
            if (sent) {
                successCount++;
            } else {
                failureCount++;
            }
        }

        return new PushDeliveryResult(activeTokens.size(), successCount, failureCount, deactivatedTokens);
    }

    /**
     * Send push notification to a single device token.
     */
    public boolean sendSingleDeviceNotification(String token, String title, String body, Map<String, String> data) {
        return sendSingleDeviceNotification(token, title, body, data, new ArrayList<>());
    }

    /**
     * Send push notification to a single device token with tracking of deactivated tokens
     * and bounded retry for transient network/server failures.
     */
    public boolean sendSingleDeviceNotification(String token, String title, String body,
                                                Map<String, String> data, List<String> deactivatedTokens) {
        if (token == null || token.isBlank()) {
            return false;
        }

        // Mask token for privacy/security in logs
        String maskedToken = maskToken(token);

        if (!isConfigured || firebaseApp == null) {
            log.info("[FCM DRY-RUN] Push simulated to token '{}': title='{}', body='{}'", maskedToken, title, body);
            return true;
        }

        Message message = buildMessage(token, title, body, data);

        for (int attempt = 1; attempt <= MAX_DISPATCH_ATTEMPTS; attempt++) {
            try {
                String messageId = FirebaseMessaging.getInstance(firebaseApp).send(message);
                log.info("FCM message successfully dispatched to '{}' (attempt {}), messageId: {}",
                        maskedToken, attempt, messageId);
                return true;
            } catch (FirebaseMessagingException ex) {
                MessagingErrorCode errorCode = ex.getMessagingErrorCode();
                log.warn("FCM dispatch error for token '{}' on attempt {}/{}: code={}, message={}",
                        maskedToken, attempt, MAX_DISPATCH_ATTEMPTS, errorCode, ex.getMessage());

                // 1. Permanent token unregistration: app uninstalled, instance ID deleted
                if (MessagingErrorCode.UNREGISTERED.equals(errorCode)) {
                    log.info("Deactivating unregistered device token: '{}'", maskedToken);
                    deviceTokenRepository.deactivateToken(token);
                    if (deactivatedTokens != null) {
                        deactivatedTokens.add(token);
                    }
                    return false; // Permanent error: do not retry
                }

                // 2. Invalid argument: check whether it is token-specific or payload-specific
                if (MessagingErrorCode.INVALID_ARGUMENT.equals(errorCode)) {
                    if (isTokenSpecificInvalidArgument(ex)) {
                        log.warn("Deactivating invalid device token (token malformed): '{}'", maskedToken);
                        deviceTokenRepository.deactivateToken(token);
                        if (deactivatedTokens != null) {
                            deactivatedTokens.add(token);
                        }
                    } else {
                        log.error("FCM payload or configuration error (token NOT deactivated): '{}', details: {}",
                                maskedToken, ex.getMessage());
                    }
                    return false; // Permanent error: do not retry
                }

                // 3. Transient error: retry with exponential backoff and jitter
                if (isTransientError(ex) && attempt < MAX_DISPATCH_ATTEMPTS) {
                    long backoff = calculateBackoff(attempt);
                    log.info("Retrying FCM dispatch for '{}' in {}ms (attempt {}/{})",
                            maskedToken, backoff, attempt + 1, MAX_DISPATCH_ATTEMPTS);
                    sleep(backoff);
                    continue;
                }

                // Other permanent errors or retry exhaustion
                return false;
            } catch (Exception ex) {
                log.error("Unexpected non-FCM error during push dispatch to '{}': {}", maskedToken, ex.getMessage(), ex);
                return false;
            }
        }
        return false;
    }

    private Message buildMessage(String token, String title, String body, Map<String, String> data) {
        com.google.firebase.messaging.Notification fcmNotification =
                com.google.firebase.messaging.Notification.builder()
                        .setTitle(title)
                        .setBody(body)
                        .build();

        Message.Builder messageBuilder = Message.builder()
                .setToken(token.trim())
                .setNotification(fcmNotification);

        if (data != null && !data.isEmpty()) {
            messageBuilder.putAllData(data);
        }

        // Android-specific channel and priority settings
        messageBuilder.setAndroidConfig(AndroidConfig.builder()
                .setPriority(AndroidConfig.Priority.HIGH)
                .setNotification(AndroidNotification.builder()
                        .setChannelId("rikkei-default")
                        .setColor("#7F1D1D")
                        .setSound("default")
                        .build())
                .build());

        return messageBuilder.build();
    }

    /**
     * Determines if an INVALID_ARGUMENT error specifically indicates an invalid registration token
     * rather than a malformed payload or options.
     */
    boolean isTokenSpecificInvalidArgument(FirebaseMessagingException ex) {
        String msg = ex.getMessage();
        if (msg == null) return false;
        String lower = msg.toLowerCase();
        return lower.contains("registration token")
                || lower.contains("invalid token")
                || lower.contains("token not found")
                || lower.contains("malformed token");
    }

    /**
     * Identifies transient, retryable FCM errors (temporary downtime or rate-limit).
     */
    boolean isTransientError(FirebaseMessagingException ex) {
        MessagingErrorCode code = ex.getMessagingErrorCode();
        return MessagingErrorCode.UNAVAILABLE.equals(code) ||
               MessagingErrorCode.INTERNAL.equals(code);
    }

    private long calculateBackoff(int attempt) {
        long multiplier = (long) Math.pow(2, attempt - 1);
        long baseDelay = INITIAL_BACKOFF_MS * multiplier;
        long jitter = ThreadLocalRandom.current().nextLong(50, 150);
        return baseDelay + jitter;
    }

    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }

    public boolean isConfigured() {
        return isConfigured;
    }

    private String maskToken(String token) {
        if (token == null) return "null";
        int len = token.length();
        if (len <= 12) return "***";
        return token.substring(0, 6) + "..." + token.substring(len - 6);
    }

    public record PushDeliveryResult(
            int totalTargeted,
            int successCount,
            int failureCount,
            List<String> deactivatedTokens
    ) {}
}
