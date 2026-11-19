# Database

PostgreSQL 18 with schema managed exclusively by [Flyway](https://flywaydb.org). Hibernate's
`ddl-auto` is `validate` in every environment: the schema comes from migrations, never from
ORM generation.

## Connection

| Environment | Source of truth |
|---|---|
| Local dev | `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` (see `.env.example`) |
| Tests | `TEST_DB_URL` / `TEST_DB_USERNAME` / `TEST_DB_PASSWORD`; defaults point at `codepath_academy_test` on port 5433 (see `docs/DEVELOPMENT.md`) |
| CI | `postgres:18-alpine` service container; values supplied as workflow env |
| Containers | Same `DB_*` variables passed by Compose / deployment environment |

Flyway runs automatically at startup against `classpath:db/migration`. Production deploys apply
migrations as a release step.

## Migrations

Location: `backend/src/main/resources/db/migration/`. Versioned, additive-only scripts:

| Migration | Contents |
|---|---|
| `V1__baseline_schema.sql` | Core schema: accounts, registration review, catalog, enrollment, progress, assessments, announcements, notifications, imports, audit, Spring Session tables |
| `V2__seed_public_catalog.sql` | Published seed catalog (7 learning paths, 20 courses, prerequisite chains) |
| `V3__phase5_content_management.sql` | `source_path` columns, import conflict staging (`proposed_body`, `resolved_at`, `resolved_by_id`), partial unique indexes |
| `V4__phase8_assessments.sql` | `assessment_question.correct_text` (short-answer key) |
| `V5__phase9_administration.sql` | `announcement.course_id` (null = platform-wide) + feed index |

Rules:

- **Never edit an applied migration.** Write a new `V{n}__…` script.
- Migrations are idempotent where possible and safe to run on a populated database.
- Indexes target real query paths (see `docs/ARCHITECTURE.md` → Data model).

## Schema overview

| Area | Tables |
|---|---|
| Identity | `app_user`, `registration_request` |
| Catalog | `learning_path`, `course`, `course_prerequisite`, `course_module`, `lesson`, `lesson_resource` |
| Enrollment | `course_enrollment` |
| Progress | `lesson_progress` |
| Assessments | `assessment`, `assessment_question`, `assessment_option`, `assessment_attempt`, `assessment_answer`, `assessment_answer_option` |
| Communication | `announcement`, `notification` |
| Operations | `content_import`, `audit_log` |
| Sessions | `SPRING_SESSION`, `SPRING_SESSION_ATTRIBUTES` (Spring Session JDBC) |

Conventions: UUID primary keys, `snake_case` names, `TIMESTAMP WITH TIME ZONE` for instants,
`REFERENCES … ON DELETE` semantics chosen per relationship (e.g. audit actor becomes
`NULL` on user deletion). Publication state is modeled as `status` text columns
(`DRAFT`/`PUBLISHED`, `PENDING`/`ACTIVE`/…) with application-enforced transitions.

## Sessions and audit

- Sessions are rows in `SPRING_SESSION` (30-minute timeout); session cookies are described in
  `docs/ARCHITECTURE.md` → Authentication and authorization.
- `audit_log` is append-only, written after successful `/api/v1/admin/**` mutations, with the
  actor set to `ON DELETE SET NULL` so history survives account removal.

## Backup and restore

See `docs/DEPLOYMENT.md` → Backup and recovery for `pg_dump`/`pg_restore` procedures. Local
development data lives in the gitignored `data/pgdata` cluster and is disposable; the walkthrough
databases (`codepath_academy_*`) are retained only as test fixtures.

## Adding a table or column

1. Write `V{n}__description.sql` (additive).
2. Add/adjust the JPA entity in the owning domain package.
3. Cover the behavior with tests (`mvn -B verify`).
4. Record the migration in this file's table and the register test record.
