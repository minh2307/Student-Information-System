package com.rikkei.eduportal.enrollment.exception;

import com.rikkei.eduportal.enrollment.dto.BatchReservationErrorDetails;

public class BatchReservationException extends RuntimeException {
    private final int status;
    private final String code;
    private final BatchReservationErrorDetails details;

    public BatchReservationException(String message, BatchReservationErrorDetails details) {
        this(409, "BATCH_RESERVATION_FAILED", message, details);
    }

    public BatchReservationException(String code, String message, BatchReservationErrorDetails details) {
        this(409, code, message, details);
    }

    public BatchReservationException(int status, String code, String message, BatchReservationErrorDetails details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }

    public int getStatus() { return status; }
    public String getCode() { return code; }
    public BatchReservationErrorDetails getDetails() { return details; }
}
