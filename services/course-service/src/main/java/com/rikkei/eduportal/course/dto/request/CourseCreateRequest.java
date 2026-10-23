package com.rikkei.eduportal.course.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class CourseCreateRequest {

    @NotBlank(message = "Mã môn học không được để trống")
    @Size(max = 20, message = "Mã môn học không được vượt quá 20 ký tự")
    private String courseCode;

    @NotBlank(message = "Tên môn học không được để trống")
    @Size(max = 150, message = "Tên môn học không được vượt quá 150 ký tự")
    private String name;

    @NotNull(message = "Số tín chỉ không được để trống")
    @Min(value = 1, message = "Số tín chỉ phải lớn hơn hoặc bằng 1")
    private Integer credits;

    @NotNull(message = "Số giờ học mỗi tuần không được để trống")
    @Min(value = 1, message = "Số giờ học mỗi tuần phải lớn hơn hoặc bằng 1")
    private Integer weeklyHours;

    private String syllabusDescription;

    private Long prerequisiteCourseId;

    public CourseCreateRequest() {}

    public CourseCreateRequest(String courseCode, String name, Integer credits, Integer weeklyHours, String syllabusDescription, Long prerequisiteCourseId) {
        this.courseCode = courseCode;
        this.name = name;
        this.credits = credits;
        this.weeklyHours = weeklyHours;
        this.syllabusDescription = syllabusDescription;
        this.prerequisiteCourseId = prerequisiteCourseId;
    }

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
