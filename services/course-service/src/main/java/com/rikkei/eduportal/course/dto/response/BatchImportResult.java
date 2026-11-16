package com.rikkei.eduportal.course.dto.response;

import java.util.ArrayList;
import java.util.List;

public class BatchImportResult<T> {
    private int total;
    private int successCount;
    private int failureCount;
    private List<String> errors = new ArrayList<>();
    private List<T> successfulItems = new ArrayList<>();

    public BatchImportResult() {}

    public BatchImportResult(int total, int successCount, int failureCount, List<String> errors, List<T> successfulItems) {
        this.total = total;
        this.successCount = successCount;
        this.failureCount = failureCount;
        this.errors = errors;
        this.successfulItems = successfulItems;
    }

    public int getTotal() { return total; }
    public void setTotal(int total) { this.total = total; }

    public int getSuccessCount() { return successCount; }
    public void setSuccessCount(int successCount) { this.successCount = successCount; }

    public int getFailureCount() { return failureCount; }
    public void setFailureCount(int failureCount) { this.failureCount = failureCount; }

    public List<String> getErrors() { return errors; }
    public void setErrors(List<String> errors) { this.errors = errors; }

    public List<T> getSuccessfulItems() { return successfulItems; }
    public void setSuccessfulItems(List<T> successfulItems) { this.successfulItems = successfulItems; }
}
