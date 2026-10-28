package com.rikkei.eduportal.lecturer.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_sessions")
public class AttendanceSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_section_id", nullable = false)
    private ClassSection classSection;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lecturer_id", nullable = false)
    private LecturerProfile lecturer;

    @Column(name = "session_name", length = 150)
    private String sessionName;

    @Column(name = "session_secret", nullable = false, length = 100)
    private String sessionSecret;

    @Column(name = "step_seconds", nullable = false)
    private Integer stepSeconds = 15;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "OPEN";

    @Column(name = "total_attendees", nullable = false)
    private Integer totalAttendees = 0;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    public AttendanceSession() {}

    public AttendanceSession(ClassSection classSection, LecturerProfile lecturer, String sessionName, String sessionSecret) {
        this.classSection = classSection;
        this.lecturer = lecturer;
        this.sessionName = sessionName;
        this.sessionSecret = sessionSecret;
        this.status = "OPEN";
        this.stepSeconds = 15;
        this.totalAttendees = 0;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public ClassSection getClassSection() { return classSection; }
    public void setClassSection(ClassSection classSection) { this.classSection = classSection; }

    public LecturerProfile getLecturer() { return lecturer; }
    public void setLecturer(LecturerProfile lecturer) { this.lecturer = lecturer; }

    public String getSessionName() { return sessionName; }
    public void setSessionName(String sessionName) { this.sessionName = sessionName; }

    public String getSessionSecret() { return sessionSecret; }
    public void setSessionSecret(String sessionSecret) { this.sessionSecret = sessionSecret; }

    public Integer getStepSeconds() { return stepSeconds; }
    public void setStepSeconds(Integer stepSeconds) { this.stepSeconds = stepSeconds; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getTotalAttendees() { return totalAttendees; }
    public void setTotalAttendees(Integer totalAttendees) { this.totalAttendees = totalAttendees; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getClosedAt() { return closedAt; }
    public void setClosedAt(LocalDateTime closedAt) { this.closedAt = closedAt; }
}
