package com.rikkei.eduportal.enrollment.dto;

import java.math.BigDecimal;

public class SemesterProgressDto {
    private int creditsEarned;
    private int totalRequiredCredits;
    private double attendanceRate;
    private BigDecimal currentCgpa;
    private BigDecimal previousCgpa;
    private String academicStanding;

    public SemesterProgressDto() {}

    public SemesterProgressDto(int creditsEarned, int totalRequiredCredits, double attendanceRate,
                               BigDecimal currentCgpa, BigDecimal previousCgpa, String academicStanding) {
        this.creditsEarned = creditsEarned;
        this.totalRequiredCredits = totalRequiredCredits;
        this.attendanceRate = attendanceRate;
        this.currentCgpa = currentCgpa;
        this.previousCgpa = previousCgpa;
        this.academicStanding = academicStanding;
    }

    public int getCreditsEarned() { return creditsEarned; }
    public void setCreditsEarned(int creditsEarned) { this.creditsEarned = creditsEarned; }

    public int getTotalRequiredCredits() { return totalRequiredCredits; }
    public void setTotalRequiredCredits(int totalRequiredCredits) { this.totalRequiredCredits = totalRequiredCredits; }

    public double getAttendanceRate() { return attendanceRate; }
    public void setAttendanceRate(double attendanceRate) { this.attendanceRate = attendanceRate; }

    public BigDecimal getCurrentCgpa() { return currentCgpa; }
    public void setCurrentCgpa(BigDecimal currentCgpa) { this.currentCgpa = currentCgpa; }

    public BigDecimal getPreviousCgpa() { return previousCgpa; }
    public void setPreviousCgpa(BigDecimal previousCgpa) { this.previousCgpa = previousCgpa; }

    public String getAcademicStanding() { return academicStanding; }
    public void setAcademicStanding(String academicStanding) { this.academicStanding = academicStanding; }
}
