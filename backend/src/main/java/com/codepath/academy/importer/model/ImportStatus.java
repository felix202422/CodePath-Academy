package com.codepath.academy.importer.model;

/**
 * Outcome recorded for one source file during one import run. The unique index
 * on (source_repository, source_path, source_hash) makes re-imports idempotent:
 * the same source version can never be recorded twice.
 */
public enum ImportStatus {
    /** The source version was written to the target lesson (created or updated). */
    IMPORTED,
    /** The lesson already holds this exact source version — nothing to do. */
    UNCHANGED,
    /** Source changed; the new version is staged in proposed_body for review. */
    CONFLICT,
    /** The file could not be read or processed; the message says why. */
    FAILED
}
