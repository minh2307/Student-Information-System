package com.rikkei.eduportal.enrollment.dto;

import java.time.LocalDateTime;

public class AnnouncementDto {
    private Long id;
    private String title;
    private String category;
    private String content;
    private String author;
    private Boolean isPinned;
    private LocalDateTime createdAt;

    public AnnouncementDto() {}

    public AnnouncementDto(Long id, String title, String category, String content, String author, Boolean isPinned, LocalDateTime createdAt) {
        this.id = id;
        this.title = title;
        this.category = category;
        this.content = content;
        this.author = author;
        this.isPinned = isPinned;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public Boolean getIsPinned() { return isPinned; }
    public void setIsPinned(Boolean isPinned) { this.isPinned = isPinned; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
