package com.codepath.academy.audit;

import com.codepath.academy.audit.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Set;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Records every successful mutation under /api/v1/admin/** into the audit
 * trail. Runs after the handler so only completed actions are logged; route
 * rules already guarantee the caller is an administrator. A failed audit write
 * must never turn a committed admin action into an error, so it is logged and
 * swallowed — the response is already on its way to the client.
 */
@Component
public class AuditInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(AuditInterceptor.class);

    static final String ADMIN_PREFIX = "/api/v1/admin/";
    private static final Set<String> MUTATING_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");
    private static final Pattern UUID_IN_PATH = Pattern.compile(
            "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");

    private final AuditService auditService;

    public AuditInterceptor(AuditService auditService) {
        this.auditService = auditService;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        String path = request.getRequestURI();
        String method = request.getMethod();
        if (!MUTATING_METHODS.contains(method) || !path.startsWith(ADMIN_PREFIX)) {
            return;
        }
        if (response.getStatus() >= 400) {
            return;
        }
        try {
            String actor = request.getUserPrincipal() == null
                    ? null
                    : request.getUserPrincipal().getName();
            auditService.record(
                    actor,
                    method + " " + normalize(path),
                    entityType(path),
                    entityId(path),
                    "status=" + response.getStatus(),
                    request.getRemoteAddr());
        } catch (RuntimeException failure) {
            log.error("Failed to record audit entry for {} {}", method, path, failure);
        }
    }

    /**
     * Collapse concrete UUIDs to {@code {id}} so the action column groups by
     * endpoint instead of exploding into one value per row; the exact target
     * lives in the entity_id column.
     */
    static String normalize(String path) {
        return UUID_IN_PATH.matcher(path).replaceAll("{id}");
    }

    /** First path segment after /api/v1/admin, e.g. {@code courses}. */
    static String entityType(String path) {
        String remainder = path.substring(ADMIN_PREFIX.length());
        int slash = remainder.indexOf('/');
        String segment = slash < 0 ? remainder : remainder.substring(0, slash);
        return segment.isEmpty() ? "admin" : segment;
    }

    /** Second segment when it is the targeted entity's UUID, else null. */
    static String entityId(String path) {
        String remainder = path.substring(ADMIN_PREFIX.length());
        int slash = remainder.indexOf('/');
        if (slash < 0) {
            return null;
        }
        int end = remainder.indexOf('/', slash + 1);
        String segment = end < 0 ? remainder.substring(slash + 1) : remainder.substring(slash + 1, end);
        return UUID_IN_PATH.matcher(segment).matches() ? segment : null;
    }
}
