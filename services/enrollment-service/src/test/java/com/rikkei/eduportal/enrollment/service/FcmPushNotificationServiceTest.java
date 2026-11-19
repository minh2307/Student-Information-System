package com.rikkei.eduportal.enrollment.service;

import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.MessagingErrorCode;
import com.rikkei.eduportal.enrollment.entity.DeviceToken;
import com.rikkei.eduportal.enrollment.entity.User;
import com.rikkei.eduportal.enrollment.repository.DeviceTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FcmPushNotificationServiceTest {

    @Mock
    private DeviceTokenRepository deviceTokenRepository;

    private FcmPushNotificationService fcmService;

    @BeforeEach
    void setUp() {
        // Initialize without credentials: dry-run mode
        fcmService = new FcmPushNotificationService(deviceTokenRepository, null, null);
    }

    @Test
    @DisplayName("B02-10: FcmPushNotificationService - Khởi tạo Dry-run an toàn khi chưa cấu hình Firebase credentials")
    void testDryRunInitialization_SafeWithoutCredentials() {
        assertFalse(fcmService.isConfigured());
    }

    @Test
    @DisplayName("B02-11: FcmPushNotificationService - Gửi thông báo chế độ Dry-run không gây lỗi hệ thống")
    void testSendNotificationToUser_DryRunMode() {
        User user = new User();
        user.setId(10L);
        user.setUsername("student1");

        DeviceToken token = new DeviceToken();
        token.setId(1L);
        token.setUser(user);
        token.setToken("fcm_dummy_token_12345678901234567890");
        token.setIsActive(true);

        when(deviceTokenRepository.findByUserIdAndIsActiveTrue(10L)).thenReturn(List.of(token));

        FcmPushNotificationService.PushDeliveryResult result = fcmService.sendNotificationToUser(
                10L,
                "Nhắc lịch học",
                "Tiết học Lập trình Web sắp bắt đầu",
                Map.of("route", "/(student)/timetable")
        );

        assertNotNull(result);
        assertEquals(1, result.totalTargeted());
        assertEquals(1, result.successCount());
        assertEquals(0, result.failureCount());
        assertTrue(token.getIsActive());
    }

    @Test
    @DisplayName("B02-12: FcmPushNotificationService - Người dùng không có device token active kết thúc an toàn")
    void testSendNotificationToUser_NoTokens() {
        when(deviceTokenRepository.findByUserIdAndIsActiveTrue(99L)).thenReturn(List.of());

        FcmPushNotificationService.PushDeliveryResult result = fcmService.sendNotificationToUser(
                99L,
                "Tiêu đề",
                "Nội dung",
                null
        );

        assertNotNull(result);
        assertEquals(0, result.totalTargeted());
        assertEquals(0, result.successCount());
        assertEquals(0, result.failureCount());
    }

    @Test
    @DisplayName("B02-13: FcmPushNotificationService - Gửi đơn thiết bị chế độ Dry-run mô phỏng thành công an toàn")
    void testSendSingleDeviceNotification_DryRun() {
        boolean sent = fcmService.sendSingleDeviceNotification(
                "fcm_test_token",
                "Tiêu đề",
                "Nội dung",
                null
        );

        assertTrue(sent);
    }

    @Test
    @DisplayName("B02-20: isTokenSpecificInvalidArgument - Phân biệt chính xác giữa lỗi token sai và lỗi payload sai")
    void testIsTokenSpecificInvalidArgument_Classification() {
        FirebaseMessagingException tokenError = mock(FirebaseMessagingException.class);
        when(tokenError.getMessage()).thenReturn("The registration token is not a valid FCM registration token");
        assertTrue(fcmService.isTokenSpecificInvalidArgument(tokenError));

        FirebaseMessagingException malformedToken = mock(FirebaseMessagingException.class);
        when(malformedToken.getMessage()).thenReturn("Malformed token length or format");
        assertTrue(fcmService.isTokenSpecificInvalidArgument(malformedToken));

        FirebaseMessagingException payloadError = mock(FirebaseMessagingException.class);
        when(payloadError.getMessage()).thenReturn("Message payload size exceeds 4096 bytes limit");
        assertFalse(fcmService.isTokenSpecificInvalidArgument(payloadError));

        FirebaseMessagingException nullMessage = mock(FirebaseMessagingException.class);
        when(nullMessage.getMessage()).thenReturn(null);
        assertFalse(fcmService.isTokenSpecificInvalidArgument(nullMessage));
    }

    @Test
    @DisplayName("B02-21: isTransientError - Chỉ định danh đúng các mã lỗi mạng/hạ tầng tạm thời cần retry")
    void testIsTransientError_Classification() {
        FirebaseMessagingException unavailEx = mock(FirebaseMessagingException.class);
        when(unavailEx.getMessagingErrorCode()).thenReturn(MessagingErrorCode.UNAVAILABLE);
        assertTrue(fcmService.isTransientError(unavailEx));

        FirebaseMessagingException internalEx = mock(FirebaseMessagingException.class);
        when(internalEx.getMessagingErrorCode()).thenReturn(MessagingErrorCode.INTERNAL);
        assertTrue(fcmService.isTransientError(internalEx));

        FirebaseMessagingException unregEx = mock(FirebaseMessagingException.class);
        when(unregEx.getMessagingErrorCode()).thenReturn(MessagingErrorCode.UNREGISTERED);
        assertFalse(fcmService.isTransientError(unregEx));

        FirebaseMessagingException invalidArgEx = mock(FirebaseMessagingException.class);
        when(invalidArgEx.getMessagingErrorCode()).thenReturn(MessagingErrorCode.INVALID_ARGUMENT);
        assertFalse(fcmService.isTransientError(invalidArgEx));
    }
}
