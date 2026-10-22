package com.rikkei.eduportal.auth.dto;

public class LecturerProfileDto {
    private String lecturerCode;
    private String department;
    private String degree;

    public LecturerProfileDto() {}

    public String getLecturerCode() { return lecturerCode; }
    public void setLecturerCode(String lecturerCode) { this.lecturerCode = lecturerCode; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getDegree() { return degree; }
    public void setDegree(String degree) { this.degree = degree; }
}
