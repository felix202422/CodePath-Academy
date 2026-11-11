package com.codepath.academy.importer.api.dto;

import com.codepath.academy.catalog.model.Lesson;
import com.codepath.academy.importer.model.ContentImport;
import java.util.UUID;

/**
 * Import row plus the comparison an accept/discard decision needs: the
 * lesson's current body next to the staged source version.
 */
public record ImportRowDetailResponse(
        UUID id,
        String sourceRepository,
        String sourcePath,
        String sourceCommit,
        String sourceHash,
        com.codepath.academy.importer.model.ImportStatus status,
        String message,
        UUID targetLessonId,
        String targetLessonTitle,
        UUID importedById,
        java.time.Instant createdAt,
        java.time.Instant resolvedAt,
        boolean hasProposal,
        String currentBody,
        String currentContentHash,
        String proposedBody) {

    public static ImportRowDetailResponse of(ContentImport row, Lesson lesson) {
        ImportRowResponse summary = ImportRowResponse.of(row,
                lesson == null ? null : lesson.getTitle());
        return new ImportRowDetailResponse(
                summary.id(), summary.sourceRepository(), summary.sourcePath(),
                summary.sourceCommit(), summary.sourceHash(), summary.status(),
                summary.message(), summary.targetLessonId(), summary.targetLessonTitle(),
                summary.importedById(), summary.createdAt(), summary.resolvedAt(),
                summary.hasProposal(),
                lesson == null ? null : lesson.getBodyMarkdown(),
                lesson == null ? null : lesson.getContentHash(),
                row.getProposedBody());
    }
}
