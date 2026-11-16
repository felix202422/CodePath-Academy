package com.codepath.academy.announcement.api.dto;

import com.codepath.academy.announcement.model.AnnouncementAudience;
import java.time.Instant;
import java.util.UUID;

/**
 * Student feed view. Only PUBLISHED announcements that are visible to this
 * student (platform-wide, or course-scoped with an approved enrollment) are
 * ever mapped to this shape.
 */
public record AnnouncementResponse(
        UUID id,
        String title,
        String bodyMarkdown,
        AnnouncementAudience audience,
        UUID courseId,
        String courseTitle,
        Instant publishedAt
) {}
