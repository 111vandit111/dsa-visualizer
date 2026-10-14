# Project rules

## Project-specific rules
P1. Next.js 16 App Router (src/app). Read the relevant guide in `node_modules/next/dist/docs/` before using any Next.js API (see AGENTS.md) — APIs differ from older versions (e.g. async `params`/`cookies()`).
P2. Backend lives ONLY in Next.js route handlers under `src/app/api/*`. MongoDB via the official `mongodb` driver, connection from `MONGODB_URI` (cached client in `src/lib/db.ts`).
P3. User solution code never runs on the server. It is instrumented and executed in a Web Worker in the browser with a step limit and timeout.
P4. Animations use Framer Motion; respect `prefers-reduced-motion`.
P5. Mutating API routes (POST/PUT/PATCH/DELETE) require the admin session cookie; check it server-side.

## General
1. Follow the existing style of the file you are editing. Run `npm run lint`.
2. Functions do one thing. Keep functions under ~50 lines and files under ~400 lines.
3. No dead code, commented-out code, debug prints, or `TODO` without an owner.
4. No magic numbers or strings — use named constants or config.
5. Names describe intent; booleans read as `is/has/should`.
6. Dependencies: existing → standard library → free open-source (MIT/Apache/BSD), maintained. No paid or proprietary libraries.
7. Match `.agent-team/style.md`.

## Correctness and errors
8. Validate all external input (request bodies, query params, env vars, test-case JSON) at the boundary.
9. Never swallow errors. Handle them or propagate them with context.
10. Handle empty, null/undefined, zero and very large inputs explicitly (e.g. infinite loops in user code, huge traces).
11. Dates are stored in UTC.

## Security
12. No secrets in code or logs. Read from env (`.env.local`, with `.env.example` committed).
13. No string-built Mongo queries from raw user input; validate/whitelist fields.
14. Never render raw user HTML; render markdown with sanitisation.
15. Check authorisation on every server-side mutation, not only in the UI. Session cookie is httpOnly, signed, sameSite=lax.

## TypeScript
16. `strict` TypeScript; no `any` (use `unknown` + narrowing). No non-null `!` unless proven.
17. `async`/`await` with error handling; no floating promises.
18. `const` by default; no `var` (except inside generated instrumentation code if required).
19. React: function components and hooks; stable keys; effects clean up (workers terminated, timers cleared).

## UI and design consistency
D1. Reuse shared components and design tokens (defined once in globals.css / Tailwind theme). No scattered hard-coded colors.
D2. Every page works from 320px to 1920px wide: no horizontal page scroll; panels stack on mobile.
D3. Modals and menus stay inside the viewport and scroll when taller.
D4. Tap targets ≥ 44×44px on mobile; visible focus; WCAG AA contrast.
D5. Every data view has loading, empty and error states.

## Backend: APIs and data
20. Consistent JSON response shape `{ data }` / `{ error }` with correct HTTP status codes.
21. Paginate list endpoints.
22. Validate input at the boundary; check authorisation server-side.

## Tests
23. Tracer/instrumentation logic and test-case comparison come with tests (normal path + edge case). Deterministic.

## Git
24. Never commit build output, `.env*.local`, or `.agent-team/`.
