package com.rikkei.eduportal.enrollment.repository;

import com.rikkei.eduportal.enrollment.entity.Announcement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
    List<Announcement> findAllByOrderByIsPinnedDescCreatedAtDesc();
    List<Announcement> findByCategoryOrderByCreatedAtDesc(String category);
}
