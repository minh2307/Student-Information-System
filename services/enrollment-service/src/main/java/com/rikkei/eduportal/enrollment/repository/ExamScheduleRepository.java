package com.rikkei.eduportal.enrollment.repository;

import com.rikkei.eduportal.enrollment.entity.ExamSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExamScheduleRepository extends JpaRepository<ExamSchedule, Long> {

    @Query("SELECT es FROM ExamSchedule es " +
           "JOIN es.classSection cs " +
           "JOIN Enrollment e ON e.classSection.id = cs.id " +
           "WHERE e.student.id = :studentId " +
           "AND (:semester IS NULL OR cs.semesterName = :semester) " +
           "AND e.status IN ('REGISTERED', 'COMPLETED') " +
           "ORDER BY es.examDate ASC, es.startTime ASC")
    List<ExamSchedule> findExamSchedulesByStudent(@Param("studentId") Long studentId, @Param("semester") String semester);

    @Query("SELECT es FROM ExamSchedule es " +
           "JOIN es.classSection cs " +
           "WHERE cs.lecturer.id = :lecturerId " +
           "AND (:semester IS NULL OR cs.semesterName = :semester) " +
           "ORDER BY es.examDate ASC, es.startTime ASC")
    List<ExamSchedule> findExamSchedulesByLecturer(@Param("lecturerId") Long lecturerId, @Param("semester") String semester);
}
