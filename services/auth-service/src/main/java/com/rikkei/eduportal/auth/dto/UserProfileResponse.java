package com.rikkei.eduportal.auth.dto;

public class UserProfileResponse {
    private UserDto user;
    private StudentProfileDto studentProfile;
    private LecturerProfileDto lecturerProfile;

    public UserProfileResponse() {}

    public UserProfileResponse(UserDto user, StudentProfileDto studentProfile, LecturerProfileDto lecturerProfile) {
        this.user = user;
        this.studentProfile = studentProfile;
        this.lecturerProfile = lecturerProfile;
    }

    public UserDto getUser() { return user; }
    public void setUser(UserDto user) { this.user = user; }

    public StudentProfileDto getStudentProfile() { return studentProfile; }
    public void setStudentProfile(StudentProfileDto studentProfile) { this.studentProfile = studentProfile; }

    public LecturerProfileDto getLecturerProfile() { return lecturerProfile; }
    public void setLecturerProfile(LecturerProfileDto lecturerProfile) { this.lecturerProfile = lecturerProfile; }
}
