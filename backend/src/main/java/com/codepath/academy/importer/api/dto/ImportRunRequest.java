package com.codepath.academy.importer.api.dto;

import com.codepath.academy.importer.model.ImportMode;

/**
 * Import run request. {@code mode} absent (or null) means auto: local checkout
 * when configured, GitHub otherwise.
 */
public record ImportRunRequest(ImportMode mode) {
}
