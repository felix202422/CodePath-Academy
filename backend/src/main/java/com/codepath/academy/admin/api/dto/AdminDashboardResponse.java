package com.codepath.academy.admin.api.dto;

import com.codepath.academy.audit.api.dto.AuditEntryResponse;
import java.util.List;

/**
 * Real aggregates for the administrator home screen. Every number is a live
 * count — no placeholder values — so the queue sizes an admin acts on are the
 * same rows the queue endpoints return.
 */
public record AdminDashboardResponse(
        long pendingRegistrations,
        long pendingEnrollments,
        long activeStudents,
        long suspendedStudents,
        long publishedCourses,
        long publishedPaths,
        long publishedAnnouncements,
        List<AuditEntryResponse> recentAudit
) {}
