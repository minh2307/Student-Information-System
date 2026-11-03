package com.rikkei.eduportal.enrollment.dto;

public class ClassSectionDto {
    private Long id;
    private String sectionCode;
    private String courseCode;
    private String courseName;
    private Integer credits;
    private Integer weeklyHours;
    private String dayOfWeek;
    private String startTime;
    private String endTime;
    private String roomName;
    private Integer maxCapacity;
    private Integer currentEnrolled;
    private String lecturerName;
    private String status;
    private Boolean isEnrolled = false;
    private Boolean isCompleted = false;
    private String enrollmentStatus;
    private Long enrollmentId;
    private Boolean hasConflict = false;

    // Real-time slot reservation fields (EDUP-203, EDUP-204)
    private Integer reservedCount = 0;
    private Integer availableSeats;
    private Boolean isReservedByMe = false;
    private Long myReservationRemainingSeconds;
    private Long myReservationId;

    public ClassSectionDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSectionCode() { return sectionCode; }
    public void setSectionCode(String sectionCode) { this.sectionCode = sectionCode; }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    public Integer getCredits() { return credits; }
    public void setCredits(Integer credits) { this.credits = credits; }

    public Integer getWeeklyHours() { return weeklyHours; }
    public void setWeeklyHours(Integer weeklyHours) { this.weeklyHours = weeklyHours; }

    public String getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(String dayOfWeek) { this.dayOfWeek = dayOfWeek; }

    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }

    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }

    public String getRoomName() { return roomName; }
    public void setRoomName(String roomName) { this.roomName = roomName; }

    public Integer getMaxCapacity() { return maxCapacity; }
    public void setMaxCapacity(Integer maxCapacity) { this.maxCapacity = maxCapacity; }

    public Integer getCurrentEnrolled() { return currentEnrolled; }
    public void setCurrentEnrolled(Integer currentEnrolled) { this.currentEnrolled = currentEnrolled; }

    public String getLecturerName() { return lecturerName; }
    public void setLecturerName(String lecturerName) { this.lecturerName = lecturerName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getIsEnrolled() { return isEnrolled; }
    public void setIsEnrolled(Boolean isEnrolled) { this.isEnrolled = isEnrolled; }

    public Boolean getIsCompleted() { return isCompleted; }
    public void setIsCompleted(Boolean isCompleted) { this.isCompleted = isCompleted; }

    public String getEnrollmentStatus() { return enrollmentStatus; }
    public void setEnrollmentStatus(String enrollmentStatus) { this.enrollmentStatus = enrollmentStatus; }

    public Long getEnrollmentId() { return enrollmentId; }
    public void setEnrollmentId(Long enrollmentId) { this.enrollmentId = enrollmentId; }

    public Boolean getHasConflict() { return hasConflict; }
    public void setHasConflict(Boolean hasConflict) { this.hasConflict = hasConflict; }

    public Integer getReservedCount() { return reservedCount; }
    public void setReservedCount(Integer reservedCount) { this.reservedCount = reservedCount; }

    public Integer getAvailableSeats() { return availableSeats; }
    public void setAvailableSeats(Integer availableSeats) { this.availableSeats = availableSeats; }

    public Boolean getIsReservedByMe() { return isReservedByMe; }
    public void setIsReservedByMe(Boolean isReservedByMe) { this.isReservedByMe = isReservedByMe; }

    public Long getMyReservationRemainingSeconds() { return myReservationRemainingSeconds; }
    public void setMyReservationRemainingSeconds(Long myReservationRemainingSeconds) { this.myReservationRemainingSeconds = myReservationRemainingSeconds; }

    public Long getMyReservationId() { return myReservationId; }
    public void setMyReservationId(Long myReservationId) { this.myReservationId = myReservationId; }
}
