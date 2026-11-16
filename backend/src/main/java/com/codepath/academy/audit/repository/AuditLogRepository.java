package com.codepath.academy.audit.repository;

import com.codepath.academy.audit.model.AuditLog;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Append-only persistence for the administrative audit trail. */
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    /** Newest first, with the actor resolved for display in one query. */
    @EntityGraph(attributePaths = "actor")
    @Query("select a from AuditLog a order by a.createdAt desc")
    List<AuditLog> findRecent(Pageable pageable);

    /** Same, narrowed to one entity type (e.g. "courses" or "students"). */
    @EntityGraph(attributePaths = "actor")
    @Query("select a from AuditLog a where a.entityType = :entityType order by a.createdAt desc")
    List<AuditLog> findRecentByEntityType(@Param("entityType") String entityType,
                                          Pageable pageable);
}
