package com.codepath.academy.importer.source;

import com.codepath.academy.common.error.ApiException;
import com.codepath.academy.config.AppProperties;
import com.codepath.academy.importer.model.ImportMode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.http.HttpClient;
import java.nio.file.Path;
import java.time.Duration;
import org.springframework.stereotype.Component;

/**
 * Chooses the import source for a run. AUTO (a null request field) resolves to
 * LOCAL when APP_CURRICULUM_LOCAL_PATH is configured and REMOTE otherwise;
 * an explicit mode is honoured or refused with an honest 400 when the
 * environment cannot serve it. Both modes report the same canonical repository
 * URL as provenance so deduplication works across modes.
 */
@Component
public class CurriculumSourceFactory {

    private final AppProperties properties;
    private final ObjectMapper json;
    private final HttpClient http;

    public CurriculumSourceFactory(AppProperties properties, ObjectMapper json) {
        this.properties = properties;
        this.json = json;
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(15))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    /**
     * @param requestedMode null = auto-resolve from configuration
     */
    public CurriculumSource create(ImportMode requestedMode) {
        boolean localConfigured = localConfigured();
        ImportMode resolved = requestedMode != null
                ? requestedMode
                : (localConfigured ? ImportMode.LOCAL : ImportMode.REMOTE);
        if (resolved == ImportMode.LOCAL) {
            if (!localConfigured) {
                throw ApiException.badRequest(
                        "Local import mode was requested but APP_CURRICULUM_LOCAL_PATH is not "
                                + "configured. Point it at a checkout of the curriculum repository.");
            }
            return new LocalDirectorySource(
                    Path.of(properties.curriculum().localCheckoutPath()),
                    canonicalRepository());
        }
        return new GitHubCurriculumSource(properties.curriculum().repository(),
                properties.curriculum().commit(), http, json);
    }

    /** The mode AUTO would pick right now (used by the import-source endpoint). */
    public ImportMode defaultMode() {
        return localConfigured() ? ImportMode.LOCAL : ImportMode.REMOTE;
    }

    public boolean localConfigured() {
        String path = properties.curriculum().localCheckoutPath();
        return path != null && !path.isBlank();
    }

    public String localPath() {
        return localConfigured() ? properties.curriculum().localCheckoutPath() : "";
    }

    /** Canonical provenance repository URL shared by both modes. */
    public String canonicalRepository() {
        return "https://github.com/" + GitHubCurriculumSource.toOwnerRepo(
                properties.curriculum().repository());
    }

    /** Configured immutable pin; empty means "default branch head at run time". */
    public String pinnedCommit() {
        String commit = properties.curriculum().commit();
        return commit == null ? "" : commit.trim();
    }
}
