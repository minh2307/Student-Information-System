package com.rikkei.eduportal.lecturer.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "email_dispatch_logs")
public class EmailDispatchLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipient_email", nullable = false, length = 150)
    private String recipientEmail;

    @Column(name = "recipient_name", length = 100)
    private String recipientName;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "subject", nullable = false, length = 255)
    private String subject;

    @Column(name = "type", length = 50)
    private String type; // EARLY_WARNING, LECTURER_MESSAGE, ANNOUNCEMENT

    @Column(name = "status", nullable = false, length = 20)
    private String status; // SENT, FAILED, RETRYING

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public EmailDispatchLog() {}

    public EmailDispatchLog(String recipientEmail, String recipientName, Long userId,
                            String subject, String type, String status, String errorMessage) {
        this.recipientEmail = recipientEmail;
        this.recipientName = recipientName;
        this.userId = userId;
        this.subject = subject;
        this.type = type;
        this.status = status;
        this.errorMessage = errorMessage;
        this.sentAt = "SENT".equals(status) ? LocalDateTime.now() : null;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRecipientEmail() { return recipientEmail; }
    public void setRecipientEmail(String recipientEmail) { this.recipientEmail = recipientEmail; }

    public String getRecipientName() { return recipientName; }
    public void setRecipientName(String recipientName) { this.recipientName = recipientName; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public LocalDateTime getSentAt() { return sentAt; }
    public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
