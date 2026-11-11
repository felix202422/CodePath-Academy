package com.codepath.academy.catalog.api.dto;

import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.LearningPath;
import java.time.Instant;
import java.util.UUID;

/** Administrator view of a learning path, including unpublished rows. */
public record PathAdminResponse(
        UUID id,
        String slug,
        String name,
        String summary,
        String description,
        String accentColor,
        int displayOrder,
        ContentStatus status,
        long courseCount,
        Instant updatedAt) {

    public static PathAdminResponse from(LearningPath path, long courseCount) {
        return new PathAdminResponse(
                path.getId(), path.getSlug(), path.getName(), path.getSummary(),
                path.getDescription(), path.getAccentColor(), path.getDisplayOrder(),
                path.getStatus(), courseCount, path.getUpdatedAt());
    }
}
