package com.rikkei.eduportal.enrollment.dto;

import jakarta.validation.constraints.NotBlank;

public class DeviceTokenRevokeRequest {

    @NotBlank(message = "FCM device token không được để trống")
    private String token;

    public DeviceTokenRevokeRequest() {}

    public DeviceTokenRevokeRequest(String token) {
        this.token = token;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
}
