package com.codepath.academy.catalog.api.dto;

import java.util.List;
import java.util.UUID;

/** Learning-path detail with the published courses it contains. */
public record PathDetailResponse(
        UUID id,
        String slug,
        String name,
        String summary,
        String description,
        String accentColor,
        List<CourseSummaryResponse> courses) {
}
