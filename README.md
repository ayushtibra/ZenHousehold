# ZenHousehold

Shared household app. Everyone in the family uses it from their own phone; changes sync to all members.

- **Home**: today's helper attendance (one-tap present / half day / absent, milk quantity) and to-dos due today or overdue.
- **To-do**: shared tasks, assignable to a family member or a helper, with a due date and optional daily / weekly / monthly repeat. Ticking a repeating task creates the next one; unticking removes it again.
- **Settings**: join code and invite, members (everyone who joined), helpers, your name, sync status.

Helper pay rules:

- **Salaried helpers** (maid, cook, driver): fixed paid leaves per month. Per-day pay = salary ÷ days in
  the month; leaves beyond the allowance are deducted, extra days (came on an off day) are added.
  Unused leaves don't carry over. Advances and salary payments count against the month; bonus doesn't.
- **Per-quantity helpers** (milk, newspaper, ironing): usual quantity per day, change it or mark
  "didn't come"; bill = quantity × rate.

## Stack

- `src/` — React + Vite PWA. Data lives in IndexedDB (Dexie) so it works offline; changes queue in an
  outbox and sync through `/api/sync`.
- `functions/api/` — Cloudflare Pages Function for the sync API, with D1. Hosted on Pages (not a Worker)
  because the office network blocks `*.workers.dev`. Records are stored as
  generic JSON rows (`kind`, `id`, `data`), so new features need no migration — just add the kind to
  `KINDS` in `functions/api/[[path]].ts` and a Dexie table on the client.
- A household is joined with a 12-character code (Settings → Invite family). Anyone with the code can
  read and edit that household.

## Run locally

```bash
npm install
npm run db:migrate:local
npm run build && npm run dev:api -- --port 8788   # app + API on http://localhost:8788
npm run dev                                        # optional: Vite hot reload on 5173, proxies /api to 8788
npm test
```

## Deploy (first time)

```bash
npx wrangler pages project create zenhousehold --production-branch main
npm run db:migrate:remote
npm run deploy
```
