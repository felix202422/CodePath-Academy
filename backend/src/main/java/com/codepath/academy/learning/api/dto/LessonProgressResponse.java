package com.codepath.academy.learning.api.dto;

import com.codepath.academy.learning.model.LessonProgress;
import com.codepath.academy.learning.model.LessonProgressStatus;
import java.time.Instant;
import java.util.UUID;

/** Result of recording lesson access or completion. */
public record LessonProgressResponse(
        UUID lessonId,
        String courseSlug,
        LessonProgressStatus status,
        Instant completedAt,
        Instant lastAccessedAt) {

    public static LessonProgressResponse from(LessonProgress progress, String courseSlug) {
        return new LessonProgressResponse(
                progress.getLessonId(),
                courseSlug,
                progress.getStatus(),
                progress.getCompletedAt(),
                progress.getLastAccessedAt());
    }
}
