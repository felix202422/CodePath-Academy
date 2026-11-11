package com.codepath.academy.importer.source;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses the {@code ## Lessons} index of a source subject README.
 *
 * <p>The source repository uses three index styles — backtick paths
 * ({@code `file.md`}), links ({@code [text](file.md)}) and numbered links
 * ({@code 1. [text](file.md)}) — sometimes mixed inside one section. A single
 * pass matches both link targets and backtick spans, keeps document order,
 * de-duplicates, and rejects entries that are not safe subject-relative
 * {@code .md} paths: parent traversal ({@code ..}), absolute paths and URL
 * schemes are dropped because they would escape the subject directory the
 * lesson index is supposed to describe.
 */
public final class LessonIndexParser {

    /** Section heading that starts the lesson index. */
    private static final Pattern SECTION = Pattern.compile(
            "^#{2,6}\\s+Lessons\\s*$", Pattern.MULTILINE | Pattern.CASE_INSENSITIVE);

    /** Next heading of any level — ends the lesson index. */
    private static final Pattern NEXT_HEADING = Pattern.compile(
            "^#{1,6}\\s+\\S", Pattern.MULTILINE);

    /**
     * One index entry in a single pass so mixed styles keep document order:
     * [text](target.md) / [text](target.md#anchor), or `path/to/file.md`.
     * Group 1 is the link target, group 2 the code-span content.
     */
    private static final Pattern ENTRY = Pattern.compile(
            "\\[[^\\]]*\\]\\(([^)\\s]+)(?:\\s+\"[^\"]*\")?\\)|`([^`\\n]+)`");

    private static final Pattern SCHEME = Pattern.compile("^[A-Za-z][A-Za-z0-9+.-]*:");

    private LessonIndexParser() {
    }

    /**
     * @param readme subject README text
     * @return ordered, de-duplicated lesson paths relative to the subject
     *         directory (may be empty when the README has no Lessons section)
     */
    public static List<String> parse(String readme) {
        Matcher section = SECTION.matcher(readme);
        if (!section.find()) {
            return List.of();
        }
        int start = section.end();
        int end = readme.length();
        Matcher heading = NEXT_HEADING.matcher(readme);
        if (heading.find(start)) {
            end = heading.start();
        }
        String block = readme.substring(start, end);

        LinkedHashSet<String> paths = new LinkedHashSet<>();
        Matcher matcher = ENTRY.matcher(block);
        while (matcher.find()) {
            String target = matcher.group(1) != null ? matcher.group(1) : matcher.group(2);
            String stripped = stripFragment(target.trim());
            if (isSubjectRelativeMarkdown(stripped)) {
                paths.add(stripped);
            }
        }
        return new ArrayList<>(paths);
    }

    private static String stripFragment(String target) {
        int hash = target.indexOf('#');
        return hash < 0 ? target : target.substring(0, hash);
    }

    /** True for safe, subject-relative {@code .md} paths only. */
    static boolean isSubjectRelativeMarkdown(String target) {
        if (target.isEmpty() || !target.toLowerCase().endsWith(".md")) {
            return false;
        }
        if (target.startsWith("/") || target.contains("\\") || SCHEME.matcher(target).find()) {
            return false;
        }
        for (String segment : target.split("/")) {
            if (segment.isEmpty() || ".".equals(segment) || "..".equals(segment)) {
                return false;
            }
        }
        return true;
    }
}
