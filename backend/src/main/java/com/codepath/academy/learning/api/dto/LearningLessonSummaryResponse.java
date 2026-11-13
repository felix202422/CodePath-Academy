package com.codepath.academy.learning.api.dto;

import com.codepath.academy.learning.model.LessonProgressStatus;
import java.time.Instant;
import java.util.UUID;

/** Published lesson metadata and this student's progress for the course outline. */
public record LearningLessonSummaryResponse(
        UUID id,
        String slug,
        String title,
        String summary,
        int displayOrder,
        LessonProgressStatus progressStatus,
        Instant completedAt) {
}
