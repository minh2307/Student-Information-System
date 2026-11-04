package com.rikkei.eduportal.ai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class AcademicAdvisorResponse {

    private String reply;
    private String mode; // GEMINI, FALLBACK, LIMITED
    private String category;
    private List<String> suggestions = new ArrayList<>();
    private String provider;
    private String model;
    private boolean fallbackUsed;
    private StudentAcademicSummaryDto academicSummary;
    private List<CourseRecommendationDto> recommendations = new ArrayList<>();
    private List<String> limitations = new ArrayList<>();
    private LocalDateTime timestamp = LocalDateTime.now();

    public AcademicAdvisorResponse() {
    }

    public AcademicAdvisorResponse(String reply, String category) {
        this.reply = reply;
        this.category = category;
    }

    public String getReply() {
        return reply;
    }

    public void setReply(String reply) {
        this.reply = reply;
    }

    /**
     * Dual compatibility getter for clients expecting message or reply
     */
    @JsonProperty("message")
    public String getMessage() {
        return reply;
    }

    public void setMessage(String message) {
        if (this.reply == null || this.reply.isBlank()) {
            this.reply = message;
        }
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public List<String> getSuggestions() {
        return suggestions;
    }

    public void setSuggestions(List<String> suggestions) {
        this.suggestions = suggestions;
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

    public StudentAcademicSummaryDto getAcademicSummary() {
        return academicSummary;
    }

    public void setAcademicSummary(StudentAcademicSummaryDto academicSummary) {
        this.academicSummary = academicSummary;
    }

    public List<CourseRecommendationDto> getRecommendations() {
        return recommendations;
    }

    public void setRecommendations(List<CourseRecommendationDto> recommendations) {
        this.recommendations = recommendations;
    }

    public List<String> getLimitations() {
        return limitations;
    }

    public void setLimitations(List<String> limitations) {
        this.limitations = limitations;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
