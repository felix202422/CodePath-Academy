package com.codepath.academy.assessment.api.admin;

import com.codepath.academy.assessment.api.dto.AssessmentAdminResponse;
import com.codepath.academy.assessment.api.dto.AssessmentDetailAdminResponse;
import com.codepath.academy.assessment.api.dto.AssessmentWriteRequest;
import com.codepath.academy.assessment.service.AdminAssessmentService;
import com.codepath.academy.catalog.api.dto.StatusChangeRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Administrator authoring of assessments: metadata, the question set and
 * explicit publication transitions. Route rules in SecurityConfig require
 * ROLE_ADMIN for /api/v1/admin/**; all cascade, structure and attempt-lock
 * rules live in {@link AdminAssessmentService}.
 */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminAssessmentController {

    private final AdminAssessmentService assessmentService;

    public AdminAssessmentController(AdminAssessmentService assessmentService) {
        this.assessmentService = assessmentService;
    }

    @GetMapping("/courses/{courseId}/assessments")
    public List<AssessmentAdminResponse> assessments(@PathVariable UUID courseId) {
        return assessmentService.listAssessments(courseId);
    }

    @PostMapping("/courses/{courseId}/assessments")
    @ResponseStatus(HttpStatus.CREATED)
    public AssessmentAdminResponse createAssessment(@PathVariable UUID courseId,
                                                    @Valid @RequestBody AssessmentWriteRequest request) {
        return assessmentService.createAssessment(courseId, request);
    }

    @GetMapping("/assessments/{id}")
    public AssessmentDetailAdminResponse assessment(@PathVariable UUID id) {
        return assessmentService.getAssessment(id);
    }

    @PutMapping("/assessments/{id}")
    public AssessmentAdminResponse updateAssessment(@PathVariable UUID id,
                                                    @Valid @RequestBody AssessmentWriteRequest request) {
        return assessmentService.updateAssessment(id, request);
    }

    @PostMapping("/assessments/{id}/status")
    public AssessmentAdminResponse changeStatus(@PathVariable UUID id,
                                                @Valid @RequestBody StatusChangeRequest request) {
        return assessmentService.changeStatus(id, request);
    }

    @DeleteMapping("/assessments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAssessment(@PathVariable UUID id) {
        assessmentService.deleteAssessment(id);
    }
}
