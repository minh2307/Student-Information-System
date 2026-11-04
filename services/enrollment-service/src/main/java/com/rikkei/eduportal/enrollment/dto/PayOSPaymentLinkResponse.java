package com.rikkei.eduportal.enrollment.dto;

public class PayOSPaymentLinkResponse {

    private Long orderCode;
    private Long amount;
    private String description;
    private String accountNumber;
    private String accountName;
    private String bin;
    private String checkoutUrl;
    private String qrCode;
    private String paymentLinkId;
    private String status;

    public PayOSPaymentLinkResponse() {}

    public PayOSPaymentLinkResponse(Long orderCode, Long amount, String description,
                                    String accountNumber, String accountName, String bin,
                                    String checkoutUrl, String qrCode, String paymentLinkId, String status) {
        this.orderCode = orderCode;
        this.amount = amount;
        this.description = description;
        this.accountNumber = accountNumber;
        this.accountName = accountName;
        this.bin = bin;
        this.checkoutUrl = checkoutUrl;
        this.qrCode = qrCode;
        this.paymentLinkId = paymentLinkId;
        this.status = status;
    }

    public Long getOrderCode() { return orderCode; }
    public void setOrderCode(Long orderCode) { this.orderCode = orderCode; }

    public Long getAmount() { return amount; }
    public void setAmount(Long amount) { this.amount = amount; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public String getAccountName() { return accountName; }
    public void setAccountName(String accountName) { this.accountName = accountName; }

    public String getBin() { return bin; }
    public void setBin(String bin) { this.bin = bin; }

    public String getCheckoutUrl() { return checkoutUrl; }
    public void setCheckoutUrl(String checkoutUrl) { this.checkoutUrl = checkoutUrl; }

    public String getQrCode() { return qrCode; }
    public void setQrCode(String qrCode) { this.qrCode = qrCode; }

    public String getPaymentLinkId() { return paymentLinkId; }
    public void setPaymentLinkId(String paymentLinkId) { this.paymentLinkId = paymentLinkId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
