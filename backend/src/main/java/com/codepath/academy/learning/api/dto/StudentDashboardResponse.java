package com.codepath.academy.learning.api.dto;

import java.util.List;

/** Server-derived student dashboard totals across approved courses only. */
public record StudentDashboardResponse(
        int enrolledCourseCount,
        long totalLessonCount,
        long completedLessonCount,
        int progressPercent,
        List<StudentCourseProgressResponse> courses) {
}
