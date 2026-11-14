package com.codepath.academy.assessment.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

/**
 * One submission payload: the student's answer per question. The server
 * validates every id against the assessment, grades it, and stores the
 * outcome — nothing here is trusted as correct.
 */
public record SubmitAttemptRequest(
        @NotNull(message = "is required")
        @Valid
        List<AnswerSubmission> answers) {

    /**
     * An answer to a single question: selected option ids for choice
     * questions, free text for short answers. Both fields are optional —
     * omitting a question records it as unanswered.
     */
    public record AnswerSubmission(
            @NotNull(message = "is required")
            UUID questionId,

            List<UUID> optionIds,

            @Size(max = 4000, message = "must be 4000 characters or fewer")
            String answerText) {
    }
}
