## Summary

<!-- What changed and why. Link the register row or backlog item (CPA-xxx) when one exists. -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Tests only
- [ ] Documentation
- [ ] Infrastructure / CI
- [ ] Refactor (no behavior change)

## How it was verified

<!-- Real commands and results only — never claim a pass that was not executed. -->

- Backend:
- Frontend:
- Browser / live checks:

## Checklist

- [ ] `cd backend && mvn -B verify` passes (if backend changed)
- [ ] `cd frontend && npm test && npm run lint && npm run build` passes (if frontend changed)
- [ ] New/changed endpoints have anonymous + wrong-role authorization tests
- [ ] No secrets, `.env` files, credentials, or real personal data committed
- [ ] Docs updated where they record this work (`docs/IMPLEMENTATION-REGISTER.md`, `CHANGELOG.md`, `docs/ARCHITECTURE.md`)
- [ ] CI jobs are green on this branch
