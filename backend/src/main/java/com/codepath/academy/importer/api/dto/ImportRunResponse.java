package com.codepath.academy.importer.api.dto;

import com.codepath.academy.importer.model.ImportMode;
import java.util.List;

/**
 * Outcome of one synchronous import run: real counters (no estimates), the
 * pinned provenance commit, subject-mapping gaps, and capped warnings.
 */
public record ImportRunResponse(
        /** Source actually used for this run. */
        ImportMode mode,
        String repository,
        /** Pinned commit every row of this run was read at. */
        String commit,
        long durationMs,
        /** Subject directories whose README lesson index was examined. */
        int subjectsScanned,
        /** Subject directories with lessons but no course mapping. */
        List<String> unmappedSubjects,
        int lessonsCreated,
        int lessonsUpdated,
        int lessonsUnchanged,
        int conflictsStaged,
        int failures,
        int mediaFilesStored,
        /** Up to 50 warnings; when more occur, the last entry summarizes the overflow. */
        List<String> warnings) {
}
