package com.codepath.academy.identity.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Public self-registration. Deliberately contains no role or status field:
 * every registration creates a PENDING student account, server-side.
 */
public record RegisterRequest(
        @NotBlank @Size(max = 160) String fullName,
        @NotBlank @Email @Size(max = 320) String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @Size(max = 500) String interests
) {}
