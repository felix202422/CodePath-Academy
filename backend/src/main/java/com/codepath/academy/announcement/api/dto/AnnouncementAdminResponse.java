package com.codepath.academy.announcement.api.dto;

import com.codepath.academy.announcement.model.AnnouncementAudience;
import com.codepath.academy.catalog.model.ContentStatus;
import java.time.Instant;
import java.util.UUID;

/** Administrator view of one announcement, including drafts and archives. */
public record AnnouncementAdminResponse(
        UUID id,
        String title,
        String bodyMarkdown,
        AnnouncementAudience audience,
        ContentStatus status,
        UUID courseId,
        String courseTitle,
        String createdByEmail,
        Instant publishedAt,
        Instant createdAt,
        Instant updatedAt
) {}
