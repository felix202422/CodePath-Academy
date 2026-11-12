# Frontend visual reference

**Recorded:** 2026-11-11 — by explicit user direction: when work continues, the frontend view
**must resemble this reference**. This document is the acceptance target for frontend work in
every phase that touches the UI.

**Reference:** RIA LMS course catalog —
<https://learn.rasainstituteofanalytics.org/courses> (screenshot provided 2026-11-11; live site
inspected the same day).

## What "resemble" means

Same layout structure, component vocabulary, and visual language as the reference, filled with
CodePath Academy's own (real) content. The reference fixes the *design*; our data model fixes the
*content*. Never invent data to imitate the reference — see "Honest adaptation rules" below.

## Region-by-region inventory

1. **Header** (sticky, white): brand mark + wordmark left; primary nav (Home, Courses ▾ with
    caret, Career Paths, About Us, Contact); wide search input with icon ("Search for
    courses..."); right actions: outlined "Sign In" button + solid primary "Apply Now" button.
   CodePath Academy has no maintained Contact page or contact address, so that link is omitted
   rather than sent to a placeholder.
2. **Courses mega-menu** (opens under the nav item): two columns —
   "Course Categories" with an icon and a per-category count for each category (two sub-columns)
   plus a "View All Courses →" link; "Popular Courses" column with thumbnail, title, and star
   rating (score + review count).
3. **Hero band** (catalog page): very light lavender background, large heading with the final
   word in the primary color ("Explore Our **Courses**"), one line of supporting copy,
   decorative illustration at the right.
4. **Filter sidebar** (left card): "Filters" heading + "Clear All" link; Search field; Category
   select; Level checkboxes with per-level counts (All Levels / Beginner / Intermediate /
   Advanced); Type checkboxes (Free / Paid / Subscription); solid "Apply Filters" button; "Reset"
   link with icon.
5. **Results bar**: "Showing 1 to 12 of 120 results" at the left; "Sort by" select at the right
   (default "Most Popular").
6. **Course grid**: 4 columns (responsive down to 1 on mobile). White rounded cards with:
   cover image carrying a corner badge (BEST SELLER / POPULAR / TRENDING) and a wishlist heart;
   chip row (category · level · type); two-line title; instructor name; meta row (duration,
   enrolled count); footer with star rating + review count on the left and price on the right
   (green "Free" when free).
7. **Pagination**: prev/next arrows plus numbered pages, active page as a solid primary chip,
   "…" ellipsis before the last page.
8. **CTA banner + rich footer** (admissions banner; quick links, contact, copyright).

## Visual language

- **Primary color:** indigo `#4f46e5` family (confirmed on the live site), with deep violet
  accents; hero band a very light indigo/lavender (`#eef2ff`-like); white cards on a light
  canvas; soft borders and shadows; ~10–14 px corner radii; chip-style tags; solid indigo
  buttons with white text; outlined secondary buttons.
- **Typography:** modern sans (Inter-like) — already our token font.
- **Pattern:** everything is a card or a rounded control; generous whitespace; counts and
  metadata shown inline as small muted text with icons.

## Honest adaptation rules (CodePath Academy data)

| Reference element | Our implementation |
|---|---|
| Category list/filter with counts | Learning paths — the 7 published paths with real per-path course counts (same data the homepage shows today); changing category updates results immediately |
| Level checkboxes with counts | `CourseLevel` BEGINNER / INTERMEDIATE / ADVANCED with real counts from the catalog data |
| Type (Free / Paid / Subscription), price, Min/Max Price | **Omit** — the product has no pricing model |
| Duration filter, duration meta | Show only once `estimated_hours` is populated (currently NULL) |
| Instructor, enrolled count, star rating, review count | Show the real approved-enrollment count from the Phase 6 ledger. Omit instructor/review metrics until those workflows collect genuine records; never fake them. |
| Wishlist heart | Persist the learner's favorite course slugs in this browser and provide an explicit Favorites view; this is not popularity or enrollment data. |
| Corner badges (BEST SELLER / POPULAR / TRENDING) | Only real signals — e.g. "Start here" from the overview's start-here set |
| Sort: Most Popular / Top Rated | Only real sorts — Curriculum order (default), Title A–Z, Level |
| Cover images / illustration | Use genuine, locally bundled course-related photos under a permissive license; keep a photo credit/license record. Do not fabricate screenshots, ratings, or course metadata. |
| Header search | Filters the public catalog client-side now; wire to a backend `?q=` when server search lands |
| Pagination | Driven by real totals; page size 12; backend paging added when the catalog outgrows one page |
| Popular-courses mega-menu column | Populate only after real popularity data exists; until then the mega-menu shows categories with counts only |
| Contact navigation | Omit until the academy has a real contact destination; do not link to a placeholder. |
| Theme | Persistent light/dark toggle in the public, student, and admin headers; colors remain token-driven and follow reduced-motion preferences. |

## Gap vs current UI (Phase 4 baseline)

- [x] Header: added client-side course search, an accessible Courses mega-menu with real path
      counts, mobile navigation, outlined "Sign In" and solid "Apply Now" (registration) actions.
      The menu intentionally has no popularity column; there is no Contact link without a real
      destination.
- [x] Hero band with an accent-colored final word on home/catalog; the course hero uses a real,
      locally licensed photo of learners working with code, and the home hero uses token-based
      decorative artwork.
- [x] Replaced chip-only filtering with a filter sidebar for real learning paths, levels, and
      search, including real counts and Clear All. Results update immediately on every change, so
      the reference's Apply and Reset buttons are omitted. Pricing/type filters are omitted.
- [x] Results bar with real result counts and honest sorts (curriculum order, title A–Z, level).
- [x] Course cards use locally bundled, royalty-free real photographs mapped to the 20 published
      course subjects, real path/level chips, and a "Start here" badge only for courses in the API's
      start-here set. Image sources, photographers, and license are recorded in
      `docs/IMAGE-ATTRIBUTIONS.md`. A heart toggles a browser-local Favorites list. Approved
      enrollment totals are real; unavailable duration, instructor, rating, and price fields are not
      shown.
- [x] Added visible hover/focus lift, accent ring, shadow, course-photo zoom, and button pointer/
      hover feedback; React filter/sort/page changes replay a staggered result entrance.
      `prefers-reduced-motion` disables the animations.
- [x] Home page now includes a factual three-step first-visit guide, reveals its sections as they
      enter the viewport, and has interactive course/path cards. A persistent light/dark toggle is
      available in the top header across the public, student, and admin shells.
- [x] Client-side pagination uses real filtered totals and 12 courses per page.
- [x] Palette moved to indigo/violet theme tokens in `src/styles/tokens.css`; the token comment and
      palette description in `docs/DEVELOPMENT-STANDARDS.md` were updated in the same change.
- [x] Updated catalog/layout tests. Verification: `npm test` → 58/58; `npm run build` and
      `npm run lint` pass. Live browser check: 20 published courses, 7 path categories, 12 results
      on page 1, pagination to page 2, and the hovered card visibly lifts/highlights. No unexpected
      console errors; signed-out sessions may log the expected 401 from `/api/v1/auth/me`.

## Execution note

Recorded while completing Phase 4; the catalog/header restyle was implemented on 2026-11-11 and
the real-photo, first-visit onboarding, scroll-reveal, and theme-toggle refinements were verified on
2026-11-12. Public pages should continue to follow the reference; the student and admin shells keep
their structure while consuming the updated shared indigo/violet tokens.
