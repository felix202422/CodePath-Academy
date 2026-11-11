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
 * One course in the public catalog. Seeded from the audited curriculum source
 * (see V2__seed_public_catalog.sql); the source-aware importer in a later
 * phase attaches reviewed lesson content to these rows.
 */
@Entity
@Table(name = "course")
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "learning_path_id", nullable = false, updatable = false)
    private UUID learningPathId;

    @Column(nullable = false, length = 140)
    private String slug;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 600)
    private String summary;

    @Column
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CourseLevel level;

    @Column(name = "estimated_hours")
    private Integer estimatedHours;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ContentStatus status;

    @Column(name = "source_repository", length = 200)
    private String sourceRepository;

    /** Source subject directory (e.g. 04-JAVA-PROGRAMMING); see V3 migration. */
    @Column(name = "source_path", length = 500)
    private String sourcePath;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

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

    public void setLearningPathId(UUID learningPathId) {
        this.learningPathId = learningPathId;
    }

    public UUID getLearningPathId() {
        return learningPathId;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getSlug() {
        return slug;
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

    public void setDescription(String description) {
        this.description = description;
    }

    public void setLevel(CourseLevel level) {
        this.level = level;
    }

    public void setStatus(ContentStatus status) {
        this.status = status;
    }

    public void setSourceRepository(String sourceRepository) {
        this.sourceRepository = sourceRepository;
    }

    public void setDisplayOrder(int displayOrder) {
        this.displayOrder = displayOrder;
    }

    public void setEstimatedHours(Integer estimatedHours) {
        this.estimatedHours = estimatedHours;
    }

    /** Source subject directory this course maps to; null for academy-only courses. */
    public void setSourcePath(String sourcePath) {
        this.sourcePath = sourcePath;
    }

    public String getSourcePath() {
        return sourcePath;
    }

    public String getDescription() {
        return description;
    }

    public CourseLevel getLevel() {
        return level;
    }

    public Integer getEstimatedHours() {
        return estimatedHours;
    }

    public ContentStatus getStatus() {
        return status;
    }

    public String getSourceRepository() {
        return sourceRepository;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
