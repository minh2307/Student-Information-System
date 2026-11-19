package com.rikkei.eduportal.lecturer.dto.response;

import java.util.List;

public record StudentAttendanceHistoryResponse(
        Long studentId,
        String studentCode,
        String studentName,
        long totalRecords,
        int totalPages,
        int currentPage,
        int pageSize,
        List<StudentAttendanceRecordDto> records
) {}
