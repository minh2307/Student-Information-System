package com.rikkei.eduportal.lecturer.entity;

import jakarta.persistence.*;

/**
 * Entity bản tối thiểu — cần merge với bản của Cát (course-service).
 * Maps: lecturer_profiles table (lecturer_id FK trong class_sections trỏ về đây).
 */
@Entity
@Table(name = "lecturer_profiles")
public class LecturerProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "lecturer_code", nullable = false, unique = true, length = 20)
    private String lecturerCode;

    @Column(nullable = false, length = 100)
    private String department;

    @Column(length = 50)
    private String degree;

    // ---- getters / setters ----

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getLecturerCode() { return lecturerCode; }
    public void setLecturerCode(String lecturerCode) { this.lecturerCode = lecturerCode; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getDegree() { return degree; }
    public void setDegree(String degree) { this.degree = degree; }
}
