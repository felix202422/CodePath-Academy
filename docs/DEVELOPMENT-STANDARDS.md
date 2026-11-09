# Development standards

These standards apply to every phase of CodePath-Academy. They exist so the codebase stays
consistent and reviewable as it grows.

## Git workflow

- Workflow: `Backlog → To Do → In Progress → Code Review → Testing → Done`.
- Work on `main` directly for this project unless a change is risky enough to warrant a branch.
- Commit messages are imperative and scoped: `feat(auth): add registration approval flow`,
  `fix(enrollment): prevent duplicate pending requests`, `test(progress): cover lesson completion`.
- Never force-push. Never commit secrets, `.env` files, credentials, or access tokens.
- One logical change per commit; leave the tree buildable at every commit.

## Backend (Java / Spring Boot)

- Java 21 language level. Maven wrapper conventions via the parent POM; pin dependency versions.
- Package layout by domain: `identity`, `curriculum`, `enrollment`, `learning`, `assessment`,
  `administration`, `importer`, `common`. Within a domain: `api` (controllers/DTOs), `service`,
  `repository`, `model` (JPA entities).
- Controllers only validate, authorize, and delegate. Business rules live in services.
- DTOs at the API boundary; entities are never serialized directly.
- Validate every request with Bean Validation; return consistent problem responses from one
  centralized exception handler.
- All authorization decisions are enforced server-side. Route-level rules are never the only check
  when an object belongs to a user (course, enrollment, attempt).
- Migrations are additive Flyway scripts under `src/main/resources/db/migration`. Never edit an
  applied migration; write a new one. Hibernate schema generation stays disabled in production.
- Tests: JUnit 5 + MockMvc for API behavior, repository tests against the H2 PostgreSQL profile by
  default, Testcontainers PostgreSQL for integration tests where Docker is available.

## Frontend (React / TypeScript)

- Strict TypeScript (`strict: true`, `noUncheckedIndexedAccess`). No `any` without a written reason.
- Feature folders under `src/features/`; shared UI in `src/components/ui/`.
- Server state via TanStack Query; forms via React Hook Form + Zod schemas shared with API rules.
- Every API call goes through one typed client (`src/lib/api.ts`) so errors and auth handling are
  centralized.
- Styling through Tailwind utility classes and design tokens in `src/styles/tokens.css`. Use the
  palette from the project brief; do not introduce one-off colors.
- Accessible by default: semantic HTML, labeled controls, visible focus, keyboard support, and
  contrast checked against the token palette.
- Tests with Vitest + Testing Library for components and user workflows.

## Security

- Passwords hashed with BCrypt via Spring Security; never logged, never stored in plaintext.
- Session cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production; CSRF tokens required
  for browser mutations.
- Markdown is rendered with sanitization and no raw HTML; uploads are validated by type, size, and
  stored outside the web root with generated names.
- Secrets come from environment variables only. `.env.example` documents names, never values.
- Every new protected endpoint gets a test proving an anonymous user and the wrong role are denied.

## Documentation

- Update `docs/IMPLEMENTATION-REGISTER.md` in the same change as the work it records.
- Record real test commands and results only. Never claim a pass that was not executed.
- Decision changes go into `docs/ARCHITECTURE.md`; source-integration changes go into
  `docs/CONTENT-INTEGRATION.md`.
