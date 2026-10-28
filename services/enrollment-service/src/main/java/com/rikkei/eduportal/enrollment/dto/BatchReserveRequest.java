package com.rikkei.eduportal.enrollment.dto;

import java.util.ArrayList;
import java.util.List;

public class BatchReserveRequest {
    private List<Long> sectionIds = new ArrayList<>();

    public BatchReserveRequest() {}

    public BatchReserveRequest(List<Long> sectionIds) {
        this.sectionIds = sectionIds != null ? sectionIds : new ArrayList<>();
    }

    public List<Long> getSectionIds() { return sectionIds; }
    public void setSectionIds(List<Long> sectionIds) { this.sectionIds = sectionIds; }
}
