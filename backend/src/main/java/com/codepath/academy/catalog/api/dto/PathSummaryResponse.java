package com.codepath.academy.catalog.api.dto;

import java.util.UUID;

/** Learning-path card with its published course count. */
public record PathSummaryResponse(
        UUID id,
        String slug,
        String name,
        String summary,
        String accentColor,
        int courseCount) {
}
