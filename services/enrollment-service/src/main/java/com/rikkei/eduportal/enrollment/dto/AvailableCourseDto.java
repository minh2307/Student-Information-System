package com.rikkei.eduportal.enrollment.dto;

public class AvailableCourseDto {
    private Long courseId;
    private String courseCode;
    private String courseName;
    private Integer credits;
    private Long prerequisiteCourseId;
    private String prerequisiteCourseCode;
    private String prerequisiteCourseName;
    private Boolean prerequisiteSatisfied;
    private Boolean alreadyCompleted;
    private Boolean currentlyEnrolled;
    private Boolean hasScheduleConflict;
    private Integer openSectionsCount;

    public AvailableCourseDto() {}

    public Long getCourseId() { return courseId; }
    public void setCourseId(Long courseId) { this.courseId = courseId; }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public String getCourseName() { return courseName; }
    public void setCourseName(String courseName) { this.courseName = courseName; }

    public Integer getCredits() { return credits; }
    public void setCredits(Integer credits) { this.credits = credits; }

    public Long getPrerequisiteCourseId() { return prerequisiteCourseId; }
    public void setPrerequisiteCourseId(Long prerequisiteCourseId) { this.prerequisiteCourseId = prerequisiteCourseId; }

    public String getPrerequisiteCourseCode() { return prerequisiteCourseCode; }
    public void setPrerequisiteCourseCode(String prerequisiteCourseCode) { this.prerequisiteCourseCode = prerequisiteCourseCode; }

    public String getPrerequisiteCourseName() { return prerequisiteCourseName; }
    public void setPrerequisiteCourseName(String prerequisiteCourseName) { this.prerequisiteCourseName = prerequisiteCourseName; }

    public Boolean getPrerequisiteSatisfied() { return prerequisiteSatisfied; }
    public void setPrerequisiteSatisfied(Boolean prerequisiteSatisfied) { this.prerequisiteSatisfied = prerequisiteSatisfied; }

    public Boolean getAlreadyCompleted() { return alreadyCompleted; }
    public void setAlreadyCompleted(Boolean alreadyCompleted) { this.alreadyCompleted = alreadyCompleted; }

    public Boolean getCurrentlyEnrolled() { return currentlyEnrolled; }
    public void setCurrentlyEnrolled(Boolean currentlyEnrolled) { this.currentlyEnrolled = currentlyEnrolled; }

    public Boolean getHasScheduleConflict() { return hasScheduleConflict; }
    public void setHasScheduleConflict(Boolean hasScheduleConflict) { this.hasScheduleConflict = hasScheduleConflict; }

    public Integer getOpenSectionsCount() { return openSectionsCount; }
    public void setOpenSectionsCount(Integer openSectionsCount) { this.openSectionsCount = openSectionsCount; }
}
