package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.PayOSPaymentLinkResponse;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Disabled("Manual test gọi trực tiếp lên cổng PayOS thật - Mở annotation khi cần test live")
class LivePayOSDemonstrationTest {

    @Autowired
    private PayOSService payOSService;

    @Test
    @DisplayName("DEMO THỰC TẾ: Tạo Payment Link Thật Với Cổng PayOS Cho Sinh Viên vinhcute123")
    void testLivePayOSRealPaymentCreation() {
        System.out.println("===============================================================================");
        System.out.println(">>> BẮT ĐẦU GỌI API THỰC TẾ LÊN CỔNG THANH TOÁN PAYOS MERCHANT <<<");
        System.out.println("===============================================================================");

        PayOSPaymentLinkResponse response = payOSService.createPaymentLink(
                "vinhcute123",
                "2024-25_SEM2",
                "https://rikkeiportal.io.vn/student/tuition",
                "https://rikkeiportal.io.vn/student/tuition?status=CANCELLED"
        );

        assertNotNull(response, "Response từ PayOS không được null");
        System.out.println("1. Mã Đơn Hàng (OrderCode): " + response.getOrderCode());
        System.out.println("2. Số Tiền Quyết Toán (VND): " + response.getAmount());
        System.out.println("3. Tên Chủ Tài Khoản Nhận: " + response.getAccountName());
        System.out.println("4. Số Tài Khoản Nhận Tiền: " + response.getAccountNumber());
        System.out.println("5. Mã Ngân Hàng (BIN): " + response.getBin());
        System.out.println("6. Nội Dung Chuyển Khoản: " + response.getDescription());
        System.out.println("7. Trạng Thái Giao Dịch: " + response.getStatus());
        System.out.println("8. Cờ IsMock (Phải là false): " + response.getIsMock());
        System.out.println("9. PayOS Payment Link ID: " + response.getPaymentLinkId());
        System.out.println("10. PayOS Live Checkout URL: " + response.getCheckoutUrl());
        System.out.println("11. PayOS VietQR Raw Payload: " + response.getQrCode());
        System.out.println("===============================================================================");

        assertFalse(Boolean.TRUE.equals(response.getIsMock()), "Giao dịch phải là THẬT (isMock = false), KHÔNG được là mock!");
        assertNotNull(response.getCheckoutUrl(), "Checkout URL không được null");
        assertTrue(response.getCheckoutUrl().startsWith("https://pay.payos.vn/web/"), "Checkout URL phải bắt đầu bằng https://pay.payos.vn/web/");
        assertFalse(response.getPaymentLinkId().startsWith("PAYOS-LINK-"), "PaymentLinkId phải là mã thật từ PayOS, không phải mã giả lập");
        assertFalse(response.getPaymentLinkId().startsWith("PAYOS-FALLBACK-"), "PaymentLinkId phải là mã thật từ PayOS, không phải fallback");
    }
}
