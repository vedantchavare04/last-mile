# LAST-MILE integration guide

LAST-MILE is a Bun/Turborepo workspace with a Next.js App Router frontend, a Prisma schema for Neon Postgres, a Cloudflare Worker adapter, optional Google OAuth, and an empty-first local workspace.

## 1. Local setup

Requirements:

- Bun 1.4.x
- Node 24+ (Next.js tooling)
- A Neon Postgres project for persisted production data
- Wrangler only when deploying the Cloudflare Worker

```bash
bun install
cp .env.example .env.local
bun run check-types
bun run lint
bun run dev
```

Open `http://localhost:3000`.

The app starts with an empty state in `apps/web/lib/operations.tsx`. Records are created through the UI and persisted in browser `localStorage` under `last-mile-workspace-v2`. This makes the UI usable without credentials while keeping the first screen honest: no fake operational data is displayed.

## 2. Environment variables

Copy `.env.example` to `.env.local` at the repository root for local development. Do not commit `.env.local`.

| Variable | Where it goes | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Vercel project env + local `.env.local` | Neon pooled connection string used by Prisma at runtime. Use the connection string from the Neon **Connect** modal with `sslmode=require`. |
| `DIRECT_URL` | Vercel project env + local `.env.local` | Neon direct connection string for Prisma migrations. For a simple setup this can match `DATABASE_URL`; using Neon's direct/unpooled URL is preferred for migrations. |
| `NEXT_PUBLIC_API_URL` | Vercel project env + local `.env.local` | Public origin for the Cloudflare API, for example `https://last-mile-api.<account>.workers.dev`. Keep `http://localhost:8787` locally if the Worker is running with Wrangler. |
| `NEXT_PUBLIC_APP_URL` | Vercel project env + local `.env.local` | Canonical app URL, for example `https://last-mile.vercel.app`. |
| `AUTH_SECRET` | Vercel project env + local `.env.local` | Secret used by Auth.js when authentication is wired into the deployment. Generate a long random value; never expose it with a `NEXT_PUBLIC_` prefix. |
| `AUTH_GOOGLE_ID` | Vercel project env + local `.env.local` | Google OAuth client ID from Google Cloud Console. |
| `AUTH_GOOGLE_SECRET` | Vercel project env + local `.env.local` | Google OAuth client secret. Keep server-side only. |
| `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED` | Vercel project env + local `.env.local` | Set to `true` only after the Google callback URL is configured. The profile menu then shows the working Google sign-in action. |
| `NEXT_PUBLIC_DEMO_MODE` | Vercel project env | Legacy compatibility flag; the current UI is empty-first and does not seed sample data. |
| `CF_ACCOUNT_ID` | Local CI/deployment shell only | Cloudflare account identifier used by Wrangler tooling. |
| `CF_API_TOKEN` | Local CI/deployment shell only | Cloudflare API token with Worker deployment permissions. Prefer `wrangler login`; do not put this into Vercel. |
| `CF_DATABASE_URL` | Cloudflare Worker secret | Neon connection string for Worker-side database access. Store with `wrangler secret put DATABASE_URL`; do not commit it to `wrangler.toml`. |

### Neon values

1. Create a project at Neon.
2. Create a database named `lastmile`.
3. Copy the pooled connection string into `DATABASE_URL`.
4. Copy the direct/unpooled connection string into `DIRECT_URL`.
5. Run the Prisma commands below.

```bash
bun --cwd packages/database db:generate
bun --cwd packages/database db:push
bun --cwd packages/database db:seed
```

The schema lives in `packages/database/prisma/schema.prisma`. It includes users/roles, donors, receivers, shelter demand, volunteers, donation batches, assignments, time-limited reservations, compatibility rules, audit events, and simulation sessions.

## 3. Vercel frontend deployment

1. Import the repository into Vercel.
2. Set **Root Directory** to `apps/web` if deploying only the frontend, or leave the repository root if you want Turborepo task detection.
3. Set the Build Command to `bun run build` from the repository root when using the root directory. If Vercel is scoped to `apps/web`, use `bun run build` with the workspace install enabled.
4. Add the variables from the table above to the Vercel project. `NEXT_PUBLIC_API_URL` must point at the deployed Worker.
5. Keep `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=false` until the OAuth callback is configured. The application remains usable with local profile editing without OAuth.

### Google OAuth callback

In Google Cloud Console, create a Web OAuth client and add these authorized redirect URIs:

```text
http://localhost:3000/api/auth/callback/google
https://YOUR-VERCEL-DOMAIN.vercel.app/api/auth/callback/google
```

Then set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, and `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true`. Restart the local server after changing `.env.local`. The profile menu will show **Continue with Google**, which calls the NextAuth route at `/api/auth/signin/google`.

The production frontend entry point is `apps/web/app/page.tsx`. It is intentionally desktop-first but collapses to a mobile menu and stacked operational cards under 760px.

## 4. Cloudflare Worker backend

`apps/api` is a small native Worker adapter. It provides `/health` and `/api/operations` endpoints and is the correct place to add authenticated Neon-backed endpoints. The current browser workspace uses local persistence deliberately so the UI is usable before deploying the Worker.

```bash
bunx wrangler login
bunx wrangler deploy -c apps/api/wrangler.toml
bunx wrangler secret put DATABASE_URL -c apps/api/wrangler.toml
```

For production, move the domain logic from `apps/web/lib/operations.ts` into a shared `packages/domain` package or API module and make the Worker the authoritative source of state. The browser should never be the authority for reservations, quantity allocation, expiry, or custody transitions.

Recommended API surface:

- `GET /api/operations` — dashboard snapshot
- `POST /api/batches` — validate and create a donation batch
- `POST /api/dispatch/replan` — run the deterministic constraint solver
- `POST /api/reservations/:id/confirm` — confirm pickup before deadline
- `POST /api/reservations/reconcile` — release expired uncollected reservations
- `POST /api/assignments/:id/reroute` — reroute physical custody without duplicating quantity
- `POST /api/simulation/events` — execute deterministic judging scenarios

## 5. Product flow and verification

The interactive UI path is:

1. Create a batch, rider, and shelter from their respective pages.
2. Confirm they appear in the tables and on the OpenStreetMap map.
3. Click a map point or table row to open the details drawer.
4. Edit the record and confirm the table/map changes.
5. Delete a batch and confirm it disappears from the map and counts.
6. Click **Replan** and confirm recommendations are generated from the records you created.
7. Refresh the browser and confirm the local workspace remains.
8. Use **Clear local workspace** to intentionally reset to zero records.

## 6. Domain safety rules

Hard constraints must be checked before scoring recommendations:

- available quantity cannot become negative;
- rider load cannot exceed capacity;
- shelter demand cannot be overfilled;
- an expired or infeasible batch cannot be assigned;
- a reservation timeout releases only uncollected quantity;
- picked-up cargo remains in physical custody and must be delivered, rerouted, or sent to a safe fallback workflow;
- compatibility rules are category-specific and produce an explanation for rejection.

`packages/database/prisma/schema.prisma` provides the relational constraints and indexes needed for Neon. Use a database transaction with row locks or an equivalent serializable operation around allocation and reservation reconciliation in the production API.

## 7. File map

- `apps/web/app/page.tsx` — operations shell, forms, drawers, profile menu, and local persistence.
- `apps/web/app/globals.css` — no-gradient visual system, responsive layout, map treatment, tables, forms, and states.
- `apps/web/lib/operations.tsx` — empty-first domain state, CRUD transitions, and dispatch recalculation.
- `apps/web/components/map-view.tsx` — real Leaflet/OpenStreetMap map with markers, popups, pan, zoom, and routes.
- `apps/web/auth.ts` and `apps/web/app/api/auth/[...nextauth]/route.ts` — optional Google OAuth integration.
- `apps/api/src/index.ts` — Cloudflare Worker adapter.
- `packages/database/prisma/schema.prisma` — Neon/Prisma relational model.
- `packages/database/prisma/seed.ts` — compatibility rule seed.
- `.env.example` — safe placeholders showing where each variable belongs.

## 8. Security and operations notes

- Never commit `.env.local`, Neon passwords, Cloudflare tokens, Auth.js secrets, or production payloads.
- Keep `DATABASE_URL` and `AUTH_SECRET` server-side only.
- Add Auth.js middleware and role checks before enabling donor/volunteer/receiver writes in production.
- Enforce reservation expiry from a Worker cron or scheduled task; a frontend countdown is only presentation.
- Use Neon branching for migration previews and a separate production branch for the deployed Vercel/Worker pair.
