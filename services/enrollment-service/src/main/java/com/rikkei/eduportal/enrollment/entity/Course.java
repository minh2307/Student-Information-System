package com.rikkei.eduportal.enrollment.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "courses")
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "course_code", nullable = false, unique = true, length = 20)
    private String courseCode;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false)
    private Integer credits;

    @Column(name = "weekly_hours", nullable = false)
    private Integer weeklyHours;

    @Column(name = "syllabus_description", columnDefinition = "TEXT")
    private String syllabusDescription;

    @Column(name = "prerequisite_course_id")
    private Long prerequisiteCourseId;

    public Course() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getCredits() { return credits; }
    public void setCredits(Integer credits) { this.credits = credits; }

    public Integer getWeeklyHours() { return weeklyHours; }
    public void setWeeklyHours(Integer weeklyHours) { this.weeklyHours = weeklyHours; }

    public String getSyllabusDescription() { return syllabusDescription; }
    public void setSyllabusDescription(String syllabusDescription) { this.syllabusDescription = syllabusDescription; }

    public Long getPrerequisiteCourseId() { return prerequisiteCourseId; }
    public void setPrerequisiteCourseId(Long prerequisiteCourseId) { this.prerequisiteCourseId = prerequisiteCourseId; }
}
