# Build Tasks

## Sprint 1 — Database Foundation & Project Master (Week 1)
**Goal:** All tables live in Supabase with seed data; Project list and detail screens render without login.
- [ ] Run migration SQL: all domain tables, RLS v1 open policies, seed data
- [ ] Next.js project scaffolded, Supabase client connected, env vars set
- [ ] `/projects` — list page: project code, name, client, status, contract value, completion %
- [ ] `/projects/[id]` — detail page: project info, budget summary, BOQ items tab
- [ ] `/clients` — list + create/edit client form (persists to DB)
- [ ] Project create/edit form with all master fields (persists to DB)
- [ ] Loading, empty, error states on all list screens
- **Definition of Done:** Visiting `/projects` shows seeded projects without login; creating a new project persists to DB and appears in list.

## Sprint 2 — Budget, BOQ & Procurement Engine (Week 2) ✦ CORE ENGINE
**Goal:** The end-to-end procurement workflow works: PR → PO → Delivery.
- [ ] BOQ line item CRUD within project detail (section, description, qty, rate, total)
- [ ] Budget category CRUD within project detail
- [ ] `/purchase-requests` — list + create PR form linked to project (persists to DB)
- [ ] PR approval action: status transitions draft → pending → approved/rejected; writes approval_record
- [ ] `/purchase-orders` — create PO from approved PR, link supplier (persists to DB)
- [ ] PO approval action with approval_record
- [ ] `/suppliers` — list + create/edit supplier
- [ ] Material delivery recording against PO (updates PO status to delivered)
- [ ] Budget vs actual card on project detail (live SQL aggregation)
- [ ] Loading, empty, error, partial states on all procurement screens
- **Definition of Done:** A PR can be created, approved, converted to PO, approved, and a delivery recorded — all persisted and reflected on the project detail page.

## Sprint 3 — Site Progress, Variations & Claims (Week 3) ✦ v1 FUNCTIONAL MILESTONE
**Goal:** The full end-to-end success scenario is usable.
- [ ] `/site-progress` — daily log list + create form per project (work done, completion %, issues, weather, worker count)
- [ ] Completion % automatically surfaced to project dashboard
- [ ] Variation order list + create/approve workflow per project
- [ ] Approved VO updates revised contract value on project detail
- [ ] Progress claim create form: pre-fills from BOQ completion %, editable amounts
- [ ] Progress claim approval workflow (draft → submitted → approved → paid)
- [ ] Customer payment recording linked to claim
- [ ] Supplier payment recording linked to PO
- [ ] Project P&L card: contract value, VO additions, total cost, gross margin
- [ ] Outstanding receivables and payables on dashboard
- [ ] Loading, empty, error states on all new screens
- **Definition of Done:** Full scenario passes — project created, BOQ entered, PR→PO→delivery done, site progress logged, VO raised and approved, progress claim generated and approved, customer payment recorded, P&L shows correct margin.

## Sprint 4 — Dashboard & Approval Centre (Week 4)
**Goal:** Director-level visibility and pending approval queue are operational.
- [ ] `/dashboard` — KPI cards: active projects, total outstanding claims, total receivables, total payables, cash position
- [ ] Per-project health indicators: budget variance %, delay flag, overdue POs
- [ ] Pending approvals queue: PRs, POs, VOs, claims awaiting action, sorted by age
- [ ] Approval action directly from queue (approve/reject with remarks)
- [ ] Upcoming milestones list (projects by end date)
- [ ] Document upload per project (file stored to Supabase Storage, record in project_documents)
- [ ] Inspection record CRUD per project
- [ ] Definition of Done: Dashboard loads real aggregated data; approving an item from the queue updates its status immediately.

## Sprint 5 — Lock It Down: Auth & Role Enforcement (Week 5)
**Goal:** Multi-user with real data is safe.
- [ ] Supabase Auth: email/password sign-up and login
- [ ] User role assignment (stored in profiles/memberships table)
- [ ] Replace v1 open RLS policies with `auth.uid() = user_id` owner policies + role checks
- [ ] Route guards: redirect unauthenticated visitors to `/login`
- [ ] Role-based navigation: each role sees only their modules
- [ ] Seed data preserved; demo mode disabled
- **Definition of Done:** Unauthenticated request returns no data from Supabase; each role can only access permitted screens and records.

## Gantt (Sprint → Feature)
```
Week 1: DB schema · seed data · project list/detail · client CRUD
Week 2: BOQ · budget · PR→PO→delivery · supplier CRUD  [CORE ENGINE]
Week 3: Site progress · VOs · progress claims · payments · P&L  [v1 FUNCTIONAL]
Week 4: Dashboard KPIs · approval queue · documents · inspections
Week 5: Auth · RLS lock-down · role enforcement
```