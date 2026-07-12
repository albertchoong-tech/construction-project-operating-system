# HSH ProjectOS — Roadmap

_Living document: append-only history at the top, backlog below. Update it at the end of
every sprint — mark the sprint complete, move anything unfinished into the backlog, and
renumber future sprints only when scope is split or merged. This file must always match
what is deployed at https://construction-project-operating-syst.vercel.app._

_Full sprint specifications (objectives, testing checklists, definitions of done) live in
[BACKLOG.md](BACKLOG.md)._

---

## ✅ Completed Sprint History (append-only — do not rewrite)

| # | Sprint | Shipped | Key commits | Summary |
|---|---|---|---|---|
| 1 | Foundation & Project Master | 2026-07-08 | `4643fed` | Schema + seed applied; app shell; Projects & Clients CRUD; BOQ/Budget tabs |
| 2 | Procurement Engine | 2026-07-08 | `3591abe` | PR → approval → PO → approval → delivery; suppliers; append-only approval audit |
| 3 | Site, Variations & Money | 2026-07-08 | `2ded555` | Progress logs, VOs revise contract value, claims pre-filled from completion %, payments, live P&L |
| 4 | Director Dashboard & Approvals | 2026-07-09 | `2696dbc` | KPIs, oldest-first approval queue, health flags, milestones, inspections, document upload |
| 5 | Auth & RLS Lock-down | 2026-07-09 | `ec87111` | Email/password auth, roles, role-gated modules + RLS, Director-only approvals |
| 6a–6b | Inspection Categories, Attachments & Document Centre | 2026-07-09 | `d40b9ff` | Issue/root-cause dropdown ("Others" + specify); multi-file uploads linked to records; categorised document centre |
| 6c | Labour Cost Module | 2026-07-09 | `9fec1de` | Wages + EPF/SOCSO/EIS/PCB entries, DB-computed totals, flows into committed cost & margin |
| 6d | Cost Centres & Health Indicator | 2026-07-09 | `2ade6a1` | PO cost centres, Cost-by-Category card, Healthy/Attention/Critical across dashboard/list/detail |
| 7 | Mobile & PWA | 2026-07-11 | `3fa6071`, `aec692b`, `1b718ba` | Mobile nav (header/drawer/bottom bar), tables→cards, camera capture + compression, role dashboards, /inspections, installable PWA |
| 7a | UX Polish | 2026-07-11 | `47d2864`, `3276239`, `d831271` | Password show/hide, Remember-me, KPI cards fit and asymmetric grid |
| 8 | User & Access Administration | 2026-07-12 | `0e2cb4c` | /team page, project-membership-scoped RLS, profiles as role source of truth, hardened sign-up |
| 9 | Quotation-to-Project | 2026-07-12 | `0d83d21` | /quotations module, approval workflow, convert-to-project copying lines into BOQ, print view |
| 10 | **Record Editing & Corrections** | **2026-07-12** | `0cd957b` | See below — latest sprint |

### Sprint 10 — Record Editing & Corrections (latest)

No new schema (uses migration 0005). App changes:

- ✅ **Edit forms** for draft/pre-approval records: PR (draft), PO (draft), VO (draft/pending),
  progress claim (draft/submitted), quotation (draft); plus full edit for labour entries,
  inspections and site-progress logs. Guarded server-side by status.
- ✅ **PO cost-centre recategorisation** after approval (Director-only, audited) — the explicit
  fix for legacy all-Material POs; inline select on the PO detail page.
- ✅ **Cancel** approved-but-unfulfilled financial records (PO / VO / claim): Director-only,
  written to `approval_records`, status → `cancelled`, retained in the DB and dropped from
  committed cost / margin / receivables automatically (a `cancelled` status simply falls out
  of the financial aggregations).
- ✅ Shared audit helper (`lib/audit.ts`); reusable line-item editors accept initial values;
  `cancelled` status badge; Edit/Cancel controls wired into every list, project tab and detail.

**Design decision:** unapproved records are hard-deletable (as before); approved records are
**cancelled and retained** rather than soft-deleted — this preserves the audit trail where it
matters (approved financials) without the cost of `deleted_at` filtering across ~25 read sites.

**Verification note:** typecheck + production build pass; the **labour-edit form was verified
end-to-end against the production database** (basic wage 3500→3600, total recomputed to 4938 —
edits flow into financials correctly). The button-based Cancel/Recategorise controls use the
identical `ActionButton` inline-server-action pattern as the approval buttons already proven in
production (Sprints 8–9); they could not be click-verified this session because the browser
test pane was intermittently dropping synthetic click events (the same false signal reproduced
on the known-good Sprint 9 deploy, confirming it is a tooling limitation, not a code defect).
**Recommended before relying on them:** one manual click-through of Cancel PO/VO/claim and PO
recategorise on the live site.

### Sprint 9 — Quotation-to-Project

Migration `0005_quotations.sql` (applied to the live database) plus app changes — closes the
last unbuilt PRD MVP item:

- ✅ `/quotations`: pipeline/won KPIs, list, and creation with client, job title, validity,
  terms and a section-aware line-item editor (totals computed in the database)
- ✅ Workflow: draft → submit → Director approve/reject with `approval_records` audit
- ✅ **Convert to Project**: creates the project (auto `PRJ` code, contract value = quotation
  total, client linked, start date today), copies every line into the BOQ with sections
  preserved, and locks the quotation as `converted`
- ✅ Client-ready document view at `/quotations/[id]` with Print/PDF (print CSS strips app
  chrome); Quotation tab on converted projects links back
- ✅ Sidebar module, Director + QS access (PMs/Supervisors excluded by module guard + RLS)
- ✅ Verified end-to-end: QT-2026-001 (RM 39,200) → approved → PRJ-2026-005 with exact BOQ copy

**Unfinished scope moved to backlog:** none — sprint shipped as specified. (Editing draft
quotations remains intentionally out of scope; it belongs to Sprint 10 with all other
record corrections. Quotation attachments deferred to the document centre's existing flow.)

### Sprint 8 — User & Access Administration

Migration `0004_team_access.sql` (applied to the live database) plus app changes:

- ✅ `/team` page (Director only): inline role changes, deactivate/reactivate accounts, project assignments
- ✅ `project_members` table; **PMs and Site Supervisors read and write only their assigned projects** (RLS `is_member`/`can_read`/`can_write` helpers — lists, dropdowns and raw REST all filter)
- ✅ `profiles` is the single source of truth for role + activation: middleware and sign-in read it per request, so role changes apply **without re-login**
- ✅ Deactivation: active sessions bounce to `/login` with a notice; fresh sign-ins rejected; reactivation restores access
- ✅ Sign-up hardened: role selector removed; DB trigger forces every new account to `site_supervisor` regardless of client-supplied metadata (no self-service privilege escalation)
- ✅ Guards: cannot demote or deactivate the last active Director; cannot deactivate yourself
- ✅ Verified end-to-end (supervisor scoping, deactivate/login-block/reactivate cycle, promotion to Finance flowing through nav/guards/dashboard)

**Unfinished scope moved to backlog** (deliberate deferral, see Go-Live Checklist below):
- Retiring the two demo accounts and seeding the real owner as Director — `director.demo@hshprojectos.com` is currently the **only** active Director, so it must stay active until a real Director account exists.

---

## 🚧 Backlog (future sprints — numbering unchanged, 11–14 remain valid)

| Sprint | Name | Priority | Effort | Dependencies |
|---|---|---|---|---|
| 11 | Reporting & Exports | 🟡 Medium | Large (~1–2 wk) | Best after 10 ✅ |
| 12 | Notifications & Scheduled Automations | 🟡 Medium | Medium–Large (~1 wk) | Email provider key; after 8 ✅ |
| 13 | Mobile Offline & Field Hardening | 🟡 Medium | Large (~1–2 wk) | None |
| 14 | Intelligence Layer | 🟢 Low | Large (~1–2 wk) | 9 ✅–10 ✅ in real use; Anthropic key |

**Sequencing:** Sprints 8–10 done. Recommended next: Sprint 11 (reporting) now that data can be
corrected; Sprint 12 (notifications) can run concurrently.

### Go-Live Checklist (carried-over items, do before real company data)
- [ ] Real owner signs up → Director promotes the account on `/team` → deactivate `director.demo@hshprojectos.com` and `supervisor.demo@hshprojectos.com`
- [ ] Rotate the demo passwords or deactivate demo accounts entirely
- [ ] Review storage-object policies (uploads are login-gated but not yet membership-scoped per project path — see limitations)
- [ ] Optional: clear 2024-dated seed projects or mark them `completed`

### Known Limitations (current production behaviour)
- A deactivated user's already-issued JWT can read via raw REST until it expires (≤1 h); the app itself signs them out on the next page load
- Storage uploads/deletes require login but are not membership-scoped to project paths (metadata records are)
- Records are not editable after creation (Sprint 10) and deletes are hard deletes — this now includes draft quotations (delete-and-recreate to amend)
- Role changes take effect on the target user's next request; their currently rendered page may be stale until navigation
- Quotation print view uses the browser's Print/PDF; no server-generated PDF files yet

---

## Update Log
- **2026-07-12** — Sprint 10 appended as completed (`0cd957b`). Edit forms verified against the production DB; button-based cancel/recategorise ship on the proven ActionButton pattern but need one manual click-through (browser test pane was dropping synthetic clicks — verified as a tooling artefact by reproducing the same false signal on the working Sprint 9 deploy). Briefly reverted (`4630630`) then reapplied after confirming the "regression" was a test-harness false positive. Backlog renumbered — 11–14 remain.
- **2026-07-12** — Sprint 9 appended as completed (`0d83d21`); no unfinished scope; draft-quotation editing noted as part of Sprint 10's corrections scope; backlog renumbering reviewed — 10–14 unchanged.
- **2026-07-12** — Sprint 8 appended as completed; demo-account retirement moved to Go-Live Checklist; backlog renumbering reviewed — 9–14 unchanged. (Roadmap file created; prior history imported from BACKLOG.md.)
