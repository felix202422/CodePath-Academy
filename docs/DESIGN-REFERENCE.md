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
| Category list/filter with counts | Learning paths — the 7 published paths with real per-path course counts (same data the homepage shows today) |
| Level checkboxes with counts | `CourseLevel` BEGINNER / INTERMEDIATE / ADVANCED with real counts from the catalog data |
| Type (Free / Paid / Subscription), price, Min/Max Price | **Omit** — the product has no pricing model |
| Duration filter, duration meta | Show only once `estimated_hours` is populated (currently NULL) |
| Instructor, enrolled count, star rating, review count | **Omit until real data exists** (enrollment counts arrive with Phase 6; ratings are not in scope). Never fake them |
| Corner badges (BEST SELLER / POPULAR / TRENDING) | Only real signals — e.g. "Start here" from the overview's start-here set |
| Sort: Most Popular / Top Rated | Only real sorts — Curriculum order (default), Title A–Z, Level |
| Cover images / illustration | No course artwork exists; build typographic/gradient covers from the course title + level using tokens (no fabricated screenshots or stock photos) |
| Header search | Filters the public catalog client-side now; wire to a backend `?q=` when server search lands |
| Pagination | Driven by real totals; page size 12; backend paging added when the catalog outgrows one page |
| Popular-courses mega-menu column | Populate only after real popularity data exists; until then the mega-menu shows categories with counts only |

## Gap vs current UI (Phase 4 baseline)

- [ ] Header: add the search field and the Courses mega-menu (currently plain nav + mobile
      disclosure); decide the primary right-hand action for our shell ("Sign In" applies;
      "Apply Now" maps to registration).
- [ ] Hero band with an accent-colored final word on home/catalog.
- [ ] Replace chip-only filtering with the filter sidebar (path, level) incl. counts,
      Clear/Reset/Apply controls.
- [ ] Results bar with counts and a sort select.
- [ ] Course card upgrade to the reference structure (cover, chips, meta, footer) — honest
      variant per the rules above.
- [ ] Pagination component (real totals).
- [ ] Palette: move `--color-navy-*` / `--color-accent-*` in `src/styles/tokens.css` to the
      indigo/violet family; components keep consuming tokens only. Update the tokens.css header
      comment and the palette line in `docs/DEVELOPMENT-STANDARDS.md` in the same change.
- [ ] Update `catalogPages.test.tsx` and routing tests for the new structure; keep a11y and
      0-console-error browser checks green.

## Execution note

Recorded while completing Phase 4; **no UI code changed yet**. The next phase that touches the
public frontend implements this document and verifies it in the browser against the reference.
Public pages must resemble the reference closely; the student and admin shells keep their
structure but adopt the same tokens and visual language.
