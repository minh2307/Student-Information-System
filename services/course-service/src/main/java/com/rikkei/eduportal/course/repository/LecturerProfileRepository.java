package com.rikkei.eduportal.course.repository;

import com.rikkei.eduportal.course.entity.LecturerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LecturerProfileRepository extends JpaRepository<LecturerProfile, Long> {

    Optional<LecturerProfile> findByLecturerCode(String lecturerCode);

    @Query("SELECT lp FROM LecturerProfile lp JOIN FETCH lp.user u WHERE u.status = 'ACTIVE' ORDER BY u.fullName ASC")
    List<LecturerProfile> findAllActiveWithUser();
}
