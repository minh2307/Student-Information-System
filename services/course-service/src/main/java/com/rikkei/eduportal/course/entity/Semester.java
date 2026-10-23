package com.rikkei.eduportal.course.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "semesters")
public class Semester {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "semester_code", unique = true, nullable = false, length = 30)
    private String semesterCode;

    @Column(name = "semester_name", nullable = false, length = 100)
    private String semesterName;

    @Column(name = "academic_year", nullable = false, length = 30)
    private String academicYear;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = false;

    @Column(name = "is_registration_open", nullable = false)
    private Boolean isRegistrationOpen = true;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Semester() {}

    public Semester(String semesterCode, String semesterName, String academicYear, Boolean isActive, Boolean isRegistrationOpen) {
        this.semesterCode = semesterCode;
        this.semesterName = semesterName;
        this.academicYear = academicYear;
        this.isActive = isActive != null ? isActive : false;
        this.isRegistrationOpen = isRegistrationOpen != null ? isRegistrationOpen : true;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSemesterCode() { return semesterCode; }
    public void setSemesterCode(String semesterCode) { this.semesterCode = semesterCode; }

    public String getSemesterName() { return semesterName; }
    public void setSemesterName(String semesterName) { this.semesterName = semesterName; }

    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public Boolean getIsRegistrationOpen() { return isRegistrationOpen; }
    public void setIsRegistrationOpen(Boolean isRegistrationOpen) { this.isRegistrationOpen = isRegistrationOpen; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}
