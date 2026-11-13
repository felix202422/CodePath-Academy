package com.codepath.academy.learning.api.dto;

import java.time.Instant;
import java.util.UUID;

/** One approved course's real lesson totals and continue target. */
public record StudentCourseProgressResponse(
        UUID courseId,
        String courseSlug,
        String courseTitle,
        String summary,
        String pathName,
        long totalLessonCount,
        long completedLessonCount,
        int progressPercent,
        UUID continueLessonId,
        String continueLessonTitle,
        Instant lastAccessedAt) {
}
