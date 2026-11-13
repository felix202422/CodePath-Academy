package com.codepath.academy.learning.api.dto;

import com.codepath.academy.learning.model.LessonProgressStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Full lesson reader payload, returned only for a student's approved course. */
public record StudentLessonResponse(
        UUID id,
        String slug,
        String title,
        String summary,
        String bodyMarkdown,
        int displayOrder,
        UUID courseId,
        String courseSlug,
        String courseTitle,
        UUID moduleId,
        String moduleTitle,
        LessonProgressStatus progressStatus,
        Instant completedAt,
        UUID previousLessonId,
        UUID nextLessonId,
        List<LearningResourceResponse> resources) {
}
