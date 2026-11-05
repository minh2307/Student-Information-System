package com.rikkei.eduportal.ai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.math.BigDecimal;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class StudentAcademicSummaryDto {
    private String studentCode;
    private String fullName;
    private String major;
    private Integer currentSemester;
    private Integer completedCredits;
    private Integer registeredCreditsCurrentSemester;
    private Integer remainingCreditsToGraduate;
    private Integer totalRequiredCredits;
    private BigDecimal currentCgpa;
    private BigDecimal previousCgpa;
    private String academicStanding;
    private Double attendanceRate;
    private int completedCoursesCount;
    private int currentlyEnrolledCoursesCount;
    private int failedCoursesCount;
    private int scheduleConflictCount;

    public StudentAcademicSummaryDto() {}

    public String getStudentCode() { return studentCode; }
    public void setStudentCode(String studentCode) { this.studentCode = studentCode; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getMajor() { return major; }
    public void setMajor(String major) { this.major = major; }

    public Integer getCurrentSemester() { return currentSemester; }
    public void setCurrentSemester(Integer currentSemester) { this.currentSemester = currentSemester; }

    public Integer getCompletedCredits() { return completedCredits; }
    public void setCompletedCredits(Integer completedCredits) { this.completedCredits = completedCredits; }

    public Integer getRegisteredCreditsCurrentSemester() { return registeredCreditsCurrentSemester; }
    public void setRegisteredCreditsCurrentSemester(Integer registeredCreditsCurrentSemester) {
        this.registeredCreditsCurrentSemester = registeredCreditsCurrentSemester;
    }

    public Integer getRemainingCreditsToGraduate() { return remainingCreditsToGraduate; }
    public void setRemainingCreditsToGraduate(Integer remainingCreditsToGraduate) {
        this.remainingCreditsToGraduate = remainingCreditsToGraduate;
    }

    public Integer getTotalRequiredCredits() { return totalRequiredCredits; }
    public void setTotalRequiredCredits(Integer totalRequiredCredits) { this.totalRequiredCredits = totalRequiredCredits; }

    public BigDecimal getCurrentCgpa() { return currentCgpa; }
    public void setCurrentCgpa(BigDecimal currentCgpa) { this.currentCgpa = currentCgpa; }

    public BigDecimal getPreviousCgpa() { return previousCgpa; }
    public void setPreviousCgpa(BigDecimal previousCgpa) { this.previousCgpa = previousCgpa; }

    public String getAcademicStanding() { return academicStanding; }
    public void setAcademicStanding(String academicStanding) { this.academicStanding = academicStanding; }

    public Double getAttendanceRate() { return attendanceRate; }
    public void setAttendanceRate(Double attendanceRate) { this.attendanceRate = attendanceRate; }

    public int getCompletedCoursesCount() { return completedCoursesCount; }
    public void setCompletedCoursesCount(int completedCoursesCount) { this.completedCoursesCount = completedCoursesCount; }

    public int getCurrentlyEnrolledCoursesCount() { return currentlyEnrolledCoursesCount; }
    public void setCurrentlyEnrolledCoursesCount(int currentlyEnrolledCoursesCount) {
        this.currentlyEnrolledCoursesCount = currentlyEnrolledCoursesCount;
    }

    public int getFailedCoursesCount() { return failedCoursesCount; }
    public void setFailedCoursesCount(int failedCoursesCount) { this.failedCoursesCount = failedCoursesCount; }

    public int getScheduleConflictCount() { return scheduleConflictCount; }
    public void setScheduleConflictCount(int scheduleConflictCount) { this.scheduleConflictCount = scheduleConflictCount; }
}
