package com.codepath.academy.audit.api.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * One audit-trail row for the administrator's audit page. The actor's email
 * and name are resolved at read time; a removed account renders as null.
 */
public record AuditEntryResponse(
        UUID id,
        String action,
        String entityType,
        String entityId,
        String details,
        String ipAddress,
        UUID actorId,
        String actorEmail,
        String actorName,
        Instant createdAt
) {}
