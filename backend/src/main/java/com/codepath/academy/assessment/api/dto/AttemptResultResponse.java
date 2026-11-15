package com.codepath.academy.assessment.api.dto;

import com.codepath.academy.assessment.model.Assessment;
import com.codepath.academy.assessment.model.AssessmentAnswer;
import com.codepath.academy.assessment.model.AssessmentAnswerOption;
import com.codepath.academy.assessment.model.AssessmentAttempt;
import com.codepath.academy.assessment.model.AssessmentOption;
import com.codepath.academy.assessment.model.AssessmentQuestion;
import com.codepath.academy.assessment.model.QuestionType;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The graded result of one submitted attempt: score, pass decision and an
 * honest per-question breakdown with the correct answers and explanations.
 * Built exclusively from stored, server-computed values.
 */
public record AttemptResultResponse(
        UUID attemptId,
        int attemptNumber,
        UUID assessmentId,
        String assessmentTitle,
        Instant startedAt,
        Instant submittedAt,
        int score,
        int maxScore,
        int percent,
        boolean passed,
        int passScorePercent,
        boolean timeExpired,
        List<QuestionResult> questions) {

    /**
     * One question's outcome after grading. The option id lists are paired
     * with parallel text lists in display order so a result screen can show
     * what was actually selected without resolving ids client-side.
     */
    public record QuestionResult(
            UUID questionId,
            QuestionType questionType,
            String prompt,
            int points,
            String explanation,
            List<UUID> yourOptionIds,
            List<String> yourOptionTexts,
            String yourAnswerText,
            boolean isCorrect,
            int pointsAwarded,
            List<UUID> correctOptionIds,
            List<String> correctOptionTexts,
            String correctAnswerText) {
    }

    public static AttemptResultResponse of(Assessment assessment, AssessmentAttempt attempt,
                                           List<AssessmentQuestion> questions,
                                           List<AssessmentOption> options,
                                           List<AssessmentAnswer> answers,
                                           List<AssessmentAnswerOption> answerLinks,
                                           boolean timeExpired) {
        Map<UUID, AssessmentAnswer> answersByQuestion = answers.stream()
                .collect(Collectors.toMap(AssessmentAnswer::getQuestionId, Function.identity()));
        Map<UUID, List<AssessmentOption>> optionsByQuestion = options.stream()
                .collect(Collectors.groupingBy(AssessmentOption::getQuestionId));
        Map<UUID, List<UUID>> selectedByAnswer = answerLinks.stream()
                .collect(Collectors.groupingBy(AssessmentAnswerOption::getAnswerId,
                        Collectors.mapping(AssessmentAnswerOption::getOptionId,
                                Collectors.toList())));

        List<QuestionResult> results = questions.stream()
                .sorted(Comparator.comparingInt(AssessmentQuestion::getDisplayOrder))
                .map(question -> {
                    AssessmentAnswer answer = answersByQuestion.get(question.getId());
                    List<AssessmentOption> questionOptions = optionsByQuestion
                            .getOrDefault(question.getId(), List.of());
                    List<UUID> selected = answer == null ? List.of()
                            : selectedByAnswer.getOrDefault(answer.getId(), List.of());
                    // Both lists follow the stored display order so ids and
                    // texts stay parallel for the result screen.
                    List<UUID> yourOptionIds = questionOptions.stream()
                            .filter(option -> selected.contains(option.getId()))
                            .map(AssessmentOption::getId)
                            .toList();
                    List<String> yourOptionTexts = questionOptions.stream()
                            .filter(option -> selected.contains(option.getId()))
                            .map(AssessmentOption::getOptionText)
                            .toList();
                    List<UUID> correctOptionIds = questionOptions.stream()
                            .filter(AssessmentOption::isCorrect)
                            .map(AssessmentOption::getId)
                            .toList();
                    List<String> correctOptionTexts = questionOptions.stream()
                            .filter(AssessmentOption::isCorrect)
                            .map(AssessmentOption::getOptionText)
                            .toList();
                    boolean shortAnswer = question.getQuestionType() == QuestionType.SHORT_ANSWER;
                    return new QuestionResult(
                            question.getId(), question.getQuestionType(), question.getPrompt(),
                            question.getPoints(), question.getExplanation(),
                            yourOptionIds, yourOptionTexts,
                            answer == null ? null : answer.getAnswerText(),
                            answer != null && Boolean.TRUE.equals(answer.getCorrect()),
                            answer == null ? 0 : answer.getPointsAwarded(),
                            correctOptionIds, correctOptionTexts,
                            shortAnswer ? question.getCorrectText() : null);
                })
                .toList();

        int maxScore = questions.stream().mapToInt(AssessmentQuestion::getPoints).sum();
        int score = answers.stream().mapToInt(AssessmentAnswer::getPointsAwarded).sum();
        boolean passed = maxScore > 0
                && score * 100 >= assessment.getPassScorePercent() * maxScore;
        int percent = maxScore == 0 ? 0 : Math.toIntExact(score * 100L / maxScore);

        return new AttemptResultResponse(
                attempt.getId(), attempt.getAttemptNumber(), assessment.getId(),
                assessment.getTitle(), attempt.getStartedAt(), attempt.getSubmittedAt(),
                score, maxScore, percent, passed, assessment.getPassScorePercent(),
                timeExpired, results);
    }
}
