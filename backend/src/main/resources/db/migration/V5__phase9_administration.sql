-- Phase 9: administration — course-scoped announcements and the audit trail.
--
-- The baseline already defines announcement (title, body_markdown, audience,
-- status, published_at, created_by_id) and audit_log (actor, action, entity,
-- details, ip_address). Two additions complete the phase:
--
-- 1. announcement.course_id: null means a platform-wide announcement; a value
--    scopes visibility to students with an APPROVED enrollment in that course.
-- 2. audit_log is written by an interceptor over /api/v1/admin/** mutations,
--    so no schema change is needed here — indexes already cover actor, entity
--    and time-ordered reads.

ALTER TABLE announcement
    ADD COLUMN course_id UUID REFERENCES course (id) ON DELETE SET NULL;

CREATE INDEX ix_announcement_course ON announcement (course_id, status, published_at DESC);
