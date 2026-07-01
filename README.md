# patleHoneAayeHo

Macro-adaptive diet app for Indian parents. Scan a meal, get a macro breakdown, and get food
recommendations built from what you already eat — never a new food, never a swap.

See [CLAUDE.md](CLAUDE.md) for the full product brief and phase plan, and
[CHANGELOG.md](CHANGELOG.md) for what's shipped so far.

## Project layout

- `frontend/` — React Native (Expo) app, TypeScript
- `backend/` — Cloudflare Workers + D1, TypeScript

## Prerequisites

- Node.js 24.x and npm
- [Expo Go](https://expo.dev/go) on your phone, or an iOS/Android simulator, to run the frontend
- A Cloudflare account (only needed once you deploy the backend — local dev works without one)

## Backend (Cloudflare Workers + D1)

```bash
cd backend
npm install
cp .dev.vars.example .dev.vars   # fill in real values as later phases need them
npm run dev                       # starts a local dev server at http://localhost:8787
```

Verify it's up:

```bash
curl http://localhost:8787/health
# {"status":"ok"}
```

Run tests:

```bash
npm test
```

Run lint:

```bash
npm run lint
```

The D1 database binding lives in `wrangler.jsonc`. `wrangler dev` runs against a local SQLite
file automatically — no Cloudflare account needed for local development. Before deploying to
production, create a real database with `wrangler d1 create ingredient-first-db` and paste the
returned `database_id` into `wrangler.jsonc`.

Apply the database schema (see [docs/schema.md](docs/schema.md) for what each table is and an ER
diagram):

```bash
npm run db:migrate           # apply all pending migrations to your local D1
npm run db:migrate:status    # see which migrations are applied vs. pending
npm run db:migrate:down      # roll back the most recently applied migration
```

## Frontend (Expo)

```bash
cd frontend
npm install --legacy-peer-deps   # see note below
cp .env.example .env             # fill in real values as later phases need them
npm start                        # opens the Expo dev tools; scan the QR code with Expo Go
```

Run tests:

```bash
npm test
```

Run lint:

```bash
npm run lint
```

> **Why `--legacy-peer-deps`?** This project is on Expo SDK 57 / React Native 0.86, which are
> newer than what `jest-expo`'s published peer dependency range (`@react-native/jest-preset@^0.85.0`)
> officially supports. The versions installed here are verified to work together; drop the flag
> once `jest-expo` publishes a release with a matching peer range.
>
> **Expo Go version mismatch?** The published Expo Go app only supports one SDK at a time. If you
> get "Project is incompatible with this version of Expo Go," check the error message — it tells
> you which SDK your installed Expo Go expects. Update the Expo Go app from the Play/App Store to
> match this project's SDK (57), or ask to have the project's SDK bumped/pinned to match your client.

## Environment variables

Both apps commit a `.env.example` / `.dev.vars.example` file with placeholders; the real files
(`.env`, `.dev.vars`) are gitignored. Never commit real API keys or secrets.

- `backend/.dev.vars.example` — Vision API key, Razorpay keys (all currently placeholders, wired
  up in later phases). D1 doesn't need a connection string — it's bound directly in `wrangler.jsonc`.
- `frontend/.env.example` — only public/publishable values belong here (Expo inlines `EXPO_PUBLIC_*`
  vars into the client bundle). Secrets stay on the backend.

## CI

`.github/workflows/ci.yml` runs lint + tests for both `backend/` and `frontend/` on every push
and pull request.
