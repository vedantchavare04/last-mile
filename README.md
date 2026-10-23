# LAST-MILE

> Every donation. The right destination. Before time runs out.

LAST-MILE is an operations control platform for coordinating surplus food and essential aid under expiry, capacity, compatibility, and field reliability constraints. It is built as a Bun/Turborepo workspace with a Next.js frontend, a Prisma/Neon data model, and a Cloudflare Worker adapter.

## Quick start

```bash
bun install
cp .env.example .env.local
bun run dev
```

Open `http://localhost:3000`.

The default is a genuinely empty local workspace. It does not inject sample batches, riders, shelters, or fake analytics. Create records in the UI and they are saved in browser `localStorage` so refreshes do not erase them.

## Commands

```bash
bun run dev          # start the Next.js app through Turborepo
bun run build        # production build
bun run check-types  # all workspace TypeScript checks
bun run lint         # all workspace ESLint checks
bun run test         # business-rule tests
```

## What is implemented

- Operations shell with Overview, Live Operations, Donation Batches, Dispatch Planning, Volunteers, Shelters, Safety, Analytics, and Settings views.
- Constraint-aware dispatch recommendations with transparent feasibility reasons.
- Batch splitting preview across rider capacity with zero double-booking signal.
- Reservation timeout recovery for an unresponsive rider.
- Shelter demand closure and safe reroute workflow for in-transit cargo.
- Category-specific compatibility checks, including raw-ration facility requirements and medical cold-chain handling.
- Interactive OpenStreetMap view with pan, zoom, popups, routes, and clickable records.
- Empty-state-first workspace with create/edit/delete drawers for batches, riders, shelters, and profile details.
- Neon-ready Prisma schema for users, roles, donors, receivers, demand, volunteers, batches, assignments, reservations, compatibility rules, events, and simulation sessions.
- Cloudflare Worker adapter under `apps/api`.
- No gradient visual treatment; the interface uses editorial typography, warm neutral surfaces, precise borders, and restrained green/amber/red operational states.

## How the application works

1. Open **Donation batches** or click **New batch**. Submit the form with a real donor name, quantity, deadline, and latitude/longitude.
2. The batch is added to the workspace, appears in the batch table, and appears as a clickable circle on the OpenStreetMap map.
3. Add riders from **Volunteers** and shelters from **Shelters & demand**. Their records also appear in the map and can be clicked to open the details drawer.
4. Click any table row or map marker to open its details. Use **Edit** to change the record or **Delete** to remove a batch.
5. Open **Dispatch planning** and click **Replan**. Recommendations are calculated from the current records, not hardcoded sample records.
6. Click the profile avatar to open the profile menu. **Edit profile** saves the profile locally. Google sign-in is enabled only when the Google variables are configured.
7. Use **Settings** to inspect record counts and integration status. Use **Clear local workspace** from the profile menu to start over.

## Architecture

- `apps/web` — Next.js App Router frontend, local workspace persistence, editable flows, and interactive map.
- `apps/api` — Cloudflare Worker adapter for `/health` and `/api/operations`.
- `packages/database` — Prisma schema, client, and seed commands for Neon Postgres.
- `packages/ui` — existing shared UI package retained for workspace compatibility.
- `integration.md` — complete Neon, Vercel, Cloudflare, environment, deployment, and production handoff instructions.

See [`integration.md`](./integration.md) before deploying. It documents every environment variable, where to insert it, the Neon migration commands, Cloudflare secret setup, Vercel configuration, and the production API surface.
