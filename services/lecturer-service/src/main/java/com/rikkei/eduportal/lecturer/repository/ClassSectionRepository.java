package com.rikkei.eduportal.lecturer.repository;

import com.rikkei.eduportal.lecturer.entity.ClassSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ClassSectionRepository extends JpaRepository<ClassSection, Long> {

    /**
     * Lấy tất cả lớp của giảng viên, JOIN FETCH course để tránh N+1.
     * Filter semester tuỳ chọn — nếu semesterName null thì bỏ qua điều kiện.
     */
    @Query("""
        SELECT cs FROM ClassSection cs
        JOIN FETCH cs.course c
        JOIN FETCH cs.lecturer lp
        WHERE lp.id = :lecturerId
          AND (:semesterName IS NULL OR cs.semesterName = :semesterName)
        ORDER BY cs.semesterName DESC, cs.dayOfWeek, cs.startTime
        """)
    List<ClassSection> findByLecturerIdAndSemester(
            @Param("lecturerId") Long lecturerId,
            @Param("semesterName") String semesterName);

    /**
     * Kiểm tra ownership: lớp có thuộc giảng viên này không.
     */
    @Query("""
        SELECT cs FROM ClassSection cs
        JOIN FETCH cs.course c
        JOIN FETCH cs.lecturer lp
        WHERE cs.id = :sectionId AND lp.id = :lecturerId
        """)
    Optional<ClassSection> findByIdAndLecturerId(
            @Param("sectionId") Long sectionId,
            @Param("lecturerId") Long lecturerId);
}
