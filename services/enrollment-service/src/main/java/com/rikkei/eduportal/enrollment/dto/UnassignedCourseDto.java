package com.rikkei.eduportal.enrollment.dto;

public class UnassignedCourseDto {
    private String courseCode;
    private String courseName;
    private String reason;

    public UnassignedCourseDto() {}

    public UnassignedCourseDto(String courseCode, String reason) {
        this.courseCode = courseCode;
        this.reason = reason;
    }

    public UnassignedCourseDto(String courseCode, String courseName, String reason) {
        this.courseCode = courseCode;
        this.courseName = courseName;
        this.reason = reason;
    }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
