-- Phase 5: course management and the source-aware curriculum importer.
--
-- course.source_path         : source subject directory the course maps to
--                              (audited mapping below; administrators may revise it).
-- course_module.source_path  : source subject directory an importer-created module
--                              was derived from; lets re-imports find their module
--                              without depending on a mutable title.
-- content_import.proposed_*  : conflict staging. When source content changed while a
--                              lesson was edited (or already published) in the academy,
--                              the new source version waits here for review instead of
--                              overwriting anything.

ALTER TABLE course ADD COLUMN source_path VARCHAR(500);
ALTER TABLE course_module ADD COLUMN source_path VARCHAR(500);

ALTER TABLE content_import ADD COLUMN proposed_body TEXT;
ALTER TABLE content_import ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE content_import ADD COLUMN resolved_by_id UUID REFERENCES app_user (id);

CREATE UNIQUE INDEX ux_course_source_path ON course (source_path) WHERE source_path IS NOT NULL;
CREATE UNIQUE INDEX ux_course_module_source ON course_module (course_id, source_path)
    WHERE source_path IS NOT NULL;
CREATE INDEX ix_content_import_status_path ON content_import (status, source_repository, source_path);

-- Audited subject mapping for the 20 seeded courses (source subjects 01-20).
UPDATE course
SET source_path = v.subject
FROM (VALUES
    ('computer-foundations', '01-COMPUTER-FOUNDATIONS'),
    ('programming-fundamentals', '02-PROGRAMMING-FUNDAMENTALS'),
    ('developer-tools', '03-DEVELOPER-TOOLS'),
    ('java-programming', '04-JAVA-PROGRAMMING'),
    ('data-structures-and-algorithms', '05-DATA-STRUCTURES-AND-ALGORITHMS'),
    ('internet-and-web-foundations', '06-INTERNET-AND-WEB-FOUNDATIONS'),
    ('html-and-css', '07-HTML-AND-CSS'),
    ('javascript-and-typescript', '08-JAVASCRIPT-AND-TYPESCRIPT'),
    ('frontend-engineering', '09-FRONTEND-ENGINEERING'),
    ('database-engineering', '10-DATABASE-ENGINEERING'),
    ('backend-engineering', '11-BACKEND-ENGINEERING'),
    ('mobile-development', '12-MOBILE-DEVELOPMENT'),
    ('software-engineering-and-architecture', '13-SOFTWARE-ENGINEERING-AND-ARCHITECTURE'),
    ('testing-and-quality', '14-TESTING-AND-QUALITY'),
    ('application-security', '15-APPLICATION-SECURITY'),
    ('devops-and-infrastructure', '16-DEVOPS-AND-INFRASTRUCTURE'),
    ('cloud-and-production', '17-CLOUD-AND-PRODUCTION'),
    ('advanced-engineering', '18-ADVANCED-ENGINEERING'),
    ('professional-development', '19-PROFESSIONAL-DEVELOPMENT'),
    ('project-laboratory', '20-PROJECT-LABORATORY')
) AS v(slug, subject)
WHERE course.slug = v.slug;
