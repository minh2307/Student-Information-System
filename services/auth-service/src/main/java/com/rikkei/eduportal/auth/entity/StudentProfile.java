package com.rikkei.eduportal.auth.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "student_profiles")
public class StudentProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @Column(name = "student_code", nullable = false, unique = true, length = 20)
    private String studentCode;

    @Column(nullable = false, length = 100)
    private String major;

    @Column(name = "current_semester")
    private Integer currentSemester = 1;

    @Column(name = "credits_earned")
    private Integer creditsEarned = 0;

    @Column(name = "total_required_credits")
    private Integer totalRequiredCredits = 160;

    @Column(name = "current_cgpa", precision = 4, scale = 2)
    private BigDecimal currentCgpa = BigDecimal.ZERO;

    @Column(name = "previous_cgpa", precision = 4, scale = 2)
    private BigDecimal previousCgpa = BigDecimal.ZERO;

    public StudentProfile() {}

    public StudentProfile(Long userId, String studentCode, String major) {
        this.userId = userId;
        this.studentCode = studentCode;
        this.major = major;
        this.currentSemester = 1;
        this.creditsEarned = 0;
        this.totalRequiredCredits = 160;
        this.currentCgpa = BigDecimal.ZERO;
        this.previousCgpa = BigDecimal.ZERO;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

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

    public BigDecimal getCurrentCgpa() { return currentCgpa; }
    public void setCurrentCgpa(BigDecimal currentCgpa) { this.currentCgpa = currentCgpa; }

    public BigDecimal getPreviousCgpa() { return previousCgpa; }
    public void setPreviousCgpa(BigDecimal previousCgpa) { this.previousCgpa = previousCgpa; }
}
