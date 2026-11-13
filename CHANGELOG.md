# Changelog

All notable changes to CodePath-Academy are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/); versions are assigned at release time.

## [Unreleased]

### Added

- Phase 0: repository audit, curriculum-source audit, architecture, development standards,
  content-integration strategy, and implementation register.
- Phase 1: Spring Boot 3.5 backend (Java 21) with session/CSRF security, JSON 401/403 handlers,
  centralized error contract, health + actuator + OpenAPI endpoints, and Flyway baseline schema;
  React 19 + Vite 8 + TypeScript 5.9 + Tailwind 4 frontend with typed API client, design tokens,
  and health status page; Dockerfiles, Nginx reverse proxy, Docker Compose stack, and GitHub
  Actions CI (frontend, backend with PostgreSQL service, container builds).
- Phase 2: UI/UX foundation — shared component library (Button, form fields with ARIA wiring,
  Card, Badge, Alert, Spinner, EmptyState, accessible Modal), responsive header with mobile
  menu, public/student/admin layout shells, home and about pages, honest phase placeholders,
  and a 404 page.
- Phase 3: authentication and security — backend session-cookie auth (Spring Session JDBC)
  with double-submit CSRF, registration → administrator approval workflow, login/logout with
  honest JSON 401/403 responses, failed-login lockout, idempotent env-var admin bootstrap,
  and authorization rules on every admin endpoint; frontend auth API with `useSession`
  query, login and registration pages (React Hook Form + Zod), role-based route guards with
  correct redirects, and sign-out in all three shells.
- Phase 4: public academy — Flyway V2 seed of 7 published learning paths and 20 courses
  (titles, summaries, levels, and prerequisite chains from the audited CodePath-Masterclass
  commit `62afa41`, with the Computer Networking path kept as a draft); public catalog API
  (`/api/v1/public/overview|paths|courses` with details, PUBLISHED-only, honest 404s);
  homepage with live catalog counts and start-here courses, course catalog with learning-path
  filters, course detail pages with prerequisite chains, module/lesson counts, source
  provenance, and an honest notice while lesson content has not yet been imported, learning
  path listing and detail pages.
- Public catalog reference restyle: indigo/violet design tokens, responsive search/menu header,
  honest live learning-path and level filters, real result sorting/pagination, locally bundled
  royalty-free course photographs and a real learning-team hero image, browser-local favorites,
  a registration CTA, visible reduced-motion-aware hover/focus and result-transition effects, and
  a persistent light/dark mode. Public course cards and details show only approved enrollment
  counts from the real enrollment ledger; ratings remain omitted until a genuine feedback workflow
  exists.
- Homepage onboarding: a factual three-step guide for first-time visitors and intersection-based
  section reveals with a reduced-motion fallback.
- Phase 5 course management: administrator path/course/module/lesson authoring with publication
  gates, a provenance-aware curriculum importer for local and remote sources, media/link rewriting,
  an idempotent import ledger with conflict accept/discard review, and admin content screens. All
  imported material remains draft until an administrator publishes it.
- Phase 6 enrollment: active students can request access to published courses; administrators
  review requests with an optional note, and students see their own request history. Only approved
  enrollment rows contribute to public course counts.
- Phase 7 student learning: approved students get a learning dashboard, an enrolled-course outline,
  and a lazy-loaded lesson reader (`/api/v1/me/learning/**`, ROLE_STUDENT). Only published
  modules/lessons of approved enrollments are exposed, lesson completion is recorded server-side
  against the existing `lesson_progress` table, and the continue target advances with completed
  lessons. Lesson Markdown is rendered through a sanitized GFM renderer.

[Unreleased]: https://github.com/felix202422/CodePath-Academy/commits/main
