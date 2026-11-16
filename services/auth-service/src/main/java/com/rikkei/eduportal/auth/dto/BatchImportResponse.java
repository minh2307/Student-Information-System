package com.rikkei.eduportal.auth.dto;

import java.util.ArrayList;
import java.util.List;

public class BatchImportResponse {
    private int total;
    private int successCount;
    private int failureCount;
    private List<String> errors = new ArrayList<>();
    private List<UserProfileResponse> createdUsers = new ArrayList<>();

    public BatchImportResponse() {}

    public BatchImportResponse(int total, int successCount, int failureCount, List<String> errors, List<UserProfileResponse> createdUsers) {
        this.total = total;
        this.successCount = successCount;
        this.failureCount = failureCount;
        this.errors = errors;
        this.createdUsers = createdUsers;
    }

    public int getTotal() { return total; }
    public void setTotal(int total) { this.total = total; }

    public int getSuccessCount() { return successCount; }
    public void setSuccessCount(int successCount) { this.successCount = successCount; }

    public int getFailureCount() { return failureCount; }
    public void setFailureCount(int failureCount) { this.failureCount = failureCount; }

    public List<String> getErrors() { return errors; }
    public void setErrors(List<String> errors) { this.errors = errors; }

    public List<UserProfileResponse> getCreatedUsers() { return createdUsers; }
    public void setCreatedUsers(List<UserProfileResponse> createdUsers) { this.createdUsers = createdUsers; }
}
