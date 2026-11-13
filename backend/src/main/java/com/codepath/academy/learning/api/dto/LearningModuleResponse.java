package com.codepath.academy.learning.api.dto;

import java.util.List;
import java.util.UUID;

/** Published module and its ordered published lessons. */
public record LearningModuleResponse(
        UUID id,
        String title,
        String summary,
        int displayOrder,
        List<LearningLessonSummaryResponse> lessons) {
}
