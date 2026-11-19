package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.DeviceTokenRegisterRequest;
import com.rikkei.eduportal.enrollment.dto.DeviceTokenResponse;
import com.rikkei.eduportal.enrollment.entity.DeviceToken;
import com.rikkei.eduportal.enrollment.entity.User;
import com.rikkei.eduportal.enrollment.exception.ResourceNotFoundException;
import com.rikkei.eduportal.enrollment.exception.UnauthorizedException;
import com.rikkei.eduportal.enrollment.repository.DeviceTokenRepository;
import com.rikkei.eduportal.enrollment.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class DeviceTokenService {

    private static final Logger log = LoggerFactory.getLogger(DeviceTokenService.class);

    private final DeviceTokenRepository deviceTokenRepository;
    private final UserRepository userRepository;

    public DeviceTokenService(DeviceTokenRepository deviceTokenRepository, UserRepository userRepository) {
        this.deviceTokenRepository = deviceTokenRepository;
        this.userRepository = userRepository;
    }

    /**
     * Register or refresh FCM device token for authenticated user.
     * Idempotent: Handles same device multiple accounts and token rotation cleanly.
     */
    @Transactional
    public DeviceTokenResponse registerToken(String username, DeviceTokenRegisterRequest request) {
        User user = resolveUser(username);
        String rawToken = request.getToken().trim();
        String platform = (request.getPlatform() != null && !request.getPlatform().isBlank())
                ? request.getPlatform().trim().toUpperCase() : "ANDROID";
        String deviceId = request.getDeviceId() != null ? request.getDeviceId().trim() : null;

        Optional<DeviceToken> existingOpt = deviceTokenRepository.findByToken(rawToken);

        DeviceToken deviceToken;
        if (existingOpt.isPresent()) {
            deviceToken = existingOpt.get();
            // If token previously belonged to another user (device shared or re-assigned), rebind to current authenticated user
            if (!deviceToken.getUser().getId().equals(user.getId())) {
                log.info("Reassigning device token from userId {} to userId {}", deviceToken.getUser().getId(), user.getId());
                deviceToken.setUser(user);
            }
            deviceToken.setPlatform(platform);
            deviceToken.setDeviceId(deviceId);
            deviceToken.setIsActive(true);
            deviceToken.setLastSeenAt(LocalDateTime.now());
            deviceToken = deviceTokenRepository.save(deviceToken);
            log.info("Device token refreshed for user '{}', deviceId: {}", username, deviceId);
        } else {
            deviceToken = new DeviceToken(user, rawToken, platform, deviceId);
            deviceToken = deviceTokenRepository.save(deviceToken);
            log.info("New device token registered for user '{}', platform: {}, deviceId: {}", username, platform, deviceId);
        }

        return new DeviceTokenResponse(
                deviceToken.getId(),
                maskToken(deviceToken.getToken()),
                deviceToken.getPlatform(),
                deviceToken.getDeviceId(),
                deviceToken.getIsActive(),
                deviceToken.getCreatedAt()
        );
    }

    /**
     * Revoke FCM device token on logout or permission revocation.
     * Idempotent: Does not leak token ownership or existence.
     */
    @Transactional
    public void revokeToken(String username, String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        User user = resolveUser(username);
        String trimmedToken = rawToken.trim();

        int updated = deviceTokenRepository.deactivateTokenByUser(trimmedToken, user.getId());
        if (updated > 0) {
            log.info("Successfully deactivated device token for user '{}'", username);
        } else {
            log.debug("Token revocation requested by '{}' but no matching active token found", username);
        }
    }

    /**
     * Deactivates a token directly by token value (used by FCM error feedback loop).
     */
    @Transactional
    public void deactivateTokenByValue(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        deviceTokenRepository.findByToken(rawToken.trim()).ifPresent(token -> {
            token.setIsActive(false);
            deviceTokenRepository.save(token);
            log.info("Deactivated device token via feedback loop: {}", maskToken(token.getToken()));
        });
    }

    /**
     * Get active registered tokens for user.
     */
    @Transactional(readOnly = true)
    public List<DeviceTokenResponse> getActiveTokens(String username) {
        User user = resolveUser(username);
        return deviceTokenRepository.findByUserIdAndIsActiveTrue(user.getId()).stream()
                .map(dt -> new DeviceTokenResponse(
                        dt.getId(),
                        maskToken(dt.getToken()),
                        dt.getPlatform(),
                        dt.getDeviceId(),
                        dt.getIsActive(),
                        dt.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }

    private User resolveUser(String username) {
        if (username == null || username.trim().isEmpty()) {
            throw new UnauthorizedException("Yêu cầu xác thực: Định danh người dùng không được để trống");
        }
        return userRepository.findByUsername(username.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng: " + username.trim()));
    }

    private String maskToken(String token) {
        if (token == null) return "null";
        int len = token.length();
        if (len <= 12) return "***";
        return token.substring(0, 6) + "..." + token.substring(len - 6);
    }
}
