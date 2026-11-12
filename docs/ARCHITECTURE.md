# Architecture

## Goals and boundaries

- Deliver a real learning management system, not a static frontend demo.
- Keep the application independent from `CodePath-Masterclass`; consume its curriculum through an
  explicit, repeatable importer.
- Keep the first release a modular monolith with one relational source of truth.
- Enforce registration, enrollment, lesson, and assessment authorization in Spring Security and
  domain services. Frontend route guards are usability only.
- Keep published lesson bodies and imported media inside academy-managed storage so learning does
  not depend on GitHub availability after import.
- Do not provision paid cloud resources or claim a live release without explicit authorization.

## Repository layout

```text
frontend/                 React, TypeScript, Vite, Tailwind, frontend tests
backend/                  Java 21, Spring Boot, REST API, Flyway, backend tests
infra/                    Docker Compose, Nginx, CI and deployment configuration
docs/                     architecture, operations, decisions, implementation register
```

The backend uses domain packages for identity, curriculum, enrollment, learning progress,
assessment, administration, notifications, and content import. Each domain follows controller →
service → repository boundaries, with DTOs at the API boundary and JPA entities kept internal.

## Runtime and persistence

- Frontend: React + strict TypeScript; React Router; TanStack Query; React Hook Form + Zod; Lucide;
  Recharts only for actual analytics; `react-markdown` with GFM, sanitization, and syntax highlighting.
- Backend: Java 21 LTS, Spring Boot 3.x, Spring Web, Spring Security, Spring Data JPA, Bean
  Validation, Flyway, PostgreSQL driver, and OpenAPI.
- Database: PostgreSQL. Production schema changes are Flyway migrations; Hibernate schema creation
  is disabled outside isolated tests.
- API: `/api/v1`, DTO validation, pagination, consistent problem responses, and generated OpenAPI.
- Frontend production traffic is served through a same-origin reverse proxy to avoid unnecessary
  cross-origin session complexity.

Exact dependency versions are pinned in the application manifests and lockfiles. Versions were
checked against package and Maven metadata on 2026-11-10; see the implementation register for the
actual environment/toolchain limitations.

## Authentication and authorization

Use server-side sessions in secure, HTTP-only cookies, backed by PostgreSQL for restart-safe session
storage. Enable CSRF protection for browser mutations; the SPA obtains the CSRF token from the API
and sends it in the configured header. Production cookies are `Secure` and `SameSite=Lax`; local
development may disable `Secure` only on localhost.

Public registration always creates a pending student account. The request cannot set roles or
approval state. An explicit, one-time bootstrap flow creates the first administrator from secret
environment variables; it is disabled by default. Login and every protected endpoint check account
status and role on the server. Student course access additionally checks an approved enrollment for
the requested course. Assessment answers and other students' private records are never exposed by
client-side filtering.

The Phase 6 enrollment API derives the student identity from the authenticated session, accepts
requests only for published courses, and scopes history to that student. Administrators may decide
each pending request once; the review row is locked during the decision and records reviewer,
timestamp, and optional note. Public catalog enrollment totals aggregate approved rows only.

## Content import and rendering

The importer accepts only the configured CodePath-Masterclass repository or an administrator-selected
local checkout. It pins a source commit, computes SHA-256 hashes, records source paths/revisions, and
creates import history. Re-imports are idempotent. A source change that conflicts with administrator
edits is staged for review instead of overwriting the edited lesson.

Imported Markdown is stored in PostgreSQL; referenced media is copied into academy-managed storage.
Raw HTML is disabled in Markdown. Sanitization, safe link/image handling, upload validation, and a
strict Mermaid rendering mode apply before content is shown. A source outage affects future imports,
not content already published by the academy.

## Data model (initial scope)

The normalized schema will cover accounts and registration review, learning paths, courses,
prerequisites, modules, lessons and resources, source/import history, course enrollments, lesson
progress, assessments/questions/options, attempts/answers, announcements/notifications, and audit
events. Constraints and indexes will encode uniqueness and common access paths. Certificates and
payments remain future extensions.

## Operational controls

- Environment variables for secrets and deployment configuration; no committed credentials.
- Health/readiness endpoints, structured logs, security headers, constrained CORS, and request
  abuse controls.
- Migrations run as a release step; startup does not mutate production schema automatically.
- Backup/restore and recovery instructions are documented before production deployment.
- GitHub Actions runs frontend checks, backend tests, dependency/security checks, and build jobs.

## Decisions requiring later external input

- A hosting provider/domain and credentials are needed for a live deployment; provisioning is out of
  scope until explicitly authorized.
- SMTP credentials are needed to deliver password-reset and email notifications. The implementation
  will keep mail delivery behind configuration and will not claim delivery when unconfigured.
- The application-code license has not been selected; the curriculum's MIT license does not
  automatically determine the academy code license.
