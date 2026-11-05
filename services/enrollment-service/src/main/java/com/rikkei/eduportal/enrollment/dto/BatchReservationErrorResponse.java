package com.rikkei.eduportal.enrollment.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.rikkei.eduportal.common.ApiResponse;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class BatchReservationErrorResponse extends ApiResponse<BatchReservationErrorDetails> {
    private String code;
    private BatchReservationErrorDetails details;

    public BatchReservationErrorResponse() {
        super();
        setStatus(409);
    }

    public BatchReservationErrorResponse(boolean success, int status, String code, String message, BatchReservationErrorDetails details) {
        super(status, message, details);
        this.code = code;
        this.details = details;
    }

    @JsonProperty("success")
    @Override
    public boolean isSuccess() {
        return false;
    }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public BatchReservationErrorDetails getDetails() { return details; }
    public void setDetails(BatchReservationErrorDetails details) {
        this.details = details;
        setData(details);
    }
}
