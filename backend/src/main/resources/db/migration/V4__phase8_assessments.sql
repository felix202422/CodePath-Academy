-- Phase 8: assessments — authoring, attempts, server-side grading, results.
--
-- The baseline schema already defines assessment, assessment_question,
-- assessment_option, assessment_attempt, assessment_answer and
-- assessment_answer_option. Grading every other question type reads
-- assessment_option.is_correct, but the baseline has no answer key for
-- SHORT_ANSWER questions. Grading must never trust the client, so the key
-- lives here in the database and is only ever sent back to administrators
-- (never to a student before their attempt is submitted).

ALTER TABLE assessment_question ADD COLUMN correct_text TEXT;
