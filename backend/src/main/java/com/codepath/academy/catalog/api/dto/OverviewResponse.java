package com.codepath.academy.catalog.api.dto;

import java.util.List;

/**
 * Homepage payload: published catalog counts, path cards with course counts,
 * and the first courses in curriculum order ("start here").
 */
public record OverviewResponse(
        int pathCount,
        int courseCount,
        List<PathSummaryResponse> paths,
        List<CourseSummaryResponse> startHere) {
}
