package com.codepath.academy.catalog.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Create or update a learning path. Status changes go through
 * {@code POST /paths/{id}/status} so every transition is an explicit action.
 */
public record PathWriteRequest(
        @NotBlank(message = "is required")
        @Size(max = 120)
        @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$",
                 message = "must be a lowercase slug (letters, digits, hyphens)")
        String slug,

        @NotBlank(message = "is required")
        @Size(max = 160)
        String name,

        @NotBlank(message = "is required")
        @Size(max = 500)
        String summary,

        @Size(max = 10000)
        String description,

        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "must be a hex color such as #4f46e5")
        String accentColor,

        @Min(0) @Max(100000)
        Integer displayOrder) {
}
