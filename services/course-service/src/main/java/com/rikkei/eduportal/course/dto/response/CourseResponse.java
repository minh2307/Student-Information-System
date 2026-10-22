package com.rikkei.eduportal.course.dto.response;

public class CourseResponse {

    private Long id;
    private String courseCode;
    private String name;
    private Integer credits;
    private Integer weeklyHours;
    private String syllabusDescription;
    private Long prerequisiteCourseId;
    private String prerequisiteCourseCode;
    private String prerequisiteCourseName;

    public CourseResponse() {}

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

    public String getPrerequisiteCourseCode() { return prerequisiteCourseCode; }
    public void setPrerequisiteCourseCode(String prerequisiteCourseCode) { this.prerequisiteCourseCode = prerequisiteCourseCode; }

    public String getPrerequisiteCourseName() { return prerequisiteCourseName; }
    public void setPrerequisiteCourseName(String prerequisiteCourseName) { this.prerequisiteCourseName = prerequisiteCourseName; }
}
