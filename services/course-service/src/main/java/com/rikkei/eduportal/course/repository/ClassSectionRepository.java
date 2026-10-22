package com.rikkei.eduportal.course.repository;

import com.rikkei.eduportal.common.SectionStatus;
import com.rikkei.eduportal.course.entity.ClassSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ClassSectionRepository extends JpaRepository<ClassSection, Long> {

    Optional<ClassSection> findBySectionCode(String sectionCode);

    boolean existsBySectionCode(String sectionCode);

    boolean existsBySectionCodeAndIdNot(String sectionCode, Long id);

    boolean existsByCourseId(Long courseId);

    @Query("SELECT cs FROM ClassSection cs " +
           "WHERE (:semesterName IS NULL OR :semesterName = '' OR cs.semesterName = :semesterName) " +
           "AND (:status IS NULL OR cs.status = :status) " +
           "AND (:keyword IS NULL OR :keyword = '' OR " +
           "     LOWER(cs.sectionCode) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(cs.course.courseCode) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(cs.course.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(cs.lecturer.user.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "     LOWER(cs.roomName) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY cs.semesterName DESC, cs.sectionCode ASC")
    List<ClassSection> searchSections(
            @Param("semesterName") String semesterName,
            @Param("status") SectionStatus status,
            @Param("keyword") String keyword);

    // Kiểm tra trùng phòng học
    @Query("SELECT cs FROM ClassSection cs " +
           "WHERE cs.semesterName = :semesterName " +
           "AND cs.dayOfWeek = :dayOfWeek " +
           "AND LOWER(cs.roomName) = LOWER(:roomName) " +
           "AND cs.status <> 'CANCELLED' " +
           "AND (:excludeId IS NULL OR cs.id <> :excludeId) " +
           "AND (cs.startTime < :endTime AND cs.endTime > :startTime)")
    List<ClassSection> findRoomConflicts(
            @Param("semesterName") String semesterName,
            @Param("dayOfWeek") String dayOfWeek,
            @Param("roomName") String roomName,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludeId") Long excludeId);

    // Kiểm tra trùng lịch giảng viên
    @Query("SELECT cs FROM ClassSection cs " +
           "WHERE cs.semesterName = :semesterName " +
           "AND cs.dayOfWeek = :dayOfWeek " +
           "AND cs.lecturer.id = :lecturerId " +
           "AND cs.status <> 'CANCELLED' " +
           "AND (:excludeId IS NULL OR cs.id <> :excludeId) " +
           "AND (cs.startTime < :endTime AND cs.endTime > :startTime)")
    List<ClassSection> findLecturerConflicts(
            @Param("semesterName") String semesterName,
            @Param("dayOfWeek") String dayOfWeek,
            @Param("lecturerId") Long lecturerId,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludeId") Long excludeId);
}
