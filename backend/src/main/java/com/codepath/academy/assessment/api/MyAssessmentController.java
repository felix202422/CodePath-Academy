package com.codepath.academy.assessment.api;

import com.codepath.academy.assessment.api.dto.AttemptResultResponse;
import com.codepath.academy.assessment.api.dto.StudentAssessmentAttemptResponse;
import com.codepath.academy.assessment.api.dto.StudentAssessmentListResponse;
import com.codepath.academy.assessment.api.dto.SubmitAttemptRequest;
import com.codepath.academy.assessment.service.AssessmentService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Approved-enrollment assessment APIs for the signed-in student: list,
 * start/resume an attempt, submit for server-side grading, and read graded
 * results. Route rules in SecurityConfig require ROLE_STUDENT.
 */
@RestController
@RequestMapping("/api/v1/me/assessments")
public class MyAssessmentController {

    private final AssessmentService assessmentService;

    public MyAssessmentController(AssessmentService assessmentService) {
        this.assessmentService = assessmentService;
    }

    @GetMapping
    public List<StudentAssessmentListResponse> assessments(Authentication authentication) {
        return assessmentService.listAssessments(authentication.getName());
    }

    /** Starts a new attempt or resumes the in-progress one (idempotent). */
    @PostMapping("/{assessmentId}/attempts")
    public StudentAssessmentAttemptResponse startAttempt(
            @PathVariable UUID assessmentId, Authentication authentication) {
        return assessmentService.startOrResumeAttempt(authentication.getName(), assessmentId);
    }

    /** Grades this attempt on the server and returns the scored result. */
    @PostMapping("/attempts/{attemptId}/submit")
    public AttemptResultResponse submitAttempt(@PathVariable UUID attemptId,
                                               @Valid @RequestBody SubmitAttemptRequest request,
                                               Authentication authentication) {
        return assessmentService.submitAttempt(
                authentication.getName(), attemptId, request);
    }

    /** Graded results for one of this student's own submitted attempts. */
    @GetMapping("/attempts/{attemptId}")
    public AttemptResultResponse attemptResult(@PathVariable UUID attemptId,
                                               Authentication authentication) {
        return assessmentService.attemptResult(authentication.getName(), attemptId);
    }
}
