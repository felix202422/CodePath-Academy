package com.codepath.academy.importer.source;

import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.Set;

/**
 * Read-only view of one pinned curriculum source revision. Implementations:
 * a local checkout (documented outage mode, docs/CONTENT-INTEGRATION.md
 * behavior 9) and the pinned GitHub tree (behavior 1).
 *
 * <p>Provenance values returned here are written verbatim onto lesson and
 * content_import rows, so {@link #repository()} and {@link #commit()} must be
 * stable for identical content — imports are deduplicated by
 * (repository, path, SHA-256).
 */
public interface CurriculumSource {

    /** Canonical provenance repository, e.g. https://github.com/owner/repo. */
    String repository();

    /** Pinned commit SHA, or the documented local-mode marker (max 40 chars). */
    String commit();

    /** Human-readable origin for the run summary (never a secret). */
    String describe();

    /** Every file path in the revision, repository-root relative with '/' separators. */
    Set<String> listPaths();

    Optional<byte[]> readBytes(String path);

    /** UTF-8 text read (BOM-tolerant) built on {@link #readBytes}. */
    default Optional<String> readText(String path) {
        return readBytes(path).map(bytes -> {
            String text = new String(bytes, StandardCharsets.UTF_8);
            return text.startsWith("\uFEFF") ? text.substring(1) : text;
        });
    }
}
