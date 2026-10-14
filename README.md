# DSA Visualizer

Step through data structure and algorithm solutions line by line. Paste or pick a JavaScript solution, run it against LeetCode-style test cases, and watch every variable, array, map, set, heap and linked list change as the code executes.

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4
- shadcn/ui (Radix) components, Framer Motion animations, CodeMirror 6 editor
- MongoDB via the official `mongodb` driver, behind Next.js route handlers only
- Tracer: acorn instruments the solution, which runs in a browser Web Worker
- Vitest for unit tests

## Setup

Requirements: Node.js 20+ and a local MongoDB.

```bash
brew services start mongodb-community   # or mongodb-community@7.0
cp .env.example .env.local              # then edit the admin password and secret
npm install
npm run seed                            # inserts "Design Twitter"
npm run dev                             # http://localhost:3000
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | no | Connection string including the database name. Defaults to `mongodb://127.0.0.1:27017/dsa-visualizer`. |
| `ADMIN_PASSWORD` | for admin | Password for `/admin` (at least 8 characters). |
| `ADMIN_SESSION_SECRET` | for admin | Secret that signs the admin session cookie (at least 32 characters). |
| `TRUST_PROXY` | no | `true` only behind a reverse proxy that sets `X-Real-IP` / `X-Forwarded-For`; enables per-client login throttling. Default `false` (one shared throttle bucket). |

Variables are validated when first used, so `npm run build` works without them.

## API

Responses use `{ "data": ... }` on success and `{ "error": { "code", "message", "details?" } }` on failure.

| Method and path | Auth | Description |
|-----------------|------|-------------|
| `GET /api/questions` | public | List with `q`, `difficulty`, `tags` (comma separated, all must match), `page`, `pageSize` (max 50). |
| `GET /api/questions/[slug]` | public | One question. |
| `POST /api/questions` | admin | Create (201). Duplicate slug returns 409. |
| `PUT /api/questions/[slug]` | admin | Replace a question. |
| `DELETE /api/questions/[slug]` | admin | Delete a question. |
| `POST /api/admin/login` | public | Body `{ "password" }`. Sets the `dsa_admin_session` httpOnly cookie. Limited to 5 attempts per minute per IP. |
| `POST /api/admin/logout` | public | Clears the session cookie. |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the dev server. |
| `npm run build` | Production build. |
| `npm run lint` | ESLint. |
| `npm test` | Vitest unit tests. |
| `npm run typecheck` | Generate route types and run `tsc --noEmit`. |
| `npm run seed` | Upsert the "Design Twitter" question into MongoDB (safe to run repeatedly). |

## Safety

User solution code is never executed on the server. It is parsed with acorn on the server only to check syntax, and it runs only inside a Web Worker in the visitor's browser with step, call-depth and time limits.

## Project layout

```
src/app/            pages and API route handlers (src/app/api)
src/components/     ui/ (shadcn), shared/ (app components), site shell
src/lib/            db, env, auth, api helpers, validation, questions repository
src/lib/tracer/     instrumenter, runtime, worker, serializer, PriorityQueue
src/hooks/          React hooks
scripts/            seed script and seed data
```
