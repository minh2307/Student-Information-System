package com.rikkei.eduportal.enrollment.dto;

public class DigitalCredentialDto {
    private String serial;
    private String studentCode;
    private String fullName;
    private String email;
    private String major;
    private Double cgpa;
    private Integer creditsEarned;
    private Integer totalRequiredCredits;
    private String academicStanding;
    private String issuedAt;
    private String issuer;
    private String signature;
    private String verificationUrl;
    private String status;

    public DigitalCredentialDto() {}

    public String getSerial() { return serial; }
    public void setSerial(String serial) { this.serial = serial; }

    public String getStudentCode() { return studentCode; }
    public void setStudentCode(String studentCode) { this.studentCode = studentCode; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getMajor() { return major; }
    public void setMajor(String major) { this.major = major; }

    public Double getCgpa() { return cgpa; }
    public void setCgpa(Double cgpa) { this.cgpa = cgpa; }

    public Integer getCreditsEarned() { return creditsEarned; }
    public void setCreditsEarned(Integer creditsEarned) { this.creditsEarned = creditsEarned; }

    public Integer getTotalRequiredCredits() { return totalRequiredCredits; }
    public void setTotalRequiredCredits(Integer totalRequiredCredits) { this.totalRequiredCredits = totalRequiredCredits; }

    public String getAcademicStanding() { return academicStanding; }
    public void setAcademicStanding(String academicStanding) { this.academicStanding = academicStanding; }

    public String getIssuedAt() { return issuedAt; }
    public void setIssuedAt(String issuedAt) { this.issuedAt = issuedAt; }

    public String getIssuer() { return issuer; }
    public void setIssuer(String issuer) { this.issuer = issuer; }

    public String getSignature() { return signature; }
    public void setSignature(String signature) { this.signature = signature; }

    public String getVerificationUrl() { return verificationUrl; }
    public void setVerificationUrl(String verificationUrl) { this.verificationUrl = verificationUrl; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
