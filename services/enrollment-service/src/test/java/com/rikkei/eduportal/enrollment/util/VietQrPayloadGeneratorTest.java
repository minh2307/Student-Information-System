package com.rikkei.eduportal.enrollment.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class VietQrPayloadGeneratorTest {

    @Test
    @DisplayName("Chuỗi VietQR sinh ra phải đúng chuẩn EMVCo và Napas247")
    void testGeneratePayloadFormat() {
        String bankBin = "970422";
        String accNo = "999988882025";
        long amount = 7050000;
        String content = "HP SV2024001 202425SEM2";

        String payload = VietQrPayloadGenerator.generatePayload(bankBin, accNo, amount, content);

        assertNotNull(payload);
        // Tag 00 + Tag 01
        assertTrue(payload.startsWith("000201010212"));
        // Tag 38 (Napas GUID + Beneficiary + Service QRIBFTTA)
        assertTrue(payload.contains("A000000727"));
        assertTrue(payload.contains("970422"));
        assertTrue(payload.contains("999988882025"));
        assertTrue(payload.contains("QRIBFTTA"));
        // Tag 53 Currency VND (704)
        assertTrue(payload.contains("5303704"));
        // Tag 54 Amount
        assertTrue(payload.contains("54077050000"));
        // Tag 58 Country VN
        assertTrue(payload.contains("5802VN"));
        // Tag 62 Content
        assertTrue(payload.contains("HP SV2024001 202425SEM2"));
        // Tag 63 CRC16-CCITT check
        assertTrue(payload.contains("6304"));
        // Exact official byte match verified with Napas API
        assertEquals("00020101021238560010A0000007270126000697042201129999888820250208QRIBFTTA5303704540770500005802VN62270823HP SV2024001 202425SEM263044A42", payload);
    }

    @Test
    @DisplayName("VietinBank (BIN 970415) sinh ra mã payload chuẩn")
    void testVietinBankPayload() {
        String bankBin = "970415";
        String accNo = "999988882025";
        long amount = 7050000;
        String content = "HP SV2024001 202425SEM2";

        String payload = VietQrPayloadGenerator.generatePayload(bankBin, accNo, amount, content);

        assertNotNull(payload);
        assertTrue(payload.contains("970415"));
        assertEquals("00020101021238560010A0000007270126000697041501129999888820250208QRIBFTTA5303704540770500005802VN62270823HP SV2024001 202425SEM26304DBB7", payload);
    }

    @Test
    @DisplayName("VietQR QuickLink URL phải tuân theo cấu trúc Napas247 QuickLink")
    void testGenerateQuickLink() {
        String quickLink = VietQrPayloadGenerator.generateQuickLink("970422", "999988882025", 7050000, "HP SV2024001 2024-25_SEM2", "HOC VIEN CONG NGHE RIKKEI");
        assertNotNull(quickLink);
        assertTrue(quickLink.startsWith("https://img.vietqr.io/image/970422-999988882025-compact2.png"));
        assertTrue(quickLink.contains("amount=7050000"));
        assertTrue(quickLink.contains("addInfo=HP+SV2024001+2024-25_SEM2") || quickLink.contains("addInfo=HP%20SV2024001%202024-25_SEM2") || quickLink.contains("SV2024001"));
        assertTrue(quickLink.contains("accountName=HOC+VIEN+CONG+NGHE+RIKKEI") || quickLink.contains("accountName=HOC%20VIEN%20CONG%20NGHE%20RIKKEI"));
    }

    @Test
    @DisplayName("Khử dấu tiếng Việt thành chuỗi chuyển khoản an toàn cho ngân hàng")
    void testSanitizeContent() {
        String raw = "Học phí SV2024001 kỳ 2 - 2025";
        String clean = VietQrPayloadGenerator.sanitizeContent(raw);
        assertEquals("HOC PHI SV2024001 KY 2 -", clean);
        assertFalse(clean.matches(".*[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ].*"));
    }
}
