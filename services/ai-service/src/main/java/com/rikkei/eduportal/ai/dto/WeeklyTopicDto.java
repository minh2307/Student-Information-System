package com.rikkei.eduportal.ai.dto;

public class WeeklyTopicDto {
    private int week;
    private String topic;
    private String contents;
    private String teachingMethod;
    private String assessment;

    public WeeklyTopicDto() {
    }

    public WeeklyTopicDto(int week, String topic, String contents, String teachingMethod, String assessment) {
        this.week = week;
        this.topic = topic;
        this.contents = contents;
        this.teachingMethod = teachingMethod;
        this.assessment = assessment;
    }

    public int getWeek() {
        return week;
    }

    public void setWeek(int week) {
        this.week = week;
    }

    public String getTopic() {
        return topic;
    }

    public void setTopic(String topic) {
        this.topic = topic;
    }

    public String getContents() {
        return contents;
    }

    public void setContents(String contents) {
        this.contents = contents;
    }

    public String getTeachingMethod() {
        return teachingMethod;
    }

    public void setTeachingMethod(String teachingMethod) {
        this.teachingMethod = teachingMethod;
    }

    public String getAssessment() {
        return assessment;
    }

    public void setAssessment(String assessment) {
        this.assessment = assessment;
    }
}
