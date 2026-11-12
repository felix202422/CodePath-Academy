package com.codepath.academy.enrollment.api.admin;

import com.codepath.academy.enrollment.api.dto.AdminEnrollmentResponse;
import com.codepath.academy.enrollment.api.dto.EnrollmentReviewRequest;
import com.codepath.academy.enrollment.model.EnrollmentStatus;
import com.codepath.academy.enrollment.service.EnrollmentService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Administrator queue and decisions for course enrollment requests. */
@RestController
@RequestMapping("/api/v1/admin/enrollments")
public class AdminEnrollmentController {

    private final EnrollmentService enrollmentService;

    public AdminEnrollmentController(EnrollmentService enrollmentService) {
        this.enrollmentService = enrollmentService;
    }

    @GetMapping
    public List<AdminEnrollmentResponse> list(
            @RequestParam(required = false) EnrollmentStatus status) {
        return enrollmentService.listForAdmin(status);
    }

    @PostMapping("/{id}/approve")
    public AdminEnrollmentResponse approve(
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) EnrollmentReviewRequest body,
            Authentication authentication) {
        return enrollmentService.approve(id, authentication.getName(), notes(body));
    }

    @PostMapping("/{id}/reject")
    public AdminEnrollmentResponse reject(
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) EnrollmentReviewRequest body,
            Authentication authentication) {
        return enrollmentService.reject(id, authentication.getName(), notes(body));
    }

    private static String notes(EnrollmentReviewRequest body) {
        return body == null ? null : body.notes();
    }
}
