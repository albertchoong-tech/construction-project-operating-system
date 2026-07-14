# End-to-end tests (Playwright)

Critical-path **smoke tests** — they verify the app boots, authenticates, and every core
module renders for a signed-in user. They are **read-only** (navigate + assert); they never
create, edit, or delete data, so they are safe to run against the shared database.

The suite is designed to **grow**: add a module by dropping one `*.spec.ts` in `tests/` that
calls the `gotoModule` helper; add a deeper flow with ordinary Playwright assertions.

## Layout

```
playwright.config.ts     # config: projects, webServer, reporters
e2e/
  auth.setup.ts          # logs in once, caches the session to .auth/ (gitignored)
  support/
    env.ts               # credentials + paths (from env vars)
    helpers.ts           # gotoModule(), expectHeading()
  tests/                 # one spec per business area
    auth, dashboard, projects, purchase-requests, purchase-orders,
    site-progress, inspections, variation-orders, progress-claims,
    payments, labour-costs, reports
```

`auth.setup.ts` runs first (Playwright project dependency) and saves an authenticated
`storageState`; every test in the `smoke` project reuses it. `auth.spec.ts` overrides that with
an empty session to test signed-out behaviour.

## Running locally

1. Set credentials — the demo Director password is already appended to `.env.local` as
   `E2E_PASSWORD` (override `E2E_EMAIL` / `E2E_PASSWORD` to use another account).
2. Build the app once (the tests run against the production build, not the dev server):
   ```
   npm run build
   ```
3. Run the suite (Playwright starts `npm run start` for you):
   ```
   npm run test:e2e          # headless
   npm run test:e2e:ui       # interactive UI mode
   npm run test:e2e:report   # open the last HTML report
   ```

To test a deployed environment instead of a local build, point at it:
```
E2E_BASE_URL=https://<preview>.vercel.app npm run test:e2e
```

## Environment variables

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Needed to build/run the app (public keys) |
| `E2E_EMAIL` | Login email (default: `director.demo@hshprojectos.com`) |
| `E2E_PASSWORD` | Login password (**required**) |
| `E2E_BASE_URL` | Optional — test a remote URL instead of a local build |

## CI

`.github/workflows/ci.yml` runs this suite on every push/PR to `main` and `develop`, after
typecheck/build. It needs three repository secrets — `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `E2E_PASSWORD`. Until they are set the E2E job **skips** itself
(with a warning) so it never blocks merges before it is configured. See `docs/RELEASE.md` §7.

## Notes & growth

- Write-path tests (creating/approving records) need an **isolated test database** so CI never
  mutates production/demo data — add them once environments are split (RELEASE.md §2 go-live).
  They can then exercise the in-app modal buttons (e.g. approve → cancel a PO) end-to-end.
- Keep selectors semantic (`getByRole`, headings, labels) rather than CSS classes so tests
  survive styling changes.
