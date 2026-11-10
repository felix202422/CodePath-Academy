package com.codepath.academy.identity.api.dto;

import java.util.UUID;

/** The authenticated account as the SPA sees it. Never includes the password hash. */
public record SessionUserResponse(
        UUID id,
        String email,
        String fullName,
        String role,
        String status
) {}
