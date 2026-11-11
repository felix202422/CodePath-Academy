package com.codepath.academy.catalog.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Create or update a lesson body. On update the service marks the lesson as
 * administrator-edited — the importer may then never silently replace it.
 * {@code displayOrder} is only honoured on create.
 */
public record LessonWriteRequest(
        @NotBlank(message = "is required")
        @Size(max = 160)
        @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$",
                 message = "must be a lowercase slug (letters, digits, hyphens)")
        String slug,

        @NotBlank(message = "is required")
        @Size(max = 240)
        String title,

        @Size(max = 600)
        String summary,

        @NotBlank(message = "is required")
        String bodyMarkdown,

        @Min(0) @Max(100000)
        Integer displayOrder) {
}
