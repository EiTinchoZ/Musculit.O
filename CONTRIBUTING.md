# Contributing

This repository is currently maintained as a personal product codebase.

## Contribution Policy

External pull requests are not currently being accepted as open collaboration.

If you are working on this codebase with the owner directly:

1. Read `README.md`
2. Read `AGENTS.md`
3. Read `ROUTINE.md`
4. Do not change the training split without explicit confirmation
5. Keep the mobile experience first-class
6. Do not replace product-specific decisions with generic SaaS patterns

## Engineering Standards

- TypeScript strictness over convenience
- Clear file ownership and explicit naming
- Persist real data safely
- Avoid fake placeholder metrics
- If a major product decision changes, update the docs in the same change

## Deployment Safety

Before any production deployment:

- `npm run lint`
- `npm run build`
- `npm run db:generate`
- verify `DATABASE_URL`

## Product Standard

Musculit.O should feel personal, deliberate, and premium.

If a change makes the project look templated, generic, or interchangeable, it is the wrong change.
