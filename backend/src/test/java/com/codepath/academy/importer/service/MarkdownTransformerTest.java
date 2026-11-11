package com.codepath.academy.importer.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

/**
 * Target resolution decides which relative links the importer rewrites and
 * which it warns about. Regression coverage: a cross-file link carrying a
 * heading fragment must resolve to the file (the fragment is reattached to
 * the permalink), never be treated as a literal filename.
 */
class MarkdownTransformerTest {

    @Test
    void stripsFragmentAndQueryButKeepsTheFile() {
        assertEquals("04-JAVA-PROGRAMMING/README.md",
                MarkdownTransformer.resolve("04-JAVA-PROGRAMMING",
                        "README.md#exercises-and-practice"));
        assertEquals("assets/flow.svg",
                MarkdownTransformer.resolve("", "assets/flow.svg?v=2"));
        assertEquals("04-JAVA-PROGRAMMING/methods/scope.md",
                MarkdownTransformer.resolve("04-JAVA-PROGRAMMING",
                        "methods/scope.md#visibility"));
    }

    @Test
    void normalizesDotSegmentsInsideTheRepository() {
        assertEquals("04-JAVA-PROGRAMMING/loops.md",
                MarkdownTransformer.resolve("04-JAVA-PROGRAMMING", "./loops.md"));
        assertEquals("loops.md",
                MarkdownTransformer.resolve("04-JAVA-PROGRAMMING", "../loops.md"));
    }

    @Test
    void leavesUntargetableReferencesNull() {
        assertNull(MarkdownTransformer.resolve("04-JAVA-PROGRAMMING", "#in-page"));
        assertNull(MarkdownTransformer.resolve("", "/absolute/site/path.md"));
        assertNull(MarkdownTransformer.resolve("", "https://example.test/x.md"));
        assertNull(MarkdownTransformer.resolve("", "mailto:team@example.test"));
        assertNull(MarkdownTransformer.resolve("04-JAVA-PROGRAMMING", "../../escape.md"));
        assertNull(MarkdownTransformer.resolve("", ""));
    }
}
