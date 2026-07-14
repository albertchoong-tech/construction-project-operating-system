# Changelog

All notable changes to HSH ProjectOS are documented here. This project follows
[Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`) from `1.0.0` onward.

Versioning was introduced retroactively in Sprint 11.5; the entries below `1.3.0`
map already-shipped sprints to the commits that delivered them. Sprint history and
specifications live in [docs/ROADMAP.md](docs/ROADMAP.md) and [docs/BACKLOG.md](docs/BACKLOG.md).

## [Unreleased]
- Sprint 12 — Notifications & Scheduled Automations (planned)

## [1.3.3] — 2026-07-14 — Lint gate fixed
Branch `feature/lint-config`
### Fixed
- **CI lint step no longer fails.** The project had no ESLint config, so `next lint` fell into
  its interactive setup prompt and exited 1 in CI (masked by `continue-on-error`, so it never
  actually ran). Added a flat config (`eslint.config.mjs`, `next/core-web-vitals` +
  `next/typescript`) and switched the script to the ESLint CLI (`next lint` is deprecated).
- Removed two dead imports flagged by the now-working linter (`Link`, `fmtDate`).
### Changed
- Lint is now a **required, zero-warning CI gate** (`--max-warnings 0`, `continue-on-error`
  removed) — new warnings fail the build.

## [1.3.2] — 2026-07-14 — E2E smoke-test safety net
Branch `feature/e2e-smoke`
### Added
- **Playwright end-to-end test framework** (`e2e/`, `playwright.config.ts`) designed to grow
  with the project: a one-time login fixture (cached `storageState`), shared `gotoModule`
  helper, and one spec per business area.
- **16 read-only smoke tests** across authentication, dashboard, projects (+ detail),
  purchase requests, purchase orders (+ detail), site progress, inspections, variation orders,
  progress claims (+ certificate), payments, labour costs and reports (+ CSV export API).
- **CI gate**: GitHub Actions now runs the suite on every push/PR to `main`/`develop` after
  typecheck/build. The job skips cleanly until three repo secrets are set
  (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `E2E_PASSWORD`).
### Notes
- Smoke tests are read-only (safe against the shared DB). Write-path E2E (create/approve/cancel)
  awaits an isolated test database — see `e2e/README.md` and `docs/RELEASE.md` §2.

## [1.3.1] — 2026-07-14 — In-app confirm/remarks modal
Branch `feature/action-button-modal`
### Changed
- `ActionButton` (approve / reject / cancel / delete / convert across the app) now opens an
  in-app modal for confirmation and the optional audit-remarks note, replacing the browser's
  native `confirm()` / `prompt()`. Consistent styling, an actual remarks textarea, Esc-to-cancel,
  and — unlike native dialogs — drivable by real end-to-end tests (Playwright). Same component
  API, so every call site is unchanged.
### Notes
- Diagnosed why these buttons can't be exercised in the automated preview pane: the app's
  authenticated `force-dynamic` pages don't become interactive there (content stays in React's
  streaming/Suspense hidden container; native `<form>` posts still work, JS-driven buttons don't).
  This is a preview-tooling limitation — production is unaffected (approvals run every sprint).

## [1.3.0] — 2026-07-12 — Reporting & Exports
Commit `3b5fbac` · migration `0006_reporting.sql` (applied live)
### Added
- `/reports` hub (Director + Finance only).
- Printable **monthly financial report** — money in/out, net cash movement, claims
  raised/certified, outstanding receivables/payables snapshot, month navigation.
- Printable **project cost report** — committed/actual/budget by cost centre with variance.
- **CSV exports** via role-gated API routes (`/api/reports/labour`, `/api/reports/payments`,
  `/api/reports/project-cost`) — 403 for non Director/Finance, RLS-scoped.
- Client-ready **progress-claim payment certificate**; claim numbers link to it.
- Print button on PO detail; cost-centre picker on the budget form.

### Release Engineering (Sprint 11.5)
- Git-flow branching (`main` / `develop` / `demo` / `feature/*`).
- GitHub Actions CI (typecheck + build) on PRs and pushes.
- This CHANGELOG, `docs/RELEASE.md`, and retroactive version tags.

## [1.2.0] — 2026-07-12 — Governance & Lifecycle
Commit `0cd957b` · migrations `0004_team_access.sql`, `0005_quotations.sql`
### Added
- **User & Access Administration** (Sprint 8) — `/team` page, project-membership-scoped
  RLS, `profiles` as the single source of truth for role + activation, hardened sign-up.
- **Quotation-to-Project** (Sprint 9) — `/quotations` module, draft→submit→approve→convert
  workflow copying line items into the BOQ, printable client-facing view.
- **Record Editing & Corrections** (Sprint 10) — edit forms for pre-approval records,
  PO cost-centre recategorisation, cancel-and-retain for approved PO/VO/claim, audit trail.

## [1.1.0] — 2026-07-09 — Field, Cost & Mobile
Commits `2ade6a1` (data), `d831271` (mobile) · migration `0003`
### Added
- Inspection issue/root-cause categories, multi-file attachments, categorised document centre.
- Labour cost module feeding committed cost and margin.
- PO cost centres, Cost-by-Category card, Healthy/Attention/Critical health indicator.
- Mobile navigation (header/drawer/bottom bar), responsive tables→cards, camera capture,
  role dashboards, `/inspections`, installable PWA.
- UX polish — password show/hide, remember-me, KPI card fit.

## [1.0.0] — 2026-07-09 — Core MVP + Auth Lock-down
Commit `ec87111` · migrations `0001_init.sql`, `0002_lockdown.sql`
### Added
- Projects & Clients, BOQ/Budget, procurement engine (PR→PO→delivery with approval audit).
- Site progress logs, variation orders, progress claims, payments, live P&L.
- Director dashboard, oldest-first approval queue, milestones, inspections, document upload.
- Email/password auth, role-based module gating and RLS, Director-only approvals.

[Unreleased]: https://github.com/albertchoong-tech/construction-project-operating-system/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/albertchoong-tech/construction-project-operating-system/releases/tag/v1.3.0
[1.2.0]: https://github.com/albertchoong-tech/construction-project-operating-system/releases/tag/v1.2.0
[1.1.0]: https://github.com/albertchoong-tech/construction-project-operating-system/releases/tag/v1.1.0
[1.0.0]: https://github.com/albertchoong-tech/construction-project-operating-system/releases/tag/v1.0.0
