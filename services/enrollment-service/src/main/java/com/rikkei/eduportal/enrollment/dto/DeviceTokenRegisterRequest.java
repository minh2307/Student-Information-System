package com.rikkei.eduportal.enrollment.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class DeviceTokenRegisterRequest {

    @NotBlank(message = "FCM device token không được để trống")
    @Size(max = 512, message = "FCM device token không được vượt quá 512 ký tự")
    private String token;

    private String platform = "ANDROID";

    private String deviceId;

    public DeviceTokenRegisterRequest() {}

    public DeviceTokenRegisterRequest(String token, String platform, String deviceId) {
        this.token = token;
        this.platform = platform != null ? platform : "ANDROID";
        this.deviceId = deviceId;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
}
