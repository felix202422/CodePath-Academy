package com.codepath.academy.catalog.api.dto;

import com.codepath.academy.catalog.model.CourseLevel;
import java.util.List;
import java.util.UUID;

/**
 * Full public course detail. Module/lesson counts are real database counts;
 * zero content means the importer has not delivered lessons yet.
 */
public record CourseDetailResponse(
        UUID id,
        String slug,
        String title,
        String summary,
        String description,
        CourseLevel level,
        String pathSlug,
        String pathName,
        String sourceRepository,
        long enrollmentCount,
        long moduleCount,
        long lessonCount,
        List<CourseSummaryResponse> prerequisites) {
}
