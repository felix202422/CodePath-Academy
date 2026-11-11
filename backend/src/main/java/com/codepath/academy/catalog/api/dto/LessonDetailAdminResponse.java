package com.codepath.academy.catalog.api.dto;

import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.Lesson;
import java.time.Instant;
import java.util.UUID;

/** Full lesson for administrators, including the editable Markdown body. */
public record LessonDetailAdminResponse(
        UUID id,
        UUID moduleId,
        String slug,
        String title,
        String summary,
        int displayOrder,
        ContentStatus status,
        boolean editedByAdmin,
        Instant publishedAt,
        String sourcePath,
        Instant updatedAt,
        String bodyMarkdown,
        String contentHash,
        String sourceRepository,
        String sourceCommit,
        String sourceHash,
        Instant createdAt) {

    public static LessonDetailAdminResponse of(Lesson lesson) {
        return new LessonDetailAdminResponse(
                lesson.getId(), lesson.getModuleId(), lesson.getSlug(), lesson.getTitle(),
                lesson.getSummary(), lesson.getDisplayOrder(), lesson.getStatus(),
                lesson.isEditedByAdmin(), lesson.getPublishedAt(), lesson.getSourcePath(),
                lesson.getUpdatedAt(), lesson.getBodyMarkdown(), lesson.getContentHash(),
                lesson.getSourceRepository(), lesson.getSourceCommit(), lesson.getSourceHash(),
                lesson.getCreatedAt());
    }
}
