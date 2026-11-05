package com.rikkei.eduportal.enrollment.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class StudentAcademicContextDto {
    private String studentCode;
    private String fullName;
    private String major;
    private Integer currentSemester;
    private Integer completedCredits;
    private Integer registeredCredits;
    private Integer totalRequiredCredits;
    private BigDecimal currentCgpa;
    private BigDecimal previousCgpa;
    private String academicStanding;
    private Double attendanceRate;
    private List<CompletedCourseDto> completedCourses = new ArrayList<>();
    private List<CurrentEnrollmentDto> currentEnrollments = new ArrayList<>();
    private List<FailedCourseDto> failedCourses = new ArrayList<>();
    private List<AvailableCourseDto> availableCourses = new ArrayList<>();
    private List<TimetableItemDto> timetable = new ArrayList<>();
    private int scheduleConflictCount;
    private List<String> conflictingSections = new ArrayList<>();

    public StudentAcademicContextDto() {}

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

    public Integer getRegisteredCredits() { return registeredCredits; }
    public void setRegisteredCredits(Integer registeredCredits) { this.registeredCredits = registeredCredits; }

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

    public List<CompletedCourseDto> getCompletedCourses() { return completedCourses; }
    public void setCompletedCourses(List<CompletedCourseDto> completedCourses) { this.completedCourses = completedCourses; }

    public List<CurrentEnrollmentDto> getCurrentEnrollments() { return currentEnrollments; }
    public void setCurrentEnrollments(List<CurrentEnrollmentDto> currentEnrollments) { this.currentEnrollments = currentEnrollments; }

    public List<FailedCourseDto> getFailedCourses() { return failedCourses; }
    public void setFailedCourses(List<FailedCourseDto> failedCourses) { this.failedCourses = failedCourses; }

    public List<AvailableCourseDto> getAvailableCourses() { return availableCourses; }
    public void setAvailableCourses(List<AvailableCourseDto> availableCourses) { this.availableCourses = availableCourses; }

    public List<TimetableItemDto> getTimetable() { return timetable; }
    public void setTimetable(List<TimetableItemDto> timetable) { this.timetable = timetable; }

    public int getScheduleConflictCount() { return scheduleConflictCount; }
    public void setScheduleConflictCount(int scheduleConflictCount) { this.scheduleConflictCount = scheduleConflictCount; }

    public List<String> getConflictingSections() { return conflictingSections; }
    public void setConflictingSections(List<String> conflictingSections) { this.conflictingSections = conflictingSections; }
}
