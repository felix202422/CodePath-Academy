package com.codepath.academy.catalog.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Create or update a course module. */
public record ModuleWriteRequest(
        @NotBlank(message = "is required")
        @Size(max = 200)
        String title,

        @Size(max = 600)
        String summary,

        @Min(0) @Max(100000)
        Integer displayOrder,

        @Size(max = 500)
        String sourcePath) {
}
