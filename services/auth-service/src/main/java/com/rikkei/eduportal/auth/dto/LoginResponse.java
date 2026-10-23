package com.rikkei.eduportal.auth.dto;

public class LoginResponse {

    private UserDto user;
    private String accessToken;

    public LoginResponse() {}

    public LoginResponse(UserDto user, String accessToken) {
        this.user = user;
        this.accessToken = accessToken;
    }

    public UserDto getUser() { return user; }
    public void setUser(UserDto user) { this.user = user; }

    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }

    public static class UserDto {
        private Long id;
        private String username;
        private String fullName;
        private String role;
        private String avatarUrl;

        public UserDto() {}

        public UserDto(Long id, String username, String fullName, String role, String avatarUrl) {
            this.id = id;
            this.username = username;
            this.fullName = fullName;
            this.role = role;
            this.avatarUrl = avatarUrl;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }

        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }

        public String getAvatarUrl() { return avatarUrl; }
        public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    }
}
