# Import 3-year demo backtest into the database

This imports synthetic UI presentation data (`trades` + `daily_returns`) via Prisma upserts.

- Daily returns are stored as **`PUBLISHED`** (`TradingDayStatus`: `DRAFT` | `PUBLISHED` | `DISTRIBUTED` | `REVERSED` — **not** `SETTLED`).
- Trades are stored as **`CLOSED`** with **`isPublic: true`**.

> Demo / presentation data only. Review before pointing at a live investor database.

## One-command import

From the repo (with `DATABASE_URL` set):

```bash
pnpm --filter @meridian/api run db:seed:demo
```

Or from `apps/api`:

```bash
pnpm db:seed:demo
```

The script loads dotenv from `apps/api/.env` (then repo-root `.env`), then reads JSON from the first path that exists:

1. `demo-data/3-year-backtest/export/json/`
2. `apps/web/public/demo/backtest/`

To upsert **trades only** and leave the frozen Profit / `daily_returns` table untouched:

```bash
HISTORICAL_TRADES_ONLY=1 pnpm --filter @meridian/api run db:seed:demo
```

## Get `DATABASE_URL` from Render

1. Open [Render Dashboard](https://dashboard.render.com/) → your Growzy workspace.
2. Open the **PostgreSQL** service (Blueprint name: `growzy-db`).
3. Go to **Info** (or **Connections**).
4. Copy a connection string:
   - **Internal Database URL** — preferred when running the seed from a Render shell / private network (same region as the DB).
   - **External Database URL** — use from your laptop; requires the DB to allow external connections.
5. Ensure the URL includes SSL, e.g. `?sslmode=require` (Render usually includes this).

### Option A — run on your machine

```bash
cd apps/api
cp .env.example .env   # if you do not already have .env
# set DATABASE_URL to the External Database URL from Render
export DATABASE_URL='postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require'
pnpm db:seed:demo
```

### Option B — run inside the Render API service shell

1. Render → **growzy-api** → **Shell**.
2. `DATABASE_URL` is already injected (Internal URL).
3. From the service root (repo root on Render):

```bash
pnpm --filter @meridian/api run db:seed:demo
```

## Regenerate source JSON (optional)

If exports are missing or you changed `generate.mjs`:

```bash
node demo-data/3-year-backtest/generate.mjs
```

Then re-run `pnpm db:seed:demo`.

## Verify

```sql
SELECT COUNT(*) FROM daily_returns WHERE status = 'PUBLISHED';
SELECT COUNT(*) FROM trades WHERE status = 'CLOSED' AND is_public = TRUE;
```
