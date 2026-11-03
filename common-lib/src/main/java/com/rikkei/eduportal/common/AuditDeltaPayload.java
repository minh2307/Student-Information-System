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

    public void addFieldDiff(String fieldName, Object oldValue, Object newValue) {
        if (!changedFields.contains(fieldName)) {
            changedFields.add(fieldName);
        }
        diff.put(fieldName, new FieldDiff(oldValue, newValue));
    }

    public void addMetadata(String key, Object value) {
        this.metadata.put(key, value);
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
        private Object before;
        private Object after;

        public FieldDiff() {}

        public FieldDiff(Object before, Object after) {
            this.before = before;
            this.after = after;
        }

        public Object getBefore() { return before; }
        public void setBefore(Object before) { this.before = before; }

        public Object getAfter() { return after; }
        public void setAfter(Object after) { this.after = after; }
    }
}
