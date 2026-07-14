import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import path from "node:path";

// Load .env.local so NEXT_PUBLIC_* (for the built app) and E2E_* (for the tests)
// are available when running locally. In CI these come from repository secrets.
loadEnv({ path: path.resolve(__dirname, ".env.local"), quiet: true });

const PORT = process.env.PORT ?? "3000";
// Point the suite at an already-running/deployed app by setting E2E_BASE_URL
// (e.g. a Vercel preview URL). Otherwise Playwright starts the app itself.
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Fail the build if someone leaves a test.only in the tree.
  forbidOnly: !!process.env.CI,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Logs in once and saves the session; every smoke test reuses it.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "smoke",
      testIgnore: /auth\.setup\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/director.json",
      },
    },
  ],
  // When testing a remote URL (E2E_BASE_URL), don't spin up a local server.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // Test the production build (no dev-server Fast Refresh churn). Run
        // `npm run build` first; see e2e/README.md.
        command: "npm run start",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
