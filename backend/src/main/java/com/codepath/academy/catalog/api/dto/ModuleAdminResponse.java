package com.codepath.academy.catalog.api.dto;

import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.CourseModule;
import java.time.Instant;
import java.util.UUID;

/** Administrator view of one course module with its real lesson counts. */
public record ModuleAdminResponse(
        UUID id,
        UUID courseId,
        String title,
        String summary,
        int displayOrder,
        ContentStatus status,
        String sourcePath,
        long lessonCount,
        long publishedLessonCount,
        Instant updatedAt) {

    public static ModuleAdminResponse of(CourseModule module, long lessonCount,
                                         long publishedLessonCount) {
        return new ModuleAdminResponse(
                module.getId(), module.getCourseId(), module.getTitle(), module.getSummary(),
                module.getDisplayOrder(), module.getStatus(), module.getSourcePath(),
                lessonCount, publishedLessonCount, module.getUpdatedAt());
    }
}
