package com.codepath.academy.catalog.api.dto;

import com.codepath.academy.catalog.model.CourseLevel;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * Create or update a course. {@code sourcePath} is the administrator-revisable
 * mapping to a source subject directory (for example 04-JAVA-PROGRAMMING);
 * empty means the course is academy-only and the importer will skip it.
 */
public record CourseWriteRequest(
        @NotNull(message = "is required")
        UUID pathId,

        @NotBlank(message = "is required")
        @Size(max = 140)
        @Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$",
                 message = "must be a lowercase slug (letters, digits, hyphens)")
        String slug,

        @NotBlank(message = "is required")
        @Size(max = 200)
        String title,

        @NotBlank(message = "is required")
        @Size(max = 600)
        String summary,

        @Size(max = 50000)
        String description,

        @NotNull(message = "is required")
        CourseLevel level,

        @Min(0) @Max(10000)
        Integer estimatedHours,

        @Min(0) @Max(100000)
        Integer displayOrder,

        @Size(max = 500)
        String sourcePath) {
}
