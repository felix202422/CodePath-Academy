package com.codepath.academy.enrollment.api.dto;

import com.codepath.academy.enrollment.model.CourseEnrollment;
import com.codepath.academy.enrollment.model.EnrollmentStatus;
import java.time.Instant;
import java.util.UUID;

/** One row in the signed-in student's own enrollment history. */
public record MyEnrollmentResponse(
        UUID id,
        UUID courseId,
        String courseSlug,
        String courseTitle,
        EnrollmentStatus status,
        Instant requestedAt,
        Instant reviewedAt,
        String reviewNotes) {

    public static MyEnrollmentResponse from(CourseEnrollment enrollment) {
        return new MyEnrollmentResponse(
                enrollment.getId(),
                enrollment.getCourse().getId(),
                enrollment.getCourse().getSlug(),
                enrollment.getCourse().getTitle(),
                enrollment.getStatus(),
                enrollment.getRequestedAt(),
                enrollment.getReviewedAt(),
                enrollment.getReviewNotes());
    }
}
