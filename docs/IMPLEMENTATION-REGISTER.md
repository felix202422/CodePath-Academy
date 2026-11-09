# Implementation register

**Workflow:** Backlog → To Do → In Progress → Code Review → Testing → Done  
**Updated:** 2026-11-10  
**Policy:** status reflects work actually present and tests actually run. A blocker is not marked done.

## Phases

| Phase | Scope | Status | Evidence / blocker |
|---|---|---|---|
| 0 — Project creation and planning | Repository audit, source audit, architecture, standards, register | Done | Academy repo verified public and empty, cloned with `origin`; Masterclass audited read-only (MIT); directory structure, README, architecture, development standards, content-integration strategy, changelog, and this register committed. Remaining limitation: GitHub issue/milestone tracking and pushes need `gh auth login`. |
| 1 — Technical foundation | React/Vite, Spring Boot, PostgreSQL, Flyway, Docker/CI, tests | In Progress | Toolchain and project skeleton being established. Docker and Java 21 are unavailable locally; DB credentials are not configured. |
| 2 — UI/UX foundation | Tokens, shared components, responsive public/student/admin shells | Backlog | — |
| 3 — Authentication and security | Registration, approval, login/logout, admin bootstrap, authorization | Backlog | — |
| 4 — Public academy | Homepage, catalog, details, paths, public information | Backlog | — |
| 5 — Course management | Paths, courses, modules, lessons, drafts/publication, importer | Backlog | Source mapping audited; importer not yet implemented. |
| 6 — Enrollment | Requests, review, history, object-level access | Backlog | — |
| 7 — Student learning | Dashboard, lesson reader, completion, progress | Backlog | — |
| 8 — Assessments | Authoring, attempts, server grading, results | Backlog | — |
| 9 — Administration and analytics | Student/course/content/admin operations, announcements, audit | Backlog | — |
| 10 — Quality assurance | Security, integration, responsive, end-to-end workflow | Backlog | — |
| 11 — Production preparation | Containers, CI/CD, health, backup/recovery, deployment docs | Backlog | Cloud provisioning and live deployment explicitly excluded pending user authorization. |

## Active backlog

| ID | Item | Priority | Status |
|---|---|---:|---|
| CPA-001 | Establish frontend/backend monorepo and reproducible local build | P0 | In Progress |
| CPA-002 | Add Flyway baseline and PostgreSQL connection configuration | P0 | To Do |
| CPA-003 | Add CI checks for frontend, backend, migrations, and dependency auditing | P1 | To Do |
| CPA-004 | Implement registration, status, and bootstrap administrator flow | P0 | Backlog |
| CPA-005 | Implement source-aware curriculum importer and review workflow | P0 | Backlog |
| CPA-006 | Provide secure session/CSRF and authorization tests | P0 | Backlog |

## Test record

| Date | Command / check | Result | Notes |
|---|---|---|---|
| 2026-11-10 | GitHub API: academy repository metadata | Passed | `felix202422/CodePath-Academy` is public and empty; verified before cloning. |
| 2026-11-10 | GitHub API: Masterclass tree and license | Passed | Public tree returned, `truncated=false`; MIT license. |
| 2026-11-10 | `pg_isready -h localhost -p 5432` | Passed | Local PostgreSQL 18 accepts connections. |
| 2026-11-10 | `psql -w -h localhost -U postgres -d postgres ...` | Blocked | No password supplied; project DB credentials are not configured. |
| 2026-11-10 | `docker --version` | Blocked | Docker CLI is not installed. |
| 2026-11-10 | `gh auth status` | Blocked | Not logged into GitHub; remote writes cannot be performed. |

Feature-specific test results will be added as those features are implemented.
