package com.rikkei.eduportal.course.entity;

import com.rikkei.eduportal.common.SectionStatus;
import jakarta.persistence.*;
import java.time.LocalTime;

@Entity
@Table(name = "class_sections")
public class ClassSection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "section_code", unique = true, nullable = false, length = 30)
    private String sectionCode;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "lecturer_id", nullable = false)
    private LecturerProfile lecturer;

    @Column(name = "semester_name", nullable = false, length = 30)
    private String semesterName;

    @Column(name = "day_of_week", nullable = false, length = 10)
    private String dayOfWeek;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "room_name", nullable = false, length = 50)
    private String roomName;

    @Column(name = "max_capacity", nullable = false)
    private Integer maxCapacity = 40;

    @Column(name = "current_enrolled", nullable = false)
    private Integer currentEnrolled = 0;

    @Version
    @Column(name = "version")
    private Integer version = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SectionStatus status = SectionStatus.OPEN;

    public ClassSection() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSectionCode() { return sectionCode; }
    public void setSectionCode(String sectionCode) { this.sectionCode = sectionCode; }

    public Course getCourse() { return course; }
    public void setCourse(Course course) { this.course = course; }

    public LecturerProfile getLecturer() { return lecturer; }
    public void setLecturer(LecturerProfile lecturer) { this.lecturer = lecturer; }

    public String getSemesterName() { return semesterName; }
    public void setSemesterName(String semesterName) { this.semesterName = semesterName; }

    public String getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(String dayOfWeek) { this.dayOfWeek = dayOfWeek; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public String getRoomName() { return roomName; }
    public void setRoomName(String roomName) { this.roomName = roomName; }

    public Integer getMaxCapacity() { return maxCapacity; }
    public void setMaxCapacity(Integer maxCapacity) { this.maxCapacity = maxCapacity; }

    public Integer getCurrentEnrolled() { return currentEnrolled; }
    public void setCurrentEnrolled(Integer currentEnrolled) { this.currentEnrolled = currentEnrolled; }

    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }

    public SectionStatus getStatus() { return status; }
    public void setStatus(SectionStatus status) { this.status = status; }
}
