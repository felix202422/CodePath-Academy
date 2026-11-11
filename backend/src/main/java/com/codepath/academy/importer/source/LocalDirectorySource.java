package com.codepath.academy.importer.source;

import com.codepath.academy.common.error.ApiException;
import com.codepath.academy.common.util.Sha256;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;
import org.springframework.http.HttpStatus;

/**
 * Local-directory import mode: reads a checkout of the curriculum repository
 * from disk (APP_CURRICULUM_LOCAL_PATH) for source outages or environments
 * without outbound GitHub access.
 *
 * <p>Provenance: {@code repository()} is the configured canonical repository
 * (the checkout is expected to be that project), and {@code commit()} is the
 * checkout's git HEAD when git can read it, otherwise a deterministic 40-char
 * SHA-256 fingerprint over the file manifest — two identical trees then pin to
 * the same value, which is what idempotent imports need.
 */
public class LocalDirectorySource implements CurriculumSource {

    private static final String[] GIT_SKIP_DIRS = {".git"};

    private final Path root;
    private final String repository;
    private final String commit;
    private final String describe;

    public LocalDirectorySource(Path root, String repository) {
        this.root = root.toAbsolutePath().normalize();
        if (!Files.isDirectory(this.root)) {
            throw ApiException.badRequest(
                    "Local import path does not exist or is not a directory: " + root);
        }
        this.repository = repository;
        this.commit = resolveCommit(this.root);
        this.describe = "local:" + this.root;
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
        return describe;
    }

    @Override
    public Set<String> listPaths() {
        try (Stream<Path> walk = Files.walk(root)) {
            Set<String> paths = new LinkedHashSet<>();
            walk.filter(Files::isRegularFile)
                    .filter(path -> !isSkipped(root.relativize(path)))
                    .map(root::relativize)
                    .map(Path::toString)
                    .map(path -> path.replace('\\', '/'))
                    .sorted()
                    .forEach(paths::add);
            return paths;
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Source unavailable",
                    "Could not read the local curriculum checkout: " + ex.getMessage());
        }
    }

    @Override
    public Optional<byte[]> readBytes(String path) {
        Path target = root.resolve(path.replace('/', java.io.File.separatorChar)).normalize();
        if (!target.startsWith(root) || !Files.isRegularFile(target, LinkOption.NOFOLLOW_LINKS)) {
            return Optional.empty();
        }
        try {
            return Optional.of(Files.readAllBytes(target));
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Source unavailable",
                    "Could not read " + path + " from the local checkout: " + ex.getMessage());
        }
    }

    private static boolean isSkipped(Path relative) {
        for (Path segment : relative) {
            for (String skip : GIT_SKIP_DIRS) {
                if (skip.equals(segment.toString())) {
                    return true;
                }
            }
        }
        return false;
    }

    private static String resolveCommit(Path root) {
        Optional<String> gitHead = gitHead(root);
        if (gitHead.isPresent()) {
            return gitHead.get();
        }
        // Deterministic tree fingerprint (documented local-mode marker).
        try (Stream<Path> walk = Files.walk(root)) {
            String manifest = walk.filter(Files::isRegularFile)
                    .filter(path -> !isSkipped(root.relativize(path)))
                    .sorted(Comparator.comparing(path -> root.relativize(path).toString()))
                    .map(path -> {
                        String relative = root.relativize(path).toString().replace('\\', '/');
                        try {
                            return relative + ":" + Sha256.hex(Files.readAllBytes(path));
                        } catch (IOException ex) {
                            throw new ApiException(HttpStatus.BAD_GATEWAY, "Source unavailable",
                                    "Could not fingerprint " + relative + " in the checkout");
                        }
                    })
                    .reduce("", (left, right) -> left.isEmpty() ? right : left + "\n" + right);
            return Sha256.hex(manifest).substring(0, 40);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Source unavailable",
                    "Could not fingerprint the local checkout: " + ex.getMessage());
        }
    }

    private static Optional<String> gitHead(Path root) {
        try {
            Process process = new ProcessBuilder(
                    "git", "-C", root.toString(), "rev-parse", "HEAD")
                    .redirectErrorStream(true)
                    .start();
            if (!process.waitFor(5, TimeUnit.SECONDS)) {
                process.destroy();
                return Optional.empty();
            }
            String output = new String(process.getInputStream().readAllBytes(),
                    StandardCharsets.UTF_8).trim();
            if (process.exitValue() == 0 && output.matches("[0-9a-f]{7,40}")) {
                String sha = output.toLowerCase();
                return Optional.of(sha.length() == 40 ? sha : sha + "0".repeat(40 - sha.length()));
            }
            return Optional.empty();
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return Optional.empty();
        }
    }
}
