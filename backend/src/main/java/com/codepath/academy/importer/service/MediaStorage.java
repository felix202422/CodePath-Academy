package com.codepath.academy.importer.service;

import com.codepath.academy.common.error.ApiException;
import com.codepath.academy.common.util.Sha256;
import com.codepath.academy.config.AppProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import org.springframework.stereotype.Component;

/**
 * Academy-managed copy of source media. Images referenced by imported lessons
 * are copied into the configured media root with their source-relative path
 * preserved ({@code assets/diagram.svg} → {@code /media/assets/diagram.svg}),
 * so lessons keep rendering when the source repository is unreachable. Copies
 * are content-addressed by checksum: an existing identical file is reused, so
 * re-imports never duplicate or thrash media.
 */
@Component
public class MediaStorage {

    private final Path root;

    public MediaStorage(AppProperties properties) {
        this.root = Path.of(properties.media().root()).toAbsolutePath().normalize();
    }

    public Path root() {
        return root;
    }

    /**
     * Store {@code bytes} under the source-relative {@code sourcePath}.
     *
     * @return public URL path ({@code /media/...}) the lesson should reference
     */
    public String store(String sourcePath, byte[] bytes) {
        String relative = normalizeRelative(sourcePath);
        Path target = root.resolve(relative).normalize();
        if (!target.startsWith(root)) {
            throw ApiException.badRequest("Refused to store media outside the media root: "
                    + sourcePath);
        }
        try {
            Files.createDirectories(target.getParent());
            if (Files.exists(target)) {
                String existing = Sha256.hex(Files.readAllBytes(target));
                if (existing.equals(Sha256.hex(bytes))) {
                    return publicUrl(relative);
                }
                // Different content at the same path: the source changed the
                // asset in place. Replace it so every referencing lesson shows
                // the current pinned revision.
                Files.write(target, bytes);
            } else {
                Files.write(target, bytes);
            }
            return publicUrl(relative);
        } catch (IOException ex) {
            throw new ApiException(org.springframework.http.HttpStatus.BAD_GATEWAY,
                    "Source unavailable",
                    "Could not store media file " + sourcePath + ": " + ex.getMessage());
        }
    }

    /** True when the media root exists as a directory (used by diagnostics). */
    public boolean isReady() {
        return Files.isDirectory(root);
    }

    private static String publicUrl(String relative) {
        return "/media/" + relative;
    }

    /**
     * Source-relative media path: forward slashes, no traversal, no leading
     * slash. Extensions stay lowercase so URLs are stable across platforms.
     */
    private static String normalizeRelative(String sourcePath) {
        String relative = sourcePath.replace('\\', '/').replaceAll("^/+", "");
        for (String segment : relative.split("/")) {
            if (segment.isEmpty() || ".".equals(segment) || "..".equals(segment)) {
                throw ApiException.badRequest(
                        "Refused unsafe media path: " + sourcePath);
            }
        }
        int dot = relative.lastIndexOf('.');
        if (dot > 0) {
            relative = relative.substring(0, dot)
                    + relative.substring(dot).toLowerCase(Locale.ROOT);
        }
        return relative;
    }
}
