package com.codepath.academy.catalog.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * One lesson: an ordered body of Markdown inside a course module.
 *
 * <p>Provenance columns record where the content came from when it was imported
 * ({@code sourceRepository}/{@code sourcePath}/{@code sourceCommit}/{@code sourceHash});
 * {@code contentHash} is the SHA-256 of the stored body and drives edit detection.
 * {@code editedByAdmin} is set whenever an administrator changes the body in the
 * academy — the importer must never silently replace such a lesson (see
 * docs/CONTENT-INTEGRATION.md). Imports always arrive as {@link ContentStatus#DRAFT}.
 */
@Entity
@Table(name = "lesson")
public class Lesson {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "module_id", nullable = false, updatable = false)
    private UUID moduleId;

    @Column(nullable = false, length = 160)
    private String slug;

    @Column(nullable = false, length = 240)
    private String title;

    @Column(length = 600)
    private String summary;

    @Column(name = "body_markdown", nullable = false, columnDefinition = "text")
    private String bodyMarkdown;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ContentStatus status;

    /** SHA-256 of {@link #bodyMarkdown}; recomputed on every body change. */
    @Column(name = "content_hash", nullable = false, length = 64)
    private String contentHash;

    @Column(name = "source_repository", length = 200)
    private String sourceRepository;

    @Column(name = "source_path", length = 500)
    private String sourcePath;

    @Column(name = "source_commit", length = 40)
    private String sourceCommit;

    @Column(name = "source_hash", length = 64)
    private String sourceHash;

    @Column(name = "edited_by_admin", nullable = false)
    private boolean editedByAdmin;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getModuleId() {
        return moduleId;
    }

    public void setModuleId(UUID moduleId) {
        this.moduleId = moduleId;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getBodyMarkdown() {
        return bodyMarkdown;
    }

    public void setBodyMarkdown(String bodyMarkdown) {
        this.bodyMarkdown = bodyMarkdown;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(int displayOrder) {
        this.displayOrder = displayOrder;
    }

    public ContentStatus getStatus() {
        return status;
    }

    public void setStatus(ContentStatus status) {
        this.status = status;
    }

    public String getContentHash() {
        return contentHash;
    }

    public void setContentHash(String contentHash) {
        this.contentHash = contentHash;
    }

    public String getSourceRepository() {
        return sourceRepository;
    }

    public void setSourceRepository(String sourceRepository) {
        this.sourceRepository = sourceRepository;
    }

    public String getSourcePath() {
        return sourcePath;
    }

    public void setSourcePath(String sourcePath) {
        this.sourcePath = sourcePath;
    }

    public String getSourceCommit() {
        return sourceCommit;
    }

    public void setSourceCommit(String sourceCommit) {
        this.sourceCommit = sourceCommit;
    }

    public String getSourceHash() {
        return sourceHash;
    }

    public void setSourceHash(String sourceHash) {
        this.sourceHash = sourceHash;
    }

    public boolean isEditedByAdmin() {
        return editedByAdmin;
    }

    public void setEditedByAdmin(boolean editedByAdmin) {
        this.editedByAdmin = editedByAdmin;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(Instant publishedAt) {
        this.publishedAt = publishedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
