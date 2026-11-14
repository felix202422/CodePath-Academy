package com.codepath.academy.assessment.api.dto;

import com.codepath.academy.assessment.model.QuestionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

/**
 * Create or update an assessment: metadata plus an optional full question
 * set. Omitting {@code questions} on update leaves the existing set untouched;
 * supplying it replaces the whole set (only allowed before the first attempt).
 */
public record AssessmentWriteRequest(
        @NotBlank(message = "is required")
        @Size(max = 240)
        String title,

        @Size(max = 2000)
        String description,

        @Min(value = 0, message = "must be between 0 and 100")
        @Max(value = 100, message = "must be between 0 and 100")
        Integer passScorePercent,

        @Min(value = 1, message = "must be at least 1")
        Integer maxAttempts,

        @Min(value = 1, message = "must be at least 1")
        Integer timeLimitMinutes,

        @Min(value = 0, message = "must be 0 or greater")
        Integer displayOrder,

        UUID moduleId,

        @Valid
        @Size(max = 50)
        List<QuestionWriteRequest> questions) {

    /** One authored question with its options and (for short answers) its key. */
    public record QuestionWriteRequest(
            @NotNull(message = "is required")
            QuestionType questionType,

            @NotBlank(message = "is required")
            @Size(max = 10000)
            String prompt,

            @Size(max = 4000)
            String explanation,

            /** Required for SHORT_ANSWER questions; ignored for other types. */
            @Size(max = 4000)
            String correctText,

            @NotNull(message = "is required")
            @Min(value = 1, message = "must be at least 1")
            @Max(value = 1000, message = "must be 1000 or less")
            Integer points,

            @Valid
            @Size(max = 20)
            List<OptionWriteRequest> options) {
    }

    /** One answer option; {@code isCorrect} drives server-side grading. */
    public record OptionWriteRequest(
            @NotBlank(message = "is required")
            @Size(max = 4000)
            String optionText,

            boolean isCorrect) {
    }
}
