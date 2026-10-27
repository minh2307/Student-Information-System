package com.rikkei.eduportal.lecturer.exception;

import com.rikkei.eduportal.common.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<?>> handleNotFound(ResourceNotFoundException ex) {
        log.error("ResourceNotFound: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(404, ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<?>> handleAccessDenied(AccessDeniedException ex) {
        log.error("AccessDenied: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(403, ex.getMessage()));
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ApiResponse<?>> handleSpringSecurityAccessDenied(org.springframework.security.access.AccessDeniedException ex) {
        log.error("SpringSecurityAccessDenied: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(403, "Forbidden: " + ex.getMessage()));
    }

    @ExceptionHandler(GradeLockedConflictException.class)
    public ResponseEntity<ApiResponse<?>> handleLocked(GradeLockedConflictException ex) {
        log.error("GradeLocked: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(409, ex.getMessage()));
    }

    @ExceptionHandler(AttendanceAlreadyCheckedInException.class)
    public ResponseEntity<ApiResponse<?>> handleAlreadyCheckedIn(AttendanceAlreadyCheckedInException ex) {
        log.warn("AttendanceAlreadyCheckedIn: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(409, ex.getMessage()));
    }

    @ExceptionHandler(InvalidQrException.class)
    public ResponseEntity<ApiResponse<?>> handleInvalidQr(InvalidQrException ex) {
        log.warn("InvalidQr: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(400, ex.getMessage()));
    }

    @ExceptionHandler(MissingGradesException.class)
    public ResponseEntity<ApiResponse<Map<String, Object>>> handleMissingGrades(MissingGradesException ex) {
        log.error("MissingGrades: {}", ex.getMessage());
        Map<String, Object> data = new HashMap<>();
        data.put("missingStudents", ex.getMissingStudents());
        ApiResponse<Map<String, Object>> body =
                new ApiResponse<>(400, ex.getMessage(), data);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, List<String>>>> handleValidation(
            MethodArgumentNotValidException ex) {
        Map<String, List<String>> errors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(Collectors.groupingBy(
                        fe -> fe.getField(),
                        Collectors.mapping(fe -> fe.getDefaultMessage(), Collectors.toList())
                ));
        ApiResponse<Map<String, List<String>>> body =
                new ApiResponse<>(400, "Validation failed", errors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<?>> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(500, "Internal server error"));
    }
}
