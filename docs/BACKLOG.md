# HSH ProjectOS — Development Backlog

> **Status tracking has moved to [ROADMAP.md](ROADMAP.md)** — that file is the living,
> append-only record of what is shipped vs. pending. This file keeps the full sprint
> specifications (objectives, features, testing checklists, definitions of done).
> Sprint 8 below was **completed 2026-07-12** (`0e2cb4c`); its demo-account retirement
> item moved to the ROADMAP Go-Live Checklist.

_Compiled 2026-07-12 from the production codebase (commit `d831271`), not just the original PRD._
_Production: https://construction-project-operating-syst.vercel.app · Supabase `brzbcundygwysrfhjmet` · auto-deploys from `main`._

---

## ✅ Completed Sprints

| # | Title | Summary | Production status |
|---|---|---|---|
| 1 | Foundation & Project Master | Schema + seed applied; app shell; Projects & Clients CRUD; project detail with BOQ/Budget tabs | ✅ Live & verified |
| 2 | Procurement Engine | PR (multi-line items) → approval → PO → approval → material delivery; Suppliers CRUD; append-only approval audit | ✅ Live & verified |
| 3 | Site, Variations & Money | Site progress logs (completion % flows to project), VOs revise contract value, claims pre-filled from completion %, customer/supplier payments with auto status transitions, live P&L | ✅ Live & verified |
| 4 | Director Dashboard & Approvals | Company KPIs, oldest-first approval queue with inline approve/reject, project health list, milestones, inspections CRUD, document upload to Storage | ✅ Live & verified |
| 5 | Auth & RLS Lock-down | Email/password auth, profiles + roles, role-gated modules and RLS write policies, Director-only approvals, anonymous access returns zero rows | ✅ Live & verified |
| 6a | Inspection Issue Categories | Structured root-cause dropdown incl. "Others — please specify"; shown in all listings | ✅ Live & verified |
| 6b | Attachments & Document Centre | Multi-file uploads on projects/VOs/inspections/progress; document centre with 10 categories and record linking; thumbnails everywhere | ✅ Live & verified |
| 6c | Labour Cost Module | Wages + statutory (EPF/SOCSO/EIS/PCB) entries per project, DB-computed totals, flows into committed cost & margin (Director/Finance only) | ✅ Live & verified |
| 6d | Cost Centres & Health Indicator | POs carry cost centres; Cost-by-Category card; Healthy/Attention/Critical rules on dashboard, list and detail | ✅ Live & verified |
| 7 | Mobile & PWA | Header/drawer/bottom-nav below 1024px, all tables render as record cards, site-first forms with camera capture + client-side compression, drafts, offline banner, role dashboards (Supervisor/Finance), global /inspections, installable PWA | ✅ Live & verified |
| 7a | UX Polish | Password show/hide, Remember-me (email prefill), KPI cards fit values, asymmetric KPI grid | ✅ Live & verified |

**Known debt carried forward:** quotations table exists but has no UI (PRD MVP item); roles fixed at sign-up (no admin UI; role stored in both profiles and JWT metadata); no editing of POs/PRs/VOs/claims after creation; hard deletes; RLS is role-based but not project-membership-scoped; two demo accounts live in auth.

---

## 🚧 Remaining Sprints

### Sprint 8 — User & Access Administration
**Objective:** Real multi-user operation. Today a user's role is chosen at sign-up and can never be changed, roles live in two places (profiles + JWT), and demo accounts linger — an admin must be able to manage the team before real staff onboard.

**Features**
- Director-only "Team" page: list users, change role, deactivate/reactivate
- Role change syncs `profiles.role` **and** auth user metadata (single server action via a SECURITY DEFINER function or admin API route)
- Project membership table + assignment UI (assign PMs/Supervisors to projects)
- Scope Site Supervisor and PM reads/writes to assigned projects (RLS membership join per SECURITY.md end-state)
- Sign-up no longer self-selects privileged roles (new users default to a low role; Director promotes)
- Remove/disable the two demo accounts; seed a proper admin

**Dependencies:** Sprint 5 auth (done). Supabase service-role key must be added to Vercel env for admin user management.
**Complexity:** Medium–Large
**Priority:** 🔴 Critical (blocks safe real-data rollout)

**Testing checklist**
- [ ] Director changes a user's role → nav, module guards and RLS writes all reflect it after next sign-in
- [ ] Deactivated user cannot sign in or read data
- [ ] Supervisor sees/writes only assigned projects (progress, inspections, photos)
- [ ] Self-sign-up cannot obtain Director/Finance role
- [ ] Existing flows (approvals, labour, claims) unaffected for permitted roles

**Definition of Done:** A Director can onboard a real employee, assign them to specific projects, change their role later, and off-board them — without touching Supabase dashboard — while RLS enforces project-level scoping.

---

### Sprint 9 — Quotation-to-Project Module
**Objective:** Close the last unbuilt PRD MVP item: win work inside the system. Quotations are the commercial front door — today the `quotations` table exists with zero UI.

**Features**
- `/quotations`: list + create (client, line items reusing the BOQ line pattern, totals)
- Status workflow: draft → submitted → approved/rejected (Director approval, audit record)
- "Convert to Project" action: creates the project, copies quotation lines into BOQ, links quotation, sets contract value
- Quotation PDF/print view for sending to clients
- Quotations tab on project detail; quotation documents category already exists

**Dependencies:** None beyond current codebase (table, approval framework, doc numbering all exist).
**Complexity:** Medium
**Priority:** 🟠 High (PRD MVP gap; first module a company touches in the sales cycle)

**Testing checklist**
- [ ] Create → submit → approve → convert produces a project with correct BOQ and contract value
- [ ] Rejected quotation cannot convert; converted quotation locks
- [ ] Numbering (QT-YYYY-###) unique; audit records written
- [ ] Mobile card layout and print view render cleanly
- [ ] QS + Director roles can operate it; others correctly blocked

**Definition of Done:** The PRD success scenario can start one step earlier — quotation created, approved, converted — and the resulting project flows through procurement → claims → payment untouched.

---

### Sprint 10 — Record Editing & Corrections
**Objective:** Real users make mistakes. Nothing except projects/clients/suppliers can be edited after creation — a typo in a PO amount today means delete-and-recreate (or is impossible once approved).

**Features**
- Edit pages/forms for PRs (draft), POs (draft: amount, supplier, cost centre, dates), VOs (draft/pending), claims (draft), labour entries, inspections, progress logs
- Guarded corrections after approval: Director-only "amend" that writes an approval_records audit entry
- Recategorise PO cost centre post-creation (fixes all-Material legacy POs)
- Soft-delete (status/`deleted_at`) for financial records instead of hard delete; hide from lists, keep in audit
- Cancel actions for approved-but-unfulfilled POs/claims

**Dependencies:** None (schema tweaks: `deleted_at` columns migration).
**Complexity:** Medium
**Priority:** 🟠 High (first week of real usage will demand it)

**Testing checklist**
- [ ] Draft edits persist and recompute totals/financials
- [ ] Post-approval amendments require Director and appear in audit trail
- [ ] Soft-deleted records vanish from lists/financials but remain queryable
- [ ] Cost centre recategorisation moves value between categories in the Cost-by-Category card
- [ ] No regression in approval state machines

**Definition of Done:** Every record type supports correction appropriate to its state, financials recompute correctly, and every after-approval change leaves an audit record.

---

### Sprint 11 — Reporting & Exports
**Objective:** Get numbers out of the system — monthly management reporting and client-facing documents without retyping into Excel.

**Features**
- Budget↔cost-centre mapping so Budget vs Actual reads per centre (variance per centre)
- Project cost report (committed/actual by centre, labour breakdown) — printable + Excel (xlsx/CSV) export
- Company monthly report: cash movements, claims raised/certified/collected, payables
- Progress claim certificate PDF (client-ready)
- PO print/PDF view (supplier-ready)
- Simple date-range filters on payments/labour listings

**Dependencies:** Sprint 10 helpful (clean data) but not required.
**Complexity:** Large
**Priority:** 🟡 Medium (High for firms replacing Excel reporting immediately)

**Testing checklist**
- [ ] Exports match on-screen aggregates exactly (spot-check against lib/financials)
- [ ] PDFs render on mobile and desktop; RM formatting correct
- [ ] Large projects (100+ rows) export within acceptable time
- [ ] Role gating: Finance/Director only for company reports

**Definition of Done:** A Director can produce a month-end pack (per-project cost report + company cash summary) and a QS can hand a client a claim certificate PDF, all generated from live data.

---

### Sprint 11.7 — Site Updates follow-ups (carried from the 11.6 user-feedback sprint)

**Objective:** close the gaps left by Sprint 11.6 now that the site team is using it daily.

**Features**
- Expose the new fields in the **edit** forms (area, corrective action, responsible party,
  follow-up date, drawing reference) — currently set at creation only.
- **Write-path E2E** for submit / video upload / drawing revision, once an isolated test
  database exists (RELEASE.md §2). Today these are manual checks.
- **Membership-scoped storage paths** so evidence files are not merely login-gated — more
  material now that video is stored.
- Optional: **multiple drawing references** per update (junction table); server-side video
  **poster generation** when the browser can't produce one; **follow-up date reminders**
  (natural fit with Sprint 12 notifications).

**Dependencies:** isolated test DB for the E2E work; otherwise none.
**Complexity:** Small–Medium · **Priority:** 🟡 Medium (raise if the field team hits the edit gap)

### Sprint 12 — Notifications & Scheduled Automations
**Objective:** The system chases people instead of the Director chasing the system (AGENTIC_LAYER "later" scope).

**Features**
- Email on approval request (to Director) and on approve/reject (to requester)
- Nightly job: flag overdue POs, stale pending approvals (>7 days), projects turning Critical — digest email to Director/PM (Vercel Cron + service-role)
- In-app notification bell with unread count (notifications table + RLS)
- Optional: web push for the PWA (approval requests, rejected inspections)

**Dependencies:** Email provider (e.g. Resend) API key in Vercel env; Sprint 8 useful for accurate recipients.
**Complexity:** Medium–Large
**Priority:** 🟡 Medium

**Testing checklist**
- [ ] Submitting a PR/VO/claim emails the Director within a minute
- [ ] Nightly digest fires on schedule with correct flagged items
- [ ] Notifications respect roles (no leakage across users)
- [ ] Unsubscribe/preferences honoured; no email storms on bulk actions

**Definition of Done:** A Director who never opens the app still learns the same day that something needs approval or a project went Critical, and clicking the email lands on the right screen.

---

### Sprint 13 — Mobile Offline & Field Hardening
**Objective:** Sites have bad signal. Build on the PWA so field entries survive connectivity gaps (deferred from the mobile sprint).

**Features**
- Offline submission queue for site progress + inspections (IndexedDB + Background Sync replay)
- Direct-to-storage photo uploads with real per-file progress bars and retry
- Per-photo captions
- Custom "Install app" prompt + iOS add-to-home-screen hint
- Pull-to-refresh on list pages; compact icon-grid tab bar on project detail

**Dependencies:** Mobile sprint (done). Careful RLS review for any direct-to-storage flows.
**Complexity:** Large
**Priority:** 🟡 Medium (High if field crews adopt heavily)

**Testing checklist**
- [ ] Airplane-mode entry queues, then syncs intact (photos included) on reconnect
- [ ] No duplicate submissions after flaky-network retries
- [ ] Upload progress/retry states render correctly on a real Android/iOS device
- [ ] Auth expiry while offline handled gracefully

**Definition of Done:** A supervisor in a dead zone logs progress with photos, drives out of site, and the entry appears on the Director's dashboard without the supervisor doing anything else.

---

### Sprint 14 — Intelligence Layer
**Objective:** The deferred INTELLIGENCE_LAYER items: turn accumulated logs and costs into insight.

**Features**
- Weekly AI summary of site logs per project (narrative for client updates)
- Anomalous cost-spike flags (PO/labour outliers vs project history)
- Draft progress-claim narrative from period's logs/photos
- Natural-language Q&A over project financials (Director)

**Dependencies:** Anthropic API key server-side; healthy data volume (Sprints 8–10 in real use); Sprint 12's notification rails for delivery.
**Complexity:** Large
**Priority:** 🟢 Low (differentiator, not operational necessity)

**Testing checklist**
- [ ] Summaries factually match underlying logs (spot-check)
- [ ] No cross-project/company data leakage in prompts
- [ ] Costs per summary bounded; failures degrade silently
- [ ] Outputs clearly labelled as drafts requiring human review

**Definition of Done:** Each Monday a PM receives an accurate auto-drafted weekly summary per active project, and a QS can generate a claim narrative draft that needs only light editing.

---

## 📍 Roadmap

| Sprint | Status | Priority | Estimated Effort | Dependencies |
|---|---|---|---|---|
| 1–7a (11 sprints) | ✅ Complete, in production | — | — | — |
| 8 · User & Access Admin | 🚧 Not started | 🔴 Critical | Medium–Large (~1 wk) | Service-role key in env |
| 9 · Quotations | 🚧 Not started | 🟠 High | Medium (~1 wk) | None |
| 10 · Editing & Corrections | 🚧 Not started | 🟠 High | Medium (~1 wk) | None |
| 11 · Reporting & Exports | 🚧 Not started | 🟡 Medium | Large (~1–2 wk) | Ideally after 10 |
| 12 · Notifications | 🚧 Not started | 🟡 Medium | Medium–Large (~1 wk) | Email provider; after 8 |
| 13 · Mobile Offline | 🚧 Not started | 🟡 Medium | Large (~1–2 wk) | None |
| 14 · Intelligence | 🚧 Not started | 🟢 Low | Large (~1–2 wk) | 8–10 in real use; Anthropic key |

## Sequencing Recommendation

**Do Sprint 8 first, alone.** It rewires authorisation (role changes, membership-scoped RLS) that every other module sits on — concurrent work would build on policies that are about to change, and it's the gate to onboarding real users at all.

**After Sprint 8, run two tracks concurrently — they touch disjoint code:**
- **Track A (commercial):** Sprint 9 → 10 → 11 (quotations, then corrections, then reporting — each feeds cleaner data to the next)
- **Track B (engagement):** Sprint 12 → 13 (notifications, then offline — both are additive layers over stable workflows)

Sprint 14 last, once real data exists to be intelligent about. If only one developer/agent is available, the strict order is **8 → 9 → 10 → 12 → 11 → 13 → 14** — corrections (10) before reporting (11) so month-end numbers are trustworthy, and notifications (12) early because they multiply the value of everything already built.
