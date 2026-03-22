# SQL Query Coach

SQL Query Coach is a Next.js portfolio project that reviews SQL snippets and returns deterministic, practical performance guidance.

The app is designed to feel like a calm database reviewer: concise by default, actionable in every finding, and explicit about what is deterministic versus AI-assisted commentary.

## Current Capabilities

- **Heuristic SQL analysis** for common anti-patterns (for example `SELECT *`, function-wrapped predicates, correlated subqueries, and leading wildcard `LIKE` usage)
- **Schema-aware hints** from lightweight DDL parsing to validate table and index context
- **Dual communication modes**:
  - **Coaching**: guidance-oriented recommendations
  - **Reviewer**: concise risk-oriented phrasing
- **Optional AI commentary layer** with clear on/off status and deterministic fallback
- **Built-in sample scenarios** for commerce, fintech, and analytics-style workloads
- **Performance summary metrics** (join/table counts, severity distribution, complexity and scan-risk signals)

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict)
- **UI:** React + Tailwind CSS
- **Tests:** Node test runner (`node --test`) with TypeScript transpile-on-test harness

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

### 3) Run quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Or run the full gate in one command:

```bash
npm run package:check
```

## Scripts

- `npm run dev` — start local development server
- `npm run lint` — run ESLint via Next.js config
- `npm run typecheck` — run strict TypeScript checks (`tsc --noEmit`)
- `npm test` — run Node test suite
- `npm run build` — create production build
- `npm run start` — serve production build
- `npm run samples:check` — print sample data sanity summary
- `npm run demo:script` — print a step-by-step demo walkthrough script
- `npm run package:check` — run lint + typecheck + tests + production build
- `npm run clean` — remove local build and cache artifacts

## Architecture Overview

High-level flow:

1. **Input workspace (left column)** captures SQL + schema DDL (or loads sample scenarios).
2. **Analysis pipeline (`lib/analysis`)** parses SQL/schema, applies deterministic heuristic rules, and scores findings.
3. **Presentation layer (right column)** renders findings, suggestions, and optional AI commentary.
4. **Mode controls** adjust output tone (Coaching vs Reviewer) without changing deterministic rule results.

Key files:

- `app/page.tsx` — app entry and sample scenario wiring
- `components/app-shell.tsx` — page orchestration, mode toggles, and analysis lifecycle
- `lib/analysis/sql-coach.ts` — core parsing + heuristic findings engine
- `lib/analysis/perf-metrics.ts` — complexity and scan-risk scoring
- `lib/analysis/commentary.ts` — optional AI commentary generator
- `lib/data/sample-scenarios.ts` — curated demo-ready SQL/schema inputs
- `tests/*.test.js` — deterministic analysis and commentary behavior tests

## Demo Assets

Demo documentation and placeholder asset workflow live in [`docs/demo/README.md`](./docs/demo/README.md).

Use:

```bash
npm run demo:script
```

to print a narrator-friendly walkthrough before recording a GIF/video.

## Limitations (Current Slice)

- Parsing is intentionally heuristic and regex-driven; this is not a full SQL parser.
- Dialect behavior is tuned primarily for PostgreSQL-style examples.
- AI commentary is deterministic mock logic today (no live provider integration).
- Findings are optimized for educational coaching, not guaranteed execution-plan correctness.
- No persistence/auth layer yet; the app is currently local-first with sample-driven workflows.

## Roadmap Alignment

This packaging/docs slice supports **Phase 6 — Polish & Release** in [`ROADMAP.md`](./ROADMAP.md).

Upcoming roadmap priorities still include:

- richer visual diagnostics and demo polish (Phase 5)
- deeper safety wording and release hardening (Phase 6)

See [`ROADMAP.md`](./ROADMAP.md) for full phase detail.
