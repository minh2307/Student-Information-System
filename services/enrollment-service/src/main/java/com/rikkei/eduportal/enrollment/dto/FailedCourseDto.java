package com.rikkei.eduportal.enrollment.dto;

import java.math.BigDecimal;

public class FailedCourseDto {
    private String courseCode;
    private String courseName;
    private Integer credits;
    private String semesterName;
    private String letterGrade;
    private BigDecimal totalScore;

    public FailedCourseDto() {}

    public FailedCourseDto(String courseCode, String courseName, Integer credits,
                           String semesterName, String letterGrade, BigDecimal totalScore) {
        this.courseCode = courseCode;
        this.courseName = courseName;
        this.credits = credits;
        this.semesterName = semesterName;
        this.letterGrade = letterGrade;
        this.totalScore = totalScore;
    }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    public Integer getCredits() { return credits; }
    public void setCredits(Integer credits) { this.credits = credits; }

    public String getSemesterName() { return semesterName; }
    public void setSemesterName(String semesterName) { this.semesterName = semesterName; }

    public String getLetterGrade() { return letterGrade; }
    public void setLetterGrade(String letterGrade) { this.letterGrade = letterGrade; }

    public BigDecimal getTotalScore() { return totalScore; }
    public void setTotalScore(BigDecimal totalScore) { this.totalScore = totalScore; }
}
