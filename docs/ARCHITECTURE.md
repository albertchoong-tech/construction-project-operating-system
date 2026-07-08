# Architecture

## Stack
- **Frontend:** Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
- **Backend/DB:** Supabase (Postgres + RLS + Storage for documents/photos)
- **Auth:** Supabase Auth (added in lock-down sprint)
- **Hosting:** Vercel

## What to Build Now vs Later
**Now:** Project master, BOQ, procurement workflow, site progress, variation orders, progress claims, payment recording, profitability dashboard — all with seed data, no login wall.
**Later:** Auth + role enforcement, document uploads, approval notification emails, reporting exports, mobile-friendly polish.

## Key Action Flow — Raise a Progress Claim
1. Site Supervisor logs daily progress entries against BOQ line items.
2. QS opens a project, reviews completion %, and clicks "New Progress Claim".
3. System pre-fills claimed amounts from cumulative progress against BOQ.
4. QS adjusts, saves; claim enters "Pending Approval" state.
5. Director approves; claim status moves to "Approved — Awaiting Payment".
6. Finance records customer receipt linked to claim; outstanding receivable clears.
7. Dashboard recalculates cash position and project P&L in real time.

## Layer Plan
1. **Data layer first** — tables, constraints, RLS policies, seed data.
2. **App logic** — CRUD forms, status state machines, approval transitions.
3. **Smart features later** — cost variance alerts, cash flow forecasting.

## Core Without AI
Every financial calculation (budget vs actual, gross margin, cash position) is plain Postgres aggregation — no AI dependency. The system is fully operational without any intelligence layer.