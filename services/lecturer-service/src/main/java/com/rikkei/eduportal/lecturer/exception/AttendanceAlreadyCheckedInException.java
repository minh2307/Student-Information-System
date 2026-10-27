package com.rikkei.eduportal.lecturer.exception;

public class AttendanceAlreadyCheckedInException extends RuntimeException {
    public AttendanceAlreadyCheckedInException(String message) {
        super(message);
    }
}
