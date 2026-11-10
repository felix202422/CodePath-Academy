package com.codepath.academy.catalog.api.dto;

import com.codepath.academy.catalog.model.CourseLevel;
import java.util.UUID;

/** Course card as shown in the catalog and path listings. */
public record CourseSummaryResponse(
        UUID id,
        String slug,
        String title,
        String summary,
        CourseLevel level,
        String pathSlug,
        String pathName) {
}
