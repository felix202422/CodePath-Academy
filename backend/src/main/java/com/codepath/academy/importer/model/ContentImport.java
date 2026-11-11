package com.codepath.academy.importer.model;

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
 * One source file processed by the importer: repository, commit, path, SHA-256
 * and outcome (docs/CONTENT-INTEGRATION.md behavior 6).
 *
 * <p>For {@link ImportStatus#CONFLICT} rows the staged replacement source sits in
 * {@code proposedBody}; administrators accept it (the row becomes IMPORTED) or
 * discard it (the row becomes UNCHANGED). Either resolution is recorded in
 * {@code resolvedAt}/{@code resolvedBy}.
 */
@Entity
@Table(name = "content_import")
public class ContentImport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "source_repository", nullable = false, length = 200)
    private String sourceRepository;

    @Column(name = "source_commit", nullable = false, length = 40)
    private String sourceCommit;

    @Column(name = "source_path", nullable = false, length = 500)
    private String sourcePath;

    @Column(name = "source_hash", nullable = false, length = 64)
    private String sourceHash;

    @Column(name = "target_lesson_id")
    private UUID targetLessonId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ImportStatus status;

    @Column(length = 2000)
    private String message;

    @Column(name = "imported_by_id")
    private UUID importedById;

    /** Staged source version awaiting review; null unless status is CONFLICT. */
    @Column(name = "proposed_body", columnDefinition = "text")
    private String proposedBody;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "resolved_by_id")
    private UUID resolvedById;

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

    public String getSourceRepository() {
        return sourceRepository;
    }

    public void setSourceRepository(String sourceRepository) {
        this.sourceRepository = sourceRepository;
    }

    public String getSourceCommit() {
        return sourceCommit;
    }

    public void setSourceCommit(String sourceCommit) {
        this.sourceCommit = sourceCommit;
    }

    public String getSourcePath() {
        return sourcePath;
    }

    public void setSourcePath(String sourcePath) {
        this.sourcePath = sourcePath;
    }

    public String getSourceHash() {
        return sourceHash;
    }

    public void setSourceHash(String sourceHash) {
        this.sourceHash = sourceHash;
    }

    public UUID getTargetLessonId() {
        return targetLessonId;
    }

    public void setTargetLessonId(UUID targetLessonId) {
        this.targetLessonId = targetLessonId;
    }

    public ImportStatus getStatus() {
        return status;
    }

    public void setStatus(ImportStatus status) {
        this.status = status;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public UUID getImportedById() {
        return importedById;
    }

    public void setImportedById(UUID importedById) {
        this.importedById = importedById;
    }

    public String getProposedBody() {
        return proposedBody;
    }

    public void setProposedBody(String proposedBody) {
        this.proposedBody = proposedBody;
    }

    public Instant getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(Instant resolvedAt) {
        this.resolvedAt = resolvedAt;
    }

    public UUID getResolvedById() {
        return resolvedById;
    }

    public void setResolvedById(UUID resolvedById) {
        this.resolvedById = resolvedById;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
