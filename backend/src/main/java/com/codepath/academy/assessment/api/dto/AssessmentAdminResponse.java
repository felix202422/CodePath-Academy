package com.codepath.academy.assessment.api.dto;

import com.codepath.academy.assessment.model.Assessment;
import com.codepath.academy.assessment.model.QuestionType;
import com.codepath.academy.catalog.model.ContentStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Administrator list view of one assessment with real counts. */
public record AssessmentAdminResponse(
        UUID id,
        UUID courseId,
        UUID moduleId,
        String title,
        String description,
        int passScorePercent,
        int maxAttempts,
        Integer timeLimitMinutes,
        int displayOrder,
        ContentStatus status,
        long questionCount,
        long attemptCount,
        Instant updatedAt) {

    public static AssessmentAdminResponse of(Assessment assessment, long questionCount,
                                             long attemptCount) {
        return new AssessmentAdminResponse(
                assessment.getId(), assessment.getCourseId(), assessment.getModuleId(),
                assessment.getTitle(), assessment.getDescription(),
                assessment.getPassScorePercent(), assessment.getMaxAttempts(),
                assessment.getTimeLimitMinutes(), assessment.getDisplayOrder(),
                assessment.getStatus(), questionCount, attemptCount,
                assessment.getUpdatedAt());
    }
}
