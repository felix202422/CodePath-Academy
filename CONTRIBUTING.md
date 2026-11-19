# Contributing to CodePath-Academy

Thanks for your interest in improving the academy platform. This document describes how to
propose changes so they stay consistent with the project's standards.

## Ground rules

- Read and follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- Never commit secrets, `.env` files, credentials, tokens, or real personal data.
- Keep every commit buildable and every push CI-green (see [DEVELOPMENT-STANDARDS.md](docs/DEVELOPMENT-STANDARDS.md)).
- Record real test commands and results only. Never claim a pass that was not executed.

## Getting started

1. Fork and clone the repository.
2. Follow the setup in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md): Node.js 24 + npm, Java 21 +
   Maven, PostgreSQL 18, and the environment variables from `.env.example`.
3. Verify your checkout before you start changing anything:

   ```bash
   cd backend && mvn -B verify      # needs a reachable PostgreSQL (see docs/DEVELOPMENT.md)
   cd frontend && npm ci && npm test && npm run lint && npm run build
   ```

## Making a change

1. Create a focused branch (or work directly on `main` for low-risk changes, as the team does
   today). One logical change per commit.
2. Follow the coding standards for your area:
   - Backend: [docs/DEVELOPMENT-STANDARDS.md](docs/DEVELOPMENT-STANDARDS.md) — controllers only
     validate/authorize/delegate, DTOs at the boundary, server-side authorization on every
     protected endpoint, additive Flyway migrations only.
   - Frontend: strict TypeScript, feature folders, TanStack Query for server state, React Hook
     Form + Zod for forms, Tailwind tokens only, accessible by default.
3. Tests are part of the change:
   - Backend: JUnit 5 + MockMvc; every new protected endpoint gets an anonymous + wrong-role test.
   - Frontend: Vitest + Testing Library for the behavior you touched.
4. Update documentation in the same change when it records the work:
   - [docs/IMPLEMENTATION-REGISTER.md](docs/IMPLEMENTATION-REGISTER.md) test records.
   - [CHANGELOG.md](CHANGELOG.md) for user-visible changes.
   - [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for decision changes.
5. Run the quality gates locally before pushing:

   ```bash
   # backend
   cd backend && mvn -B verify
   # frontend
   cd frontend && npm test && npm run lint && npm run build
   ```

6. Push and open a pull request using the template. CI runs the frontend suite, the backend
   suite against a PostgreSQL service container, a dependency audit, and both container image
   builds; the PR is ready when all jobs are green.

## Pull request expectations

- Fill in the PR template: what changed, why, how it was verified.
- Link the register row or backlog item when one exists.
- Keep reviews kind and specific; see the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting bugs and requesting features

Use the issue templates. For security problems, follow [SECURITY.md](SECURITY.md) instead —
do not open a public issue for vulnerabilities.

## Release process

Deployment is preparation-only until a hosting target and explicit authorization exist
(see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)). Versioning and releases are assigned at that
time; [CHANGELOG.md](CHANGELOG.md) follows Keep a Changelog.
