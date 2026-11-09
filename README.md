# CodePath-Academy

**Learn. Build. Innovate. Become.**

CodePath-Academy is a database-backed technology learning platform for structured courses,
administrator-approved registration and enrollment, practical lessons, assessments, and persistent
learning progress. The academy application is independent of the educational-resource repository;
it imports licensed curriculum and stores the published content in its own database and media store.

> **Status:** active development. This repository is not deployed. The current development machine
> has Node.js 24, Maven, Java 25, and PostgreSQL 18; Docker and Java 21 are not installed. The
> PostgreSQL service is running, but local database credentials have not been configured for this
> project. Git push works through stored credentials; the GitHub CLI is not authenticated.

## Repositories

- Application: <https://github.com/felix202422/CodePath-Academy>
- Curriculum source (read-only): <https://github.com/felix202422/CodePath-Masterclass>

The curriculum repository is MIT-licensed. Imported content must retain the required notice and
source attribution. The academy does not modify that repository.

## Architecture

This is a monorepo with a React/TypeScript frontend, a Java 21 / Spring Boot API, PostgreSQL with
Flyway-managed migrations, and deployment assets. The backend is a modular monolith: one application
with domain-separated modules rather than premature microservices. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and
[`docs/CONTENT-INTEGRATION.md`](docs/CONTENT-INTEGRATION.md).

```text
Browser ── HTTPS ── Nginx / Vite dev proxy
                         ├── React SPA
                         └── /api/v1 ── Spring Boot ── PostgreSQL
                                             └──────── local/object media storage
```

## Development

Prerequisites and verified local limitations are recorded in
[`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md). The intended local workflow is Docker Compose plus
the Vite and Spring Boot development servers. A local PostgreSQL 18 server can be used where Docker
is unavailable by setting the variables in `.env` from `.env.example`.

## Project status

The phase-by-phase implementation register and real test results are maintained in
[`docs/IMPLEMENTATION-REGISTER.md`](docs/IMPLEMENTATION-REGISTER.md). No statistics or test results
are generated as placeholders. Deployment is intentionally preparation-only until a hosting target
and explicit provisioning authorization are provided.
