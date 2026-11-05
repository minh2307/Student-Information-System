package com.rikkei.eduportal.auth.service;

import com.rikkei.eduportal.auth.entity.RefreshToken;
import com.rikkei.eduportal.auth.entity.User;
import com.rikkei.eduportal.auth.exception.UnauthorizedException;
import com.rikkei.eduportal.auth.repository.RefreshTokenRepository;
import com.rikkei.eduportal.common.UserStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final long refreshExpirationDays;

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            @Value("${jwt.refresh-expiration-days:7}") long refreshExpirationDays) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshExpirationDays = refreshExpirationDays;
    }

    @Transactional
    public RefreshToken createRefreshToken(User user) {
        String token = UUID.randomUUID().toString() + "-" + UUID.randomUUID().toString();
        RefreshToken refreshToken = new RefreshToken(
                token,
                user,
                LocalDateTime.now().plusDays(refreshExpirationDays)
        );
        return refreshTokenRepository.save(refreshToken);
    }

    @Transactional
    public RefreshToken verifyAndRotate(String tokenString) {
        RefreshToken token = refreshTokenRepository.findByToken(tokenString)
                .orElseThrow(() -> new UnauthorizedException("Refresh token không tồn tại trong hệ thống."));

        if (token.isRevoked()) {
            // Token Reuse Detection: thu hồi toàn bộ token của user để phòng chống chiếm đoạt phiên
            refreshTokenRepository.revokeAllUserTokens(token.getUser());
            throw new UnauthorizedException("CẢNH BÁO: Refresh token đã bị thu hồi trước đó. Vui lòng đăng nhập lại!");
        }

        if (token.isExpired()) {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
            throw new UnauthorizedException("Refresh token đã hết hạn. Vui lòng đăng nhập lại!");
        }

        if (token.getUser().getStatus() == UserStatus.LOCKED) {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
            throw new UnauthorizedException("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên!");
        }

        // Đánh dấu token cũ đã thu hồi (Rotation)
        token.setRevoked(true);
        refreshTokenRepository.save(token);

        // Sinh token mới cho chuỗi phiên kế tiếp
        return createRefreshToken(token.getUser());
    }

    @Transactional
    public void revokeToken(String tokenString) {
        if (tokenString != null && !tokenString.isBlank()) {
            refreshTokenRepository.findByToken(tokenString).ifPresent(token -> {
                token.setRevoked(true);
                refreshTokenRepository.save(token);
            });
        }
    }

    @Transactional
    public void revokeAllUserTokens(User user) {
        refreshTokenRepository.revokeAllUserTokens(user);
    }
}
