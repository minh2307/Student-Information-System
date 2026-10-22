package com.rikkei.eduportal.lecturer.exception;

public class GradeLockedConflictException extends RuntimeException {
    public GradeLockedConflictException(String message) {
        super(message);
    }
}
