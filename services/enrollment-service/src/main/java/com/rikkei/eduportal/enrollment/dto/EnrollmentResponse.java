package com.rikkei.eduportal.enrollment.dto;

import java.time.LocalDateTime;

public class EnrollmentResponse {
    private Long enrollmentId;
    private Long classSectionId;
    private String sectionCode;
    private String courseCode;
    private String courseName;
    private Integer credits;
    private String status;
    private Boolean hasConflict;
    private LocalDateTime registeredAt;

    public EnrollmentResponse() {}

    public EnrollmentResponse(Long enrollmentId, Long classSectionId, String sectionCode,
                              String courseCode, String courseName, Integer credits,
                              String status, Boolean hasConflict, LocalDateTime registeredAt) {
        this.enrollmentId = enrollmentId;
        this.classSectionId = classSectionId;
        this.sectionCode = sectionCode;
        this.courseCode = courseCode;
        this.courseName = courseName;
        this.credits = credits;
        this.status = status;
        this.hasConflict = hasConflict;
        this.registeredAt = registeredAt;
    }

    public Long getEnrollmentId() { return enrollmentId; }
    public void setEnrollmentId(Long enrollmentId) { this.enrollmentId = enrollmentId; }

    public Long getClassSectionId() { return classSectionId; }
    public void setClassSectionId(Long classSectionId) { this.classSectionId = classSectionId; }

    public String getSectionCode() { return sectionCode; }
    public void setSectionCode(String sectionCode) { this.sectionCode = sectionCode; }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    public Integer getCredits() { return credits; }
    public void setCredits(Integer credits) { this.credits = credits; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getHasConflict() { return hasConflict; }
    public void setHasConflict(Boolean hasConflict) { this.hasConflict = hasConflict; }

    public LocalDateTime getRegisteredAt() { return registeredAt; }
    public void setRegisteredAt(LocalDateTime registeredAt) { this.registeredAt = registeredAt; }
}
