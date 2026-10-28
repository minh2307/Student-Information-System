package com.rikkei.eduportal.enrollment.dto;

import java.util.ArrayList;
import java.util.List;

public class SchedulePlanOption {
    private int planIndex;
    private String title;
    private int matchPercentage;
    private int totalCredits;
    private int studyDaysCount;
    private List<String> studyDays = new ArrayList<>();
    private List<String> highlights = new ArrayList<>();
    private List<ClassSectionDto> sections = new ArrayList<>();

    public SchedulePlanOption() {}

    public SchedulePlanOption(int planIndex, String title, int matchPercentage, int totalCredits,
                              int studyDaysCount, List<String> studyDays, List<String> highlights,
                              List<ClassSectionDto> sections) {
        this.planIndex = planIndex;
        this.title = title;
        this.matchPercentage = matchPercentage;
        this.totalCredits = totalCredits;
        this.studyDaysCount = studyDaysCount;
        this.studyDays = studyDays != null ? studyDays : new ArrayList<>();
        this.highlights = highlights != null ? highlights : new ArrayList<>();
        this.sections = sections != null ? sections : new ArrayList<>();
    }

    public int getPlanIndex() { return planIndex; }
    public void setPlanIndex(int planIndex) { this.planIndex = planIndex; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public int getMatchPercentage() { return matchPercentage; }
    public void setMatchPercentage(int matchPercentage) { this.matchPercentage = matchPercentage; }

    public int getTotalCredits() { return totalCredits; }
    public void setTotalCredits(int totalCredits) { this.totalCredits = totalCredits; }

    public int getStudyDaysCount() { return studyDaysCount; }
    public void setStudyDaysCount(int studyDaysCount) { this.studyDaysCount = studyDaysCount; }

    public List<String> getStudyDays() { return studyDays; }
    public void setStudyDays(List<String> studyDays) { this.studyDays = studyDays; }

    public List<String> getHighlights() { return highlights; }
    public void setHighlights(List<String> highlights) { this.highlights = highlights; }

    public List<ClassSectionDto> getSections() { return sections; }
    public void setSections(List<ClassSectionDto> sections) { this.sections = sections; }
}
