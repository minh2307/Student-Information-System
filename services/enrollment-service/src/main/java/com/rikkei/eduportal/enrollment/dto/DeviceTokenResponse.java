package com.rikkei.eduportal.enrollment.dto;

import java.time.LocalDateTime;

public class DeviceTokenResponse {

    private Long id;
    private String token;
    private String platform;
    private String deviceId;
    private Boolean isActive;
    private LocalDateTime registeredAt;

    public DeviceTokenResponse() {}

    public DeviceTokenResponse(Long id, String token, String platform, String deviceId, Boolean isActive, LocalDateTime registeredAt) {
        this.id = id;
        this.token = token;
        this.platform = platform;
        this.deviceId = deviceId;
        this.isActive = isActive;
        this.registeredAt = registeredAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public LocalDateTime getRegisteredAt() { return registeredAt; }
    public void setRegisteredAt(LocalDateTime registeredAt) { this.registeredAt = registeredAt; }
}
