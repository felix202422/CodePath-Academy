package com.codepath.academy.audit.model;

import com.codepath.academy.identity.model.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * One append-only record of an administrative action. Rows are written by
 * {@code AuditInterceptor} over successful /api/v1/admin/** mutations and are
 * never updated or deleted by application code. The actor FK is ON DELETE SET
 * NULL in the baseline, so a removed account leaves an honest orphan row.
 */
@Entity
@Table(name = "audit_log")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** The acting administrator; null if the account was removed later. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id")
    private AppUser actor;

    /** Human-readable action, e.g. {@code POST /api/v1/admin/courses/{id}/status}. */
    @Column(nullable = false, length = 120)
    private String action;

    /** First path segment after /admin, e.g. {@code courses}. */
    @Column(name = "entity_type", nullable = false, length = 80)
    private String entityType;

    /** Path variable UUID when the action targeted one entity, else null. */
    @Column(name = "entity_id", length = 80)
    private String entityId;

    /** Response status and any query string, kept short and client-safe. */
    @Column
    private String details;

    @Column(name = "ip_address", length = 60)
    private String ipAddress;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public AppUser getActor() {
        return actor;
    }

    public void setActor(AppUser actor) {
        this.actor = actor;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getEntityType() {
        return entityType;
    }

    public void setEntityType(String entityType) {
        this.entityType = entityType;
    }

    public String getEntityId() {
        return entityId;
    }

    public void setEntityId(String entityId) {
        this.entityId = entityId;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
