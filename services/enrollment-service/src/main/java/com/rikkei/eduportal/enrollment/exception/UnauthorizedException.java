package com.rikkei.eduportal.enrollment.exception;

public class UnauthorizedException extends BusinessException {
    public UnauthorizedException(String message) {
        super(401, message);
    }
}
