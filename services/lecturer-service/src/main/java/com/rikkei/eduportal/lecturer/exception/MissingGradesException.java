package com.rikkei.eduportal.lecturer.exception;

import java.util.List;

/**
 * 400 khi lock-grades nhưng vẫn có SV chưa đủ điểm.
 */
public class MissingGradesException extends RuntimeException {

    private final List<String> missingStudents;

    public MissingGradesException(String message, List<String> missingStudents) {
        super(message);
        this.missingStudents = missingStudents;
    }

    public List<String> getMissingStudents() {
        return missingStudents;
    }
}
