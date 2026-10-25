# Dynanote

A local-first scientific notebook with Markdown, LaTeX, and interactive educational visualizations.

## Run and verify

```bash
npm install
npm run dev
npm test
npm run build
```

The development server uses http://127.0.0.1:3000 by default. `npm run preview` serves the production build.

## Features

- Live Preview and Markdown source editing, with inline math and embedded visualizations.
- A five-note **Hackathon Demo** folder (run of show, projectile motion, a live-measured Ohm's law loop, binary search, Kepler's laws). It appears first in a fresh vault; **Add demo notes** adds it to an existing one. Every number quoted in the demo text is recomputed by `npm test`.
- Nine declarative visualization domains: math, circuits, physics, chemistry, algorithms, logic, orbits, 3D, and annotated diagrams.
- Optional AI providers for generation and sketch interpretation. The offline library selects examples by keyword; it does not understand images or synthesize custom models.
- Export/import JSON vault backups. Imports add notes with new IDs and preserve existing notes.
- Export the active note as Markdown and import one or more `.md` files. Title, folder, tags, dates, and the attached simulation are kept in JSON-valued front matter; plain Markdown files are titled from their first heading or file name.
- Undo the most recent deletion during the session, visible save failures, and protection against overwriting unreadable saved vaults.
- Generation attaches to the originating note and preserves edits made while requests run.
- Lazy-loaded visualization engines and per-simulation error boundaries.

## Safety and interpretation

Equations use an arithmetic-only parser with numeric parameters and approved math functions. Each expression is compiled once and reused across samples and frames; syntax errors, unknown functions, and wrong argument counts are reported at compile time. Arbitrary generated JavaScript is retired; existing script-based specifications remain readable but do not execute. Markdown links allow HTTP, HTTPS, and mailto only.

API keys remain in memory for the session, are omitted from saved settings, and must be re-entered after reload. Previously persisted credentials are removed from browser settings storage during migration. Requests go directly from the browser to the configured provider; that provider must support browser requests/CORS. No provider credentials are included in vault exports.

Automated checks validate structure and selected numerical/topological properties. They are not scientific certification. Invalid results are rejected after the retry limit. Logic truth tables are computed from the gate wiring; a supplied table that disagrees is flagged by the reviewer. Circuit measurements support exactly one DC source in a closed series loop with positive resistors and switches; other circuits are displayed as schematics with measurements unavailable. Complex physics, chemistry, and orbit models remain educational approximations.

Notes are stored in browser localStorage, not synchronized between devices. Export backups regularly. Saves are debounced and flushed when the page is hidden or closed. Imported and stored notes are fully validated, including timestamps and attached simulations. Save failures leave current edits in memory and display a warning. If a stored vault is malformed, automatic saving is paused until a valid backup is imported. Undo deletion is session-only and covers the most recent deletion.

## Regression coverage

`npm test` recomputes the figures quoted in the example and demo notes, replays the quicksort and binary-search traces, checks logic truth tables against their wiring, and exercises expression safety, domain preservation, malformed specifications, validation failure reporting, series-circuit topology, empty-vault loading, and updates to notes during generation. Live external provider integration requires separate credentials and is not covered by the offline tests.

## AI workflow

The AI chooses a representation from the user's request rather than following a fixed scientific script. It returns a short public design summary, assumptions, and limitations alongside the specification. Refinements include the current model and original instructions on every attempt.

The parser does not invent missing functions, parameters, gravity, or domains. A read-only reviewer separates blocking renderer problems from advisory limitations. Valid negative parameters, small masses, and function discontinuities are allowed; warnings do not trigger mandatory rewrites. Unsupported numerical models can be represented honestly as diagrams or schematics of the same subject.

Recoverable output failures feed the previous draft and accumulated feedback back to the model. The default budget is four model calls, configurable per request with `maxAttempts` (1–6). The loop stops on success, cancellation, exhausted budget, or two identical failed drafts. Transport/authentication failures do not consume scientific revision attempts. Every adapter forwards cancellation signals and preserves design metadata.

Adaptive Revisions can be disabled for a single-shot response; renderer checks remain active. Offline fallback is off by default and never replaces refinements, sketch requests, explicit instructions, or models that fail validation. The offline library is not an AI agent and cannot refine an existing model.

The audit displays actual design summaries, tool observations, revisions, and limitations rather than a fabricated reasoning trace. These checks establish compatibility with the current renderers, not scientific certification.
