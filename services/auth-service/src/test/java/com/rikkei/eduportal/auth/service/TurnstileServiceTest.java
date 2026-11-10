package com.rikkei.eduportal.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

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
}
