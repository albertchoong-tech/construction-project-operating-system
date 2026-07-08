# Security

## Secret Handling
- Supabase service role key: server-side only (Next.js API routes / server actions). Never in client bundle.
- Supabase anon key: client-safe; scoped by RLS.
- All env vars in Vercel dashboard; never committed to repo.

## Permission Model (End State — reached at lock-down sprint)
| Role | Scope |
|---|---|
| Director | All projects, all approvals, all financials |
| Project Manager | Assigned projects: budgets, progress, resources |
| Quantity Surveyor | BOQ, quotations, VOs, progress claims |
| Purchasing Officer | PRs, POs, suppliers, deliveries |
| Finance | Receipts, payments, cash flow |
| Site Supervisor | Site progress logs, inspections (own projects only) |

RLS policies enforce `user_id = auth.uid()` plus a `memberships` join for project-level scoping. v1 demo policies are fully permissive and replaced before any real data enters.

## Approved Tools Rule
Agent actions use only the named tools listed in AGENTIC_LAYER.md. No `eval`, no `run_any`, no raw SQL from user input. Every tool call is logged to `approval_records`.

## Audit Principle
Every status-changing action writes a record: who, what, when, before-state, after-state. Records are append-only (no update/delete on audit tables).