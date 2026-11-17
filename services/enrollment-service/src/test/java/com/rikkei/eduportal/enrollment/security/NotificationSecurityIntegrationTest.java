package com.rikkei.eduportal.enrollment.security;

import com.rikkei.eduportal.enrollment.controller.NotificationController;
import com.rikkei.eduportal.enrollment.dto.NotificationDto;
import com.rikkei.eduportal.enrollment.entity.Notification;
import com.rikkei.eduportal.enrollment.entity.User;
import com.rikkei.eduportal.enrollment.exception.BusinessException;
import com.rikkei.eduportal.enrollment.exception.GlobalExceptionHandler;
import com.rikkei.eduportal.enrollment.exception.ResourceNotFoundException;
import com.rikkei.eduportal.enrollment.repository.AnnouncementRepository;
import com.rikkei.eduportal.enrollment.repository.NotificationRepository;
import com.rikkei.eduportal.enrollment.repository.UserRepository;
import com.rikkei.eduportal.enrollment.service.AnnouncementAndNotificationService;
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
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
public class NotificationSecurityIntegrationTest {

    private static final String DEFAULT_SECRET = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
    private static final String UNTRUSTED_SECRET = "FakeUntrustedSecretKeyForTestingInvalidSignature123456";

    private final SecretKey realKey = Keys.hmacShaKeyFor(DEFAULT_SECRET.getBytes(StandardCharsets.UTF_8));
    private final SecretKey untrustedKey = Keys.hmacShaKeyFor(UNTRUSTED_SECRET.getBytes(StandardCharsets.UTF_8));

    @Mock
    private AnnouncementRepository announcementRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    private AnnouncementAndNotificationService service;
    private JwtTokenProvider jwtTokenProvider;
    private NotificationController controller;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(DEFAULT_SECRET);
        service = new AnnouncementAndNotificationService(
                announcementRepository,
                notificationRepository,
                userRepository
        );
        controller = new NotificationController(service, jwtTokenProvider);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private String createToken(String subject, long ttlMillis, SecretKey key) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(subject)
                .claim("username", subject)
                .claim("role", "STUDENT")
                .issuedAt(new Date(now))
                .expiration(new Date(now + ttlMillis))
                .signWith(key)
                .compact();
    }

    @Test
    @DisplayName("NOTI-SEC-01: GET /api/v1/notifications với JWT hợp lệ trả về 200 OK và danh sách thông báo")
    void notiSec01_validJwt_returns200AndNotifications() throws Exception {
        String token = createToken("student1", 3600000, realKey);

        User user = new User();
        user.setId(10L);
        user.setUsername("student1");

        Notification noti = new Notification();
        noti.setId(1L);
        noti.setUser(user);
        noti.setTitle("Thông báo học vụ");
        noti.setMessage("Nội dung học vụ");
        noti.setIsRead(false);
        noti.setCreatedAt(LocalDateTime.now());

        when(userRepository.findByUsername("student1")).thenReturn(Optional.of(user));
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(10L)).thenReturn(List.of(noti));

        mockMvc.perform(get("/api/v1/notifications")
                        .header("Authorization", "Bearer " + token)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].id", is(1)))
                .andExpect(jsonPath("$.data[0].title", is("Thông báo học vụ")));

        verify(userRepository).findByUsername("student1");
        verify(notificationRepository).findByUserIdOrderByCreatedAtDesc(10L);
    }

    @Test
    @DisplayName("NOTI-SEC-02: GET /api/v1/notifications khi thiếu Authorization header bị từ chối 401 Unauthorized")
    void notiSec02_missingAuthorization_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/notifications")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("Yêu cầu xác thực")));

        verifyNoInteractions(notificationRepository);
    }

    @Test
    @DisplayName("NOTI-SEC-03: GET /api/v1/notifications với JWT sai chữ ký (Untrusted Key) bị chặn 401 Unauthorized")
    void notiSec03_untrustedKeyJwt_returns401() throws Exception {
        String forgedToken = createToken("student1", 3600000, untrustedKey);

        mockMvc.perform(get("/api/v1/notifications")
                        .header("Authorization", "Bearer " + forgedToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("Chữ ký xác thực JWT không hợp lệ")));

        verifyNoInteractions(notificationRepository);
    }

    @Test
    @DisplayName("NOTI-SEC-04: GET /api/v1/notifications với JWT hết hạn bị chặn 401 Unauthorized")
    void notiSec04_expiredJwt_returns401() throws Exception {
        String expiredToken = createToken("student1", -1000, realKey);

        mockMvc.perform(get("/api/v1/notifications")
                        .header("Authorization", "Bearer " + expiredToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("Phiên đăng nhập đã hết hạn")));

        verifyNoInteractions(notificationRepository);
    }

    @Test
    @DisplayName("NOTI-SEC-05: GET /api/v1/notifications với JWT bị sửa đổi payload (Tampered) bị chặn 401")
    void notiSec05_tamperedPayloadJwt_returns401() throws Exception {
        String validToken = createToken("student1", 3600000, realKey);
        String[] parts = validToken.split("\\.");

        // Giả mạo payload từ student1 thành admin
        String decodedPayload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
        String tamperedPayload = decodedPayload.replace("student1", "admin");
        String tamperedPayloadBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(tamperedPayload.getBytes(StandardCharsets.UTF_8));
        String tamperedToken = parts[0] + "." + tamperedPayloadBase64 + "." + parts[2];

        mockMvc.perform(get("/api/v1/notifications")
                        .header("Authorization", "Bearer " + tamperedToken)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("Chữ ký xác thực JWT không hợp lệ")));

        verifyNoInteractions(notificationRepository);
    }

    @Test
    @DisplayName("NOTI-SEC-06: Giả mạo X-User-Username: admin nhưng token là student1 -> chỉ lấy identity từ token")
    void notiSec06_spoofedUsernameHeader_usesOnlyTokenSubject() throws Exception {
        String studentToken = createToken("student1", 3600000, realKey);

        User user = new User();
        user.setId(10L);
        user.setUsername("student1");

        when(userRepository.findByUsername("student1")).thenReturn(Optional.of(user));
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(10L)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/notifications")
                        .header("Authorization", "Bearer " + studentToken)
                        .header("X-User-Username", "admin") // Attacker cố tình inject header admin
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // Kiểm tra chắc chắn service truy vấn theo student1, TUYỆT ĐỐI KHÔNG truy vấn theo admin
        verify(userRepository).findByUsername("student1");
        verify(userRepository, never()).findByUsername("admin");
        verify(notificationRepository).findByUserIdOrderByCreatedAtDesc(10L);
    }

    @Test
    @DisplayName("NOTI-SEC-07: Đọc notification của chính mình với JWT hợp lệ được chấp nhận")
    void notiSec07_readOwnNotifications_allowed() throws Exception {
        String token = createToken("sv2024001", 3600000, realKey);

        User user = new User();
        user.setId(101L);
        user.setUsername("sv2024001");

        when(userRepository.findByUsername("sv2024001")).thenReturn(Optional.of(user));
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(101L)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/notifications")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        verify(notificationRepository).findByUserIdOrderByCreatedAtDesc(101L);
    }

    @Test
    @DisplayName("NOTI-SEC-08: Token của User A không thể đọc dữ liệu thông báo của User B")
    void notiSec08_userACannotReadUserBNotifications() throws Exception {
        String tokenUserA = createToken("userA", 3600000, realKey);

        User userA = new User();
        userA.setId(1L);
        userA.setUsername("userA");

        when(userRepository.findByUsername("userA")).thenReturn(Optional.of(userA));
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/notifications")
                        .header("Authorization", "Bearer " + tokenUserA))
                .andExpect(status().isOk());

        // User B có id = 2L không bao giờ bị truy vấn
        verify(notificationRepository, never()).findByUserIdOrderByCreatedAtDesc(2L);
    }

    @Test
    @DisplayName("NOTI-SEC-09: PUT /api/v1/notifications/{id}/read của chính mình thành công (200 OK)")
    void notiSec09_markOwnNotificationAsRead_success() throws Exception {
        String tokenUserA = createToken("userA", 3600000, realKey);

        User userA = new User();
        userA.setId(1L);
        userA.setUsername("userA");

        Notification noti = new Notification();
        noti.setId(55L);
        noti.setUser(userA);
        noti.setIsRead(false);

        when(userRepository.findByUsername("userA")).thenReturn(Optional.of(userA));
        when(notificationRepository.findById(55L)).thenReturn(Optional.of(noti));

        mockMvc.perform(put("/api/v1/notifications/55/read")
                        .header("Authorization", "Bearer " + tokenUserA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Đánh dấu đã đọc thành công")));

        assertTrue(noti.getIsRead());
        verify(notificationRepository).save(noti);
    }

    @Test
    @DisplayName("NOTI-SEC-10: PUT /api/v1/notifications/{id}/read của user khác bị từ chối 403 Forbidden")
    void notiSec10_markOtherUserNotificationAsRead_forbidden() throws Exception {
        String tokenUserB = createToken("userB", 3600000, realKey);

        User userB = new User();
        userB.setId(2L);
        userB.setUsername("userB");

        User userA = new User();
        userA.setId(1L);
        userA.setUsername("userA");

        // Notification 55 thuộc sở hữu User A
        Notification notiUserA = new Notification();
        notiUserA.setId(55L);
        notiUserA.setUser(userA);
        notiUserA.setIsRead(false);

        when(userRepository.findByUsername("userB")).thenReturn(Optional.of(userB));
        when(notificationRepository.findById(55L)).thenReturn(Optional.of(notiUserA));

        mockMvc.perform(put("/api/v1/notifications/55/read")
                        .header("Authorization", "Bearer " + tokenUserB))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)))
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("Từ chối truy cập")));

        // Trạng thái isRead của User A không bị thay đổi
        assertFalse(notiUserA.getIsRead());
        verify(notificationRepository, never()).save(notiUserA);
    }

    @Test
    @DisplayName("NOTI-SEC-11: PUT /api/v1/notifications/{id}/read với ID không tồn tại trả về 404 Not Found")
    void notiSec11_nonExistentNotificationId_returns404() throws Exception {
        String tokenUserA = createToken("userA", 3600000, realKey);

        User userA = new User();
        userA.setId(1L);
        userA.setUsername("userA");

        when(userRepository.findByUsername("userA")).thenReturn(Optional.of(userA));
        when(notificationRepository.findById(9999L)).thenReturn(Optional.empty());

        mockMvc.perform(put("/api/v1/notifications/9999/read")
                        .header("Authorization", "Bearer " + tokenUserA))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("Không tìm thấy thông báo")));
    }

    @Test
    @DisplayName("NOTI-SEC-12: JWT subject không hợp lệ (rỗng) bị từ chối 401 Unauthorized")
    void notiSec12_invalidSubjectJwt_returns401() throws Exception {
        long now = System.currentTimeMillis();
        String tokenWithEmptySubject = Jwts.builder()
                .subject("   ") // whitespace only
                .issuedAt(new Date(now))
                .expiration(new Date(now + 3600000))
                .signWith(realKey)
                .compact();

        mockMvc.perform(get("/api/v1/notifications")
                        .header("Authorization", "Bearer " + tokenWithEmptySubject))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("thiếu thông tin định danh")));

        verifyNoInteractions(notificationRepository);
    }

    @Test
    @DisplayName("NOTI-SEC-13: PUT /api/v1/notifications/read-all với token hợp lệ đánh dấu thành công (200 OK)")
    void notiSec13_markAllAsRead_validToken_success() throws Exception {
        String token = createToken("student1", 3600000, realKey);

        User user = new User();
        user.setId(10L);
        user.setUsername("student1");

        when(userRepository.findByUsername("student1")).thenReturn(Optional.of(user));

        mockMvc.perform(put("/api/v1/notifications/read-all")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Đánh dấu tất cả đã đọc thành công")));

        verify(notificationRepository).markAllAsRead(10L);
    }

    @Test
    @DisplayName("NOTI-SEC-14: PUT /api/v1/notifications/read-all không có token bị từ chối 401")
    void notiSec14_markAllAsRead_unauthorized_returns401() throws Exception {
        mockMvc.perform(put("/api/v1/notifications/read-all"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));

        verifyNoInteractions(notificationRepository);
    }
}
