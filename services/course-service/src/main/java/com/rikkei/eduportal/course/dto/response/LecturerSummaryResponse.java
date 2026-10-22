package com.rikkei.eduportal.course.dto.response;

public class LecturerSummaryResponse {

    private Long id;
    private String lecturerCode;
    private String fullName;
    private String email;
    private String department;
    private String degree;

    public LecturerSummaryResponse() {}

    public LecturerSummaryResponse(Long id, String lecturerCode, String fullName, String email, String department, String degree) {
        this.id = id;
        this.lecturerCode = lecturerCode;
        this.fullName = fullName;
        this.email = email;
        this.department = department;
        this.degree = degree;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getLecturerCode() { return lecturerCode; }
    public void setLecturerCode(String lecturerCode) { this.lecturerCode = lecturerCode; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getDegree() { return degree; }
    public void setDegree(String degree) { this.degree = degree; }
}
