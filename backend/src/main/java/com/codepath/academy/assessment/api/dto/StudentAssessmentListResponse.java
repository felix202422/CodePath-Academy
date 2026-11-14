package com.codepath.academy.assessment.api.dto;

import com.codepath.academy.assessment.model.Assessment;
import com.codepath.academy.assessment.model.AssessmentAttempt;
import com.codepath.academy.assessment.model.AttemptStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * One published assessment as seen by an enrolled student, with this
 * student's real attempt history. Correct answers are never included here.
 */
public record StudentAssessmentListResponse(
        UUID id,
        UUID courseId,
        String courseSlug,
        String courseTitle,
        UUID moduleId,
        String title,
        String description,
        int passScorePercent,
        int maxAttempts,
        Integer timeLimitMinutes,
        int questionCount,
        int attemptsUsed,
        int bestScore,
        int bestMaxScore,
        boolean passed,
        UUID inProgressAttemptId,
        List<AttemptSummary> attempts) {

    public static StudentAssessmentListResponse of(Assessment assessment,
                                                   String courseSlug,
                                                   String courseTitle,
                                                   int questionCount,
                                                   List<AssessmentAttempt> attempts) {
        List<AttemptSummary> summaries = attempts.stream().map(AttemptSummary::of).toList();
        int attemptsUsed = attempts.size();
        int bestScore = attempts.stream()
                .map(a -> a.getScore() == null ? 0 : a.getScore())
                .mapToInt(Integer::intValue).max().orElse(0);
        int bestMaxScore = attempts.stream()
                .map(a -> a.getMaxScore() == null ? 0 : a.getMaxScore())
                .mapToInt(Integer::intValue).max().orElse(0);
        boolean passed = attempts.stream().anyMatch(a -> Boolean.TRUE.equals(a.getPassed()));
        UUID inProgress = attempts.stream()
                .filter(a -> a.getStatus() == AttemptStatus.IN_PROGRESS)
                .map(AssessmentAttempt::getId)
                .findFirst()
                .orElse(null);
        return new StudentAssessmentListResponse(
                assessment.getId(), assessment.getCourseId(), courseSlug, courseTitle,
                assessment.getModuleId(), assessment.getTitle(), assessment.getDescription(),
                assessment.getPassScorePercent(), assessment.getMaxAttempts(),
                assessment.getTimeLimitMinutes(), questionCount, attemptsUsed,
                bestScore, bestMaxScore, passed, inProgress, summaries);
    }

    /** One attempt's stored outcome; scores stay null until graded. */
    public record AttemptSummary(
            UUID attemptId,
            int attemptNumber,
            AttemptStatus status,
            Instant startedAt,
            Instant submittedAt,
            Integer score,
            Integer maxScore,
            Boolean passed) {

        public static AttemptSummary of(AssessmentAttempt attempt) {
            return new AttemptSummary(
                    attempt.getId(), attempt.getAttemptNumber(), attempt.getStatus(),
                    attempt.getStartedAt(), attempt.getSubmittedAt(),
                    attempt.getScore(), attempt.getMaxScore(), attempt.getPassed());
        }
    }
}
