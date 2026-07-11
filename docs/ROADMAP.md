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
| 8 | **User & Access Administration** | **2026-07-12** | `0e2cb4c` | See below — latest sprint |

### Sprint 8 — User & Access Administration (latest)

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

## 🚧 Backlog (future sprints — numbering unchanged, 9–14 remain valid)

| Sprint | Name | Priority | Effort | Dependencies |
|---|---|---|---|---|
| 9 | Quotation-to-Project Module | 🟠 High | Medium (~1 wk) | None |
| 10 | Record Editing & Corrections | 🟠 High | Medium (~1 wk) | None |
| 11 | Reporting & Exports | 🟡 Medium | Large (~1–2 wk) | Best after 10 |
| 12 | Notifications & Scheduled Automations | 🟡 Medium | Medium–Large (~1 wk) | Email provider key; after 8 ✅ |
| 13 | Mobile Offline & Field Hardening | 🟡 Medium | Large (~1–2 wk) | None |
| 14 | Intelligence Layer | 🟢 Low | Large (~1–2 wk) | 9–10 in real use; Anthropic key |

**Sequencing:** Sprint 8 (the gate to real users) is done. Track A (9 → 10 → 11) and
Track B (12 → 13) can now run concurrently; Sprint 14 last.

### Go-Live Checklist (carried-over items, do before real company data)
- [ ] Real owner signs up → Director promotes the account on `/team` → deactivate `director.demo@hshprojectos.com` and `supervisor.demo@hshprojectos.com`
- [ ] Rotate the demo passwords or deactivate demo accounts entirely
- [ ] Review storage-object policies (uploads are login-gated but not yet membership-scoped per project path — see limitations)
- [ ] Optional: clear 2024-dated seed projects or mark them `completed`

### Known Limitations (current production behaviour)
- A deactivated user's already-issued JWT can read via raw REST until it expires (≤1 h); the app itself signs them out on the next page load
- Storage uploads/deletes require login but are not membership-scoped to project paths (metadata records are)
- Records are not editable after creation (Sprint 10) and deletes are hard deletes
- `quotations` table still has no UI (Sprint 9)
- Role changes take effect on the target user's next request; their currently rendered page may be stale until navigation

---

## Update Log
- **2026-07-12** — Sprint 8 appended as completed; demo-account retirement moved to Go-Live Checklist; backlog renumbering reviewed — 9–14 unchanged. (Roadmap file created; prior history imported from BACKLOG.md.)
