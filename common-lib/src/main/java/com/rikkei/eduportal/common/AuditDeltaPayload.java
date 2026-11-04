package com.rikkei.eduportal.common;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Standard JSON Delta payload structure for audit_logs table.
 * Cấu trúc JSON Delta tiêu chuẩn cho bảng audit_logs.
 * Ghi nhận chi tiết thay đổi dữ liệu theo từng trường (Field-level diff)
 * phục vụ kiểm toán học vụ và hiển thị giao diện đối soát Visual Diff trên ReactJS.
 * Hỗ trợ đồng thời cả 2 quy chuẩn API: addDiff(...) và addFieldDiff(...).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuditDeltaPayload implements Serializable {

    private String entity;
    private String entityId;
    private List<String> changedFields = new ArrayList<>();
    private Map<String, FieldDiff> diff = new LinkedHashMap<>();
    private Map<String, Object> metadata = new LinkedHashMap<>();

    public AuditDeltaPayload() {}

    public AuditDeltaPayload(String entity, String entityId) {
        this.entity = entity;
        this.entityId = entityId;
    }

    public static class FieldDiff implements Serializable {
        @JsonProperty("from")
        @JsonAlias({"before", "oldValue"})
        private Object from;

        @JsonProperty("to")
        @JsonAlias({"after", "newValue"})
        private Object to;

        public FieldDiff() {}

        public FieldDiff(Object from, Object to) {
            this.from = from;
            this.to = to;
        }

        public Object getFrom() { return from; }
        public void setFrom(Object from) { this.from = from; }

        public Object getTo() { return to; }
        public void setTo(Object to) { this.to = to; }

        // Alias getters & setters for 'before' and 'after' compatibility
        public Object getBefore() { return from; }
        public void setBefore(Object before) { this.from = before; }

        public Object getAfter() { return to; }
        public void setAfter(Object after) { this.to = after; }
    }

    /**
     * Phương thức thêm chênh lệch dữ liệu (addDiff) - chuẩn audit log.
     */
    public AuditDeltaPayload addDiff(String field, Object fromValue, Object toValue) {
        if (field != null && !field.isBlank()) {
            String trimmed = field.trim();
            if (!this.changedFields.contains(trimmed)) {
                this.changedFields.add(trimmed);
            }
            this.diff.put(trimmed, new FieldDiff(fromValue, toValue));
        }
        return this;
    }

    /**
     * Phương thức tương thích (addFieldDiff) cho các module gọi addFieldDiff.
     */
    public AuditDeltaPayload addFieldDiff(String fieldName, Object oldValue, Object newValue) {
        return addDiff(fieldName, oldValue, newValue);
    }

    public AuditDeltaPayload addMetadata(String key, Object value) {
        if (key != null && !key.isBlank()) {
            this.metadata.put(key.trim(), value);
        }
        return this;
    }

    public String getEntity() { return entity; }
    public void setEntity(String entity) { this.entity = entity; }

    public String getEntityId() { return entityId; }
    public void setEntityId(String entityId) { this.entityId = entityId; }

    public List<String> getChangedFields() { return changedFields; }
    public void setChangedFields(List<String> changedFields) { this.changedFields = changedFields; }

    public Map<String, FieldDiff> getDiff() { return diff; }
    public void setDiff(Map<String, FieldDiff> diff) { this.diff = diff; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
}
