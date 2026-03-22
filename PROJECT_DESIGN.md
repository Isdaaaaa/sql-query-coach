# Project Design

## Personality
- Confident, calm, and pragmatic — feels like a seasoned database reviewer
- Friendly coaching tone available, but defaults to concise technical clarity

## Color palette
- Base: Slate 900/800 for backgrounds
- Accent: Teal 500 for actions and highlights
- Supporting: Amber 400 for warnings, Emerald 500 for success, Rose 500 for critical findings
- Surface: Warm gray panels with subtle borders/shadows

## Typography
- Heading: Inter or Sora, bold weights for section titles
- Body: Inter, medium/regular
- Code: JetBrains Mono or Fira Code for SQL snippets and findings

## Components
- Input panel: query editor + schema text area with monospace styling
- Findings list: cards with severity badge, description, and actionable suggestion
- Mode toggle: Coaching vs Reviewer
- Suggestion blocks: rewritten queries, index statements, and rationale with copy actions
- Visualization: simple diagrams for join relationships and scan risks (icons + small charts)
- Status bar: indicates whether AI commentary is enabled and data source is sample or user-provided

## Layout
- Two-column desktop layout: left inputs, right results
- Sticky header with app title, mode toggle, and AI commentary toggle
- Collapsible panels for advanced details (e.g., rule diagnostics)

## Inspiration references
- Database client UIs (Postico, TablePlus) for clarity
- VS Code Problems panel for structured findings
- Stripe docs for concise, readable technical writing
