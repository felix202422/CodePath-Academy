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

Secrets come from environment variables only (see `.env.example`). Keep `.env` untracked and never
put real values in `application.yml`, test fixtures, or logs. Flyway runs automatically at startup;
production must use migrations, never Hibernate DDL.

### Database (this machine)

The system PostgreSQL service on port 5432 is password-protected and its credentials are not part of
this project, so development uses an **isolated cluster** under `data/pgdata` (gitignored) on
**port 5433** with trust auth. It never touches the system service.

```powershell
# Start the dev cluster (repeat after a machine/environment restart)
& 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe' -D 'D:\Documents\Codepath-Academy\data\pgdata' `
  -o "-p 5433" -l 'D:\Documents\Codepath-Academy\data\pg.log' start
& 'C:\Program Files\PostgreSQL\18\bin\pg_isready.exe' -h localhost -p 5433
```

One-time creation (already done on this machine):

```powershell
& 'C:\Program Files\PostgreSQL\18\bin\createdb.exe' -h localhost -p 5433 -U codepath_academy codepath_academy
& 'C:\Program Files\PostgreSQL\18\bin\createdb.exe' -h localhost -p 5433 -U codepath_academy codepath_academy_test
```

### Backend

```powershell
$env:DB_URL="jdbc:postgresql://localhost:5433/codepath_academy"
$env:DB_USERNAME="codepath_academy"
$env:DB_PASSWORD=""
$env:SERVER_PORT="8081"       # only if port 8080 is occupied on this machine
mvn -B spring-boot:run         # http://localhost:8081 (or :8080)
mvn -B test                    # runs against codepath_academy_test on 5433
```

Note: on this machine port 8080 is held by an unrelated environment process
(`AgentService`), so local runs use `SERVER_PORT=8081` and the frontend proxy target is set with
`API_PROXY_TARGET=http://localhost:8081`. Defaults remain 8080 elsewhere.

Tests use the `test` profile (`src/test/resources/application-test.yml`), which points at
`codepath_academy_test` on port 5433 by default and honors `TEST_DB_URL` / `TEST_DB_USERNAME` /
`TEST_DB_PASSWORD` overrides — CI supplies these against its Postgres service container.

### Frontend

```powershell
npm ci        # or npm install
npm test      # Vitest
npm run lint  # ESLint
$env:API_PROXY_TARGET="http://localhost:8081"  # when the API is not on :8080
npm run dev   # http://localhost:5173, proxies /api and /actuator to the API
```

## Known constraints

The current environment lacks a Java 21 runtime (Java 25 compiles with `--release 21`) and Docker.
Java 25 can compile with `--release 21`, but that does not substitute for validating the app on
Java 21, and container images/Compose cannot be run here. These constraints are reflected in test
records; no test is reported as passed unless it was actually run.
