package com.codepath.academy.common.error;

import java.time.Instant;

/**
 * Consistent error payload for all API failures. Field errors are keyed by DTO field name
 * so the frontend can attach messages to the right form control.
 */
public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        java.util.Map<String, String> fieldErrors
) {
    public static ApiError of(int status, String error, String message, String path) {
        return new ApiError(Instant.now(), status, error, message, path, java.util.Map.of());
    }

    public static ApiError of(int status, String error, String message, String path,
                              java.util.Map<String, String> fieldErrors) {
        return new ApiError(Instant.now(), status, error, message, path, fieldErrors);
    }
}
