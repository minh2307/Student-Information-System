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
    private String status;
    private LocalDate dueDate;
    private LocalDateTime paymentDate;
    private String transactionCode;
    private String paymentMethod;
    private List<TuitionCourseItemDto> courses;

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
}
