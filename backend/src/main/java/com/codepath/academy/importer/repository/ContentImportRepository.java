package com.codepath.academy.importer.repository;

import com.codepath.academy.importer.model.ContentImport;
import com.codepath.academy.importer.model.ImportStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Import provenance and review rows (see docs/CONTENT-INTEGRATION.md). */
public interface ContentImportRepository extends JpaRepository<ContentImport, UUID> {

    /**
     * Idempotency guard: the same source version (repository + path + hash) is
     * recorded at most once — the database enforces it via ux_content_import_source.
     */
    Optional<ContentImport> findBySourceRepositoryAndSourcePathAndSourceHash(
            String sourceRepository, String sourcePath, String sourceHash);

    /** An unresolved staged conflict for this source file, if one exists. */
    Optional<ContentImport> findFirstBySourceRepositoryAndSourcePathAndStatusOrderByCreatedAtDesc(
            String sourceRepository, String sourcePath, ImportStatus status);

    List<ContentImport> findTop100ByOrderByCreatedAtDesc();

    List<ContentImport> findTop100ByStatusOrderByCreatedAtDesc(ImportStatus status);

    long countByStatus(ImportStatus status);

    boolean existsByTargetLessonId(UUID targetLessonId);
}
