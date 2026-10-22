package com.rikkei.eduportal.ai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class GenerateSyllabusResponse {

    private String courseName;
    private Integer credits;
    private Integer weeklyHours;
    private String courseCode;
    private String overview;
    private List<String> prerequisites = new ArrayList<>();
    private List<LearningOutcomeDto> learningOutcomes = new ArrayList<>();
    private List<WeeklyTopicDto> weeklyTopics = new ArrayList<>();
    private AssessmentSchemeDto assessmentScheme = new AssessmentSchemeDto();
    private List<String> textbooks = new ArrayList<>();
    private String syllabus;
    private String provider;
    private String model;
    private boolean fallbackUsed;
    private LocalDateTime generatedAt = LocalDateTime.now();

    public GenerateSyllabusResponse() {
    }

    public String getCourseName() {
        return courseName;
    }

    public void setCourseName(String courseName) {
        this.courseName = courseName;
    }

    public Integer getCredits() {
        return credits;
    }

    public void setCredits(Integer credits) {
        this.credits = credits;
    }

    public Integer getWeeklyHours() {
        return weeklyHours;
    }

    public void setWeeklyHours(Integer weeklyHours) {
        this.weeklyHours = weeklyHours;
    }

    public String getCourseCode() {
        return courseCode;
    }

    public void setCourseCode(String courseCode) {
        this.courseCode = courseCode;
    }

    public String getOverview() {
        return overview;
    }

    public void setOverview(String overview) {
        this.overview = overview;
    }

    public List<String> getPrerequisites() {
        return prerequisites;
    }

    public void setPrerequisites(List<String> prerequisites) {
        this.prerequisites = prerequisites;
    }

    public List<LearningOutcomeDto> getLearningOutcomes() {
        return learningOutcomes;
    }

    public void setLearningOutcomes(List<LearningOutcomeDto> learningOutcomes) {
        this.learningOutcomes = learningOutcomes;
    }

    public List<WeeklyTopicDto> getWeeklyTopics() {
        return weeklyTopics;
    }

    public void setWeeklyTopics(List<WeeklyTopicDto> weeklyTopics) {
        this.weeklyTopics = weeklyTopics;
    }

    public AssessmentSchemeDto getAssessmentScheme() {
        return assessmentScheme;
    }

    public void setAssessmentScheme(AssessmentSchemeDto assessmentScheme) {
        this.assessmentScheme = assessmentScheme;
    }

    public List<String> getTextbooks() {
        return textbooks;
    }

    public void setTextbooks(List<String> textbooks) {
        this.textbooks = textbooks;
    }

    public String getSyllabus() {
        return syllabus;
    }

    public void setSyllabus(String syllabus) {
        this.syllabus = syllabus;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public boolean isFallbackUsed() {
        return fallbackUsed;
    }

    public void setFallbackUsed(boolean fallbackUsed) {
        this.fallbackUsed = fallbackUsed;
    }

    public LocalDateTime getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(LocalDateTime generatedAt) {
        this.generatedAt = generatedAt;
    }
}
