package com.codepath.academy.catalog.model;

/**
 * Publication state shared by curriculum content. The public read API only
 * ever exposes {@link #PUBLISHED} rows; everything else stays invisible until
 * an administrator publishes it.
 */
public enum ContentStatus {
    DRAFT,
    PUBLISHED,
    ARCHIVED
}
