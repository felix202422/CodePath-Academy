# Production readiness verification checklist

Every row below maps a requirement to where it is implemented and to the tool
that verifies it. Nothing is marked verified without a real executed run; the
latest results are recorded in [`IMPLEMENTATION-REGISTER.md`](./IMPLEMENTATION-REGISTER.md)
and the tools section of this document.

**Last full verification run:** 2026-11-19 (local dev stack: PostgreSQL 18.6 on
`:5433`, backend jar on `:8082`, Vite on `:5173`).

## Tools

| Tool | Command | What it verifies | Latest result |
|---|---|---|---|
| Frontend unit/integration tests | `npm test` (in `frontend/`) | Page meta contracts, consent store, analytics gating, cookie banner, contact/legal/admin pages, layouts, component behaviour | **146/146 passed** (23 files) |
| Frontend lint | `npm run lint` | ESLint rules incl. hooks correctness | **0 errors, 0 warnings** |
| Frontend build | `npm run build` | `tsc -b` type-check + Vite production bundle (incl. `%VITE_SITE_URL%` normalization) | **exit 0** (pre-existing >500 kB chunk advisory only) |
| Backend test suite | `mvn -B verify` (in `backend/`) | 96 tests on real PostgreSQL: API contracts, security, SEO crawler files, contact inbox, admin flows | **96/96, BUILD SUCCESS** |
| Site readiness checker | `python scripts/verify_site.py [--base URL --api URL]` | 84 static/live checks: crawler files, sitemap coverage vs. the public API, social-preview tags, favicon/manifest assets, API security headers, honest 401s, CSRF/validation contracts | **84 passed, 0 failed, 0 skipped — PASS** |
| Lighthouse (in-app browser) | audit of `/`, `/courses/computer-foundations`, `/paths/software-engineering` | Accessibility, best practices, SEO categories + failure details | **100 / 100 / 100 on all three pages, 0 failures** |
| CI (GitHub Actions) | every push to `main` (`/.github/workflows/ci.yml`) | frontend `npm ci` + test + build + `npm audit --audit-level=critical`; backend `mvn verify` against a `postgres:18` service; container image builds + `nginx -t` config validation | Green on runs through Wave D (`a7a8568`); each wave is pushed and re-verified |

Run order for a full local pass: start PostgreSQL + backend + Vite (see
[`DEVELOPMENT.md`](./DEVELOPMENT.md)), then `mvn -B verify`, `npm test`,
`npm run lint`, `npm run build`, `python scripts/verify_site.py`, and a
Lighthouse audit in the in-app browser.

## 1. Repository and documentation

| Requirement | Implementation | Verification |
|---|---|---|
| Professional repository files, none empty or decorative | `README.md`, `LICENSE` (MIT), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` (private reporting channel), `CHANGELOG.md` (Keep a Changelog), `.gitignore`, `.editorconfig`, `.gitattributes`, `.env.example`, `Dockerfile`/`Dockerfile.frontend`, `docker-compose.yml`, `.github/workflows/ci.yml`, issue + PR templates, `docs/` (architecture, database, API, deployment, development, content integration, design reference, development standards, image attributions, this checklist) | Files reviewed for real content each wave; docs updated with each phase (register test records cite the edits); CI parses the workflow on every push |
| Honest status tracking | `docs/IMPLEMENTATION-REGISTER.md` — phases move to Done only with executed test evidence; blockers recorded as blockers | Every Done row cites an executed command and its real output |

## 2. Discovery and social (SEO)

| Requirement | Implementation | Verification |
|---|---|---|
| Custom 404 page | `features/errors/NotFoundPage.tsx`, routed for unknown paths with `noindex` meta | `pageMeta.test.ts` soft-404 cases; live browser visit to an unknown URL |
| Unique meta title + description per page | `lib/pageMeta.ts` + `usePageMeta` on every route; static fallback tags in `index.html` | `pageMeta.test.ts` (unique public titles/descriptions, dynamic course/path meta, private-shell `noindex`), `legalPages.test.tsx`; `verify_site.py` checks the static tag inventory; live meta reads on `/contact`, `/privacy`, `/terms` |
| Above-the-fold CTA | Hero CTAs on `/` (`HomePage.tsx` — "Browse courses", "Explore learning paths") in the first viewport; sticky quick-actions bar on mobile | Live measurement: hero CTA rect top 493 px within a 670 px viewport; sticky bar verified pinned with reserved padding (register, Phase 13/14) |
| Full favicon set + web manifest | `frontend/public/`: `favicon.svg`, `favicon.ico`, 16/32 px PNG, `apple-touch-icon.png`, 192/512 px icons + maskable variants, `site.webmanifest` with 16–512 px declarations | `verify_site.py` fetches every icon (rejecting SPA-fallback HTML), validates manifest JSON and cross-checks each manifest `src` resolves to a real file — all present |
| `robots.txt` blocks private areas only | Backend `SeoController` (root path, forwarded by Vite proxy and Nginx edge): disallows `/student`, `/admin`, `/api/`, `/actuator`; advertises the sitemap | `SeoControllerTest`, `SeoEndpointsTest` (live HTTP contract); `verify_site.py` asserts all four disallows and that public routes are **not** blocked |
| Automatic sitemap, public pages only | `SeoController.PUBLIC_ROUTES` (7 static routes: `/`, `/courses`, `/paths`, `/about`, `/contact`, `/privacy`, `/terms`) + every **published** path/course, `lastmod` from `updated_at`, absolute URLs from `APP_PUBLIC_BASE_URL` | `SeoControllerTest` (10/10 with the Wave E route additions), `SeoEndpointsTest` (34 baseline URLs = 7 + 7 + 20; draft/orphan content excluded); `verify_site.py` diffs the sitemap against the live public API — 0 missing, 0 duplicates, no private/auth routes |
| Original OG image + OG/Twitter metadata | Original 1200×630 card `images/og/codepath-academy-og.png`; static OG/Twitter/canonical tags in `index.html` (`%VITE_SITE_URL%` token, slash-less, normalized by `vite.config.ts`), rewritten per route client-side by `pageMeta.ts` | `verify_site.py` requires og:type/title/description/url/image + image:width/height/alt and twitter:card/title/description/image; build verified in unset/set/restored `VITE_SITE_URL` modes (register, Phase 12) |
| Alt-text audit | Every `<img>` carries meaningful `alt` (`CourseCard`, `CatalogPage`, `MarkdownContent` renderer falls back to `''` only when the source has none) | Repo-wide `<img>` audit: 3 sites, all with `alt`; Lighthouse image-alt audit passes on all three audited pages |
| Compressed, lazy images | All content images are pre-compressed WebP (10 files, 1.09 MB total, largest 273 KB) with `loading="lazy"` + `decoding="async"` on every render site | File-size inventory + grep for `loading="lazy"`/`decoding="async"` covering all 3 `<img>` sites |
| Indexing controls | `index, follow` on indexable pages; `noindex` on login/register/student/admin/404/placeholders/thank-you; robots + sitemap agree with the visibility rules | `pageMeta.test.ts`, `legalPages.test.tsx`, `adminPages.test.tsx`; live reads (`/contact/thank-you` → `noindex, nofollow`; `/admin/messages` → `noindex, nofollow`) |
| Mobile breakpoints + safe-area sticky CTA | Responsive type/layout tokens throughout; `StickyMobileCta` (`bottom: 0`, hidden below `xl`, `env(safe-area-inset-bottom)` padding) with matching page padding so content is never covered | `StickyMobileCta.test.tsx` (safe-area padding), `layouts.test.tsx` (reserved `pb-[calc(5rem_+_env(safe-area-inset-bottom))]`); live measurement at 883×670 (register, Phase 13) |

## 3. Privacy, consent, and honest contact

| Requirement | Implementation | Verification |
|---|---|---|
| Functional contact form with backend | `/contact` (React Hook Form + Zod, inline field errors) → `POST /api/v1/contact` (anonymous, CSRF kept, bean validation, ack-only 201 that never echoes data) → Flyway V6 `contact_message` table → admin inbox `/admin/messages` (unread-first, idempotent mark-read) | `ContactApiTest` (6), `contactPages.test.tsx` (5); live end-to-end: submit → thank-you → inbox row → mark read → persists after reload; empty submit → 4 honest field alerts with no navigation |
| Thank-you page without implied approval | `/contact/thank-you`: "recorded for administrator review", explicitly does **not** guarantee a reply, `noindex, nofollow` | `contactPages.test.tsx`; live read of title/h1/copy/robots |
| Privacy Policy and Terms | Indexable `/privacy` and `/terms` with unique titles/descriptions, GDPR-style wording, cookie-preferences entry point | `legalPages.test.tsx` (7); live meta reads (unique title + description, `index, follow`, absolute canonical) |
| Real contact details, never invented | Optional `VITE_CONTACT_EMAIL` mailto shown **only** when configured; empty default hides it; form works without it | `contactPages.test.tsx` (mailto only when env set); `.env.example` documents both optional vars |
| Cookie banner + preference center | First-visit notice (`components/cookie/CookieBanner.tsx`) with always-on essential category, explicit analytics opt-in, preference center re-openable from the footer; decision persisted in `localStorage` (`lib/consent.ts`) with in-memory fallback only when storage fails | `consent.test.ts` (9), `CookieBanner.test.tsx` (6); live flow: first visit → "Essential only" → persisted `{"analytics":false}` → banner gone → footer reopen → toggle + save → `analytics:true` persists across navigation |
| Consent-gated pluggable analytics, no PII | `lib/analytics.ts`: no script and no events without explicit stored consent; `VITE_ANALYTICS_URL` empty (default) = nothing loads even with consent; events carry names only | `analytics.test.ts` (5); live: consent `analytics:true` stored, yet no `cpa-analytics-script` element and no third-party request (no provider configured — correct) |
| Two fixed bars never stack | Sticky CTA waits for a cookie decision and hides on `/login`, `/register`, `/privacy`, `/terms`, `/contact*` (`STICKY_CTA_HIDDEN_ON`) | `layouts.test.tsx` (CTA withheld until decision); live: absent while undecided, visible on `/` after deciding, absent on `/contact/thank-you` |

## 4. Quality: semantics, accessibility, resilience

| Requirement | Implementation | Verification |
|---|---|---|
| Semantic HTML | Landmark elements (`header`/`nav`/`main`/`footer`/`section` with `aria-labelledby`), lists for catalogs, real tables with `th`, one `h1` per page | Lighthouse SEO + axe audits pass; a11y-tree snapshots during live walkthroughs |
| Keyboard and focus | Visible `:focus-visible` outline on all controls; focusable modal with ARIA wiring; `buttonClasses()` gives anchors button-like focus styling | Register Phase 13 live check (2 px solid accent-500 outline); Lighthouse target-size and focus audits pass |
| Valid interactive nesting | `buttonStyles.ts` `buttonClasses()` used for every navigating control; **no** `<button>` inside `<a>`/`<Link>` anywhere (14 sites converted across 10 files in Wave E) | Recursive source scan returns zero nestings; Lighthouse `target-size` failure (159×1.6 px frame) eliminated |
| Accessible names match visible text | Logo links `aria-label="CP CodePath Academy home"` with an explicit text node between badge and wordmark so the visible label is contained in the name | axe 4.12 `label-content-name-mismatch`: 0 violations (was 2 nodes); Lighthouse a11y 92 → 100 |
| Contrast | Hero paragraph `text-slate-600` on accent-50 (was 4.25:1); in-text links underlined (`underline underline-offset-2`) so links are not color-only | Lighthouse `color-contrast` and `link-in-text-block` failures eliminated (homepage and course page re-audited to 100) |
| Error boundaries | `AppErrorBoundary` + per-route `RouteErrorBoundary` with a real recovery action | Rendered-error tests in the suite; boundary present in every route tree |
| Secure external links | `rel="noopener noreferrer"` + `target="_blank"` on external anchors (incl. `MarkdownContent` renderer and the curriculum-repo link) | Phase 13 audit; Lighthouse `best-practices` 100 |
| Skeletons and form error states | Shared `Skeleton` primitive for loading states; `role="alert"` field errors on forms | `Skeleton`/form tests in the suite; live empty-submit produced 4 alerts |
| Responsive typography | Fluid `text-*` scales and `sm:`/`md:` steps in tokens; headings tested at mobile width | Register Phase 13 (883 px walkthrough) |

## 5. Security and access control (enforced by the backend)

| Requirement | Implementation | Verification |
|---|---|---|
| Backend enforces access/progress | Session + CSRF security, role guards, ownership scoping, JSON 401/403 handlers | Full backend suite (96/96), incl. anonymous/role sweeps (e.g. admin inbox rejects anonymous) |
| No private-area indexing | robots disallow + `noindex` meta + sitemap visibility rules all derived from the same published-only logic | `SeoControllerTest`, `SeoEndpointsTest`, `pageMeta.test.ts`, `verify_site.py` cross-checks |
| Security headers | `X-Content-Type-Options`, CSP with `frame-ancestors`, frame options on API responses (edge headers declared per-location in `infra/docker/nginx.conf`) | `verify_site.py` header checks against the live API; CI `nginx -t` validates the edge config (nginx is not installed on the dev machine) |
| Secrets never committed | `.env.example` carries names and empty/placeholder values only; `VITE_` vars are public by design and documented as such | `.gitignore` + repository review each wave |

## 6. Honest limitations (not claimed as complete)

- **Deployment is prepare-only.** No cloud provisioning or live origin exists
  (excluded pending authorization), so edge-only behaviour — immutable asset
  caching, HSTS over TLS, gzip/brotli — is specified in
  `infra/docker/nginx.conf`, validated by CI's `nginx -t`, and documented in
  `DEPLOYMENT.md`, but cannot be exercised end-to-end here. `verify_site.py`
  reports these as SKIP with that reason when the origin sets no
  `Cache-Control` (the dev server).
- **Social preview tags are static + client-rewritten.** Non-JavaScript
  scrapers see the `index.html` defaults (site-level title/description/OG
  image); per-route values are applied client-side by `pageMeta.ts`. The
  contract is tested both ways; there is no server-side HTML rendering (SPA by
  design).
- **No mail delivery.** The contact form stores messages for the admin inbox;
  no SMTP integration exists. A `mailto:` fallback appears only if
  `VITE_CONTACT_EMAIL` is configured — nothing is invented.
- **Analytics ships disabled.** Without `VITE_ANALYTICS_URL` nothing loads
  regardless of consent; with it, the tag still requires an explicit opt-in.
  No analytics provider is configured or endorsed by this repository.
- **Browser-based checks are manual.** Lighthouse and the live walkthroughs
  run in the in-app browser against the local dev stack; they are recorded as
  executed runs, not automated CI gates. `verify_site.py` is read-only by
  design (its contact check submits an intentionally invalid payload).
- **Images use one size per slot.** Content images are compressed WebP with
  lazy/async loading but no `srcset` variants; files are small enough for the
  display boxes used (largest 273 KB). Revisit if the catalog grows
  photographic hero art.
- **`gh` CLI is unauthenticated on this machine**, so CI results are read via
  the public GitHub API; pushing itself uses stored Git credentials.
