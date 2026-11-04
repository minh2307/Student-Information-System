package com.rikkei.eduportal.enrollment.util;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;

/**
 * Tiện ích khởi tạo mã VietQR chuẩn quốc tế EMVCo và Napas247 QuickLink.
 * Tuân thủ tiêu chuẩn thanh toán QR liên ngân hàng Napas247 (QRIBFTTA).
 */
public final class VietQrPayloadGenerator {

    private static final String NAPAS_GUID = "A000000727";
    private static final String SERVICE_CODE_ACCOUNT = "QRIBFTTA";
    private static final String CURRENCY_VND = "704";
    private static final String COUNTRY_VN = "VN";

    private VietQrPayloadGenerator() {}

    /**
     * Khởi tạo chuỗi payload EMVCo hợp lệ cho Napas247 VietQR.
     * Các ứng dụng ngân hàng di động (MB, Vietcombank, VietinBank, Techcombank, ...)
     * khi quét chuỗi này sẽ tự động điền đúng STK, Ngân hàng, Số tiền và Nội dung.
     */
    public static String generatePayload(String bankBin, String accountNumber, long amount, String transferContent) {
        if (bankBin == null || bankBin.isBlank()) {
            bankBin = "970422"; // MB Bank mặc định
        }
        if (accountNumber == null || accountNumber.isBlank()) {
            accountNumber = "999988882025";
        }
        String cleanContent = sanitizeContent(transferContent);

        // Tag 00: Payload Format Indicator (01)
        String tag00 = "000201";

        // Tag 01: Point of Initiation Method (12 = Dynamic QR có số tiền)
        String tag01 = "010212";

        // Tag 38: Consumer Account Information (Napas247)
        // Subtag 00: GUID
        String sub00 = "00" + formatLength(NAPAS_GUID) + NAPAS_GUID;

        // Subtag 01: Beneficiary (Bank BIN + Account Number)
        String subBin = "00" + formatLength(bankBin) + bankBin;
        String subAcc = "01" + formatLength(accountNumber) + accountNumber;
        String beneficiaryValue = subBin + subAcc;
        String sub01 = "01" + formatLength(beneficiaryValue) + beneficiaryValue;

        // Subtag 02: Service Code
        String sub02 = "02" + formatLength(SERVICE_CODE_ACCOUNT) + SERVICE_CODE_ACCOUNT;

        String tag38Value = sub00 + sub01 + sub02;
        String tag38 = "38" + formatLength(tag38Value) + tag38Value;

        // Tag 53: Transaction Currency (704 = VND)
        String tag53 = "5303" + CURRENCY_VND;

        // Tag 54: Transaction Amount
        String tag54 = "";
        if (amount > 0) {
            String amountStr = String.valueOf(amount);
            tag54 = "54" + formatLength(amountStr) + amountStr;
        }

        // Tag 58: Country Code (VN)
        String tag58 = "5802" + COUNTRY_VN;

        // Tag 62: Additional Data Field (Nội dung chuyển khoản)
        String tag62 = "";
        if (!cleanContent.isEmpty()) {
            String sub08 = "08" + formatLength(cleanContent) + cleanContent;
            tag62 = "62" + formatLength(sub08) + sub08;
        }

        // Tag 63: CRC-16 (CCITT-FALSE)
        String rawDataWithoutCrc = tag00 + tag01 + tag38 + tag53 + tag54 + tag58 + tag62 + "6304";
        String crcHex = calculateCRC16(rawDataWithoutCrc);

        return rawDataWithoutCrc + crcHex;
    }

    /**
     * Khởi tạo đường dẫn ảnh VietQR QuickLink chính thức (img.vietqr.io).
     */
    public static String generateQuickLink(String bankBin, String accountNumber, long amount, String transferContent, String accountName) {
        String cleanContent = sanitizeContent(transferContent);
        String encodedContent = URLEncoder.encode(cleanContent, StandardCharsets.UTF_8);
        String encodedName = URLEncoder.encode(accountName != null ? accountName : "HOC VIEN CONG NGHE RIKKEI", StandardCharsets.UTF_8);
        return String.format(
                "https://img.vietqr.io/image/%s-%s-compact2.png?amount=%d&addInfo=%s&accountName=%s",
                bankBin, accountNumber, Math.max(0, amount), encodedContent, encodedName
        );
    }

    /**
     * Tính mã kiểm tra CRC-16/CCITT-FALSE theo chuẩn EMVCo.
     * Đa thức: 0x1021, Giá trị khởi tạo: 0xFFFF.
     */
    public static String calculateCRC16(String data) {
        int crc = 0xFFFF;
        int polynomial = 0x1021;
        byte[] bytes = data.getBytes(StandardCharsets.US_ASCII);

        for (byte b : bytes) {
            for (int i = 0; i < 8; i++) {
                boolean bit = ((b >> (7 - i)) & 1) == 1;
                boolean c15 = ((crc >> 15) & 1) == 1;
                crc = (crc << 1) & 0xFFFF;
                if (c15 ^ bit) {
                    crc ^= polynomial;
                }
            }
        }
        return String.format("%04X", crc & 0xFFFF);
    }

    /**
     * Chuẩn hóa nội dung chuyển khoản thành ký tự ASCII viết hoa an toàn cho ngân hàng.
     */
    public static String sanitizeContent(String raw) {
        if (raw == null || raw.isBlank()) return "";
        String normalized = Normalizer.normalize(raw, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace("đ", "d")
                .replace("Đ", "D")
                .trim();
        // Loại bỏ ký tự đặc biệt, chỉ giữ lại chữ cái, số, dấu cách, gạch dưới và dấu gạch nối
        String cleaned = normalized.replaceAll("[^a-zA-Z0-9 _-]", "").toUpperCase();
        // Giới hạn độ dài an toàn tối đa 25 ký tự theo quy định Napas
        if (cleaned.length() > 25) {
            cleaned = cleaned.substring(0, 25).trim();
        }
        return cleaned;
    }

    private static String formatLength(String value) {
        return String.format("%02d", value.length());
    }
}
