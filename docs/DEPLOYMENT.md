# Deployment Guide

This document describes the intended deployment flow for Musculit.O.

## Goal

Deploy the app to Vercel with PostgreSQL persistence so that:

- workouts save progressively
- set-by-set weights persist
- journal entries persist
- progress history survives reloads, devices, and sessions

## Prerequisites

- GitHub repository
- Vercel account
- PostgreSQL database accessible from Vercel

## Environment Variable

Required:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
```

Supabase on Vercel can also inject these automatically:

```bash
POSTGRES_PRISMA_URL=postgresql://...
POSTGRES_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...
```

## Local Setup Before Deploy

```bash
npm install
npm run db:generate
npm run db:push
npm run build
```

## GitHub -> Vercel Flow

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Add `DATABASE_URL` in Vercel project settings, or install Supabase from the Vercel Marketplace and let it inject the Postgres variables automatically.
4. Redeploy so Prisma Client is generated in the Vercel build.

The project already includes:

- `postinstall: prisma generate`
- API route persistence through `src/app/api/app-state/route.ts`
- Prisma client initialization in `src/lib/prisma.ts`

## Important Note On Schema Push

Vercel should not be relied on to mutate your schema automatically during every build.

Use one of these approaches:

- run `npm run db:push` locally against the target database before deploy
- or run it in a controlled CI step

## Persistence Behavior

When `DATABASE_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL`, or `POSTGRES_URL_NON_POOLING` exists:

- `GET /api/app-state` loads from database
- `PUT /api/app-state` saves to database

When none of those variables exist:

- development fallback uses local JSON storage

This means production persistence is database-backed, while local development remains usable before infra is connected.

## Recommended Production Checklist

- database connected
- env variable set
- prisma client generated
- build passes
- first save from UI verified
- first journal entry verified
- first set-weight update verified

## Suggested Post-Deploy Smoke Test

1. Open the deployed app
2. Mark one exercise complete
3. Enter different weights for each set
4. Add a journal note
5. Save progress
6. Refresh the page
7. Confirm all values persisted
