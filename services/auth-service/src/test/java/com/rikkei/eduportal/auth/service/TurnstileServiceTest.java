package com.rikkei.eduportal.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rikkei.eduportal.auth.dto.ChallengeResponse;
import com.rikkei.eduportal.auth.dto.LoginRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
class TurnstileServiceTest {

    @Mock
    private HttpClient httpClient;

    @Mock
    private HttpResponse<String> httpResponse;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private TurnstileService turnstileService;

    private static final String VALID_SECRET = "0x4AAAAAAF67h81B4OuR_dummy_secret";
    private static final String HOSTNAMES = "localhost,127.0.0.1";
    private static final String VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    @BeforeEach
    void setUp() {
        turnstileService = new TurnstileService(
                VALID_SECRET,
                HOSTNAMES,
                VERIFY_URL,
                true,
                objectMapper,
                httpClient
        );
    }

    private String solvePoW(String nonce, int difficulty) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        String prefix = "0".repeat(difficulty);
        long counter = 0;
        while (true) {
            String candidate = String.valueOf(counter);
            byte[] hash = md.digest((nonce + ":" + candidate).getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) sb.append('0');
                sb.append(hex);
            }
            if (sb.toString().startsWith(prefix)) {
                return candidate;
            }
            counter++;
        }
    }

    @Test
    void testVerify_MissingOrEmptyToken_ThrowsAccessDeniedException() {
        assertThrows(AccessDeniedException.class, () ->
                turnstileService.verify(null, "127.0.0.1", "login"));

        assertThrows(AccessDeniedException.class, () ->
                turnstileService.verify("", "127.0.0.1", "login"));

        assertThrows(AccessDeniedException.class, () ->
                turnstileService.verify("   ", "127.0.0.1", "login"));
    }

    @Test
    void testVerify_TokenTooLong_ThrowsAccessDeniedException() {
        String overlyLongToken = "a".repeat(2049);
        assertThrows(AccessDeniedException.class, () ->
                turnstileService.verify(overlyLongToken, "127.0.0.1", "login"));
    }

    @Test
    void testVerify_Disabled_DoesNotCallHttpClient() {
        TurnstileService disabledService = new TurnstileService(
                VALID_SECRET, HOSTNAMES, VERIFY_URL, false, objectMapper, httpClient);

        assertDoesNotThrow(() -> disabledService.verify(null, "127.0.0.1", "login"));
        verifyNoInteractions(httpClient);
    }

    @Test
    void testVerify_MissingSecret_SkipsVerificationSafely() {
        TurnstileService noSecretService = new TurnstileService(
                "", HOSTNAMES, VERIFY_URL, true, objectMapper, httpClient);

        assertDoesNotThrow(() ->
                noSecretService.verify("some-valid-token", "127.0.0.1", "login"));
        verifyNoInteractions(httpClient);
    }

    @Test
    void testVerify_ValidTokenAndSuccessfulVerification_Passes() throws Exception {
        String responseBody = "{\"success\":true,\"action\":\"login\",\"hostname\":\"localhost\",\"error-codes\":[]}";
        when(httpResponse.statusCode()).thenReturn(200);
        when(httpResponse.body()).thenReturn(responseBody);
        doReturn(httpResponse).when(httpClient).send(any(HttpRequest.class), any());

        assertDoesNotThrow(() ->
                turnstileService.verify("valid-turnstile-token", "127.0.0.1", "login"));
    }

    @Test
    void testVerify_ActionMismatch_ThrowsAccessDeniedException() throws Exception {
        String responseBody = "{\"success\":true,\"action\":\"signup\",\"hostname\":\"localhost\",\"error-codes\":[]}";
        when(httpResponse.statusCode()).thenReturn(200);
        when(httpResponse.body()).thenReturn(responseBody);
        doReturn(httpResponse).when(httpClient).send(any(HttpRequest.class), any());

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                turnstileService.verify("valid-turnstile-token", "127.0.0.1", "login"));
        assertTrue(ex.getMessage().contains("Action"));
    }

    @Test
    void testVerify_HostnameMismatch_ThrowsAccessDeniedException() throws Exception {
        String responseBody = "{\"success\":true,\"action\":\"login\",\"hostname\":\"evil.com\",\"error-codes\":[]}";
        when(httpResponse.statusCode()).thenReturn(200);
        when(httpResponse.body()).thenReturn(responseBody);
        doReturn(httpResponse).when(httpClient).send(any(HttpRequest.class), any());

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                turnstileService.verify("valid-turnstile-token", "127.0.0.1", "login"));
        assertTrue(ex.getMessage().contains("Hostname"));
    }

    @Test
    void testVerify_CloudflareRejectsToken_ThrowsAccessDeniedException() throws Exception {
        String responseBody = "{\"success\":false,\"error-codes\":[\"invalid-input-response\"]}";
        when(httpResponse.statusCode()).thenReturn(200);
        when(httpResponse.body()).thenReturn(responseBody);
        doReturn(httpResponse).when(httpClient).send(any(HttpRequest.class), any());

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                turnstileService.verify("expired-or-invalid-token", "127.0.0.1", "login"));
        assertTrue(ex.getMessage().contains("không hợp lệ hoặc đã hết hạn"));
    }

    @Test
    void testVerify_InterruptedException_RestoresInterruptFlagAndThrowsAccessDeniedException() throws Exception {
        when(httpClient.send(any(HttpRequest.class), any())).thenThrow(new InterruptedException("Simulation of thread interrupt"));

        try {
            AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                    turnstileService.verify("valid-turnstile-token", "127.0.0.1", "login"));
            assertTrue(ex.getMessage().contains("ngắt"));
            assertTrue(Thread.currentThread().isInterrupted(), "Thread interrupt flag must be restored when InterruptedException occurs");
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void testVerify_IOException_ThrowsAccessDeniedExceptionWithoutInterruption() throws Exception {
        when(httpClient.send(any(HttpRequest.class), any())).thenThrow(new java.io.IOException("Network connection reset"));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                turnstileService.verify("valid-turnstile-token", "127.0.0.1", "login"));
        assertTrue(ex.getMessage().contains("Lỗi xác thực bảo mật Turnstile"));
        assertFalse(Thread.currentThread().isInterrupted(), "Thread should not be interrupted on standard IOException");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // P0-01: Native Mobile Cryptographic Challenge & Anti-Bot Tests
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("P0-01: generateChallenge trả về challenge hợp lệ với cấu trúc token, nonce và difficulty")
    void testGenerateChallenge_ReturnsValidChallenge() {
        ChallengeResponse challenge = turnstileService.generateChallenge("192.168.1.100");

        assertNotNull(challenge);
        assertNotNull(challenge.getChallengeToken());
        assertNotNull(challenge.getNonce());
        assertTrue(challenge.getDifficulty() >= 1);
        assertTrue(challenge.getExpiresAt() > System.currentTimeMillis());
    }

    @Test
    @DisplayName("P0-01: verifyNativeChallenge với lời giải PoW hợp lệ thành công")
    void testVerifyNativeChallenge_ValidPoW_Succeeds() throws Exception {
        ChallengeResponse challenge = turnstileService.generateChallenge("192.168.1.100");
        String solution = solvePoW(challenge.getNonce(), challenge.getDifficulty());

        assertDoesNotThrow(() ->
                turnstileService.verifyNativeChallenge(challenge.getChallengeToken(), solution, "192.168.1.100"));
    }

    @Test
    @DisplayName("P0-01: verifyNativeChallenge chặn Replay Attack (không cho dùng lại challenge token)")
    void testVerifyNativeChallenge_ReplayAttack_ThrowsAccessDeniedException() throws Exception {
        ChallengeResponse challenge = turnstileService.generateChallenge("192.168.1.100");
        String solution = solvePoW(challenge.getNonce(), challenge.getDifficulty());

        // Lần đầu thành công
        assertDoesNotThrow(() ->
                turnstileService.verifyNativeChallenge(challenge.getChallengeToken(), solution, "192.168.1.100"));

        // Lần thứ hai bị chặn do replay
        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                turnstileService.verifyNativeChallenge(challenge.getChallengeToken(), solution, "192.168.1.100"));
        assertTrue(ex.getMessage().contains("Replay Attack"));
    }

    @Test
    @DisplayName("P0-01: verifyNativeChallenge chặn lời giải PoW sai")
    void testVerifyNativeChallenge_WrongSolution_ThrowsAccessDeniedException() {
        ChallengeResponse challenge = turnstileService.generateChallenge("192.168.1.100");

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                turnstileService.verifyNativeChallenge(challenge.getChallengeToken(), "incorrect_salt_99999", "192.168.1.100"));
        assertTrue(ex.getMessage().contains("Proof-of-Work không chính xác"));
    }

    @Test
    @DisplayName("P0-01: verifyNativeChallenge chặn token bị giả mạo chữ ký (Tampering)")
    void testVerifyNativeChallenge_TamperedToken_ThrowsAccessDeniedException() {
        ChallengeResponse challenge = turnstileService.generateChallenge("192.168.1.100");
        String decoded = new String(Base64.getUrlDecoder().decode(challenge.getChallengeToken()), StandardCharsets.UTF_8);
        // Thay đổi payload (đổi difficulty từ 3 thành 0 để gian lận)
        String tampered = decoded.replace(":3.", ":0.");
        String tamperedToken = Base64.getUrlEncoder().withoutPadding().encodeToString(tampered.getBytes(StandardCharsets.UTF_8));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                turnstileService.verifyNativeChallenge(tamperedToken, "0", "192.168.1.100"));
        assertTrue(ex.getMessage().contains("Chữ ký Challenge token không hợp lệ"));
    }

    @Test
    @DisplayName("P0-01: verifyLoginProtection từ chối request giả mạo clientType mobile mà không có challenge proof")
    void testVerifyLoginProtection_FakeClientTypeWithoutProof_ThrowsAccessDeniedException() {
        LoginRequest fakeRequest = new LoginRequest("student", "pass");
        fakeRequest.setClientType("MOBILE_NATIVE");

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                turnstileService.verifyLoginProtection(fakeRequest, "192.168.1.100"));
        assertTrue(ex.getMessage().contains("Yêu cầu mã xác thực Turnstile"));
    }

    @Test
    @DisplayName("P0-01: verifyLoginProtection thành công cho Native Mobile khi có challenge proof hợp lệ")
    void testVerifyLoginProtection_ValidNativeChallenge_Succeeds() throws Exception {
        ChallengeResponse challenge = turnstileService.generateChallenge("192.168.1.100");
        String solution = solvePoW(challenge.getNonce(), challenge.getDifficulty());

        LoginRequest nativeRequest = new LoginRequest("student", "pass");
        nativeRequest.setChallengeToken(challenge.getChallengeToken());
        nativeRequest.setChallengeSolution(solution);
        nativeRequest.setClientType("MOBILE_NATIVE");

        assertDoesNotThrow(() ->
                turnstileService.verifyLoginProtection(nativeRequest, "192.168.1.100"));
    }
}
