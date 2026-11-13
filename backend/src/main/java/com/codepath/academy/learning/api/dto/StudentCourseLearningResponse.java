package com.codepath.academy.learning.api.dto;

import java.util.List;
import java.util.UUID;

/** Enrolled course's published outline and server-computed progress. */
public record StudentCourseLearningResponse(
        UUID courseId,
        String courseSlug,
        String courseTitle,
        String summary,
        String pathName,
        long totalLessonCount,
        long completedLessonCount,
        int progressPercent,
        List<LearningModuleResponse> modules) {
}
