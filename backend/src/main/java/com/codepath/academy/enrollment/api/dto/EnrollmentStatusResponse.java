package com.codepath.academy.enrollment.api.dto;

import com.codepath.academy.enrollment.model.CourseEnrollment;
import com.codepath.academy.enrollment.model.EnrollmentStatus;
import java.time.Instant;
import java.util.UUID;

/**
 * The current student's request for one course. A null {@code status} means
 * the active student has not requested enrollment yet.
 */
public record EnrollmentStatusResponse(
        UUID courseId,
        EnrollmentStatus status,
        Instant requestedAt,
        Instant reviewedAt,
        String reviewNotes) {

    public static EnrollmentStatusResponse notRequested(UUID courseId) {
        return new EnrollmentStatusResponse(courseId, null, null, null, null);
    }

    public static EnrollmentStatusResponse from(CourseEnrollment enrollment) {
        return new EnrollmentStatusResponse(
                enrollment.getCourse().getId(),
                enrollment.getStatus(),
                enrollment.getRequestedAt(),
                enrollment.getReviewedAt(),
                enrollment.getReviewNotes());
    }
}
