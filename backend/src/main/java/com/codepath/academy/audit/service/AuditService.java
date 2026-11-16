package com.codepath.academy.audit.service;

import com.codepath.academy.audit.api.dto.AuditEntryResponse;
import com.codepath.academy.audit.model.AuditLog;
import com.codepath.academy.audit.repository.AuditLogRepository;
import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.repository.AppUserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Writes and reads the append-only administrative audit trail. Writes happen
 * from {@code AuditInterceptor} after a successful /api/v1/admin/** mutation;
 * application code never updates or deletes an existing row.
 */
@Service
public class AuditService {

    private static final int DEFAULT_LIMIT = 50;
    private static final int MAX_LIMIT = 200;

    private final AuditLogRepository auditLogRepository;
    private final AppUserRepository userRepository;

    public AuditService(AuditLogRepository auditLogRepository, AppUserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    /**
     * Record one completed administrative action. The actor is resolved by
     * email so a removed account simply leaves a null actor on the row.
     */
    @Transactional
    public void record(String actorEmail, String action, String entityType, String entityId,
                       String details, String ipAddress) {
        AuditLog entry = new AuditLog();
        if (actorEmail != null && !actorEmail.isBlank()) {
            userRepository.findByEmailNormalized(AppUser.normalizeEmail(actorEmail))
                    .ifPresent(entry::setActor);
        }
        entry.setAction(truncate(action, 120));
        entry.setEntityType(truncate(entityType, 80));
        entry.setEntityId(truncate(entityId, 80));
        entry.setDetails(details);
        entry.setIpAddress(truncate(ipAddress, 60));
        auditLogRepository.save(entry);
    }

    /** Newest-first audit page, optionally narrowed to one entity type. */
    @Transactional(readOnly = true)
    public List<AuditEntryResponse> recent(String entityType, Integer limit) {
        int pageSize = limit == null ? DEFAULT_LIMIT : Math.min(Math.max(limit, 1), MAX_LIMIT);
        List<AuditLog> entries = entityType == null || entityType.isBlank()
                ? auditLogRepository.findRecent(PageRequest.of(0, pageSize))
                : auditLogRepository.findRecentByEntityType(entityType.trim(),
                        PageRequest.of(0, pageSize));
        return entries.stream().map(AuditService::toResponse).toList();
    }

    private static AuditEntryResponse toResponse(AuditLog entry) {
        AppUser actor = entry.getActor();
        return new AuditEntryResponse(
                entry.getId(),
                entry.getAction(),
                entry.getEntityType(),
                entry.getEntityId(),
                entry.getDetails(),
                entry.getIpAddress(),
                actor == null ? null : actor.getId(),
                actor == null ? null : actor.getEmail(),
                actor == null ? null : actor.getFullName(),
                entry.getCreatedAt());
    }

    private static String truncate(String value, int max) {
        if (value == null || value.length() <= max) {
            return value;
        }
        return value.substring(0, max);
    }
}
