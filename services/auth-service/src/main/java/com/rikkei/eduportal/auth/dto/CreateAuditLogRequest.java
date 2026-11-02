package com.rikkei.eduportal.auth.dto;

import com.rikkei.eduportal.common.AuditDeltaPayload;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;

public class CreateAuditLogRequest {

    @NotBlank(message = "Hành động (action) không được để trống")
    private String action;

    private String actorUsername;
    private String actorRole;

    @NotBlank(message = "Thực thể đích (targetEntity) không được để trống")
    private String targetEntity;

    private String targetId;

    @NotBlank(message = "Tóm tắt (summary) không được để trống")
    private String summary;

    private String oldValue;
    private String newValue;
    private AuditDeltaPayload delta;
    private Map<String, Object> metadata;

    public CreateAuditLogRequest() {}

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getActorUsername() { return actorUsername; }
    public void setActorUsername(String actorUsername) { this.actorUsername = actorUsername; }

    public String getActorRole() { return actorRole; }
    public void setActorRole(String actorRole) { this.actorRole = actorRole; }

    public String getTargetEntity() { return targetEntity; }
    public void setTargetEntity(String targetEntity) { this.targetEntity = targetEntity; }

    public String getTargetId() { return targetId; }
    public void setTargetId(String targetId) { this.targetId = targetId; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getOldValue() { return oldValue; }
    public void setOldValue(String oldValue) { this.oldValue = oldValue; }

    public String getNewValue() { return newValue; }
    public void setNewValue(String newValue) { this.newValue = newValue; }

    public AuditDeltaPayload getDelta() { return delta; }
    public void setDelta(AuditDeltaPayload delta) { this.delta = delta; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
}
