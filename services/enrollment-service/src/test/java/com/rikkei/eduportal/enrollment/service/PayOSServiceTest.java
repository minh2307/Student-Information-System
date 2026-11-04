package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.PayOSPaymentLinkResponse;
import com.rikkei.eduportal.enrollment.dto.PayOSWebhookPayload;
import com.rikkei.eduportal.enrollment.dto.TuitionDto;
import com.rikkei.eduportal.enrollment.entity.Notification;
import com.rikkei.eduportal.enrollment.entity.StudentProfile;
import com.rikkei.eduportal.enrollment.entity.TuitionFee;
import com.rikkei.eduportal.enrollment.entity.User;
import com.rikkei.eduportal.enrollment.repository.NotificationRepository;
import com.rikkei.eduportal.enrollment.repository.StudentProfileRepository;
import com.rikkei.eduportal.enrollment.repository.TuitionFeeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PayOSServiceTest {

    @Mock
    private TuitionFeeRepository tuitionFeeRepository;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private StudentDashboardService dashboardService;

    @Mock
    private TuitionService tuitionService;

    private PayOSService payOSService;

    private final String testChecksumKey = "test-checksum-key-32bytes-secret!!";
    private StudentProfile student;
    private User user;
    private TuitionFee tuition;

    @BeforeEach
    void setUp() {
        payOSService = new PayOSService(
                tuitionFeeRepository,
                studentProfileRepository,
                notificationRepository,
                dashboardService,
                tuitionService
        );

        ReflectionTestUtils.setField(payOSService, "clientId", "demo-client-id");
        ReflectionTestUtils.setField(payOSService, "apiKey", "demo-api-key");
        ReflectionTestUtils.setField(payOSService, "checksumKey", testChecksumKey);
        ReflectionTestUtils.setField(payOSService, "baseUrl", "https://api-merchant.payos.vn");
        ReflectionTestUtils.setField(payOSService, "returnUrl", "http://localhost:5173/student/tuition?status=PAID");
        ReflectionTestUtils.setField(payOSService, "cancelUrl", "http://localhost:5173/student/tuition?status=CANCELLED");

        user = new User();
        user.setId(10L);
        user.setFullName("Nguyen Van A");
        user.setEmail("vana@rikkei.edu.vn");

        student = new StudentProfile();
        student.setId(1L);
        student.setStudentCode("SV2024001");
        student.setUser(user);

        tuition = new TuitionFee();
        tuition.setId(5L);
        tuition.setStudent(student);
        tuition.setSemesterName("2024-25_SEM2");
        tuition.setTotalCredits(10);
        tuition.setCreditUnitPrice(BigDecimal.valueOf(450000));
        tuition.setFacilityFee(BigDecimal.valueOf(300000));
        tuition.setTotalAmount(BigDecimal.valueOf(4800000));
        tuition.setPaidAmount(BigDecimal.ZERO);
        tuition.setStatus("UNPAID");
    }

    @Test
    @DisplayName("TC-PAYOS-01: Sinh chữ ký tạo liên kết thanh toán chuẩn HMAC-SHA256")
    void testComputeCreatePaymentLinkSignature() {
        long amount = 4800000L;
        long orderCode = 123456789L;
        String desc = "HP SV2024001 SEM2";
        String returnUrl = "http://localhost:5173/success";
        String cancelUrl = "http://localhost:5173/cancel";

        String signature = payOSService.computeCreatePaymentLinkSignature(amount, cancelUrl, desc, orderCode, returnUrl, testChecksumKey);

        assertNotNull(signature);
        assertEquals(64, signature.length()); // SHA256 hex string has 64 chars

        // Tính lại thủ công để so sánh
        String expectedData = String.format("amount=%d&cancelUrl=%s&description=%s&orderCode=%d&returnUrl=%s",
                amount, cancelUrl, desc, orderCode, returnUrl);
        String manualHash = payOSService.computeHmacSha256(expectedData, testChecksumKey);
        assertEquals(manualHash, signature);
    }

    @Test
    @DisplayName("TC-PAYOS-02: Xác thực chữ ký Webhook PayOS thành công khi payload nguyên vẹn")
    void testVerifyWebhookSignature_ValidSignature() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("orderCode", 123456789L);
        data.put("amount", 4800000L);
        data.put("description", "HP SV2024001");
        data.put("reference", "FT24082772594212");
        data.put("code", "00");

        // Xây dựng chuỗi sorted key1=v1&key2=v2...
        // amount=4800000&code=00&description=HP SV2024001&orderCode=123456789&reference=FT24082772594212
        String expectedCanonical = "amount=4800000&code=00&description=HP SV2024001&orderCode=123456789&reference=FT24082772594212";
        String validSig = payOSService.computeHmacSha256(expectedCanonical, testChecksumKey);

        boolean isValid = payOSService.verifyWebhookSignature(data, validSig, testChecksumKey);
        assertTrue(isValid);
    }

    @Test
    @DisplayName("TC-PAYOS-03: Từ chối Webhook khi chữ ký bị can thiệp sai lệch (Tampered signature)")
    void testVerifyWebhookSignature_InvalidSignature() {
        Map<String, Object> data = new HashMap<>();
        data.put("orderCode", 123456789L);
        data.put("amount", 4800000L);

        boolean isValid = payOSService.verifyWebhookSignature(data, "fake-or-tampered-signature-1234567890", testChecksumKey);
        assertFalse(isValid);
    }

    @Test
    @DisplayName("TC-PAYOS-04: Xử lý Webhook PayOS tự động quyết toán học phí sang PAID và tạo Notification")
    void testProcessWebhook_SuccessSettlement() {
        long orderCode = 50012345678L; // encodes tuitionId = 500
        tuition.setPayosOrderCode(orderCode);

        when(tuitionFeeRepository.findByPayosOrderCode(orderCode)).thenReturn(Optional.of(tuition));
        when(tuitionFeeRepository.save(any(TuitionFee.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("orderCode", orderCode);
        data.put("amount", 4800000L);
        data.put("description", "HP SV2024001 SEM2");
        data.put("reference", "FT-BANK-REF-9988");
        data.put("code", "00");

        // Sinh chữ ký hợp lệ
        Map<String, Object> sorted = new TreeMap<>(data);
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, Object> e : sorted.entrySet()) {
            if (sb.length() > 0) sb.append("&");
            sb.append(e.getKey()).append("=").append(e.getValue());
        }
        String validSig = payOSService.computeHmacSha256(sb.toString(), testChecksumKey);

        PayOSWebhookPayload payload = new PayOSWebhookPayload("00", "success", true, data, validSig);

        Map<String, Object> result = payOSService.processWebhook(payload);

        assertNotNull(result);
        assertEquals(true, result.get("success"));
        assertEquals("PAID", tuition.getStatus());
        assertEquals("FT-BANK-REF-9988", tuition.getTransactionCode());
        assertEquals("PayOS VietQR (Tự động)", tuition.getPaymentMethod());
        assertEquals(BigDecimal.valueOf(4800000), tuition.getPaidAmount());

        verify(notificationRepository, times(1)).save(any(Notification.class));
        verify(tuitionFeeRepository, times(1)).save(tuition);
    }

    @Test
    @DisplayName("TC-PAYOS-05: Webhook văng SecurityException khi chữ ký không hợp lệ")
    void testProcessWebhook_InvalidSignature_ThrowsException() {
        Map<String, Object> data = Map.of("orderCode", 123456L, "amount", 1000000L);
        PayOSWebhookPayload payload = new PayOSWebhookPayload("00", "success", true, data, "invalid-sig");

        assertThrows(SecurityException.class, () -> payOSService.processWebhook(payload));
    }

    @Test
    @DisplayName("TC-PAYOS-06: Webhook xử lý tính idempotent khi nhận request trùng lặp (không cộng đè học phí)")
    void testProcessWebhook_IdempotentDuplicate() {
        long orderCode = 123456L;
        tuition.setStatus("PAID");
        tuition.setPaidAmount(BigDecimal.valueOf(4800000));
        tuition.setPayosOrderCode(orderCode);

        when(tuitionFeeRepository.findByPayosOrderCode(orderCode)).thenReturn(Optional.of(tuition));

        Map<String, Object> data = new TreeMap<>();
        data.put("amount", 4800000L);
        data.put("code", "00");
        data.put("orderCode", orderCode);

        String canonical = "amount=4800000&code=00&orderCode=123456";
        String validSig = payOSService.computeHmacSha256(canonical, testChecksumKey);

        PayOSWebhookPayload payload = new PayOSWebhookPayload("00", "success", true, data, validSig);

        Map<String, Object> result = payOSService.processWebhook(payload);

        assertEquals(true, result.get("success"));
        // paidAmount remains unchanged
        assertEquals(BigDecimal.valueOf(4800000), tuition.getPaidAmount());
        verify(notificationRepository, never()).save(any(Notification.class));
    }

    @Test
    @DisplayName("TC-PAYOS-07: Tạo Payment Link thành công và lưu mã orderCode vào TuitionFee")
    void testCreatePaymentLink_Success() {
        when(dashboardService.resolveStudent("SV2024001")).thenReturn(student);
        when(tuitionService.getStudentTuition("SV2024001", "2024-25_SEM2")).thenReturn(new TuitionDto());
        when(tuitionFeeRepository.findByStudentIdAndSemesterName(1L, "2024-25_SEM2")).thenReturn(Optional.of(tuition));
        when(tuitionFeeRepository.save(any(TuitionFee.class))).thenAnswer(inv -> inv.getArgument(0));

        PayOSPaymentLinkResponse response = payOSService.createPaymentLink("SV2024001", "2024-25_SEM2");

        assertNotNull(response);
        assertNotNull(response.getOrderCode());
        assertEquals(4800000L, response.getAmount());
        assertNotNull(response.getCheckoutUrl());
        assertNotNull(response.getQrCode());
        assertEquals("PENDING", response.getStatus());
        assertEquals(response.getOrderCode(), tuition.getPayosOrderCode());
    }
}
