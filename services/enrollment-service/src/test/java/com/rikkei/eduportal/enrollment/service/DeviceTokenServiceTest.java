package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.DeviceTokenRegisterRequest;
import com.rikkei.eduportal.enrollment.dto.DeviceTokenResponse;
import com.rikkei.eduportal.enrollment.entity.DeviceToken;
import com.rikkei.eduportal.enrollment.entity.User;
import com.rikkei.eduportal.enrollment.exception.ResourceNotFoundException;
import com.rikkei.eduportal.enrollment.repository.DeviceTokenRepository;
import com.rikkei.eduportal.enrollment.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeviceTokenServiceTest {

    @Mock
    private DeviceTokenRepository deviceTokenRepository;

    @Mock
    private UserRepository userRepository;

    private DeviceTokenService deviceTokenService;

    private User user1;
    private User user2;

    @BeforeEach
    void setUp() {
        deviceTokenService = new DeviceTokenService(deviceTokenRepository, userRepository);

        user1 = new User();
        user1.setId(1L);
        user1.setUsername("student1");
        user1.setEmail("student1@rikkei.edu.vn");

        user2 = new User();
        user2.setId(2L);
        user2.setUsername("student2");
        user2.setEmail("student2@rikkei.edu.vn");
    }

    @Test
    @DisplayName("B02-01: registerToken - Đăng ký token mới cho người dùng thành công")
    void testRegisterToken_NewToken_Success() {
        when(userRepository.findByUsername("student1")).thenReturn(Optional.of(user1));
        when(deviceTokenRepository.findByToken("fcm_token_alpha")).thenReturn(Optional.empty());

        DeviceToken savedEntity = new DeviceToken();
        savedEntity.setId(101L);
        savedEntity.setUser(user1);
        savedEntity.setToken("fcm_token_alpha");
        savedEntity.setPlatform("ANDROID");
        savedEntity.setDeviceId("pixel-7-pro");
        savedEntity.setIsActive(true);
        savedEntity.setLastSeenAt(LocalDateTime.now());
        savedEntity.setCreatedAt(LocalDateTime.now());
        savedEntity.setUpdatedAt(LocalDateTime.now());

        when(deviceTokenRepository.save(any(DeviceToken.class))).thenReturn(savedEntity);

        DeviceTokenRegisterRequest request = new DeviceTokenRegisterRequest();
        request.setToken("fcm_token_alpha");
        request.setPlatform("ANDROID");
        request.setDeviceId("pixel-7-pro");

        DeviceTokenResponse response = deviceTokenService.registerToken("student1", request);

        assertNotNull(response);
        assertEquals(101L, response.getId());
        assertTrue(response.getToken().contains("...")); // Masked for privacy
        assertEquals("ANDROID", response.getPlatform());
        assertEquals("pixel-7-pro", response.getDeviceId());
        assertTrue(response.getIsActive());

        ArgumentCaptor<DeviceToken> captor = ArgumentCaptor.forClass(DeviceToken.class);
        verify(deviceTokenRepository).save(captor.capture());
        DeviceToken persisted = captor.getValue();
        assertEquals(user1, persisted.getUser());
        assertEquals("fcm_token_alpha", persisted.getToken());
        assertTrue(persisted.getIsActive());
    }

    @Test
    @DisplayName("B02-02: registerToken - Cập nhật lastSeenAt và kích hoạt lại token đã tồn tại")
    void testRegisterToken_ExistingTokenSameUser_UpdatesLastSeenAndActive() {
        when(userRepository.findByUsername("student1")).thenReturn(Optional.of(user1));

        DeviceToken existing = new DeviceToken();
        existing.setId(102L);
        existing.setUser(user1);
        existing.setToken("fcm_token_existing");
        existing.setPlatform("ANDROID");
        existing.setIsActive(false); // previously inactive
        existing.setLastSeenAt(LocalDateTime.now().minusDays(5));

        when(deviceTokenRepository.findByToken("fcm_token_existing")).thenReturn(Optional.of(existing));
        when(deviceTokenRepository.save(any(DeviceToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DeviceTokenRegisterRequest request = new DeviceTokenRegisterRequest();
        request.setToken("fcm_token_existing");
        request.setPlatform("ANDROID");

        DeviceTokenResponse response = deviceTokenService.registerToken("student1", request);

        assertNotNull(response);
        assertTrue(response.getIsActive());
        verify(deviceTokenRepository).save(existing);
        assertTrue(existing.getIsActive());
    }

    @Test
    @DisplayName("B02-03: registerToken - Chuyển giao thiết bị (Re-assignment): Token thuộc User khác được gán lại cho User mới")
    void testRegisterToken_ReassignmentToNewUser() {
        when(userRepository.findByUsername("student1")).thenReturn(Optional.of(user1));

        DeviceToken existingFromUser2 = new DeviceToken();
        existingFromUser2.setId(103L);
        existingFromUser2.setUser(user2); // Previously registered by user2
        existingFromUser2.setToken("fcm_shared_tablet");
        existingFromUser2.setIsActive(true);

        when(deviceTokenRepository.findByToken("fcm_shared_tablet")).thenReturn(Optional.of(existingFromUser2));
        when(deviceTokenRepository.save(any(DeviceToken.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DeviceTokenRegisterRequest request = new DeviceTokenRegisterRequest();
        request.setToken("fcm_shared_tablet");
        request.setPlatform("ANDROID");
        request.setDeviceId("samsung-tab-s9");

        DeviceTokenResponse response = deviceTokenService.registerToken("student1", request);

        assertNotNull(response);
        assertEquals(user1.getId(), existingFromUser2.getUser().getId());
        assertEquals("student1", existingFromUser2.getUser().getUsername());
        assertTrue(existingFromUser2.getIsActive());
    }

    @Test
    @DisplayName("B02-04: registerToken - Người dùng không tồn tại ném ResourceNotFoundException")
    void testRegisterToken_UserNotFound_ThrowsException() {
        when(userRepository.findByUsername("unknown_user")).thenReturn(Optional.empty());

        DeviceTokenRegisterRequest request = new DeviceTokenRegisterRequest();
        request.setToken("fcm_token_fail");

        assertThrows(ResourceNotFoundException.class, () ->
                deviceTokenService.registerToken("unknown_user", request));
        verify(deviceTokenRepository, never()).save(any());
    }

    @Test
    @DisplayName("B02-05: revokeToken - Thu hồi token của chính người dùng thành công")
    void testRevokeToken_OwnToken_Deactivates() {
        when(userRepository.findByUsername("student1")).thenReturn(Optional.of(user1));
        when(deviceTokenRepository.deactivateTokenByUser("fcm_token_to_revoke", 1L)).thenReturn(1);

        deviceTokenService.revokeToken("student1", "fcm_token_to_revoke");

        verify(deviceTokenRepository).deactivateTokenByUser("fcm_token_to_revoke", 1L);
    }

    @Test
    @DisplayName("B02-06: revokeToken - Cô lập dữ liệu: Không thể thu hồi token của người dùng khác")
    void testRevokeToken_OtherUserToken_DoesNotDeactivate() {
        when(userRepository.findByUsername("student1")).thenReturn(Optional.of(user1));
        when(deviceTokenRepository.deactivateTokenByUser("fcm_token_user2", 1L)).thenReturn(0);

        deviceTokenService.revokeToken("student1", "fcm_token_user2");

        verify(deviceTokenRepository).deactivateTokenByUser("fcm_token_user2", 1L);
    }

    @Test
    @DisplayName("B02-07: revokeToken - Token không tồn tại kết thúc an toàn không lỗi")
    void testRevokeToken_NonExistentToken_SilentNoOp() {
        when(userRepository.findByUsername("student1")).thenReturn(Optional.of(user1));
        when(deviceTokenRepository.deactivateTokenByUser("fcm_non_existent", 1L)).thenReturn(0);

        assertDoesNotThrow(() -> deviceTokenService.revokeToken("student1", "fcm_non_existent"));
        verify(deviceTokenRepository).deactivateTokenByUser("fcm_non_existent", 1L);
    }

    @Test
    @DisplayName("B02-08: getActiveTokens - Trả về danh sách token active của người dùng")
    void testGetActiveTokens_ReturnsList() {
        when(userRepository.findByUsername("student1")).thenReturn(Optional.of(user1));

        DeviceToken t1 = new DeviceToken();
        t1.setId(1L);
        t1.setUser(user1);
        t1.setToken("tok1234567890");
        t1.setPlatform("ANDROID");
        t1.setIsActive(true);

        DeviceToken t2 = new DeviceToken();
        t2.setId(2L);
        t2.setUser(user1);
        t2.setToken("tok2345678901");
        t2.setPlatform("ANDROID");
        t2.setIsActive(true);

        when(deviceTokenRepository.findByUserIdAndIsActiveTrue(1L)).thenReturn(List.of(t1, t2));

        List<DeviceTokenResponse> responses = deviceTokenService.getActiveTokens("student1");

        assertEquals(2, responses.size());
        assertTrue(responses.get(0).getToken().contains("..."));
        assertTrue(responses.get(1).getToken().contains("..."));
    }

    @Test
    @DisplayName("B02-09: deactivateTokenByValue - Thu hồi token trực tiếp theo giá trị (FCM feedback loop)")
    void testDeactivateTokenByValue() {
        DeviceToken token = new DeviceToken();
        token.setId(201L);
        token.setToken("bad_token");
        token.setIsActive(true);

        when(deviceTokenRepository.findByToken("bad_token")).thenReturn(Optional.of(token));

        deviceTokenService.deactivateTokenByValue("bad_token");

        assertFalse(token.getIsActive());
        verify(deviceTokenRepository).save(token);
    }
}
