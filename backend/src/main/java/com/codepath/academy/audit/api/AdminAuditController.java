package com.codepath.academy.audit.api;

import com.codepath.academy.audit.api.dto.AuditEntryResponse;
import com.codepath.academy.audit.service.AuditService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only audit trail for administrators: newest entries first, optionally
 * narrowed to one entity type (e.g. {@code students} or {@code courses}).
 * Route rules require ROLE_ADMIN; rows are written by AuditInterceptor and
 * never mutated through this API.
 */
@RestController
@RequestMapping("/api/v1/admin/audit")
public class AdminAuditController {

    private final AuditService auditService;

    public AdminAuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    public List<AuditEntryResponse> recent(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) Integer limit) {
        return auditService.recent(entityType, limit);
    }
}
