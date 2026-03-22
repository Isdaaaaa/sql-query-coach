# SQL Query Coach

Bootstrap foundation for a portfolio app that reviews SQL query quality and surfaces practical performance guidance.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Local typed sample data (no database required)

## Quickstart
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

## Scripts
- `npm run dev` — start local dev server
- `npm run lint` — lint via Next.js ESLint config
- `npm run typecheck` — strict TypeScript check
- `npm run build` — production build
- `npm run test` — placeholder test runner

## Current scope (slice-000)
- Base app shell with sticky header and two-column layout
- Placeholder typed domain models (`lib/models/domain.ts`)
- Placeholder sample scenario data (`lib/data/sample-scenarios.ts`)
- Tailwind theme aligned with project design tokens

## Next
Implement heuristic extraction + rule engine and wire findings to deterministic analysis results.
