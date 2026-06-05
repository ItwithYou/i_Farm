# Super Smart Farm System

Foundation for migrating the Excel-based farm management & financial tracking
system into a Next.js + Prisma + Supabase application.

## Stack

- **Frontend:** Next.js (App Router) · Tailwind CSS · Shadcn UI
- **Data:** Supabase Postgres + Prisma (type-safe queries & migrations)
- **Deploy:** Vercel

## What's in this scaffold

| Path | Purpose |
|---|---|
| `prisma/schema.prisma` | Relational schema: batches, chart of accounts, multi-currency ledger, capital advances, FX rates |
| `lib/prisma.ts` | Prisma client singleton (hot-reload safe) |
| `lib/currency.ts` | `decimal.js` conversion utilities + LAK formatting |
| `lib/batch-pnl.ts` | Per-batch P&L aggregation (enforces `pnlInclusion`) |
| `app/actions/transactions.ts` | Server Action: Zod validation + FX snapshot on write |
| `app/transactions/new-transaction-form.tsx` | Multi-currency entry form (client) |
| `app/batches/[id]/page.tsx` | Batch Profitability Dashboard (server) |

## Setup

```bash
# 1. Scaffold the Next.js app around these files (or copy them in)
npx create-next-app@latest . --typescript --tailwind --app
npx shadcn@latest init
npx shadcn@latest add card input label select switch textarea button table badge

# 2. Dependencies
npm install prisma @prisma/client decimal.js zod

# 3. Configure DB
cp .env.example .env   # fill in Supabase connection strings
npx prisma migrate dev --name init
```

## Key financial-correctness decisions

- **Money is `Decimal` / Postgres `NUMERIC`, never `Float`.** Floats corrupt currency math.
- **Cross-currency P&L uses a snapshotted `amountLakEquivalent`** stored on each
  transaction at posting time, so historical reports never drift when FX rates move.
- **FX rates are effective-dated** (`ExchangeRate` table, all rates relative to LAK).
  Static/manual rates recommended; live rates only needed for today's new entries.
- **Capital advances are a separate liability model**, structurally unable to leak
  into income. `AdvanceRepayment` is an append-only audit log.
- **`pnlInclusion`** (your `Include_in_batch_profit`) is enforced in the P&L query so
  shared admin / capital expenditure is excluded from per-batch profit.
- **`Category.isCapital`** distinguishes CapEx (construction/improvement) from OpEx.

## Open design choices (see PR description)

- Wide currency columns vs. a normalized `(currency, amount)` line table.
- Keep `AdvanceRepayment` audit log vs. a single mutable `repaidAmount`.
