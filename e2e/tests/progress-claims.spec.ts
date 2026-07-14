import { test, expect } from "@playwright/test";
import { gotoModule } from "../support/helpers";

test("progress claims list renders", async ({ page }) => {
  await gotoModule(page, "/progress-claims", "Progress Claims");
});

test("a claim opens its client-facing certificate", async ({ page }) => {
  await page.goto("/progress-claims");
  const claimLink = page.getByRole("link", { name: /PC-\d{4}-\d{3}/ }).first();
  await expect(claimLink).toBeVisible();
  await claimLink.click();
  // Client-facing certificate document rendered.
  await expect(page.getByRole("heading", { level: 1, name: /Progress Claim PC-/ })).toBeVisible();
  await expect(page.getByText("Amount claimed this period")).toBeVisible();
});
