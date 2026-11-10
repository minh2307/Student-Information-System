package com.rikkei.eduportal.enrollment.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class TuitionDto {
    private Long id;
    private String semesterName;
    private Integer totalCredits;
    private BigDecimal creditUnitPrice;
    private BigDecimal facilityFee;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal remainingAmount;
    private BigDecimal excessAmount; // Khoản tiền dư / bảo lưu cho sinh viên khi hủy môn sau khi đã đóng tiền
    private String status;
    private LocalDate dueDate;
    private LocalDateTime paymentDate;
    private String transactionCode;
    private String paymentMethod;
    private List<TuitionCourseItemDto> courses;

    // Thông tin sinh viên (loại bỏ hoàn toàn hardcoded sv2024001)
    private String studentCode;
    private String studentName;

    // Chuẩn thanh toán Napas247 VietQR QuickLink & Payload
    private String bankBin;
    private String bankName;
    private String bankShortName;
    private String accountNumber;
    private String accountName;
    private String transferContent;
    private String vietQrPayload;
    private String vietQrQuickLink;

    // Danh sách ngân hàng hỗ trợ quét VietQR (VietinBank, MB Bank)
    private List<BankOptionDto> supportedBanks;

    public TuitionDto() {}

    public static class TuitionCourseItemDto {
        private String courseCode;
        private String courseName;
        private Integer credits;
        private BigDecimal fee;

        public TuitionCourseItemDto(String courseCode, String courseName, Integer credits, BigDecimal fee) {
            this.courseCode = courseCode;
            this.courseName = courseName;
            this.credits = credits;
            this.fee = fee;
        }

        public String getCourseCode() { return courseCode; }
        public String getCourseName() { return courseName; }
        public Integer getCredits() { return credits; }
        public BigDecimal getFee() { return fee; }
    }

    public static class BankOptionDto {
        private String bankBin;
        private String bankShortName;
        private String bankName;
        private String accountNumber;
        private String accountName;
        private String vietQrPayload;
        private String vietQrQuickLink;

        public BankOptionDto() {}

        public BankOptionDto(String bankBin, String bankShortName, String bankName, String accountNumber,
                             String accountName, String vietQrPayload, String vietQrQuickLink) {
            this.bankBin = bankBin;
            this.bankShortName = bankShortName;
            this.bankName = bankName;
            this.accountNumber = accountNumber;
            this.accountName = accountName;
            this.vietQrPayload = vietQrPayload;
            this.vietQrQuickLink = vietQrQuickLink;
        }

        public String getBankBin() { return bankBin; }
        public void setBankBin(String bankBin) { this.bankBin = bankBin; }

        public String getBankShortName() { return bankShortName; }
        public void setBankShortName(String bankShortName) { this.bankShortName = bankShortName; }

        public String getBankName() { return bankName; }
        public void setBankName(String bankName) { this.bankName = bankName; }

        public String getAccountNumber() { return accountNumber; }
        public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

        public String getAccountName() { return accountName; }
        public void setAccountName(String accountName) { this.accountName = accountName; }

        public String getVietQrPayload() { return vietQrPayload; }
        public void setVietQrPayload(String vietQrPayload) { this.vietQrPayload = vietQrPayload; }

        public String getVietQrQuickLink() { return vietQrQuickLink; }
        public void setVietQrQuickLink(String vietQrQuickLink) { this.vietQrQuickLink = vietQrQuickLink; }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSemesterName() { return semesterName; }
    public void setSemesterName(String semesterName) { this.semesterName = semesterName; }

    public Integer getTotalCredits() { return totalCredits; }
    public void setTotalCredits(Integer totalCredits) { this.totalCredits = totalCredits; }

    public BigDecimal getCreditUnitPrice() { return creditUnitPrice; }
    public void setCreditUnitPrice(BigDecimal creditUnitPrice) { this.creditUnitPrice = creditUnitPrice; }

    public BigDecimal getFacilityFee() { return facilityFee; }
    public void setFacilityFee(BigDecimal facilityFee) { this.facilityFee = facilityFee; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public BigDecimal getRemainingAmount() { return remainingAmount; }
    public void setRemainingAmount(BigDecimal remainingAmount) { this.remainingAmount = remainingAmount; }

    public BigDecimal getExcessAmount() { return excessAmount; }
    public void setExcessAmount(BigDecimal excessAmount) { this.excessAmount = excessAmount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }

    public LocalDateTime getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDateTime paymentDate) { this.paymentDate = paymentDate; }

    public String getTransactionCode() { return transactionCode; }
    public void setTransactionCode(String transactionCode) { this.transactionCode = transactionCode; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public List<TuitionCourseItemDto> getCourses() { return courses; }
    public void setCourses(List<TuitionCourseItemDto> courses) { this.courses = courses; }

    public String getStudentCode() { return studentCode; }
    public void setStudentCode(String studentCode) { this.studentCode = studentCode; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getBankBin() { return bankBin; }
    public void setBankBin(String bankBin) { this.bankBin = bankBin; }

    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }

    public String getBankShortName() { return bankShortName; }
    public void setBankShortName(String bankShortName) { this.bankShortName = bankShortName; }

    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }

    public String getAccountName() { return accountName; }
    public void setAccountName(String accountName) { this.accountName = accountName; }

    public String getTransferContent() { return transferContent; }
    public void setTransferContent(String transferContent) { this.transferContent = transferContent; }

    public String getVietQrPayload() { return vietQrPayload; }
    public void setVietQrPayload(String vietQrPayload) { this.vietQrPayload = vietQrPayload; }

    public String getVietQrQuickLink() { return vietQrQuickLink; }
    public void setVietQrQuickLink(String vietQrQuickLink) { this.vietQrQuickLink = vietQrQuickLink; }

    public List<BankOptionDto> getSupportedBanks() { return supportedBanks; }
    public void setSupportedBanks(List<BankOptionDto> supportedBanks) { this.supportedBanks = supportedBanks; }
}
