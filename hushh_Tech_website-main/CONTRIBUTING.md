# Contributing

Thanks for contributing to Hushh Tech Website.

## Before you start

- Read [README.md](/Users/ankitkumarsingh/hushhTech/README.md) for the repo layout.
- Do not commit secrets, keys, `.env` files, `.p8` files, or service-account JSON.
- Treat GCP Secret Manager as the production source of truth for sensitive values.
- Assume this repo is a public wrapper around production systems, not the source of truth for private infrastructure state.

## Local setup

```bash
npm ci
npm run test
npm run security:gitleaks
```

Use these additional checks when you are touching repo-health or security-sensitive paths:

```bash
npm run security:pre-commit
npm run security:audit
```

## Branching and pull requests

- Do not push directly to `main`.
- Create a topic branch from `main`.
- Keep pull requests focused and small enough to review.
- Explain what changed, why it changed, and how you validated it.

## What maintainers expect

- Keep changes focused. Do not mix product UX, infra risk, and repo policy work into one PR.
- New runtime code should live in the existing repo structure instead of adding ad hoc root files.
- Do not add new public examples or docs that teach browser-visible vendor secret usage.
- Server-side secret usage should stay behind API routes or maintainer-controlled runtime config.
- Database changes should go through `supabase/migrations/` with timestamped files.
- If your change affects deploy, auth, wallets, or vendor integrations, document the operational impact clearly in the PR.

## Validation

At minimum, run the narrowest relevant checks for your change. Examples:

- `npm run test`
- `npx vite build`
- `npm run security:gitleaks`
- `npm run security:pre-commit`

## Security issues

Do not file public issues for vulnerabilities. Follow [SECURITY.md](/Users/ankitkumarsingh/hushhTech/SECURITY.md).
