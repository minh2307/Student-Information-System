package com.rikkei.eduportal.auth.repository;

import com.rikkei.eduportal.auth.entity.LecturerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LecturerProfileRepository extends JpaRepository<LecturerProfile, Long> {

    Optional<LecturerProfile> findByUserId(Long userId);

    Optional<LecturerProfile> findByLecturerCode(String lecturerCode);

    boolean existsByLecturerCode(String lecturerCode);

    void deleteByUserId(Long userId);
}
