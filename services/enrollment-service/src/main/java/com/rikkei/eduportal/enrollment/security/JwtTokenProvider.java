package com.rikkei.eduportal.enrollment.security;

import com.rikkei.eduportal.enrollment.exception.UnauthorizedException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

/**
 * Cryptographic JWT Validator for enrollment-service.
 * Provides Defense-in-Depth verification by validating HMAC-SHA256 signatures
 * using server-side JWT_SECRET, checking expiration, and rejecting tampered tokens.
 */
@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);

    private final SecretKey secretKey;

    public JwtTokenProvider(
            @Value("${jwt.secret:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}") String secret) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Parses and cryptographically verifies the JWT token.
     * Rejects invalid signatures, expired tokens, and malformed headers.
     */
    public Claims parseAndVerifyClaims(String token) {
        if (token == null || token.isBlank()) {
            throw new UnauthorizedException("Yêu cầu xác thực: Token không được để trống");
        }

        try {
            return Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token.trim())
                    .getPayload();
        } catch (ExpiredJwtException ex) {
            log.warn("JWT token expired: {}", ex.getMessage());
            throw new UnauthorizedException("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        } catch (SignatureException ex) {
            log.warn("JWT signature verification failed (tampered token): {}", ex.getMessage());
            throw new UnauthorizedException("Chữ ký xác thực JWT không hợp lệ (Token bị thay đổi hoặc giả mạo).");
        } catch (JwtException | IllegalArgumentException ex) {
            log.warn("Invalid JWT token format or claims: {}", ex.getMessage());
            throw new UnauthorizedException("Mã xác thực JWT không hợp lệ: " + ex.getMessage());
        }
    }

    /**
     * Validates token and returns subject (studentCode or username).
     */
    public String validateAndGetSubject(String token) {
        Claims claims = parseAndVerifyClaims(token);
        String subject = claims.getSubject();
        if (subject != null && !subject.isBlank()) {
            return subject.trim();
        }
        String username = claims.get("username", String.class);
        if (username != null && !username.isBlank()) {
            return username.trim();
        }
        throw new UnauthorizedException("Mã xác thực JWT thiếu thông tin định danh người dùng (subject/username).");
    }

    /**
     * Returns true if token is valid without throwing exception.
     */
    public boolean validateToken(String token) {
        try {
            parseAndVerifyClaims(token);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }
}
