package com.rikkei.eduportal.common;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Standard JSON Delta payload structure for audit_logs table.
 * Field-level diff tracking for academic audit trail and ReactJS Visual Diff reconciliation.
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

    public void addFieldDiff(String fieldName, Object oldValue, Object newValue) {
        addDiff(fieldName, oldValue, newValue);
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

    public static class FieldDiff implements Serializable {
        private Object from;
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

        public Object getBefore() { return from; }
        public void setBefore(Object before) { this.from = before; }

        public Object getAfter() { return to; }
        public void setAfter(Object after) { this.to = after; }
    }
}
