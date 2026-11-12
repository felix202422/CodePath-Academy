package com.codepath.academy.enrollment.api.dto;

import com.codepath.academy.enrollment.model.CourseEnrollment;
import com.codepath.academy.enrollment.model.EnrollmentStatus;
import java.time.Instant;
import java.util.UUID;

/** Administrator queue/history row, including the applicant identity. */
public record AdminEnrollmentResponse(
        UUID id,
        UUID courseId,
        String courseSlug,
        String courseTitle,
        UUID studentId,
        String studentName,
        String studentEmail,
        EnrollmentStatus status,
        Instant requestedAt,
        Instant reviewedAt,
        String reviewNotes) {

    public static AdminEnrollmentResponse from(CourseEnrollment enrollment) {
        return new AdminEnrollmentResponse(
                enrollment.getId(),
                enrollment.getCourse().getId(),
                enrollment.getCourse().getSlug(),
                enrollment.getCourse().getTitle(),
                enrollment.getStudent().getId(),
                enrollment.getStudent().getFullName(),
                enrollment.getStudent().getEmail(),
                enrollment.getStatus(),
                enrollment.getRequestedAt(),
                enrollment.getReviewedAt(),
                enrollment.getReviewNotes());
    }
}
