import { test as setup, expect } from "@playwright/test";
import { CREDENTIALS, AUTH_FILE } from "./support/env";

/**
 * Runs once before the smoke suite: signs in as the demo Director and saves the
 * session to disk so every test starts authenticated (Playwright's recommended
 * pattern — fast and avoids logging in per test).
 */
setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill(CREDENTIALS.email);
  await page.getByPlaceholder("••••••••").fill(CREDENTIALS.password);
  // The submit button lives inside the form; the "Sign In" tab toggle does not.
  await page.locator("form").getByRole("button", { name: "Sign In" }).click();

  // Land on the Director dashboard (signIn redirects here).
  await expect(page.getByText("Pending Approvals").first()).toBeVisible();

  await page.context().storageState({ path: AUTH_FILE });
});
