package com.codepath.academy.identity.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Self-service password change for the signed-in account. The current password
 * is required so a hijacked session alone cannot silently lock the owner out;
 * no other identity fields (email, role, status) are accepted here.
 */
public record ChangePasswordRequest(
        @NotBlank @Size(max = 72) String currentPassword,
        @NotBlank @Size(min = 8, max = 72) String newPassword
) {}
