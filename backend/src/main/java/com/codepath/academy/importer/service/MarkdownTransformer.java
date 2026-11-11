package com.codepath.academy.importer.service;

import com.codepath.academy.importer.source.CurriculumSource;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Rewrites one imported lesson body for academy hosting:
 *
 * <ul>
 *   <li>relative image references are copied into academy media storage and
 *       repointed at {@code /media/...} (learning no longer depends on the
 *       source repository being reachable);</li>
 *   <li>relative non-image links become GitHub blob permalinks at the pinned
 *       commit, so cross-lesson navigation survives outside GitHub's renderer;</li>
 *   <li>an attribution footer records repository, path {@code @} commit and
 *       the MIT license, appended to every imported body.</li>
 * </ul>
 *
 * <p>Code spans inside a line and fenced code blocks are never rewritten —
 * sample code that happens to contain {@code [x](y)} stays byte-identical.
 */
public final class MarkdownTransformer {

    /** Image: {@code ![alt](target)} with an optional title. */
    private static final Pattern IMAGE = Pattern.compile(
            "!\\[([^\\]]*)\\]\\(([^)\\s]+)(?:\\s+\"[^\"]*\")?\\)");

    /** Plain link: {@code [text](target)} (the leading {@code !} is excluded). */
    private static final Pattern LINK = Pattern.compile(
            "(?<!!)\\[([^\\]]*)\\]\\(([^)\\s]+)(?:\\s+\"[^\"]*\")?\\)");

    private static final Pattern SCHEME = Pattern.compile("^[A-Za-z][A-Za-z0-9+.-]*:");

    private static final Pattern FENCE = Pattern.compile("^\\s*(```|~~~)");

    /** Inline code span, protected from all rewriting. */
    private static final Pattern CODE_SPAN = Pattern.compile("`[^`\\n]*`");

    private MarkdownTransformer() {
    }

    /** One media file a rewritten lesson now references. */
    public record MediaReference(String sourcePath, String location, String title) {
    }

    /** Result of transforming one lesson body. */
    public record Result(String body, List<MediaReference> media, List<String> warnings) {
    }

    /**
     * @param markdown   raw source body
     * @param sourcePath repository path of the lesson file (relative resolution base)
     * @param source     pinned source revision (image bytes and existence checks)
     * @param media      academy media storage for image copies
     */
    public static Result transform(String markdown, String sourcePath,
                                   CurriculumSource source, MediaStorage media) {
        List<MediaReference> mediaRefs = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        String directory = sourcePath.contains("/")
                ? sourcePath.substring(0, sourcePath.lastIndexOf('/'))
                : "";

        StringBuilder out = new StringBuilder(markdown.length() + 512);
        boolean inFence = false;
        String[] lines = markdown.split("\n", -1);
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            if (FENCE.matcher(line).find()) {
                inFence = !inFence;
            } else if (!inFence) {
                line = rewriteLine(line, directory, source, sourcePath,
                        media, mediaRefs, warnings);
            }
            out.append(line);
            if (i < lines.length - 1) {
                out.append('\n');
            }
        }

        String body = out.toString().stripTrailing() + "\n\n" + footer(sourcePath, source);
        return new Result(body, List.copyOf(mediaRefs), List.copyOf(warnings));
    }

    private static String rewriteLine(String line, String directory,
                                      CurriculumSource source, String sourcePath,
                                      MediaStorage media,
                                      List<MediaReference> mediaRefs,
                                      List<String> warnings) {
        // Split the line into code spans (kept verbatim) and prose (rewritten).
        StringBuilder result = new StringBuilder(line.length());
        int cursor = 0;
        Matcher span = CODE_SPAN.matcher(line);
        while (span.find()) {
            rewriteProse(result, line.substring(cursor, span.start()),
                    directory, source, sourcePath, media, mediaRefs, warnings);
            result.append(span.group());
            cursor = span.end();
        }
        rewriteProse(result, line.substring(cursor),
                directory, source, sourcePath, media, mediaRefs, warnings);
        return result.toString();
    }

    private static void rewriteProse(StringBuilder out, String text, String directory,
                                     CurriculumSource source, String sourcePath,
                                     MediaStorage media,
                                     List<MediaReference> mediaRefs,
                                     List<String> warnings) {
        if (text.indexOf('[') < 0) {
            out.append(text);
            return;
        }
        // Images first (they carry the leading !), then plain links.
        String afterImages = replaceAll(text, IMAGE, matcher ->
                rewriteTarget(matcher, directory, source, sourcePath, media,
                        mediaRefs, warnings, true));
        out.append(replaceAll(afterImages, LINK, matcher ->
                rewriteTarget(matcher, directory, source, sourcePath, media,
                        mediaRefs, warnings, false)));
    }

    private static String rewriteTarget(Matcher matcher, String directory,
                                        CurriculumSource source, String sourcePath,
                                        MediaStorage media,
                                        List<MediaReference> mediaRefs,
                                        List<String> warnings, boolean image) {
        String target = matcher.group(2);
        String resolved = resolve(directory, target);
        if (resolved == null) {
            return matcher.group();
        }
        if (image) {
            Optional<byte[]> bytes = source.readBytes(resolved);
            if (bytes.isEmpty()) {
                warnings.add("Image not found in source: " + resolved
                        + " (referenced by " + sourcePath + ")");
                return matcher.group();
            }
            try {
                String location = media.store(resolved, bytes.get());
                mediaRefs.add(new MediaReference(resolved, location, matcher.group(1)));
                return matcher.group().replace(target, location);
            } catch (RuntimeException ex) {
                warnings.add("Could not copy image " + resolved + ": " + ex.getMessage());
                return matcher.group();
            }
        }
        if (source.readBytes(resolved).isEmpty()) {
            warnings.add("Link target not found in source: " + resolved
                    + " (referenced by " + sourcePath + ")");
            return matcher.group();
        }
        String fragment = "";
        int hash = target.indexOf('#');
        if (hash >= 0) {
            fragment = target.substring(hash);
        }
        return matcher.group().replace(target, permalink(source, resolved) + fragment);
    }

    /**
     * Pinned GitHub blob permalink for a repository path. Used both for
     * rewritten links and for the attribution footer.
     */
    public static String permalink(CurriculumSource source, String repositoryPath) {
        return source.repository() + "/blob/" + source.commit() + "/" + repositoryPath;
    }

    /** Apply a replacement over every occurrence, keeping unmatched text intact. */
    private static String replaceAll(String text, Pattern pattern,
                                     Function<Matcher, String> replacer) {
        Matcher matcher = pattern.matcher(text);
        if (!matcher.find()) {
            return text;
        }
        StringBuilder out = new StringBuilder(text.length());
        int last = 0;
        do {
            out.append(text, last, matcher.start()).append(replacer.apply(matcher));
            last = matcher.end();
        } while (matcher.find());
        out.append(text.substring(last));
        return out.toString();
    }

    /**
     * Resolve a target against the lesson's directory inside the repository.
     * Returns null for targets that must stay untouched: external schemes,
     * in-page anchors, absolute site paths, and anything escaping the repo root.
     */
    static String resolve(String directory, String target) {
        String path = target;
        int query = path.indexOf('?');
        if (query >= 0) {
            path = path.substring(0, query);
        }
        // The fragment identifies a heading inside the file, not part of its
        // path — strip it before the existence check (rewriteTarget reattaches
        // it to the permalink).
        int hash = path.indexOf('#');
        if (hash >= 0) {
            path = path.substring(0, hash);
        }
        if (path.isEmpty() || path.startsWith("/")
                || SCHEME.matcher(path).find()) {
            return null;
        }
        List<String> segments = new ArrayList<>();
        if (!directory.isEmpty()) {
            for (String segment : directory.split("/")) {
                segments.add(segment);
            }
        }
        for (String segment : path.split("/")) {
            if (segment.isEmpty() || ".".equals(segment)) {
                continue;
            }
            if ("..".equals(segment)) {
                if (segments.isEmpty()) {
                    return null; // escapes the repository root
                }
                segments.remove(segments.size() - 1);
                continue;
            }
            segments.add(segment);
        }
        if (segments.isEmpty()) {
            return null;
        }
        return String.join("/", segments);
    }

    /** Attribution appended to every imported body (docs/CONTENT-INTEGRATION.md). */
    static String footer(String sourcePath, CurriculumSource source) {
        String repository = source.repository();
        return "---\n\n"
                + "*Imported from [CodePath-Masterclass](" + repository + ") — `"
                + sourcePath + " @ " + source.commit() + "`, MIT © Felix Haule 2026. "
                + "See [LICENSE](" + repository + "/blob/" + source.commit()
                + "/LICENSE).*";
    }
}
