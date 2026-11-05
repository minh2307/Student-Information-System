package com.rikkei.eduportal.enrollment.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class BatchReservationErrorDetails {
    private String failedCourseId;
    private String failedCourseName;
    private String reason;
    private String message;

    public BatchReservationErrorDetails() {}

    public BatchReservationErrorDetails(String failedCourseId, String failedCourseName, String reason, String message) {
        this.failedCourseId = failedCourseId;
        this.failedCourseName = failedCourseName;
        this.reason = reason;
        this.message = message;
    }

    public String getFailedCourseId() { return failedCourseId; }
    public void setFailedCourseId(String failedCourseId) { this.failedCourseId = failedCourseId; }

    public String getFailedCourseName() { return failedCourseName; }
    public void setFailedCourseName(String failedCourseName) { this.failedCourseName = failedCourseName; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
