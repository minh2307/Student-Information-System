package com.rikkei.eduportal.ai.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class AcademicAdvisorResponse {

    private String reply;
    private String category;
    private List<String> suggestions = new ArrayList<>();
    private String provider;
    private String model;
    private boolean fallbackUsed;
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

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
