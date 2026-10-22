package com.rikkei.eduportal.course.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "student_profiles")
public class StudentProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private User user;

    @Column(name = "student_code", unique = true, nullable = false, length = 20)
    private String studentCode;

    @Column(nullable = false, length = 100)
    private String major;

    @Column(name = "current_semester")
    private Integer currentSemester = 1;

    @Column(name = "credits_earned")
    private Integer creditsEarned = 0;

    @Column(name = "total_required_credits")
    private Integer totalRequiredCredits = 160;

    @Column(name = "current_cgpa", precision = 3, scale = 2)
    private BigDecimal currentCgpa = BigDecimal.ZERO;

    @Column(name = "previous_cgpa", precision = 3, scale = 2)
    private BigDecimal previousCgpa = BigDecimal.ZERO;

    public StudentProfile() {}

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

    public BigDecimal getCurrentCgpa() { return currentCgpa; }
    public void setCurrentCgpa(BigDecimal currentCgpa) { this.currentCgpa = currentCgpa; }

    public BigDecimal getPreviousCgpa() { return previousCgpa; }
    public void setPreviousCgpa(BigDecimal previousCgpa) { this.previousCgpa = previousCgpa; }
}
