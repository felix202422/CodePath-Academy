# Development setup

## Intended toolchain

- Node.js 24 LTS and npm 11.
- Java 21 LTS and Maven 3.9+.
- PostgreSQL 18.
- Docker Engine / Docker Compose plugin for the one-command local stack.
- Git and GitHub CLI for repository operations.

## Environment audit (2026-11-10)

| Tool | Observed | Status |
|---|---|---|
| Node.js | 24.13.1 | Available |
| npm | 11.8.0 | Available |
| Java | 25.0.4.1 | Available; application will target Java 21, but Java 21 itself is not installed. |
| Maven | 3.9.16 | Available |
| PostgreSQL client/server | 18 | Installed; service accepts connections on localhost:5432. |
| PostgreSQL project credentials | Not configured | `postgres` connection without a password was rejected. Do not put credentials in Git. |
| Docker | Not found | Compose configuration can be authored, but cannot be run here unless Docker is installed. |
| GitHub CLI | 2.102.0 | Installed but not authenticated. Public API reads work without it; Git push works via stored credentials (verified); issue/milestone administration needs `gh auth login`. |

The repository is cloned from the verified, public, empty application repository. Its `origin` is
`https://github.com/felix202422/CodePath-Academy.git`. The current workspace has no pre-existing
project files.

## Local configuration

1. Copy `.env.example` to `.env` and set a dedicated local PostgreSQL database/user/password.
2. Keep `.env` untracked. Never put real values in `application.yml`, test fixtures, or logs.
3. Start the database using Docker Compose or an existing PostgreSQL 18 service.
4. Run Flyway migrations via the backend. Production must use migrations, not Hibernate DDL.
5. Start the API and frontend using the commands added to their package/build manifests.

The current environment lacks a Java 21 runtime, Docker, and project database credentials. Java 25
can compile with `--release 21`, but that does not substitute for validating the app on Java 21. These
constraints will be reflected in test records; no test will be reported as passed unless run.
