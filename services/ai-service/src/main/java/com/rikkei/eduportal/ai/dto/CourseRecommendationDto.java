package com.rikkei.eduportal.ai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class CourseRecommendationDto {
    private String courseCode;
    private String courseName;
    private Integer credits;
    private String reason;
    private Boolean prerequisiteSatisfied;
    private Boolean availableInCurrentSemester;
    private String recommendedPriority; // HIGH, MEDIUM, LOW

    public CourseRecommendationDto() {}

    public CourseRecommendationDto(String courseCode, String courseName, Integer credits,
                                   String reason, Boolean prerequisiteSatisfied,
                                   Boolean availableInCurrentSemester, String recommendedPriority) {
        this.courseCode = courseCode;
        this.courseName = courseName;
        this.credits = credits;
        this.reason = reason;
        this.prerequisiteSatisfied = prerequisiteSatisfied;
        this.availableInCurrentSemester = availableInCurrentSemester;
        this.recommendedPriority = recommendedPriority;
    }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    public Integer getCredits() { return credits; }
    public void setCredits(Integer credits) { this.credits = credits; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public Boolean getPrerequisiteSatisfied() { return prerequisiteSatisfied; }
    public void setPrerequisiteSatisfied(Boolean prerequisiteSatisfied) { this.prerequisiteSatisfied = prerequisiteSatisfied; }

    public Boolean getAvailableInCurrentSemester() { return availableInCurrentSemester; }
    public void setAvailableInCurrentSemester(Boolean availableInCurrentSemester) {
        this.availableInCurrentSemester = availableInCurrentSemester;
    }

    public String getRecommendedPriority() { return recommendedPriority; }
    public void setRecommendedPriority(String recommendedPriority) { this.recommendedPriority = recommendedPriority; }
}
