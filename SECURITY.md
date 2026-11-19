# Security policy

## Reporting a vulnerability

Please do **not** report security vulnerabilities through public issues.

Report privately using one of these channels, in order of preference:

1. **GitHub private vulnerability reporting** — if enabled on this repository, open
   **Security → Report a vulnerability** and describe the issue there. This keeps the report
   confidential until a fix is available.
2. **Request a private channel** — if that option is unavailable, open a public issue titled
   `Security report — please contact privately` with **no vulnerability details**, asking a
   maintainer to establish a private channel. Never include exploit details, credentials, or
   personal data in the public issue.

A maintainer will acknowledge the report within a few working days, work with you on a fix and
timeline, and credit you in the disclosure unless you prefer otherwise.

Please include:

- Description of the vulnerability and its impact
- Steps to reproduce (proof of concept, endpoints, affected version/commit)
- Any known mitigations

## Supported versions

Development is preparation-only: there is no hosted production deployment yet, so only the
latest commit on `main` receives security fixes. Once releases exist, this section will list
the supported version lines.

## Scope and ground rules

- The repository, its API (`/api/v1/**`), container images, and the deployment configuration
  are in scope.
- The curriculum source repository (`CodePath-Masterclass`) is read-only and maintained
  separately; report its issues upstream.
- Be respectful: give maintainers reasonable time to publish a fix before any disclosure.
- Good-faith research is welcome; do not degrade the service, access other users' data, or
  spam.

## Existing protections

Current hardening is documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (session and
CSRF design, header/CORS contracts, password storage) and enforced by the test suite —
`SecurityHardeningTest`, `SessionCookieHardeningTest`, and `SecurityAuthorizationTest`.
