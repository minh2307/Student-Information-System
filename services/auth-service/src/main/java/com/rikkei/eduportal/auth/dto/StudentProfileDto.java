package com.rikkei.eduportal.auth.dto;

import java.math.BigDecimal;

public class StudentProfileDto {
    private String studentCode;
    private String major;
    private Integer currentSemester;
    private Integer creditsEarned;
    private Integer totalRequiredCredits;
    private BigDecimal currentCgpa;
    private BigDecimal previousCgpa;

    public StudentProfileDto() {}

    public String getStudentCode() { return studentCode; }
    public void setStudentCode(String studentCode) { this.studentCode = studentCode; }

    public String getMajor() { return major; }
    public void setMajor(String major) { this.major = major; }

    public Integer getCurrentSemester() { return currentSemester; }
    public void setCurrentSemester(Integer currentSemester) { this.currentSemester = currentSemester; }

    public Integer getCreditsEarned() { return creditsEarned; }
    public void setCreditsEarned(Integer creditsEarned) { this.creditsEarned = creditsEarned; }

    public Integer getTotalRequiredCredits() { return totalRequiredCredits; }
    public void setTotalRequiredCredits(Integer totalRequiredCredits) { this.totalRequiredCredits = totalRequiredCredits; }

    public BigDecimal getCurrentCgpa() { return currentCgpa; }
    public void setCurrentCgpa(BigDecimal currentCgpa) { this.currentCgpa = currentCgpa; }

    public BigDecimal getPreviousCgpa() { return previousCgpa; }
    public void setPreviousCgpa(BigDecimal previousCgpa) { this.previousCgpa = previousCgpa; }
}
