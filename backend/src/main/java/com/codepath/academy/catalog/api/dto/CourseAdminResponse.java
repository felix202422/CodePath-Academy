package com.codepath.academy.catalog.api.dto;

import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.Course;
import com.codepath.academy.catalog.model.CourseLevel;
import java.time.Instant;
import java.util.UUID;

/**
 * Administrator view of a course. Counts come from real database queries and
 * separate total from published numbers so the publish state is visible.
 */
public record CourseAdminResponse(
        UUID id,
        UUID pathId,
        String pathSlug,
        String pathName,
        String slug,
        String title,
        String summary,
        String description,
        CourseLevel level,
        Integer estimatedHours,
        int displayOrder,
        ContentStatus status,
        String sourceRepository,
        String sourcePath,
        long moduleCount,
        long lessonCount,
        long publishedModuleCount,
        long publishedLessonCount,
        Instant updatedAt) {

    public static CourseAdminResponse of(Course course, String pathSlug, String pathName,
                                         long moduleCount, long lessonCount,
                                         long publishedModuleCount, long publishedLessonCount) {
        return new CourseAdminResponse(
                course.getId(), course.getLearningPathId(), pathSlug, pathName,
                course.getSlug(), course.getTitle(), course.getSummary(), course.getDescription(),
                course.getLevel(), course.getEstimatedHours(), course.getDisplayOrder(),
                course.getStatus(), course.getSourceRepository(), course.getSourcePath(),
                moduleCount, lessonCount, publishedModuleCount, publishedLessonCount,
                course.getUpdatedAt());
    }
}
