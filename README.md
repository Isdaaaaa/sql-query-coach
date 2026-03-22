# SQL Query Coach

SQL Query Coach is a lightweight web app that analyzes SQL queries and a simplified schema to surface likely performance issues, suggest index or rewrite options, and provide two explanation modes: a concise Reviewer view and a friendly Coaching view for learners.

Core features

- Paste-in query + simplified schema input
- Heuristic detectors for common issues: missing indexes, SELECT *, cartesian joins risk, functions on indexed columns, unbounded scans, skewed GROUP BY/ORDER BY
- Structured findings with severity, suggested rewrites, and index candidates
- Two explanation tones: Coaching (friendly) and Reviewer (concise)
- Sample Postgres-like schemas and canned queries for demos

Why it matters

Many developers need quick, actionable guidance on query performance without setting up heavy APM or database replicas. This project demonstrates how deterministic heuristics and clear UX can help engineers and learners diagnose queries safely and consistently.

Setup

1. Install dependencies (Node.js + pnpm/npm)

   pnpm install

2. Start the dev server

   pnpm dev

3. Open the demo page and use the sample schemas/queries to try the Coach mode.

Showcase notes

- The demo uses static sample schemas and deterministic heuristics to keep results consistent for portfolio review.
- AI commentary is optional and labeled; deterministic fallbacks are provided so demos remain reproducible.

Limitations

- No live database connectivity or EXPLAIN integration in the MVP.
- Recommendations are heuristic and intended as guidance; they should be validated in a real environment before production changes.

License

MIT
