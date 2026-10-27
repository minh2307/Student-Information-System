package com.rikkei.eduportal.enrollment.dto;

import java.util.ArrayList;
import java.util.List;

public class BatchReserveResponse {
    private int successCount;
    private int failedCount;
    private List<String> details = new ArrayList<>();
    private List<SlotReservationResponse> reservations = new ArrayList<>();

    public BatchReserveResponse() {}

    public BatchReserveResponse(int successCount, int failedCount, List<String> details,
                                List<SlotReservationResponse> reservations) {
        this.successCount = successCount;
        this.failedCount = failedCount;
        this.details = details != null ? details : new ArrayList<>();
        this.reservations = reservations != null ? reservations : new ArrayList<>();
    }

    public int getSuccessCount() { return successCount; }
    public void setSuccessCount(int successCount) { this.successCount = successCount; }

    public int getFailedCount() { return failedCount; }
    public void setFailedCount(int failedCount) { this.failedCount = failedCount; }

    public List<String> getDetails() { return details; }
    public void setDetails(List<String> details) { this.details = details; }

    public List<SlotReservationResponse> getReservations() { return reservations; }
    public void setReservations(List<SlotReservationResponse> reservations) { this.reservations = reservations; }
}
