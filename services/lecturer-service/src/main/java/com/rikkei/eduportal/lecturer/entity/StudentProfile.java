package com.rikkei.eduportal.lecturer.entity;

import jakarta.persistence.*;

/**
 * Entity bản tối thiểu — cần merge với bản của Quân (enrollment-service).
 */
@Entity
@Table(name = "student_profiles")
public class StudentProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "student_code", nullable = false, unique = true, length = 20)
    private String studentCode;

    @Column(nullable = false, length = 100)
    private String major;

    @Column(name = "current_semester")
    private Integer currentSemester;

    @Column(name = "credits_earned")
    private Integer creditsEarned;

    @Column(name = "total_required_credits")
    private Integer totalRequiredCredits;

    @Column(name = "current_cgpa", precision = 4, scale = 2)
    private java.math.BigDecimal currentCgpa;

    @Column(name = "previous_cgpa", precision = 4, scale = 2)
    private java.math.BigDecimal previousCgpa;

    // ---- getters / setters ----

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

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

    public java.math.BigDecimal getCurrentCgpa() { return currentCgpa; }
    public void setCurrentCgpa(java.math.BigDecimal currentCgpa) { this.currentCgpa = currentCgpa; }

    public java.math.BigDecimal getPreviousCgpa() { return previousCgpa; }
    public void setPreviousCgpa(java.math.BigDecimal previousCgpa) { this.previousCgpa = previousCgpa; }
}
