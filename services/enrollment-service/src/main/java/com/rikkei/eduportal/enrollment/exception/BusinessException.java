package com.rikkei.eduportal.enrollment.exception;

public class BusinessException extends RuntimeException {
    private final int status;

    public BusinessException(String message) {
        super(message);
        this.status = 400;
    }

    public BusinessException(int status, String message) {
        super(message);
        this.status = status;
    }

    public int getStatus() {
        return status;
    }
}
