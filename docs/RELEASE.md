# HSH ProjectOS — Release Engineering & DevOps

_The operating manual for how code moves from a developer's machine to production.
Established in Sprint 11.5. Read this before changing the deploy flow._

Production URL: https://construction-project-operating-syst.vercel.app
Repo: https://github.com/albertchoong-tech/construction-project-operating-system
Hosting: Vercel (git-connected) · Database/Auth/Storage: Supabase

---

## 1. Branching model

A lightweight git-flow. Four kinds of branch, one direction of flow.

| Branch | Purpose | Deploys to | Who merges in |
|---|---|---|---|
| `main` | **Production.** Always releasable, always tagged. | Vercel **Production** (the live URL) | `develop` only, via PR, at release time |
| `develop` | **Integration.** The next release accumulates here. | Vercel **Preview** (auto URL) | `feature/*` via PR |
| `demo` | **Stable demo** for showing prospects. Seed data. | Vercel **Preview** (pin a domain to it) | `main` (fast-forward at release) |
| `feature/*` | One change in progress (`feature/notifications`). | Vercel **Preview** (auto URL per push) | — (branch off `develop`) |

**Flow:** `feature/x` → PR → `develop` → (soak/verify) → PR → `main` → tag → fast-forward `demo`.

```
feature/notifications ─┐
feature/mobile-offline ─┼─▶ develop ──(release PR)──▶ main ──tag v1.4.0──▶ demo
feature/* ─────────────┘        │                      │
                          preview URL              production URL
```

Rules:
- **Never commit features straight to `main`.** `main` only receives reviewed release PRs from `develop`.
- **`main` is protected** — enable branch protection on GitHub: require the `verify` CI check + 1 review, no force-push. (Dashboard step, see §7.)
- Hotfixes: branch `hotfix/x` off `main`, PR back into `main`, then merge `main` down into `develop` so the fix isn't lost.
- Keep `feature/*` branches short-lived; delete after merge.

> **Note on the old rule.** Earlier docs said "push straight to `main`." That was correct
> for the solo bootstrap phase. From Sprint 11.5 onward the flow above supersedes it — see
> the updated `CLAUDE.md` "Deploy & data" section. The unchanged rules: **deploy by git, never
> by Vercel CLI**, and **every commit must be authored by the GitHub identity Vercel verifies**.

---

## 2. Demo vs Production deployment

**Current topology (chosen Sprint 11.5): single Vercel project.**
- `main` → production URL (the Vercel *Production* branch).
- `develop`, `demo`, and every `feature/*` push get an automatic Vercel *Preview* deployment.
- All environments currently share **one Supabase project**. This is acceptable **only because
  production holds no real customer data yet** — just seed/demo rows.
- To give the `demo` branch a stable address, assign a custom domain (e.g. `demo.<yourdomain>`)
  to its deployment in the Vercel dashboard → Project → Domains → attach to branch `demo`.

**Go-live topology (do this when the first real customer data lands — see §6).**
Split demo and production so a demo click can never touch real records:

1. Create a **second Supabase project** = real production DB. Apply migrations `0001`→latest in order.
2. Create a **second Vercel project** from the same repo, Production branch = `main`, with the
   *real* Supabase env vars. This becomes the customer's production app + domain.
3. Repurpose the **existing** Vercel project as the permanent **demo** (Production branch = `demo`,
   keeps the seed database). Demo and production are now fully isolated.
4. Update this section and the env matrix below once done.

### Environment variables (per Vercel project)
| Variable | Where | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel env (all envs) | No (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel env (all envs) | No (publishable) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only**, if/when added | **Yes — never expose to the client** |

Pull locally with `vercel link` → `vercel env pull .env.local`. Never invent new keys; never
put a service-role key in any `NEXT_PUBLIC_*` var or frontend code.

---

## 3. Release tagging & versioning

Semantic Versioning (`MAJOR.MINOR.PATCH`) from `1.0.0`. See [CHANGELOG.md](../CHANGELOG.md).
- **MAJOR** — breaking data-model or workflow change requiring a migration users must plan for.
- **MINOR** — a shipped sprint / new feature set, backward-compatible.
- **PATCH** — bug fixes and corrections, no new capability.

### Cutting a release
1. On `develop`, ensure CI is green and the release is verified on its preview URL.
2. Bump `version` in `package.json`; move the `[Unreleased]` notes into a dated version
   section in `CHANGELOG.md`.
3. Open a release PR `develop` → `main`, merge it.
4. Tag `main` and push the tag:
   ```bash
   git checkout main && git pull
   git tag -a v1.4.0 -m "v1.4.0 — Notifications & Scheduled Automations"
   git push origin v1.4.0
   ```
5. Fast-forward `demo` to the release: `git checkout demo && git merge --ff-only main && git push`.
6. Create a GitHub Release from the tag, pasting the CHANGELOG section.

Tags are immutable — never move or delete a published tag. Existing tags: `v1.0.0`, `v1.1.0`,
`v1.2.0`, `v1.3.0` (retroactively applied to their release commits in Sprint 11.5).

---

## 4. Backup & recovery

**Database (Supabase) — highest priority; this is the system of record.**
- Supabase takes automatic daily backups on paid plans; **confirm the plan tier includes them**
  and check the retention window (Dashboard → Database → Backups). On the free tier there are
  **no automatic backups** — upgrade before real data, or run the manual dump below on a schedule.
- Manual logical backup (run from a machine with the DB password, store off-Supabase):
  ```bash
  pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges -F c -f backup-$(date +%F).dump
  ```
- Enable **Point-in-Time Recovery (PITR)** before go-live so you can restore to any moment,
  not just the last daily snapshot.
- **Test a restore once** into a scratch project — an untested backup is not a backup.

**Storage (Supabase buckets):** uploaded photos/documents are not covered by the DB dump.
Periodically sync the bucket to external storage (`supabase storage` CLI or a scheduled job).

**Code & config:** git is the source of truth (GitHub is the off-site copy). Record the list of
Vercel + Supabase env var *names* (not values) in a secure note so the app can be rebuilt.

**Migrations:** every schema change is a numbered file in `supabase/migrations/`. Apply them in
order to reconstruct the schema. Never edit an already-applied migration — add a new one.

---

## 5. Monitoring & observability (recommendations)

Roughly in priority order for a small team:
1. **Uptime** — a free external check (UptimeRobot / Better Stack) hitting the production URL
   every 1–5 min with alerts to email/WhatsApp. Cheapest early-warning you can buy.
2. **Runtime errors** — Vercel's built-in logs cover function errors; add **Sentry** (or Vercel
   Observability) for grouped client + server error tracking with stack traces and alerts.
3. **Deploy health** — Vercel already emails on failed deploys; keep those notifications on.
4. **Database** — watch Supabase Dashboard → Reports for connection/egress limits; set a billing
   alert so a traffic spike doesn't silently exhaust the plan.
5. **Auth anomalies** — periodically review Supabase Auth logs for unexpected sign-ups (sign-up
   is hardened to `site_supervisor`, but review is still worthwhile).

None of these require code changes; they're dashboard/service setup. Add Sentry only when the
error volume justifies the dependency.

---

## 6. Production go-live checklist

Do all of this **before** the first real company data is entered.

- [ ] **Split environments** (§2 go-live topology): dedicated production Supabase + Vercel project.
- [ ] **Seed the real owner**: real Director signs up → an existing Director promotes them on `/team`.
- [ ] **Retire demo accounts**: deactivate `director.demo@hshprojectos.com` and
      `supervisor.demo@hshprojectos.com` (only after a real Director exists — the demo Director is
      currently the sole active Director), and rotate/void the demo passwords.
- [ ] **Backups on**: confirm Supabase daily backups + enable PITR; run one test restore (§4).
- [ ] **Branch protection**: require `verify` CI + review on `main`; disable force-push (§7).
- [ ] **Uptime + error monitoring** live (§5).
- [ ] **Storage policies**: review that uploads are membership-scoped per project path (currently
      login-gated but not path-scoped — see ROADMAP Known Limitations).
- [ ] **Clear/complete** the 2024-dated seed projects, or mark them `completed`, in production.
- [ ] **Custom domain** on production with HTTPS; verify the PWA manifest/icons resolve.
- [ ] **Confirm no secrets** in the client bundle (`SUPABASE_SERVICE_ROLE_KEY` server-only).

---

## 7. CI/CD review

**Current pipeline.**
- **CI (GitHub Actions, `.github/workflows/ci.yml`)** runs on PRs and pushes to `main`/`develop`:
  - `verify` job: `npm ci` → **typecheck** (required gate) → **build** (informational,
    placeholder public env) → **lint** (required gate — ESLint flat config,
    `--max-warnings 0`). Node pinned via `.nvmrc` (20).
  - `e2e` job (needs `verify`): builds the app and runs the **Playwright smoke suite**
    (`e2e/`, 16 read-only tests across the core workflows). It **skips itself** until the repo
    secrets `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `E2E_PASSWORD` are set,
    so it never blocks merges before setup. See `e2e/README.md`.
- **CD (Vercel, git-connected)** builds and deploys automatically: `main` → production,
  every other branch/PR → a preview URL. Deploys are **only** triggered by git — never the CLI.

**Recommended hardening (dashboard steps, not code):**
1. **Branch protection on `main`**: GitHub → Settings → Branches → add rule for `main` →
   require the `verify` status check, require 1 PR review, block force-push and direct pushes.
2. **Promote `build` to a required gate**: add `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (both public) as GitHub Actions repository secrets, switch the
   Build step to use them, remove its `continue-on-error`, and add it to branch protection.
3. **Lint is a required, zero-warning gate** (`eslint.config.mjs`, `--max-warnings 0`). Keep it
   green; new warnings fail CI by design.
4. **Preview env**: ensure Vercel Preview deployments point at a **non-production** Supabase project
   once environments are split, so preview traffic never mutates production data.
5. Optional: add a migrations check / `supabase db diff` step so schema drift is caught in CI.

2b. **Enable the E2E job**: add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
   `E2E_PASSWORD` as repository secrets so the Playwright smoke suite runs (it skips until then),
   and add `e2e` to the required checks in branch protection once green.

**Deliberately out of scope (small-team appropriate):** no container/Kubernetes pipeline, no
blue-green infra. The E2E suite is smoke-level and read-only for now; write-path E2E waits on an
isolated test database (§2 go-live). That altitude is right until team size or data risk grows.

---

## Change log for this document
- **2026-07-12** (Sprint 11.5) — created: branching model, single-project topology with go-live
  split path, SemVer + tagging, backup/monitoring/go-live/CI-CD sections.
