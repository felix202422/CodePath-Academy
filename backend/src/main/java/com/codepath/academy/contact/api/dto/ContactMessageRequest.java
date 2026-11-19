package com.codepath.academy.contact.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Public contact-form payload. Length limits match the V6 columns so
 * validation failures return field errors before any database write.
 */
public record ContactMessageRequest(
        @NotBlank @Size(max = 160) String name,
        @NotBlank @Email @Size(max = 320) String email,
        @NotBlank @Size(max = 200) String subject,
        @NotBlank @Size(max = 4000) String message
) {}
