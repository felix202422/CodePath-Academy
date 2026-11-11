package com.codepath.academy.importer.api.dto;

/**
 * What the importer would read from, for the import screen header. Never
 * exposes configuration beyond the curriculum source itself.
 */
public record ImportSourceResponse(
        /** Canonical repository URL shared by local and remote modes. */
        String repository,
        /** True when APP_CURRICULUM_LOCAL_PATH points at a usable checkout. */
        boolean localPathConfigured,
        /** The configured local checkout path, or empty when unset. */
        String localPath,
        /** Configured immutable commit pin; empty follows the default branch head. */
        String commitPin) {
}
