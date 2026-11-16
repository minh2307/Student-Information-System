package com.rikkei.eduportal.enrollment.dto;

import java.util.ArrayList;
import java.util.List;

public class BatchImportResult {
    private int total;
    private int successCount;
    private int failureCount;
    private List<String> errors = new ArrayList<>();
    private List<ExamScheduleDto> successfulItems = new ArrayList<>();

    public BatchImportResult() {}

    public BatchImportResult(int total, int successCount, int failureCount, List<String> errors, List<ExamScheduleDto> successfulItems) {
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

    public List<ExamScheduleDto> getSuccessfulItems() { return successfulItems; }
    public void setSuccessfulItems(List<ExamScheduleDto> successfulItems) { this.successfulItems = successfulItems; }
}
