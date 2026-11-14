package com.codepath.academy.assessment.api.dto;

import com.codepath.academy.assessment.model.AssessmentAttempt;
import com.codepath.academy.assessment.model.AssessmentQuestion;
import com.codepath.academy.assessment.model.AssessmentOption;
import com.codepath.academy.assessment.model.QuestionType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * The taking view of one assessment: rules plus questions. Correctness,
 * explanations and the short-answer key are stripped — grading happens only
 * on submit, on the server.
 */
public record StudentAssessmentAttemptResponse(
        UUID assessmentId,
        String title,
        String description,
        int passScorePercent,
        int maxAttempts,
        Integer timeLimitMinutes,
        UUID attemptId,
        int attemptNumber,
        Instant startedAt,
        List<QuestionResponse> questions) {

    public static StudentAssessmentAttemptResponse of(
            com.codepath.academy.assessment.model.Assessment assessment,
            AssessmentAttempt attempt,
            List<AssessmentQuestion> questions,
            List<AssessmentOption> options) {
        List<QuestionResponse> questionResponses = questions.stream()
                .map(question -> new QuestionResponse(
                        question.getId(),
                        question.getQuestionType(),
                        question.getPrompt(),
                        question.getPoints(),
                        options.stream()
                                .filter(option -> option.getQuestionId().equals(question.getId()))
                                .map(option -> new OptionResponse(
                                        option.getId(), option.getOptionText()))
                                .toList()))
                .toList();
        return new StudentAssessmentAttemptResponse(
                assessment.getId(), assessment.getTitle(), assessment.getDescription(),
                assessment.getPassScorePercent(), assessment.getMaxAttempts(),
                assessment.getTimeLimitMinutes(),
                attempt.getId(), attempt.getAttemptNumber(), attempt.getStartedAt(),
                questionResponses);
    }

    /** One question with its selectable options only — never the answer key. */
    public record QuestionResponse(
            UUID id,
            QuestionType questionType,
            String prompt,
            int points,
            List<OptionResponse> options) {
    }

    /** One selectable option; students pick by id. */
    public record OptionResponse(
            UUID id,
            String optionText) {
    }
}
