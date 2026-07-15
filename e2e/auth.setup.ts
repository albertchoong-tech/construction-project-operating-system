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

  // Wait for sign-in to resolve. If it fails, surface the app's actual error
  // (e.g. "Invalid login credentials") instead of a generic locator timeout —
  // in CI this tells you exactly which secret is wrong.
  try {
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 });
  } catch {
    const alert = page.getByRole("alert");
    let reported: string;
    if (await alert.count()) {
      reported = (await alert.first().innerText()).trim() || "(alert shown but empty)";
    } else {
      // No alert — capture a snippet of the page so a blank failure is still legible
      // (e.g. a server error from a bad NEXT_PUBLIC_SUPABASE_URL baked into the build).
      const body = (await page.locator("body").innerText().catch(() => "")) || "";
      reported = `no error alert; page text: "${body.replace(/\s+/g, " ").trim().slice(0, 180)}"`;
    }
    throw new Error(
      `Sign-in did not leave /login for ${CREDENTIALS.email}. App reported: ${reported}. ` +
        "Verify the E2E_PASSWORD and NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY " +
        "repository secrets (see e2e/README.md).",
    );
  }

  // Landed on the Director dashboard.
  await expect(page.getByText("Pending Approvals").first()).toBeVisible();
  await page.context().storageState({ path: AUTH_FILE });
});
