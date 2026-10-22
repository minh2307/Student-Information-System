package com.rikkei.eduportal.ai.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;

import java.util.ArrayList;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class AcademicAdvisorRequest {

    @NotBlank(message = "Nội dung câu hỏi không được để trống")
    @JsonAlias({"prompt", "question", "query"})
    private String message;

    private List<ChatMessageDto> history = new ArrayList<>();

    private String studentCode;
    private Integer currentSemester;
    private String major;
    private Integer creditsEarned;
    private Double currentCgpa;
    private List<String> conflictingSections = new ArrayList<>();

    public AcademicAdvisorRequest() {
    }

    public AcademicAdvisorRequest(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public List<ChatMessageDto> getHistory() {
        return history;
    }

    public void setHistory(List<ChatMessageDto> history) {
        this.history = history;
    }

    public String getStudentCode() {
        return studentCode;
    }

    public void setStudentCode(String studentCode) {
        this.studentCode = studentCode;
    }

    public Integer getCurrentSemester() {
        return currentSemester;
    }

    public void setCurrentSemester(Integer currentSemester) {
        this.currentSemester = currentSemester;
    }

    public String getMajor() {
        return major;
    }

    public void setMajor(String major) {
        this.major = major;
    }

    public Integer getCreditsEarned() {
        return creditsEarned;
    }

    public void setCreditsEarned(Integer creditsEarned) {
        this.creditsEarned = creditsEarned;
    }

    public Double getCurrentCgpa() {
        return currentCgpa;
    }

    public void setCurrentCgpa(Double currentCgpa) {
        this.currentCgpa = currentCgpa;
    }

    public List<String> getConflictingSections() {
        return conflictingSections;
    }

    public void setConflictingSections(List<String> conflictingSections) {
        this.conflictingSections = conflictingSections;
    }
}
