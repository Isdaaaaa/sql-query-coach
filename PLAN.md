# Plan

## Summary
SQL Query Coach is a web app that analyzes SQL queries alongside a simplified schema to surface likely performance bottlenecks, suggest index or rewrite options, and provide two explanation modes: a concise reviewer view and a friendly coaching view for juniors. The MVP relies on deterministic heuristics with an optional AI commentary layer.

## Target user
- Backend and data engineers who review or debug queries
- Junior developers learning database performance basics
- Teams that want lightweight query guidance without deep APM setup

## Portfolio positioning
Demonstrates practical database literacy, safe-by-default guidance, and UX for both educational and expert modes. Highlights ability to combine parsers, heuristics, and AI commentary in a responsible way.

## MVP scope
- Paste-in query + simplified schema input
- Heuristic detector set: missing indexes on join/filter columns, SELECT *, cartesian joins risk, functions on indexed columns, unbounded scans, skewed GROUP BY/ORDER BY hints
- Structured output: findings with severity, plain-English coaching, and terse reviewer notes
- Suggested rewrites and index candidates with rationale
- Toggle between Coaching (friendly) and Reviewer (succinct) tone
- Sample Postgres schemas + canned queries for demo

## Non-goals (for MVP)
- Full-cost estimation or EXPLAIN integration
- Vendor-specific tuning (stick to Postgres-like guidance)
- Live database connectivity or migrations
- Automated index creation

## Technical approach
- SvelteKit or Next.js frontend; Tailwind for styling
- SQL parsing via a lightweight parser (e.g., sqlglot) to extract tables, joins, projections, predicates
- Heuristic rules engine producing structured findings
- Optional AI commentary using OpenAI-compatible API for narrative explanations
- Static sample schemas/queries stored locally for demos; no external DB required
- Type-safe data models for findings, severities, and suggestions

## Execution notes
- Start with deterministic heuristics and deterministic sample outputs to keep demos consistent
- Keep AI commentary optional and clearly labeled
- Provide copy-ready rewrites and index statements where applicable
- Emphasize safety: avoid recommending dangerous operations without caveats
- Build a simple JSON contract for findings to allow future CLI use
