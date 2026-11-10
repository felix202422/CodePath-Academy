package com.codepath.academy.common.error;

import org.springframework.http.HttpStatus;

/**
 * Domain-level failure carrying an HTTP status and a client-safe message.
 * Use this instead of throwing raw runtime exceptions from services.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String error;

    public ApiException(HttpStatus status, String error, String message) {
        super(message);
        this.status = status;
        this.error = error;
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
}
