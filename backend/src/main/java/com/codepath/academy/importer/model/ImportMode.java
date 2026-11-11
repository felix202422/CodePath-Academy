package com.codepath.academy.importer.model;

/**
 * Where an import run read its source from.
 * AUTO (the default request value) resolves to LOCAL when a local checkout is
 * configured and REMOTE otherwise.
 */
public enum ImportMode {
    LOCAL,
    REMOTE
}
