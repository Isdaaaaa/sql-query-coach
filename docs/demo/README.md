# Demo Assets and Recording Guide

This folder keeps demo-ready references for SQL Query Coach.

The goal is to make recording and portfolio publishing repeatable: one short walkthrough, one screenshot set, and one optional GIF.

## Suggested Asset Set

- `hero-screenshot.png` — full app view with a visible high-severity finding
- `mode-toggle.png` — Coaching vs Reviewer toggle state
- `ai-commentary-on.png` — AI toggle enabled with commentary panel visible
- `custom-input.png` — status bar showing `Data: Custom`
- `walkthrough.gif` *(optional)* — 20-45s loop of core flow
- `walkthrough.mp4` *(optional)* — narrated 60-90s demo

Use this folder for final exported assets when available.

## Demo Script

Run:

```bash
npm run demo:script
```

This prints a concise, narration-friendly walkthrough for recordings.

## Recording Notes

- Keep camera framing steady; avoid rapid zooming.
- Use one sample scenario first, then one scenario switch.
- Narration style: calm, technical, practical.
- Prefer concrete language: “range predicate”, “correlated subquery”, “severity high”.

## Publishing Checklist

- [ ] README links to this demo folder
- [ ] At least one screenshot captured from latest UI
- [ ] Lint/typecheck/tests/build all pass on the same branch
- [ ] Any placeholder media names replaced with real files

## Placeholder Policy

If final media is not ready yet, keep this README and commit the structure so demo assets can be dropped in without changing docs layout.
