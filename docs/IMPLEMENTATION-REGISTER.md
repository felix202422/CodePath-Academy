# Implementation register

**Workflow:** Backlog → To Do → In Progress → Code Review → Testing → Done  
**Updated:** 2026-11-10  
**Policy:** status reflects work actually present and tests actually run. A blocker is not marked done.

## Phases

| Phase | Scope | Status | Evidence / blocker |
|---|---|---|---|
| 0 — Project creation and planning | Repository audit, source audit, architecture, standards, register | Done | Academy repo verified public and empty, cloned with `origin`; Masterclass audited read-only (MIT); directory structure, README, architecture, development standards, content-integration strategy, changelog, and this register committed and pushed (root commit `8c3ef41` verified via GitHub API). Limitation: `gh` CLI is unauthenticated, so GitHub issues/milestones need `gh auth login`; plain Git push works via stored credentials. |
| 1 — Technical foundation | React/Vite, Spring Boot, PostgreSQL, Flyway, Docker/CI, tests | Done | Backend Spring Boot 3.5.16 with Flyway V1 on real PostgreSQL 18.6: `mvn verify` → 8/8 tests pass. Frontend React 19 + Vite 8: `npm test` → 9/9 pass, `npm run build` and `npm run lint` pass. Live stack verified: API on `:8081` (env process owns `:8080`) serving health/actuator/OpenAPI, 401/403 JSON + CSRF cookie + security headers confirmed by curl, SPA on `:5173` renders live DB-backed status with 0 console errors. GitHub Actions run 2 green: backend (Temurin 21 + postgres:18 service), frontend, and both container image builds passed; run 1 failed only on the frontend image build (COPY outside context) and was fixed in `d53d85a`. Docker remains absent locally. |
| 2 — UI/UX foundation | Tokens, shared components, responsive public/student/admin shells | Done | Design tokens + Tailwind theme; shared components (Button, Input/Textarea/Select with aria wiring, Card, Badge, Alert, Spinner, EmptyState, accessible Modal with focus trap/Escape/backdrop close); responsive AppHeader with mobile disclosure; public/student/admin shells with honest phase placeholders and 404. `npm test` → 31/31, `npm run build` and `npm run lint` pass; all three shells verified in browser with 0 console errors at 912 CSS px (admin nav correctly collapses to the menu below its lg breakpoint). |
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
| CPA-001 | Establish frontend/backend monorepo and reproducible local build | P0 | Done |
| CPA-002 | Add Flyway baseline and PostgreSQL connection configuration | P0 | Done |
| CPA-003 | Add CI checks for frontend, backend, migrations, and dependency auditing | P1 | Done — run 1 exposed a broken frontend image build; run 2 green (frontend, backend, images). Dependency-audit step not yet added. |
| CPA-004 | Implement registration, status, and bootstrap administrator flow | P0 | Backlog |
| CPA-005 | Implement source-aware curriculum importer and review workflow | P0 | Backlog |
| CPA-006 | Provide secure session/CSRF and authorization tests | P0 | Backlog |

## Test record

| Date | Command / check | Result | Notes |
|---|---|---|---|
| 2026-11-10 | GitHub API: academy repository metadata | Passed | `felix202422/CodePath-Academy` is public and empty; verified before cloning. |
| 2026-11-10 | GitHub API: Masterclass tree and license | Passed | Public tree returned, `truncated=false`; MIT license. |
| 2026-11-10 | `pg_isready -h localhost -p 5432` | Passed | Local PostgreSQL 18 accepts connections. |
| 2026-11-10 | `psql -w -h localhost -U postgres -d postgres ...` | Blocked | System service on 5432 rejects passwordless access; no project credentials exist for it. Workaround: isolated project cluster on 5433 (see below). |
| 2026-11-10 | `docker --version` | Blocked | Docker CLI is not installed. |
| 2026-11-10 | `gh auth status` | Blocked | GitHub CLI not logged in; issues/milestones cannot be managed until `gh auth login`. |
| 2026-11-10 | `git push -u origin main` + GitHub API commit check | Passed | Phase 0 root commit `8c3ef41` pushed and verified on `felix202422/CodePath-Academy`. |
| 2026-11-10 | Isolated PostgreSQL cluster on `localhost:5433` (`pg_ctl`/`pg_isready`) | Passed | Project dev cluster under `data/pgdata` (gitignored); databases `codepath_academy` and `codepath_academy_test` created; system service on 5432 untouched. |
| 2026-11-10 | `mvn -B test` (backend, real PostgreSQL 18.6) | Passed | 8/8 tests: `ApplicationSmokeTest` 2, `SecurityAuthorizationTest` 6; Flyway applied V1 to `codepath_academy_test`. |
| 2026-11-10 | `mvn -B -q verify` (CI-equivalent backend command) | Passed | Exit code 0; test schema already at v1 ("No migration necessary"). |
| 2026-11-10 | `npm test` (Vitest 5) | Passed | 9/9 tests: API client contract (5), ApiStatus component (2), App routing (2). |
| 2026-11-10 | `npm run build` (`tsc -b` + Vite 8) | Passed | Exit 0; 140 modules, 292.12 kB JS (91.89 kB gzip), 9.51 kB CSS. |
| 2026-11-10 | `npm run lint` (ESLint 10 flat config) | Passed | 0 errors, 0 warnings. |
| 2026-11-10 | Live API: `GET :8081/api/v1/health`, `/actuator/health`, `/api/v1/openapi.json` | Passed | 200 with `{"status":"UP",...}`; actuator reports liveness/readiness groups; OpenAPI 3.1 doc served; server run applied Flyway V1 to `codepath_academy`. |
| 2026-11-10 | Live security checks via curl | Passed | `/api/v1/me` and `/api/v1/admin/students` → 401 JSON; `POST /api/v1/admin/courses` without CSRF → 403 JSON; `XSRF-TOKEN` cookie issued; `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, CSP present. |
| 2026-11-10 | End-to-end: Vite dev server `:5173` → proxy → API `:8081` → PostgreSQL | Passed | SPA rendered Status `UP`, service `codepath-academy`, live server time; browser console 0 errors. |
| 2026-11-10 | `docker build` / `docker compose up` | Blocked | Docker CLI not installed locally; image builds verified by CI instead (below). |
| 2026-11-10 | GitHub Actions run 1 (`7671a83`) | Failed | Frontend job ✅ (npm ci/test/build), backend job ✅ (Temurin 21 + postgres:18 service, `mvn verify`), container job ❌ — `Dockerfile.frontend` COPYed `nginx.conf` outside its `frontend/` build context. |
| 2026-11-10 | GitHub Actions run 2 (`d53d85a`, root-context fix) | Passed | All 3 jobs green: Backend 04:36:31→04:37:05, Frontend 04:36:31→04:36:46, Container images 04:37:08→04:39:20 UTC. First local validation of the backend on Java 21. |
| 2026-11-10 | Phase 2: `npm test` (Vitest) | Passed | 31/31 tests across 7 files: App routing (5), ApiStatus (2), API client (5), Button (4), Field (6), Modal (5), layouts (4). |
| 2026-11-10 | Phase 2: `npm run build` + `npm run lint` | Passed | tsc + Vite: 2196 modules, 313.66 kB JS (98.43 kB gzip), 20.94 kB CSS; ESLint 0 errors/warnings. |
| 2026-11-10 | Phase 2: browser check of all three shells | Passed | Public home, student, and admin shells render with 0 console errors; mobile menu toggles with correct aria state; admin header no longer wraps at 912 CSS px (DPR 1.25); badge hidden below xl as designed. |

Feature-specific test results will be added as those features are implemented.
