package com.codepath.academy.importer.source;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * The lesson index parser must survive the three styles the audited source
 * uses (backtick paths, links, numbered links — sometimes mixed inside one
 * section), keep document order, de-duplicate, and reject entries that would
 * escape the subject directory.
 */
class LessonIndexParserTest {

    @Test
    void parsesAllThreeIndexStylesInDocumentOrder() {
        String readme = """
                # Subject

                Intro prose before the index.

                ## Lessons

                1. [First lesson](first.md)
                - `second.md`
                - [Nested lesson](nested/third.md)
                - [Fourth](fourth.md#anchor)

                ## Exercises

                Not part of the index.
                """;

        assertEquals(List.of("first.md", "second.md", "nested/third.md", "fourth.md"),
                LessonIndexParser.parse(readme));
    }

    @Test
    void deduplicatesRepeatedEntries() {
        String readme = """
                ## Lessons

                - [Same](same.md)
                - [Same again](same.md)
                - `same.md`
                """;

        assertEquals(List.of("same.md"), LessonIndexParser.parse(readme));
    }

    @Test
    void rejectsParentAbsoluteAndSchemeEntries() {
        String readme = """
                ## Lessons

                - [Escape](../outside.md)
                - [Absolute](/etc/passwd.md)
                - [Web link](https://example.test/lesson.md)
                - [Windows path](..\\evil.md)
                - [Not markdown](readme.txt)
                - [Valid](valid.md)
                """;

        assertEquals(List.of("valid.md"), LessonIndexParser.parse(readme));
    }

    @Test
    void sectionEndsAtTheNextHeading() {
        String readme = """
                ## Lessons

                - [Indexed](indexed.md)

                ### Details

                - [After the section](not-indexed.md)
                """;

        assertEquals(List.of("indexed.md"), LessonIndexParser.parse(readme));
    }

    @Test
    void returnsEmptyWithoutALessonsSection() {
        String readme = """
                # Subject

                Just prose, no index.

                ## Prerequisites

                - [Something](something.md)
                """;

        assertTrue(LessonIndexParser.parse(readme).isEmpty());
    }

    @Test
    void toleratesAnEmptyLessonsSection() {
        assertTrue(LessonIndexParser.parse("## Lessons\n\nnothing listed yet\n").isEmpty());
    }

    @Test
    void matchesTheSectionHeadingRegardlessOfCaseAndLevel() {
        String readme = "#### lessons\n\n- [One](one.md)\n";
        assertEquals(List.of("one.md"), LessonIndexParser.parse(readme));

        assertFalse(LessonIndexParser.isSubjectRelativeMarkdown(""));
        assertFalse(LessonIndexParser.isSubjectRelativeMarkdown("lesson.MD.bak"));
        assertTrue(LessonIndexParser.isSubjectRelativeMarkdown("a/b/c.md"));
    }
}
