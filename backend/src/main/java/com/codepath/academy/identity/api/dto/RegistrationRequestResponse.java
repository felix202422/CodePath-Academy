package com.codepath.academy.identity.api.dto;

import java.time.Instant;
import java.util.UUID;

/** Admin view of a registration request, including the applicant's account. */
public record RegistrationRequestResponse(
        UUID id,
        UUID userId,
        String email,
        String fullName,
        String status,
        String interests,
        Instant createdAt,
        String reviewNotes,
        Instant reviewedAt
) {}
