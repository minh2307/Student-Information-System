package com.rikkei.eduportal.auth.dto;

public class AuthResponse {
    private String accessToken;
    private String tokenType = "Bearer";
    private UserDto user;
    private StudentProfileDto studentProfile;
    private LecturerProfileDto lecturerProfile;

    public AuthResponse() {}

    public AuthResponse(String accessToken, UserDto user) {
        this.accessToken = accessToken;
        this.tokenType = "Bearer";
        this.user = user;
    }

    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }

    public String getTokenType() { return tokenType; }
    public void setTokenType(String tokenType) { this.tokenType = tokenType; }

    public UserDto getUser() { return user; }
    public void setUser(UserDto user) { this.user = user; }

    public StudentProfileDto getStudentProfile() { return studentProfile; }
    public void setStudentProfile(StudentProfileDto studentProfile) { this.studentProfile = studentProfile; }

    public LecturerProfileDto getLecturerProfile() { return lecturerProfile; }
    public void setLecturerProfile(LecturerProfileDto lecturerProfile) { this.lecturerProfile = lecturerProfile; }
}
