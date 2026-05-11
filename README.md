# Musculit.O

<p align="center">
  <strong>Discipline first. Results follow.</strong>
</p>

<p align="center">
  A personal gym tracking system for real-world training, progressive overload, recovery awareness, and long-term physical change.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white" alt="Prisma 6" />
  <img src="https://img.shields.io/badge/Postgres-ready-4169E1?logo=postgresql&logoColor=white" alt="Postgres Ready" />
  <img src="https://img.shields.io/badge/Vercel-ready-000000?logo=vercel&logoColor=white" alt="Vercel Ready" />
  <img src="https://img.shields.io/badge/Mobile-first-C7642D" alt="Mobile First" />
  <img src="https://img.shields.io/badge/License-All%20Rights%20Reserved-8B0000" alt="License" />
</p>

## What This Is

Musculit.O is a personal training operating system built around one real use case: tracking a real gym routine with real weights, real fatigue, real rest periods, and real consistency over time.

This is not a generic fitness template. It is a purpose-built system for Martin Bundy's current training split, current gym context, and current progression goals.

## Current Capabilities

- Daily tracker based on the current approved routine
- Set-by-set weight logging for each exercise
- Rest timer with 2-minute countdown and completion sound
- Journal field for post-session notes
- XP, level, and streak system
- Fire streak indicator unlocked only after 3 consecutive 100% days
- Day, week, month, and year calendar views
- Progressive save flow through API persistence
- Database-ready architecture for Vercel + Postgres
- Local fallback persistence when no database is configured yet

## Training Philosophy Embedded In The App

- Show up consistently
- Train close to failure without throwing technique away
- Log weights honestly
- Rest with intention
- Let progressive overload prove itself over weeks, not moods

## Weekly Split

| Day | Focus | Cardio | Notes |
| --- | --- | --- | --- |
| Monday | Legs | 20 min stair climber | Heavy lower day |
| Tuesday | Upper Body | 20 min stair climber | Longest day |
| Wednesday | Rest | No | Full recovery |
| Thursday | Legs | 20 min stair climber | Repeat lower structure |
| Friday | Push | 20 min stair climber | Partner-compatible day |
| Saturday | Pull | 20 min stair climber | Pull first, cardio after |
| Sunday | Rest | No | Full recovery |

The full source-of-truth routine is documented in [ROUTINE.md](./ROUTINE.md).

## Tech Stack

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- Prisma 6
- PostgreSQL for production persistence

## Persistence Model

The app is designed so that data does not stay trapped in browser memory.

Current behavior:

- If `DATABASE_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL`, or `POSTGRES_URL_NON_POOLING` exists, the app saves through `/api/app-state` to PostgreSQL using Prisma
- If none of those variables exist, the app falls back to a local JSON store for development continuity

This means the project is already structured so that when deployed correctly on Vercel with Postgres, your logs, set weights, journals, and progress history persist progressively.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database Setup

1. Copy `.env.example` to `.env`
2. Set `DATABASE_URL` or use the variables injected by Supabase on Vercel
3. Generate Prisma client:

```bash
npm run db:generate
```

4. Push the schema:

```bash
npm run db:push
```

## Deploying To Vercel

The deployment flow is documented in [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

High-level:

1. Push repo to GitHub
2. Import project into Vercel
3. Connect a PostgreSQL database
4. Add `DATABASE_URL` or use Supabase Marketplace env injection
5. Run schema push
6. Redeploy

## Repository Structure

```text
src/
  app/
    api/
    globals.css
    layout.tsx
    page.tsx
  components/
    musculit-app.tsx
  lib/
    app-state-store.ts
    database-env.ts
    musculit-state.ts
    prisma.ts
    routine-data.ts
    set-utils.ts

prisma/
  schema.prisma

docs/
  DEPLOYMENT.md

AGENTS.md
CLAUDE.md
CONTRIBUTING.md
LICENSE
PROMPTS_INICIALES.md
ROUTINE.md
```

## Ownership

Musculit.O is an original personal project by Martin Bundy.

Unless a future written license change is added by the owner, this repository is **not open source**. Source availability here does **not** grant reuse, redistribution, sublicensing, resale, or derivative commercialization rights.

See [LICENSE](./LICENSE).

## Working With AI Agents

The repo includes explicit collaboration docs for Codex and Claude Code:

- [AGENTS.md](./AGENTS.md)
- [CLAUDE.md](./CLAUDE.md)
- [PROMPTS_INICIALES.md](./PROMPTS_INICIALES.md)

## Build Status

Validated locally with:

- `npm run lint`
- `npm run build`
- `npx prisma generate`

## Motto

> Train with intent.  
> Record the truth.  
> Let consistency become visible.
