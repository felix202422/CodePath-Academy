package com.codepath.academy.catalog.api.dto;

import java.time.Instant;

/**
 * One indexable public catalog page for the sitemap: the SPA route path
 * (never an API URL) plus its last modification when known. Visibility rules
 * match the public API — drafts and orphaned courses never produce entries.
 */
public record SitemapEntry(String path, Instant lastmod) {}
