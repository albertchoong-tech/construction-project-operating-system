import { test, expect } from "@playwright/test";
import { CREDENTIALS } from "../support/env";

// These cases run signed OUT — override the shared authenticated session.
test.use({ storageState: { cookies: [], origins: [] } });

test("unauthenticated visit is redirected to the login page", async ({ page }) => {
  await page.goto("/purchase-orders");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
});

test("invalid credentials are rejected", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill(CREDENTIALS.email);
  await page.getByPlaceholder("••••••••").fill("definitely-the-wrong-password");
  await page.locator("form").getByRole("button", { name: "Sign In" }).click();

  // Stays on /login and surfaces an error, rather than reaching the app.
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
