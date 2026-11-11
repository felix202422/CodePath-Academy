package com.codepath.academy.catalog.api.dto;

import com.codepath.academy.catalog.model.ContentStatus;
import jakarta.validation.constraints.NotNull;

/** Explicit publication-state transition; the service enforces the cascade rules. */
public record StatusChangeRequest(
        @NotNull(message = "is required")
        ContentStatus status) {
}
