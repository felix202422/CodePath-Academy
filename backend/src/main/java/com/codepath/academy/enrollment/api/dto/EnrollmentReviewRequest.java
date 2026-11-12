package com.codepath.academy.enrollment.api.dto;

import jakarta.validation.constraints.Size;

/** Optional administrator note attached to an enrollment decision. */
public record EnrollmentReviewRequest(
        @Size(max = 1000, message = "must be at most 1000 characters")
        String notes) {
}
