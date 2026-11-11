# Curriculum integration audit and plan

## Source audit (read-only)

- Repository: <https://github.com/felix202422/CodePath-Masterclass>
- Owner: `felix202422`
- Visibility: public
- License: MIT (`LICENSE`, copyright Felix Haule, 2026)
- Default branch: `main`
- Audited commit: `62afa4143c26c036169429810fe8bc0b4e9a4de6` (tree `63982eb1210f3aceed170a7468a6696d4ff36d6e`)
- Tree response: 567 files; 531 Markdown files; 9 SVG assets; 10 SQL files.
- The source completion report describes 22 curriculum subjects, 279 lessons, 133 separated
  solution files, 267 Mermaid diagrams, and seven project briefs plus a capstone.
- The curriculum is a self-study textbook, not a runtime package. Subject `README.md` files define
  prerequisites, order, exercises, and expected outcomes; individual lessons are Markdown.

No files were changed in the curriculum repository. Its public MIT license permits redistribution
under its conditions; imported substantial copies must preserve the copyright and license notice
and cite the source repository and commit.

## Initial path mapping

These are draft learning paths, not claims of complete programs. The public catalog
publishes course *metadata* (titles, summaries, levels, prerequisites) seeded from the
audited source once a path is reviewed; lesson content rows are never seeded — they
enter the database only through the importer below and stay invisible until an
administrator publishes them.

| Academy path | Candidate source subjects | Audit note |
|---|---|---|
| Software Engineering | 01–05, 13–14, 19–20 | Broad source coverage; split subject courses by prerequisites. |
| Frontend Development | 06–09 | Strong HTML/CSS, JavaScript/TypeScript, React, accessibility, and projects. |
| Backend Development | 03, 10–11, 15 | Java/Spring Boot, REST, persistence, testing, and security coverage. |
| Database Engineering | 10 | Dedicated relational design, SQL, PostgreSQL, transactions, and query topics. |
| Mobile Development | 12 | Dedicated Dart/Flutter subject and project materials. |
| Cybersecurity | 15, with related 11/16/17 material | Dedicated application-security subject; publish only after review of lab safety and completeness. |
| Computer Networking | 06 and networking portions of 16–17 | No dedicated end-to-end networking subject was found in the tree; keep this path draft-only until validated material exists. |
| DevOps and Cloud | 16–18 | Dedicated DevOps, cloud/production, and advanced engineering subjects. |

## Importer behavior

1. Read a pinned Git tree and supported Markdown, SVG, and explicitly supported resource files.
2. Identify subject directories from the numbered curriculum structure and lesson files from the
   source lesson template/subject index; exclude solutions and administrative documents by default.
3. Extract titles, headings, Markdown body, fenced code, relative links, diagrams, exercises, and
   project references without flattening code blocks.
4. Resolve relative images/assets and copy supported files into academy-managed media storage.
5. Map source subjects to draft academy paths/courses; allow an administrator to revise mappings.
6. Record repository, commit, file path, SHA-256, and import outcome. The same source/hash cannot
   create duplicate lessons.
7. If source content changed, stage a reviewable diff. Never silently replace a lesson edited in the
   academy.
8. Leave imports unpublished until an administrator reviews and publishes them.
9. Provide a documented local-directory import mode for source outages or environments without
   outbound GitHub access.

The initial audit used GitHub's public API and raw content endpoints. The importer must be verified
against a local clone/archive and representative nested paths before any source lessons are
published.

## Implementation notes (Phase 5)

How the nine behaviors are concretely realized; verified by `LessonIndexParserTest`,
`CurriculumImporterTest`, and `AdminCatalogApiTest`.

- **Source selection (1, 9).** `CurriculumSourceFactory` builds a `GitHubCurriculumSource`
  (default-branch head, or the immutable `APP_CURRICULUM_COMMIT` pin when set) or a
  `LocalDirectorySource` when `APP_CURRICULUM_LOCAL_PATH` points at a checkout — the documented
  outage/no-egress mode. Every run records the resolved 40-hex commit on each row.
- **Subject/lesson discovery (2).** Subject directories are the numbered top-level folders
  (`^\d{2}-[A-Z0-9][A-Z0-9-]*$`). The `## Lessons` index inside the subject `README.md` is the
  authoritative lesson list — there is no directory scan, so unindexed material never enters the
  academy. The parser reads links (`[text](path.md)`) and backtick paths (`path.md`) in a single
  pass in document order, de-duplicates, and rejects `../`, absolute, scheme, and non-`.md`
  entries. Index entries whose files are missing become warnings, not failures.
- **Exclusions (2).** Entries under `exercises/` and `solutions/` (top-level of the entry path,
  case-insensitive) are skipped before any read. Subjects without `README.md` are skipped with a
  warning; subjects with no `## Lessons` section contribute nothing.
- **Content transformation (3, 4).** `MarkdownTransformer` rewrites only relative image/link
  targets: images are copied into the media root under their subject-relative location and
  repointed to `/media/...`; lesson links become pinned GitHub permalinks (`/blob/<commit>/...`),
  with query/heading fragments excluded from the file-existence check and preserved on the link.
  Fenced code is never rewritten. Every body receives an attribution footer —
  `Imported from [CodePath-Masterclass](<repository>) — `<path> @ <commit>`, MIT © Felix Haule 2026.`
  — and display fields (title/summary) are derived from the **raw** source so the footer can never
  leak into them. Relative media files are counted as unique stored locations.
- **Mapping (5).** Each imported subject maps to its academy course via the seeded
  `course.source_path` column (`V3` migration seeds all 20 slugs); one lazy `Core lessons` module
  per course (`course_module.source_path` = subject). Subjects with lessons but no course mapping
  are reported in `unmappedSubjects` instead of failing.
- **Provenance and idempotency (6).** Every processed file records `(repository, path, hash)` in
  `content_import` (unique index `(repo, path, hash)`; `V3` adds `ux_course_source_path`,
  `ux_course_module_source`, `ix_content_import_status_path`). A re-run whose recorded row exists
  with status ≠ `FAILED` skips the file entirely — this is what makes runs idempotent **and**
  stops a discarded conflict from being re-staged. Only `FAILED` rows are retried.
- **Conflict staging (7).** A changed source version updates an unedited `DRAFT` lesson in place
  and auto-resolves any older staged conflict for that file. If the lesson is `editedByAdmin` **or**
  `PUBLISHED`, the new version is staged as a `CONFLICT` row with `proposedBody` instead; the
  academy body is untouched. **Accept** applies the proposal (re-derives title/summary, updates
  hashes, clears `editedByAdmin`, row → `IMPORTED`, records `resolvedAt`/`resolvedById`); **discard**
  keeps the academy version and sets `editedByAdmin = true` (row → `UNCHANGED`) — the flag is what
  makes future runs respect the decision. Both drop `proposedBody`; acting on a non-`CONFLICT` row
  is a 409.
- **Publication gate (8).** Imports create `DRAFT` lessons and `DRAFT` modules only; the public
  catalog counts published rows exclusively, so imported content is invisible until published
  through the normal bottom-up cascade.
- **Failure isolation.** A file that exists but cannot be processed (e.g. slug collision) records a
  `FAILED` row with the cause and the run continues; missing/unreadable files are warnings only.
  Warnings are capped at 50 with the overflow summarized in the final entry.

## Local-clone verification (2026-11-11)

The running API was configured with `APP_CURRICULUM_LOCAL_PATH` pointing at the read-only working
clone under `data/masterclass` and invoked through the authenticated admin import endpoint. Against
commit `62afa4143c26c036169429810fe8bc0b4e9a4de6`, the run scanned 22 subjects, created 271 DRAFT
lessons, stored 8 media files, and reported 0 failures and 0 warnings. The idempotency rerun
created 0 lessons, counted all 271 as unchanged, stored no additional media, and also had 0
failures/warnings. README heading links resolved and no longer emitted false "target not found"
warnings. No source repository files were changed, and no imported content was published.
