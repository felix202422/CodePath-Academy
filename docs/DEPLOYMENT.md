# Deployment

> **Status: preparation only.** No cloud provider, domain, or credentials have been
> provisioned. Provisioning a live deployment requires explicit authorization (see
> `docs/IMPLEMENTATION-REGISTER.md` → Phase 11 scope). This document describes what is
> ready to run and how to operate it once authorized.

## What exists

| Asset | Location | Purpose |
|---|---|---|
| Backend image | `infra/docker/Dockerfile.backend` | Multi-stage Maven → Temurin 21 JRE build |
| Frontend image | `infra/docker/Dockerfile.frontend` | Multi-stage Node 24 build → Nginx serving the SPA + reverse proxy |
| Compose stack | `infra/docker-compose.yml` | Postgres 18 + backend + frontend, health-checked |
| Edge config | `infra/docker/nginx.conf` | SPA fallback, `/api` proxy, internal-only actuator, security headers |
| CI | `.github/workflows/ci.yml` | Frontend test/build + dependency audit, backend test on Temurin 21 + `postgres:18`, both image builds |

Images are built (not pushed) by CI on every green run; `docker` is unavailable on the current
development machine, so container execution is validated by CI rather than locally.

## Topology

```text
Browser ── HTTPS (TLS at the future hosting edge) ── Nginx :80
                                                   ├── /            → SPA (static)
                                                   ├── /api/        → backend :8080
                                                   └── /actuator/   → backend (private networks only)
                                                                     backend ── PostgreSQL 18
```

## Configuration

All configuration is environment variables (names in `.env.example`; values never committed):

| Variable | Purpose |
|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | PostgreSQL connection |
| `APP_CORS_ALLOWED_ORIGINS` | Comma-separated allow-list; production = the deployed origin only |
| `APP_COOKIE_SECURE` | `true` in production: forces `Secure` on the session cookie (TLS-terminating proxy safe) |
| `APP_BOOTSTRAP_ADMIN_ENABLED` / `_EMAIL` / `_PASSWORD` | One-time first-administrator provisioning; disable after use |
| `APP_CURRICULUM_REPOSITORY`, `APP_CURRICULUM_COMMIT`, `APP_CURRICULUM_LOCAL_PATH` | Source-aware importer pinning |
| `APP_MEDIA_ROOT` | Media storage directory (production: persistent volume) |

Production checklist:

1. Set `APP_COOKIE_SECURE=true` and `APP_CORS_ALLOWED_ORIGINS` to the real origin.
2. Terminate TLS at the hosting edge; HSTS is emitted by the backend for secure requests.
3. Run bootstrap admin once with a strong password, then set `APP_BOOTSTRAP_ADMIN_ENABLED=false`.
4. Apply Flyway migrations as a release step (startup runs them, but releases should gate on them).
5. Keep `/actuator/` unreachable from the public internet (Nginx already restricts it; repeat
   at the edge).

## Running the stack

```bash
cp .env.example .env      # fill in real values; .env is gitignored
docker compose -f infra/docker-compose.yml up --build
```

- Frontend (SPA + proxy) listens on port 80 of the compose network; map a host port in the
  compose file when running outside a full stack.
- Health: Nginx `GET /healthz` (edge), backend `GET /actuator/health` (internal),
  SPA status page reads `GET /api/v1/health`.

## HTTP caching

`infra/docker/nginx.conf` sets the caching policy:

- Hashed build assets (`/assets/…`, content-hashed by Vite): `Cache-Control: public, max-age=31536000, immutable`.
- `index.html` and other HTML: `no-cache` (revalidate every time so deploys take effect immediately).
- Images: long-lived `public` caching; `robots.txt`/`sitemap.xml`: revalidated.
- API responses are `no-store` (Spring default for authenticated JSON) — the edge never caches `/api/`.

## Backup and recovery

Preparation-only until a hosting target exists; the procedures below are the planned
runbook and are validated against local PostgreSQL 18 where noted.

### Backup

```bash
# Full logical backup (schema + data)
pg_dump -h "$DB_HOST" -U "$DB_USER" -d codepath_academy \
  --format=custom --file="backup_$(date +%F).dump"

# Media store (APP_MEDIA_ROOT) — back up alongside the database
tar -czf "media_$(date +%F).tar.gz" "$APP_MEDIA_ROOT"
```

Schedule: daily database dump + daily media archive, retained per the future hosting
provider's policy; keep at least one off-site copy. Spring Session rows are disposable and
need not be preserved.

### Restore

```bash
createdb -h "$DB_HOST" -U "$DB_USER" codepath_academy
pg_restore -h "$DB_HOST" -U "$DB_USER" -d codepath_academy --clean --if-exists backup_YYYY-MM-DD.dump
tar -xzf media_YYYY-MM-DD.tar.gz -C "$APP_MEDIA_ROOT"
```

After restore, verify `flyway_schema_history` integrity (`SELECT * FROM flyway_schema_history`)
and `GET /actuator/health`.

## CI/CD

- Every push/PR: frontend (`npm test`, `npm run build`, `npm audit --audit-level=critical`),
  backend (`mvn -B verify` on Temurin 21 with a `postgres:18` service), both container images.
- Image push, release tagging, and environment promotion are intentionally **not** wired: they
  need registry credentials and a hosting target (authorization pending).
