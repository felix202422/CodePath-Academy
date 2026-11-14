package com.codepath.academy.assessment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.codepath.academy.assessment.api.dto.AssessmentWriteRequest;
import com.codepath.academy.assessment.api.dto.AssessmentWriteRequest.OptionWriteRequest;
import com.codepath.academy.assessment.api.dto.AssessmentWriteRequest.QuestionWriteRequest;
import com.codepath.academy.assessment.api.dto.AttemptResultResponse;
import com.codepath.academy.assessment.api.dto.AttemptResultResponse.QuestionResult;
import com.codepath.academy.assessment.model.QuestionType;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Locks the assessment JSON contract: boolean record components keep their
 * declared {@code is}-prefixed names (Jackson does not strip them for record
 * components), so the admin authoring payloads and the student result
 * payloads are written exactly as the API documents them.
 */
class AssessmentJsonContractTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void optionWriteRequestKeepsIsCorrectName() throws Exception {
        String json = mapper.writeValueAsString(new OptionWriteRequest("A correct option", true));
        assertEquals("{\"optionText\":\"A correct option\",\"isCorrect\":true}", json);

        OptionWriteRequest parsed = mapper.readValue(
                "{\"optionText\":\"Pick me\",\"isCorrect\":true}", OptionWriteRequest.class);
        assertTrue(parsed.isCorrect());
        assertEquals("Pick me", parsed.optionText());
    }

    @Test
    void questionResultKeepsIsCorrectName() throws Exception {
        UUID questionId = UUID.randomUUID();
        QuestionResult result = new QuestionResult(
                questionId, QuestionType.MULTIPLE_CHOICE, "Prompt?", 2, "Why.",
                List.of(), null, true, 2, List.of(UUID.randomUUID()), null);
        String json = mapper.writeValueAsString(result);
        assertTrue(json.contains("\"isCorrect\":true"),
                "result JSON must expose isCorrect, was: " + json);

        QuestionResult parsed = mapper.readValue(json, QuestionResult.class);
        assertTrue(parsed.isCorrect());
        assertEquals(questionId, parsed.questionId());
    }

    @Test
    void writeRequestRoundTripsTheFullQuestionSet() throws Exception {
        AssessmentWriteRequest request = new AssessmentWriteRequest(
                "Quiz", "Description", 80, 2, 15, 0, null,
                List.of(new QuestionWriteRequest(
                        QuestionType.SHORT_ANSWER, "Name it?", null, "Spring Boot", 3,
                        List.of())));
        AssessmentWriteRequest parsed = mapper.readValue(
                mapper.writeValueAsString(request), AssessmentWriteRequest.class);
        assertEquals("Quiz", parsed.title());
        assertEquals("Spring Boot", parsed.questions().get(0).correctText());
        assertEquals(3, parsed.questions().get(0).points());
    }
}
