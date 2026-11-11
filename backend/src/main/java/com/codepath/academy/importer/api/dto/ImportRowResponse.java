package com.codepath.academy.importer.api.dto;

import com.codepath.academy.importer.model.ContentImport;
import com.codepath.academy.importer.model.ImportStatus;
import java.time.Instant;
import java.util.UUID;

/** One import ledger row for the review list. */
public record ImportRowResponse(
        UUID id,
        String sourceRepository,
        String sourcePath,
        String sourceCommit,
        String sourceHash,
        ImportStatus status,
        String message,
        UUID targetLessonId,
        String targetLessonTitle,
        UUID importedById,
        Instant createdAt,
        Instant resolvedAt,
        /** True when a staged source version is waiting for review. */
        boolean hasProposal) {

    public static ImportRowResponse of(ContentImport row, String targetLessonTitle) {
        return new ImportRowResponse(
                row.getId(), row.getSourceRepository(), row.getSourcePath(),
                row.getSourceCommit(), row.getSourceHash(), row.getStatus(),
                row.getMessage(), row.getTargetLessonId(), targetLessonTitle,
                row.getImportedById(), row.getCreatedAt(), row.getResolvedAt(),
                row.getProposedBody() != null);
    }
}
