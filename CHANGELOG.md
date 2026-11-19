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
- Phase 8 assessments: administrators author assessments on the course detail page (metadata plus
  multiple-choice, true/false, multi-answer, and short-answer questions with a server-stored answer
  key), with whole-set validation before any write; question sets lock once attempts exist — delete
  is blocked and later saves are settings-only unless the set is replaced — and publishing requires
  a published course, a published module when set, and at least one question (Flyway V4 adds
  `correct_text`, never sent to students before submission). Enrolled students list published
  assessments with attempt history (`/api/v1/me/assessments/**`, ROLE_STUDENT), start or resume an
  attempt idempotently, answer under a countdown derived from the server's start time with a
  30-second submission grace, and submit through a two-step confirm; grading happens only on the
  server (`score × 100 ≥ passScorePercent × maxScore`, expired attempts recorded at 0 points), and
  the result screen shows the score, pass mark, and per-question breakdown of the student's answers
  against the stored key.
- Phase 9 administration and analytics: an append-only audit trail written by an
  `AuditInterceptor` after every successful `/api/v1/admin/**` mutation (normalized action,
  entity type from the path, failed writes logged and swallowed — never breaking the action),
  surfaced as an administrator dashboard of live indexed counts plus recent activity, a students
  screen with the registration review queue (approve/reject with optional notes) and
  suspend/reactivate account lifecycle (server-side state rules; suspended accounts are refused
  authenticated access by `AccountStatusFilter` while `/auth/me` still reports honest status),
  announcements with draft-first authoring where publication only ever moves through the explicit
  `/status` transition (Flyway V5 adds `course_id`; status is never accepted from a write payload;
  entering PUBLISHED stamps `publishedAt`), a read-only audit log with entity/limit filters, and a
  student announcement feed (`/api/v1/me/announcements`) that returns only published platform-wide
  or approved-course announcements.
- Phase 10 quality assurance: an end-to-end journey test covering registration → approval →
  bottom-up content authoring/publishing → enrollment → lesson progress → server-graded attempt,
  asserting dashboard deltas and audit rows for every administrative step; a security-hardening
  suite pinning CSP/frame/nosniff headers on success and error responses, HSTS only on secure
  requests, a CORS origin allow-list (foreign origins refused with 403), session-cookie flags
  (HttpOnly, SameSite=Lax, no JSESSIONID), BCrypt-at-rest with no secret material in any API
  view, an authorization sweep of every admin and personal endpoint, and an actuator surface
  limited to health/info; `app.web.cookie-secure` is now live through a
  `DefaultCookieSerializerCustomizer` so deployments behind a TLS-terminating proxy can force the
  `Secure` flag; frontend responsive/accessibility contracts (shared mobile-nav disclosure with
  `aria-expanded`/`aria-controls`, Modal focus trap and focus restoration, reduced-motion-aware
  ScrollReveal, horizontally scrollable admin tables with scoped column headers); and a CI
  dependency-audit gate (`npm audit --audit-level=critical`) closing CPA-003.
- Phase 11 production preparation (part 1 — repository and operations readiness): MIT `LICENSE`,
  `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` with private vulnerability reporting,
  `.gitattributes` line-ending policy, GitHub issue/PR templates; `docs/DATABASE.md`,
  `docs/API.md`, and `docs/DEPLOYMENT.md` (prepare-only status, production checklist, HTTP
  caching policy, backup/restore runbook exercised against the live dev cluster); Nginx edge
  caching (immutable hashed assets, revalidated HTML, 7-day images) with per-location security
  headers, and a CI `nginx -t` validation step. Cloud provisioning and live deployment remain
  excluded pending authorization.
- Phase 12 SEO and social sharing: backend `SeoController` serving `/robots.txt` (disallows only
  `/student`, `/admin`, `/api/`, `/actuator/`) and `/sitemap.xml` (4 static routes plus published
  paths/courses with `lastmod` from `updated_at`) at root paths, forwarded by both the Vite dev
  proxy and the Nginx edge so dev and production behave identically; absolute URLs resolved from
  `APP_PUBLIC_BASE_URL` with a validated Host/X-Forwarded-Proto fallback; `usePageMeta` on all 27
  routes with unique public titles/descriptions, dynamic course/path metadata with soft-404
  `noindex`, and `noindex` on student/admin/login/404/placeholder shells; static OG/Twitter/
  canonical tags in `index.html` with a slash-less `%VITE_SITE_URL%` token normalized at build
  time; an original 1200×630 Open Graph card and the full favicon set (svg/ico/16/32/
  apple-touch/192/512/maskable pair + web manifest) generated by
  `scripts/generate_brand_assets.py`; `VITE_SITE_URL` documented in `.env.example`,
  `docs/API.md`, and `docs/DEPLOYMENT.md`.
- Phase 13 UX and accessibility polish: a shared `Skeleton` primitive with accessible
  status labels now fronts every public catalog surface (home overview, course grid, path
  grid, course/path detail) instead of bare spinners; a sticky mobile CTA bar pinned below
  `xl` for signed-out visitors with `env(safe-area-inset-bottom)` padding and matching
  reserved page padding (hidden on auth/legal routes and for signed-in users); a dedicated
  registration thank-you page at `/register/success` (noindex) that states plainly the
  account is not active yet and never implies approval; a route-aware error boundary that
  turns render crashes into an honest alert fallback with reload/home actions and resets on
  navigation; audit fixes — external links now carry `rel="noopener noreferrer"`, Markdown
  images gained `decoding="async"`, and keyboard focus visibility was verified live
  (`:focus-visible` → 2px solid accent-500).
- Phase 14 privacy, consent, and contact: a public contact form (`/contact`, React Hook
  Form + Zod) backed by `POST /api/v1/contact` — validated, CSRF-protected, ack-only 201
  with no echoed data — storing messages in the new Flyway V6 `contact_message` table for
  an administrator inbox at `/admin/messages` (unread-first list, idempotent mark-read);
  a thank-you page at `/contact/thank-you` that states plainly the message is recorded for
  review and does not guarantee a reply; indexable Privacy Policy (`/privacy`) and Terms of
  Use (`/terms`) pages with unique meta, GDPR-style wording, and no invented contact details
  (an optional `VITE_CONTACT_EMAIL` mailto is shown only when configured); a cookie notice
  with an always-on essential category, an explicit analytics opt-in, and a preference
  center re-openable from the footer — the choice persists in `localStorage` and gates a
  pluggable analytics loader (`VITE_ANALYTICS_URL`, default off, name-only events, no PII);
  the sticky mobile CTA now waits for the cookie decision so two fixed bars never stack;
  and `docs/API.md`, `docs/DATABASE.md`, `docs/DEPLOYMENT.md` gained the contact/inbox,
  V6, and CSP `script-src` notes.

[Unreleased]: https://github.com/felix202422/CodePath-Academy/commits/main
