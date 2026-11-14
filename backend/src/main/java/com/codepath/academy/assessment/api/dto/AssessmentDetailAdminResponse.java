package com.codepath.academy.assessment.api.dto;

import com.codepath.academy.assessment.model.Assessment;
import com.codepath.academy.assessment.model.AssessmentQuestion;
import com.codepath.academy.assessment.model.QuestionType;
import com.codepath.academy.catalog.model.ContentStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Administrator authoring view of one assessment: metadata, real counts and
 * the full question set including correctness — never returned to students.
 */
public record AssessmentDetailAdminResponse(
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
        Instant updatedAt,
        List<QuestionAdminResponse> questions) {

    public static AssessmentDetailAdminResponse of(Assessment assessment,
                                                   List<QuestionAdminResponse> questions,
                                                   long questionCount,
                                                   long attemptCount) {
        return new AssessmentDetailAdminResponse(
                assessment.getId(), assessment.getCourseId(), assessment.getModuleId(),
                assessment.getTitle(), assessment.getDescription(),
                assessment.getPassScorePercent(), assessment.getMaxAttempts(),
                assessment.getTimeLimitMinutes(), assessment.getDisplayOrder(),
                assessment.getStatus(), questionCount, attemptCount,
                assessment.getUpdatedAt(), questions);
    }

    /** One authored question with its options and answer key. */
    public record QuestionAdminResponse(
            UUID id,
            QuestionType questionType,
            String prompt,
            String explanation,
            String correctText,
            int points,
            int displayOrder,
            List<OptionAdminResponse> options) {

        public static QuestionAdminResponse of(AssessmentQuestion question,
                                               List<OptionAdminResponse> options) {
            return new QuestionAdminResponse(
                    question.getId(), question.getQuestionType(), question.getPrompt(),
                    question.getExplanation(), question.getCorrectText(), question.getPoints(),
                    question.getDisplayOrder(), options);
        }
    }

    /** One option including whether it is the correct answer. */
    public record OptionAdminResponse(
            UUID id,
            String optionText,
            boolean correct,
            int displayOrder) {
    }
}
