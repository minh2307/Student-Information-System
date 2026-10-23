package com.rikkei.eduportal.enrollment.service;

import com.rikkei.eduportal.enrollment.dto.AnnouncementDto;
import com.rikkei.eduportal.enrollment.dto.NotificationDto;
import com.rikkei.eduportal.enrollment.entity.Announcement;
import com.rikkei.eduportal.enrollment.entity.Notification;
import com.rikkei.eduportal.enrollment.entity.User;
import com.rikkei.eduportal.enrollment.repository.AnnouncementRepository;
import com.rikkei.eduportal.enrollment.repository.NotificationRepository;
import com.rikkei.eduportal.enrollment.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AnnouncementAndNotificationService {

    private final AnnouncementRepository announcementRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public AnnouncementAndNotificationService(AnnouncementRepository announcementRepository,
                                             NotificationRepository notificationRepository,
                                             UserRepository userRepository) {
        this.announcementRepository = announcementRepository;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<AnnouncementDto> getAnnouncements(String category) {
        List<Announcement> list;
        if (category != null && !category.trim().isEmpty() && !"ALL".equalsIgnoreCase(category.trim())) {
            list = announcementRepository.findByCategoryOrderByCreatedAtDesc(category.trim());
        } else {
            list = announcementRepository.findAllByOrderByIsPinnedDescCreatedAtDesc();
        }

        return list.stream().map(a -> new AnnouncementDto(
                a.getId(),
                a.getTitle(),
                a.getCategory(),
                a.getContent(),
                a.getAuthor(),
                a.getIsPinned(),
                a.getCreatedAt()
        )).collect(Collectors.toList());
    }

    @Transactional
    public AnnouncementDto createAnnouncement(AnnouncementDto dto) {
        Announcement a = new Announcement();
        a.setTitle(dto.getTitle());
        a.setCategory(dto.getCategory() != null ? dto.getCategory() : "HỌC VỤ");
        a.setContent(dto.getContent());
        a.setAuthor(dto.getAuthor() != null ? dto.getAuthor() : "Phòng Đào tạo");
        a.setIsPinned(Boolean.TRUE.equals(dto.getIsPinned()));
        a.setCreatedAt(LocalDateTime.now());
        a = announcementRepository.save(a);

        return new AnnouncementDto(a.getId(), a.getTitle(), a.getCategory(), a.getContent(), a.getAuthor(), a.getIsPinned(), a.getCreatedAt());
    }

    @Transactional
    public void deleteAnnouncement(Long id) {
        announcementRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> getUserNotifications(String username) {
        User user = resolveUser(username);
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(n -> new NotificationDto(
                        n.getId(),
                        n.getTitle(),
                        n.getMessage(),
                        n.getType(),
                        n.getIsRead(),
                        n.getLinkUrl(),
                        n.getCreatedAt()
                )).collect(Collectors.toList());
    }

    @Transactional
    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setIsRead(true);
            notificationRepository.save(n);
        });
    }

    @Transactional
    public void markAllAsRead(String username) {
        User user = resolveUser(username);
        notificationRepository.markAllAsRead(user.getId());
    }

    private User resolveUser(String username) {
        if (username != null && !username.trim().isEmpty()) {
            var opt = userRepository.findByUsername(username.trim());
            if (opt.isPresent()) return opt.get();
        }
        return userRepository.findByUsername("sv2024001")
                .orElseGet(() -> userRepository.findAll().stream().findFirst().orElseThrow());
    }
}
