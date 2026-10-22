package com.rikkei.eduportal.enrollment.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "enrollments",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_student_section", columnNames = {"student_id", "class_section_id"})
    }
)
public class Enrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private StudentProfile student;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "class_section_id", nullable = false)
    private ClassSection classSection;

    @Column(nullable = false, length = 20)
    private String status = "REGISTERED"; // REGISTERED, PENDING, CANCELLED, REJECTED

    @Column(name = "has_conflict")
    private Boolean hasConflict = false;

    @Column(name = "attendance_rate", precision = 5, scale = 2)
    private BigDecimal attendanceRate = new BigDecimal("100.00");

    @Column(name = "registered_at")
    private LocalDateTime registeredAt = LocalDateTime.now();

    public Enrollment() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public StudentProfile getStudent() { return student; }
    public void setStudent(StudentProfile student) { this.student = student; }

    public ClassSection getClassSection() { return classSection; }
    public void setClassSection(ClassSection classSection) { this.classSection = classSection; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getHasConflict() { return hasConflict; }
    public void setHasConflict(Boolean hasConflict) { this.hasConflict = hasConflict; }

    public BigDecimal getAttendanceRate() { return attendanceRate; }
    public void setAttendanceRate(BigDecimal attendanceRate) { this.attendanceRate = attendanceRate; }

    public LocalDateTime getRegisteredAt() { return registeredAt; }
    public void setRegisteredAt(LocalDateTime registeredAt) { this.registeredAt = registeredAt; }
}
