package com.codepath.academy.announcement.model;

import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.identity.model.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * One administrator-authored announcement. {@code courseId == null} makes it
 * platform-wide; otherwise only students with an APPROVED enrollment in that
 * course ever see it. Publication follows the shared DRAFT → PUBLISHED →
 * ARCHIVED lifecycle and students only read PUBLISHED rows.
 */
@Entity
@Table(name = "announcement")
public class Announcement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 240)
    private String title;

    @Column(name = "body_markdown", nullable = false)
    private String bodyMarkdown;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AnnouncementAudience audience = AnnouncementAudience.STUDENTS;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ContentStatus status = ContentStatus.DRAFT;

    /** {@code null} means platform-wide; a value scopes visibility to a course. */
    @Column(name = "course_id")
    private UUID courseId;

    /** Set when the announcement first (and most recently) entered PUBLISHED. */
    @Column(name = "published_at")
    private Instant publishedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private AppUser createdBy;

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

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getBodyMarkdown() {
        return bodyMarkdown;
    }

    public void setBodyMarkdown(String bodyMarkdown) {
        this.bodyMarkdown = bodyMarkdown;
    }

    public AnnouncementAudience getAudience() {
        return audience;
    }

    public void setAudience(AnnouncementAudience audience) {
        this.audience = audience;
    }

    public ContentStatus getStatus() {
        return status;
    }

    public void setStatus(ContentStatus status) {
        this.status = status;
    }

    public UUID getCourseId() {
        return courseId;
    }

    public void setCourseId(UUID courseId) {
        this.courseId = courseId;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public void setPublishedAt(Instant publishedAt) {
        this.publishedAt = publishedAt;
    }

    public AppUser getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(AppUser createdBy) {
        this.createdBy = createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
