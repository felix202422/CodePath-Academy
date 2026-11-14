package com.codepath.academy.assessment.model;

/**
 * Question kinds an administrator can author. Each type has its own
 * server-side grading rule (see the assessment service): choice questions are
 * graded from {@code assessment_option.is_correct}, multi-answer requires an
 * exact set match, and short answers are compared against the stored answer
 * key.
 */
public enum QuestionType {
    MULTIPLE_CHOICE,
    TRUE_FALSE,
    MULTI_ANSWER,
    SHORT_ANSWER
}
