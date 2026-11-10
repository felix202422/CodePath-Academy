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

[Unreleased]: https://github.com/felix202422/CodePath-Academy/commits/main
