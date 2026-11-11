package com.codepath.academy.importer.source;

import com.codepath.academy.common.error.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.Set;
import org.springframework.http.HttpStatus;

/**
 * Remote import mode: reads one pinned revision of the curriculum repository
 * through the GitHub REST API (tree listing) and raw.githubusercontent.com
 * (file bodies). The commit is resolved once — either the configured pin
 * (APP_CURRICULUM_COMMIT) or the default branch head at run time — and then
 * never moves, so every row written during the run shares one immutable
 * provenance commit.
 *
 * <p>Honest failure modes: unauthenticated GitHub API calls are rate limited;
 * a exhausted limit surfaces as a 502 with the retry advice instead of a
 * misleading partial import. Optionally GITHUB_TOKEN raises the limit — it is
 * read from the environment and never logged or persisted.
 */
public class GitHubCurriculumSource implements CurriculumSource {

    private static final String API_ROOT = "https://api.github.com";
    private static final String RAW_ROOT = "https://raw.githubusercontent.com";
    private static final Duration TIMEOUT = Duration.ofSeconds(30);

    private final String ownerRepo;
    private final String repository;
    private final String commit;
    private final HttpClient http;
    private final ObjectMapper json;
    private final Optional<String> token;

    /** @param repositoryValue configured value: "owner/repo" or a github.com URL */
    public GitHubCurriculumSource(String repositoryValue, String pinnedCommit,
                                  HttpClient http, ObjectMapper json) {
        this.ownerRepo = toOwnerRepo(repositoryValue);
        this.repository = "https://github.com/" + ownerRepo;
        this.token = Optional.ofNullable(System.getenv("GITHUB_TOKEN"))
                .filter(value -> !value.isBlank());
        this.http = http;
        this.json = json;
        this.commit = resolveCommit(pinnedCommit);
    }

    @Override
    public String repository() {
        return repository;
    }

    @Override
    public String commit() {
        return commit;
    }

    @Override
    public String describe() {
        return "github:" + ownerRepo + "@" + commit;
    }

    @Override
    public Set<String> listPaths() {
        String body = get(API_ROOT + "/repos/" + ownerRepo + "/git/trees/" + commit + "?recursive=1",
                "application/vnd.github+json");
        JsonNode tree;
        try {
            JsonNode root = json.readTree(body);
            if (root.path("truncated").asBoolean(false)) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "Source unavailable",
                        "GitHub returned a truncated file tree for this commit; the import "
                                + "would silently skip files, so it was aborted.");
            }
            tree = root.path("tree");
        } catch (ApiException ex) {
            throw ex;
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Source unavailable",
                    "GitHub returned a file tree this importer could not parse.");
        }
        Set<String> paths = new LinkedHashSet<>();
        for (Iterator<JsonNode> it = tree.elements(); it.hasNext();) {
            JsonNode entry = it.next();
            if ("blob".equals(entry.path("type").asText())) {
                paths.add(entry.path("path").asText());
            }
        }
        return paths;
    }

    @Override
    public Optional<byte[]> readBytes(String path) {
        HttpRequest request = request(RAW_ROOT + "/" + ownerRepo + "/" + commit + "/" + path)
                .header("Accept", "application/vnd.github.raw")
                .GET()
                .build();
        try {
            HttpResponse<byte[]> response = http.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() == 404) {
                return Optional.empty();
            }
            if (response.statusCode() != 200) {
                throw fail(response.statusCode(), path);
            }
            return Optional.of(response.body());
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Source unavailable",
                    "Could not download " + path + " from GitHub: " + ex.getMessage());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Source unavailable",
                    "Interrupted while downloading " + path + " from GitHub.");
        }
    }

    // --- internals ---------------------------------------------------------

    private String resolveCommit(String pinnedCommit) {
        if (pinnedCommit != null && !pinnedCommit.isBlank()) {
            String pinned = pinnedCommit.trim().toLowerCase();
            if (!pinned.matches("[0-9a-f]{7,40}")) {
                throw ApiException.badRequest(
                        "APP_CURRICULUM_COMMIT must be a commit SHA (40 hex characters).");
            }
            return pinned;
        }
        String body = get(API_ROOT + "/repos/" + ownerRepo + "/commits?per_page=1",
                "application/vnd.github+json");
        try {
            JsonNode commits = json.readTree(body);
            String sha = commits.isArray() && !commits.isEmpty()
                    ? commits.get(0).path("sha").asText("")
                    : "";
            if (!sha.matches("[0-9a-f]{40}")) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "Source unavailable",
                        "GitHub returned no resolvable commit for " + ownerRepo + ".");
            }
            return sha;
        } catch (ApiException ex) {
            throw ex;
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Source unavailable",
                    "GitHub returned a commit list this importer could not parse.");
        }
    }

    private String get(String url, String accept) {
        HttpRequest request = request(url).header("Accept", accept).GET().build();
        try {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw fail(response.statusCode(), url);
            }
            return response.body();
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Source unavailable",
                    "Could not reach GitHub: " + ex.getMessage());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Source unavailable",
                    "Interrupted while reaching GitHub.");
        }
    }

    private HttpRequest.Builder request(String url) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(url))
                .timeout(TIMEOUT)
                .header("User-Agent", "codepath-academy-importer")
                .header("X-GitHub-Api-Version", "2022-11-28");
        token.ifPresent(value -> builder.header("Authorization", "Bearer " + value));
        return builder;
    }

    private ApiException fail(int status, String what) {
        if (status == 403 || status == 429) {
            return new ApiException(HttpStatus.BAD_GATEWAY, "Source unavailable",
                    "GitHub rejected the request (HTTP " + status + ") — most likely the API "
                            + "rate limit for unauthenticated calls. Set GITHUB_TOKEN, wait for the "
                            + "limit to reset, or import from a local checkout instead.");
        }
        if (status == 401) {
            return new ApiException(HttpStatus.BAD_GATEWAY, "Source unavailable",
                    "GitHub rejected the configured GITHUB_TOKEN (HTTP 401).");
        }
        return new ApiException(HttpStatus.BAD_GATEWAY, "Source unavailable",
                "GitHub returned HTTP " + status + " for " + what + ".");
    }

    static String toOwnerRepo(String repositoryValue) {
        String value = repositoryValue.trim();
        if (value.startsWith("https://") || value.startsWith("http://")) {
            int hostStart = value.indexOf("://") + 3;
            int pathStart = value.indexOf('/', hostStart);
            value = pathStart < 0 ? "" : value.substring(pathStart + 1);
        }
        if (value.endsWith(".git")) {
            value = value.substring(0, value.length() - 4);
        }
        value = value.replaceAll("^/+|/+$", "");
        if (!value.matches("[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+")) {
            throw ApiException.badRequest(
                    "APP_CURRICULUM_REPOSITORY must be 'owner/repository' (got: "
                            + repositoryValue + ").");
        }
        return value;
    }
}
