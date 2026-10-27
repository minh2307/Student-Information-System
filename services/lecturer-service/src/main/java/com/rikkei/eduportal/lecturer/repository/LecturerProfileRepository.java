package com.rikkei.eduportal.lecturer.repository;

import com.rikkei.eduportal.lecturer.entity.LecturerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface LecturerProfileRepository extends JpaRepository<LecturerProfile, Long> {

    @Query("SELECT lp FROM LecturerProfile lp JOIN FETCH lp.user u WHERE u.username = :username")
    Optional<LecturerProfile> findByUsername(@Param("username") String username);

    default Optional<LecturerProfile> findByUserUsername(String username) {
        return findByUsername(username);
    }
}
