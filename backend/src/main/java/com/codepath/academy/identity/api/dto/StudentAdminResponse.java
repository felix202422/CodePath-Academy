package com.codepath.academy.identity.api.dto;

import com.codepath.academy.identity.model.UserStatus;
import java.time.Instant;
import java.util.UUID;

/** Administrator view of one student account. */
public record StudentAdminResponse(
        UUID id,
        String email,
        String fullName,
        UserStatus status,
        String interests,
        Instant createdAt
) {}
