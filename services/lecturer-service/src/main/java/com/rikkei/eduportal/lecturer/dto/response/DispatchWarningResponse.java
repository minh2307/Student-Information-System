package com.rikkei.eduportal.lecturer.dto.response;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class DispatchWarningResponse {
    private int sentCount;
    private String status;
    private LocalDateTime dispatchedAt;
    private List<String> recipientNames = new ArrayList<>();
    private String message;

    public DispatchWarningResponse() {}

    public DispatchWarningResponse(int sentCount, String status, LocalDateTime dispatchedAt,
                                   List<String> recipientNames, String message) {
        this.sentCount = sentCount;
        this.status = status;
        this.dispatchedAt = dispatchedAt;
        this.recipientNames = recipientNames != null ? recipientNames : new ArrayList<>();
        this.message = message;
    }

    public int getSentCount() { return sentCount; }
    public void setSentCount(int sentCount) { this.sentCount = sentCount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getDispatchedAt() { return dispatchedAt; }
    public void setDispatchedAt(LocalDateTime dispatchedAt) { this.dispatchedAt = dispatchedAt; }

    public List<String> getRecipientNames() { return recipientNames; }
    public void setRecipientNames(List<String> recipientNames) { this.recipientNames = recipientNames; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
