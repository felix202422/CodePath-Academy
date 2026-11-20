package com.codepath.academy.common.error;

import org.springframework.http.HttpStatus;

/**
 * Domain-level failure carrying an HTTP status and a client-safe message.
 * Use this instead of throwing raw runtime exceptions from services.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String error;
    private final java.util.Map<String, String> fieldErrors;

    public ApiException(HttpStatus status, String error, String message) {
        this(status, error, message, java.util.Map.of());
    }

    /**
     * Failure scoped to specific request fields (for example a wrong current
     * password) so the SPA can attach the message to the right form control.
     */
    public ApiException(HttpStatus status, String error, String message,
                        java.util.Map<String, String> fieldErrors) {
        super(message);
        this.status = status;
        this.error = error;
        this.fieldErrors = java.util.Map.copyOf(fieldErrors);
    }

    public static ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, "Not found", message);
    }

    public static ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "Bad request", message);
    }

    public static ApiException conflict(String message) {
        return new ApiException(HttpStatus.CONFLICT, "Conflict", message);
    }

    public static ApiException forbidden(String message) {
        return new ApiException(HttpStatus.FORBIDDEN, "Access denied", message);
    }

    public HttpStatus status() {
        return status;
    }

    public String error() {
        return error;
    }

    public java.util.Map<String, String> fieldErrors() {
        return fieldErrors;
    }
}
