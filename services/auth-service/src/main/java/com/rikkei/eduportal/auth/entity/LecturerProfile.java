package com.rikkei.eduportal.auth.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "lecturer_profiles")
public class LecturerProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @Column(name = "lecturer_code", nullable = false, unique = true, length = 20)
    private String lecturerCode;

    @Column(nullable = false, length = 100)
    private String department;

    @Column(length = 50)
    private String degree;

    public LecturerProfile() {}

    public LecturerProfile(Long userId, String lecturerCode, String department, String degree) {
        this.userId = userId;
        this.lecturerCode = lecturerCode;
        this.department = department;
        this.degree = degree;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getLecturerCode() { return lecturerCode; }
    public void setLecturerCode(String lecturerCode) { this.lecturerCode = lecturerCode; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getDegree() { return degree; }
    public void setDegree(String degree) { this.degree = degree; }
}
