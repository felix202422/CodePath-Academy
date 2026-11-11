package com.codepath.academy.catalog.api.dto;

import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.Lesson;
import java.time.Instant;
import java.util.UUID;

/** Administrator list view of a lesson (body intentionally omitted). */
public record LessonAdminResponse(
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
        Instant updatedAt) {

    public static LessonAdminResponse of(Lesson lesson) {
        return new LessonAdminResponse(
                lesson.getId(), lesson.getModuleId(), lesson.getSlug(), lesson.getTitle(),
                lesson.getSummary(), lesson.getDisplayOrder(), lesson.getStatus(),
                lesson.isEditedByAdmin(), lesson.getPublishedAt(), lesson.getSourcePath(),
                lesson.getUpdatedAt());
    }
}
