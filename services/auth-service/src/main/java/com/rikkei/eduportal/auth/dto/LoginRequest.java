package com.rikkei.eduportal.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public class LoginRequest {

    @NotBlank(message = "Username không được để trống")
    private String username;

    @NotBlank(message = "Password không được để trống")
    private String password;

    @JsonProperty("cf-turnstile-response")
    private String cfTurnstileResponse;

    private String turnstileToken;

    private String challengeToken;

    private String challengeSolution;

    private String clientType;

    public LoginRequest() {}

    public LoginRequest(String username, String password) {
        this.username = username;
        this.password = password;
    }

    public LoginRequest(String username, String password, String turnstileToken) {
        this.username = username;
        this.password = password;
        this.turnstileToken = turnstileToken;
    }

    public LoginRequest(String username, String password, String challengeToken, String challengeSolution, String clientType) {
        this.username = username;
        this.password = password;
        this.challengeToken = challengeToken;
        this.challengeSolution = challengeSolution;
        this.clientType = clientType;
    }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getCfTurnstileResponse() { return cfTurnstileResponse; }
    public void setCfTurnstileResponse(String cfTurnstileResponse) { this.cfTurnstileResponse = cfTurnstileResponse; }

    public String getTurnstileToken() {
        if (turnstileToken != null && !turnstileToken.trim().isEmpty()) {
            return turnstileToken.trim();
        }
        if (cfTurnstileResponse != null && !cfTurnstileResponse.trim().isEmpty()) {
            return cfTurnstileResponse.trim();
        }
        return null;
    }

    public void setTurnstileToken(String turnstileToken) { this.turnstileToken = turnstileToken; }

    public String getChallengeToken() { return challengeToken; }
    public void setChallengeToken(String challengeToken) { this.challengeToken = challengeToken; }

    public String getChallengeSolution() { return challengeSolution; }
    public void setChallengeSolution(String challengeSolution) { this.challengeSolution = challengeSolution; }

    public String getClientType() { return clientType; }
    public void setClientType(String clientType) { this.clientType = clientType; }
}
