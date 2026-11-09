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

These are draft learning paths, not claims of complete programs. Courses are published only after
the imported content and ordering have been reviewed.

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
