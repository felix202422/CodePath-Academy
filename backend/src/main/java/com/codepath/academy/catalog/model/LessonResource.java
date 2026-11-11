package com.codepath.academy.catalog.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * A file a lesson points at. The importer writes one row per image it copied
 * into academy-managed media storage so learning does not depend on the source
 * repository being reachable (docs/ARCHITECTURE.md).
 */
@Entity
@Table(name = "lesson_resource")
public class LessonResource {

    public enum Kind {
        IMAGE,
        FILE,
        LINK,
        VIDEO
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "lesson_id", nullable = false, updatable = false)
    private UUID lessonId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Kind kind;

    @Column(nullable = false, length = 240)
    private String title;

    /** Stable academy URL (for example /media/assets/diagram.svg) or external URL. */
    @Column(nullable = false, length = 1000)
    private String location;

    @Column(name = "mime_type", length = 120)
    private String mimeType;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(length = 64)
    private String checksum;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getLessonId() {
        return lessonId;
    }

    public void setLessonId(UUID lessonId) {
        this.lessonId = lessonId;
    }

    public Kind getKind() {
        return kind;
    }

    public void setKind(Kind kind) {
        this.kind = kind;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getMimeType() {
        return mimeType;
    }

    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }

    public Long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(Long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    public String getChecksum() {
        return checksum;
    }

    public void setChecksum(String checksum) {
        this.checksum = checksum;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
