# HSH ProjectOS

Integrated construction project and financial management platform — replaces Excel and WhatsApp by tracking the full project lifecycle from quotation to profitability for residential construction teams.

## What it does

- **Projects & Clients** — project master with client, contract value, status, dates, completion %
- **BOQ & Budgets** — bill-of-quantities line items with computed totals; budget categories with variance
- **Procurement engine** — purchase request → approval → purchase order → approval → material delivery, with an append-only approval audit trail
- **Site progress** — daily logs (work done, completion %, workers, weather, issues); latest completion flows to the project master and dashboard
- **Variation orders** — approval workflow; approved VOs update the revised contract value
- **Progress claims** — pre-filled from completion % × revised contract minus claimed-to-date; certification with approved amount; customer receipts auto-mark claims paid
- **Payments** — customer receipts and supplier payments; POs auto-mark paid when settled
- **Director dashboard** — cash position, receivables/payables, pending-approvals queue (oldest first, inline approve/reject), project health ranking, upcoming milestones
- **Inspections & documents** — inspection records and file uploads to Supabase Storage per project

v1 runs in demo mode (no login wall, open RLS policies). The lock-down sprint — Supabase Auth, owner RLS policies, role-based navigation — is planned next; see `docs/TASKS.md` Sprint 5.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, React 19, Server Actions) |
| Language | TypeScript strict |
| Styles | Tailwind CSS v4 |
| DB | Supabase Postgres (schema in `supabase/migrations/0001_init.sql`) |
| Deploy | Vercel (auto-deploys from `main`) |

## Quick start

```bash
npm install
vercel link && vercel env pull .env.local   # Supabase keys live in Vercel env
npm run dev
```

Apply `supabase/migrations/0001_init.sql` in the Supabase SQL editor if the database is fresh.

## Docs

The full plan lives in `/docs`: [PRD](docs/PRD.md) · [Architecture](docs/ARCHITECTURE.md) · [Data model](docs/DATA_MODEL.md) · [Tasks](docs/TASKS.md) · [Test plan](docs/TEST_PLAN.md) · [Security](docs/SECURITY.md)
