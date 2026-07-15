import path from "node:path";

/** Where the authenticated session is cached by auth.setup.ts. */
export const AUTH_FILE = path.resolve(__dirname, "../.auth/director.json");

const password = process.env.E2E_PASSWORD;
if (!password) {
  throw new Error(
    "E2E_PASSWORD is not set. Add it to .env.local for local runs, or as a GitHub " +
      "Actions secret for CI. See e2e/README.md.",
  );
}

/**
 * Demo Director account used to drive the suite. It is a throwaway demo login;
 * override with E2E_EMAIL / E2E_PASSWORD env vars (real accounts, CI secrets).
 * These tests are read-only smoke checks — they never mutate data.
 */
export const CREDENTIALS = {
  // `||` (not `??`) so an empty string — which is what an unset `${{ vars.E2E_EMAIL }}`
  // injects in CI — falls back to the default rather than becoming a blank email.
  email: process.env.E2E_EMAIL || "director.demo@hshprojectos.com",
  password,
};
