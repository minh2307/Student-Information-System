package com.rikkei.eduportal.enrollment.security;

import com.rikkei.eduportal.enrollment.controller.StudentPortalController;
import com.rikkei.eduportal.enrollment.dto.StudentDashboardResponse;
import com.rikkei.eduportal.enrollment.exception.GlobalExceptionHandler;
import com.rikkei.eduportal.enrollment.exception.UnauthorizedException;
import com.rikkei.eduportal.enrollment.service.AcademicContextService;
import com.rikkei.eduportal.enrollment.service.CourseRegistrationService;
import com.rikkei.eduportal.enrollment.service.ExamScheduleService;
import com.rikkei.eduportal.enrollment.service.RealtimeSeatService;
import com.rikkei.eduportal.enrollment.service.StudentDashboardService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Collections;
import java.util.Date;

import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class JwtSignatureSecurityIntegrationTest {

    private static final String DEFAULT_SECRET = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
    private static final String UNTRUSTED_SECRET = "UntrustedHackerKeyWithAtLeast256BitsLengthForHmacSha256Secret!!";

    private final SecretKey realKey = Keys.hmacShaKeyFor(DEFAULT_SECRET.getBytes(StandardCharsets.UTF_8));
    private final SecretKey untrustedKey = Keys.hmacShaKeyFor(UNTRUSTED_SECRET.getBytes(StandardCharsets.UTF_8));

    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private StudentDashboardService dashboardService;
    @Mock
    private CourseRegistrationService registrationService;
    @Mock
    private ExamScheduleService examScheduleService;
    @Mock
    private RealtimeSeatService realtimeSeatService;
    @Mock
    private AcademicContextService academicContextService;

    private StudentPortalController studentPortalController;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(DEFAULT_SECRET);
        studentPortalController = new StudentPortalController(
                dashboardService,
                registrationService,
                examScheduleService,
                realtimeSeatService,
                academicContextService,
                jwtTokenProvider
        );
        mockMvc = MockMvcBuilders.standaloneSetup(studentPortalController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private String createValidToken(String subject, long ttlMillis) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(subject)
                .claim("username", subject)
                .claim("role", "STUDENT")
                .issuedAt(new Date(now))
                .expiration(new Date(now + ttlMillis))
                .signWith(realKey)
                .compact();
    }

    private String createExpiredToken(String subject) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(subject)
                .claim("username", subject)
                .claim("role", "STUDENT")
                .issuedAt(new Date(now - 100000))
                .expiration(new Date(now - 1000))
                .signWith(realKey)
                .compact();
    }

    private String createUntrustedToken(String subject) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(subject)
                .claim("username", subject)
                .claim("role", "STUDENT")
                .issuedAt(new Date(now))
                .expiration(new Date(now + 3600000))
                .signWith(untrustedKey)
                .compact();
    }

    private String createTamperedToken(String originalSubject, String forgedSubject) {
        String token = createValidToken(originalSubject, 3600000);
        String[] parts = token.split("\\.");
        String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
        String tamperedPayloadJson = payloadJson.replace(originalSubject, forgedSubject);
        String tamperedPayloadBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(tamperedPayloadJson.getBytes(StandardCharsets.UTF_8));
        return parts[0] + "." + tamperedPayloadBase64 + "." + parts[2];
    }

    @Test
    @DisplayName("SEC-01: Direct JwtTokenProvider - Chữ ký HMAC-SHA256 hợp lệ trả về Subject chính xác")
    void testDirectJwtTokenProvider_ValidToken_ReturnsSubject() {
        String token = createValidToken("SV2024001", 3600000);
        String subject = jwtTokenProvider.validateAndGetSubject(token);
        assertEquals("SV2024001", subject);
        assertTrue(jwtTokenProvider.validateToken(token));
    }

    @Test
    @DisplayName("SEC-02: Direct JwtTokenProvider - Payload bị sửa đổi trái phép (Tampered Payload) bị từ chối 401")
    void testDirectJwtTokenProvider_TamperedPayload_ThrowsUnauthorized() {
        String tamperedToken = createTamperedToken("SV2024001", "SV2024002");
        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () ->
                jwtTokenProvider.validateAndGetSubject(tamperedToken)
        );
        assertTrue(ex.getMessage().contains("Chữ ký xác thực JWT không hợp lệ") ||
                ex.getMessage().contains("Token bị thay đổi"));
        assertFalse(jwtTokenProvider.validateToken(tamperedToken));
    }

    @Test
    @DisplayName("SEC-03: Direct JwtTokenProvider - Ký bởi Untrusted Key bị từ chối 401")
    void testDirectJwtTokenProvider_UntrustedSignature_ThrowsUnauthorized() {
        String untrustedToken = createUntrustedToken("SV2024001");
        assertThrows(UnauthorizedException.class, () ->
                jwtTokenProvider.validateAndGetSubject(untrustedToken)
        );
        assertFalse(jwtTokenProvider.validateToken(untrustedToken));
    }

    @Test
    @DisplayName("SEC-04: Direct JwtTokenProvider - Token hết hạn (Expired Token) bị từ chối 401")
    void testDirectJwtTokenProvider_ExpiredToken_ThrowsUnauthorized() {
        String expiredToken = createExpiredToken("SV2024001");
        UnauthorizedException ex = assertThrows(UnauthorizedException.class, () ->
                jwtTokenProvider.validateAndGetSubject(expiredToken)
        );
        assertTrue(ex.getMessage().contains("Phiên đăng nhập đã hết hạn"));
        assertFalse(jwtTokenProvider.validateToken(expiredToken));
    }

    @Test
    @DisplayName("SEC-05: HTTP Pipeline - Bearer token hợp lệ trả về 200 OK và lấy đúng dữ liệu sinh viên")
    void testHttpMockMvc_ValidToken_Returns200() throws Exception {
        String token = createValidToken("SV2024001", 3600000);
        StudentDashboardResponse mockResponse = new StudentDashboardResponse();
        when(dashboardService.getStudentDashboard(eq("SV2024001"))).thenReturn(mockResponse);

        mockMvc.perform(get("/api/v1/student/dashboard")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is(200)))
                .andExpect(jsonPath("$.message", is("Lấy dữ liệu dashboard thành công")));

        verify(dashboardService).getStudentDashboard("SV2024001");
    }

    @Test
    @DisplayName("SEC-06: HTTP Pipeline - Giả mạo payload JWT (Tampered sub) bị chặn 401 Unauthorized")
    void testHttpMockMvc_TamperedPayload_Returns401Unauthorized() throws Exception {
        String tamperedToken = createTamperedToken("SV2024001", "SV2024002");

        mockMvc.perform(get("/api/v1/student/dashboard")
                        .header("Authorization", "Bearer " + tamperedToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    @Test
    @DisplayName("SEC-07: HTTP Pipeline - Token ký bằng khóa lạ (Untrusted Signature) bị chặn 401 Unauthorized")
    void testHttpMockMvc_UntrustedSignature_Returns401Unauthorized() throws Exception {
        String untrustedToken = createUntrustedToken("SV2024001");

        mockMvc.perform(get("/api/v1/student/dashboard")
                        .header("Authorization", "Bearer " + untrustedToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    @Test
    @DisplayName("SEC-08: HTTP Pipeline - Token hết hạn bị chặn 401 Unauthorized")
    void testHttpMockMvc_ExpiredToken_Returns401Unauthorized() throws Exception {
        String expiredToken = createExpiredToken("SV2024001");

        mockMvc.perform(get("/api/v1/student/dashboard")
                        .header("Authorization", "Bearer " + expiredToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    @Test
    @DisplayName("SEC-09: HTTP Pipeline - Không có Bearer token và không có header Gateway bị chặn 401")
    void testHttpMockMvc_MissingAuth_Returns401Unauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/student/dashboard")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    @Test
    @DisplayName("SEC-10: HTTP Pipeline - Header X-User-Username đơn lẻ không có Bearer token bị từ chối 401 Unauthorized (Fail-Closed)")
    void testHttpMockMvc_UnverifiedGatewayHeaderWithoutToken_Returns401Unauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/student/dashboard")
                        .header("X-User-Username", "SV2024001")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    @Test
    @DisplayName("SEC-11: Defense in Depth - Sinh viên SV2024001 không thể đọc dữ liệu của SV2024002")
    void testCrossStudentAccessPrevention() throws Exception {
        String studentAToken = createValidToken("SV2024001", 3600000);
        StudentDashboardResponse mockResponseA = new StudentDashboardResponse();
        when(dashboardService.getStudentDashboard(eq("SV2024001"))).thenReturn(mockResponseA);

        // Sinh viên A gửi token A -> Server truy xuất đúng A
        mockMvc.perform(get("/api/v1/student/dashboard")
                        .header("Authorization", "Bearer " + studentAToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        verify(dashboardService).getStudentDashboard("SV2024001");

        // Giả sử kẻ tấn công chỉnh sửa token A để mạo danh SV2024002 -> Bị từ chối 401 ngay lập tức
        String forgedTokenForB = createTamperedToken("SV2024001", "SV2024002");
        mockMvc.perform(get("/api/v1/student/dashboard")
                        .header("Authorization", "Bearer " + forgedTokenForB)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    @Test
    @DisplayName("SEC-12: HTTP Pipeline - Header X-User-Username bị giả mạo khi có Bearer token hợp lệ bị bỏ qua, chỉ lấy danh tính từ chữ ký JWT")
    void testHttpMockMvc_SpoofedHeaderWithValidToken_UsesTokenSubjectAndIgnoresHeader() throws Exception {
        String token = createValidToken("SV2024001", 3600000);
        StudentDashboardResponse mockResponse = new StudentDashboardResponse();
        when(dashboardService.getStudentDashboard(eq("SV2024001"))).thenReturn(mockResponse);

        mockMvc.perform(get("/api/v1/student/dashboard")
                        .header("Authorization", "Bearer " + token)
                        .header("X-User-Username", "SV2024002")
                        .header("X-Student-Code", "SV2024999")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is(200)));

        verify(dashboardService).getStudentDashboard("SV2024001");
    }

    @Test
    @DisplayName("SEC-13: HTTP Pipeline - Header Authorization sai định dạng (không có prefix Bearer) bị từ chối 401 Unauthorized")
    void testHttpMockMvc_MalformedAuthorizationHeader_Returns401Unauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/student/dashboard")
                        .header("Authorization", "Basic dXNlcjpwYXNz")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));

        mockMvc.perform(get("/api/v1/student/dashboard")
                        .header("Authorization", "Bearer ")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }

    @Test
    @DisplayName("SEC-14: HTTP Pipeline - Token JWT có Subject rỗng hoặc khoảng trắng bị từ chối 401 Unauthorized")
    void testHttpMockMvc_TokenWithBlankSubject_Returns401Unauthorized() throws Exception {
        long now = System.currentTimeMillis();
        String tokenWithBlankSubject = Jwts.builder()
                .subject("   ")
                .claim("role", "STUDENT")
                .issuedAt(new Date(now))
                .expiration(new Date(now + 3600000))
                .signWith(realKey)
                .compact();

        mockMvc.perform(get("/api/v1/student/dashboard")
                        .header("Authorization", "Bearer " + tokenWithBlankSubject)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
    }
}
