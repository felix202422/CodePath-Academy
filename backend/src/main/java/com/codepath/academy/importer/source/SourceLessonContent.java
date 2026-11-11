package com.codepath.academy.importer.source;

/**
 * Derived display fields for one source lesson file: title from the first
 * {@code # } heading, summary from the first prose paragraph, and the academy
 * slug derived from the subject-relative path ({@code troubleshooting/README.md}
 * → {@code troubleshooting-readme} so sibling READMEs never collide).
 */
public record SourceLessonContent(String title, String summary, String slug) {

    private static final int SUMMARY_LIMIT = 600;

    public static SourceLessonContent of(String sourcePath, String markdown) {
        return new SourceLessonContent(
                titleOf(markdown, sourcePath),
                summaryOf(markdown),
                slugOf(sourcePath));
    }

    /** First H1, else the file name turned into a readable heading. */
    static String titleOf(String markdown, String sourcePath) {
        for (String line : markdown.split("\n", -1)) {
            String trimmed = line.trim();
            if (trimmed.startsWith("# ")) {
                String title = trimmed.substring(2).trim();
                if (!title.isEmpty()) {
                    return truncate(title, 240);
                }
            }
            if (!trimmed.isEmpty() && !trimmed.startsWith("#")) {
                break; // only headings before the first prose line count
            }
        }
        String file = sourcePath.substring(sourcePath.lastIndexOf('/') + 1);
        if (file.toLowerCase().endsWith(".md")) {
            file = file.substring(0, file.length() - 3);
        }
        return truncate(file.replace('-', ' ').replace('_', ' ').trim(), 240);
    }

    /**
     * First prose paragraph: skips headings, code fences, list bullets, images
     * and link-only lines, then strips inline markup. Empty when the lesson
     * opens with only structure.
     */
    static String summaryOf(String markdown) {
        boolean inFence = false;
        StringBuilder paragraph = new StringBuilder();
        for (String rawLine : markdown.split("\n", -1)) {
            String line = rawLine.trim();
            if (line.startsWith("```") || line.startsWith("~~~")) {
                inFence = !inFence;
                continue;
            }
            if (inFence) {
                continue;
            }
            if (line.isEmpty()) {
                if (paragraph.length() > 0) {
                    break;
                }
                continue;
            }
            if (line.startsWith("#") || line.startsWith("- ") || line.startsWith("* ")
                    || line.startsWith("+ ") || line.startsWith("> ")
                    || line.matches("^\\d+[.)]\\s+.*") || line.startsWith("![")) {
                if (paragraph.length() > 0) {
                    break;
                }
                continue;
            }
            if (paragraph.length() > 0) {
                paragraph.append(' ');
            }
            paragraph.append(line);
            // A paragraph continues until a blank line; stop early once we have
            // enough text to fill the summary.
            if (plainText(paragraph).length() >= SUMMARY_LIMIT) {
                break;
            }
        }
        return truncate(plainText(paragraph), SUMMARY_LIMIT);
    }

    /**
     * {@code 04-JAVA-PROGRAMMING/variables.md} → {@code variables};
     * {@code troubleshooting/README.md} → {@code troubleshooting-readme}.
     * Lowercased; {@code /} becomes {@code -}; trailing {@code .md} removed.
     */
    static String slugOf(String sourcePath) {
        String slug = sourcePath;
        if (slug.toLowerCase().endsWith(".md")) {
            slug = slug.substring(0, slug.length() - 3);
        }
        slug = slug.toLowerCase().replace('/', '-');
        slug = slug.replaceAll("[^a-z0-9-]+", "-")
                .replaceAll("-{2,}", "-")
                .replaceAll("(^-|-$)", "");
        return slug.isEmpty() ? "lesson" : slug;
    }

    /** Strip inline Markdown for the plain-text summary. */
    private static String plainText(CharSequence markdown) {
        String text = markdown.toString()
                .replaceFirst("^\\s*[-*+]\\s+", "")
                .replaceAll("!\\[[^\\]]*\\]\\([^)]*\\)", "")
                .replaceAll("\\[([^\\]]*)\\]\\([^)]*\\)", "$1")
                .replaceAll("`([^`]*)`", "$1")
                .replaceAll("\\*\\*([^*]*)\\*\\*", "$1")
                .replaceAll("__([^_]*)__", "$1")
                .replaceAll("\\*([^*]+)\\*", "$1")
                .replaceAll("#+\\s*", "")
                .replaceAll("<[^>]+>", "")
                .replaceAll("\\s+", " ")
                .trim();
        return text;
    }

    private static String truncate(String text, int limit) {
        if (text.length() <= limit) {
            return text;
        }
        String cut = text.substring(0, limit);
        int lastSpace = cut.lastIndexOf(' ');
        if (lastSpace > limit / 2) {
            cut = cut.substring(0, lastSpace);
        }
        return cut.trim() + "…";
    }
}
