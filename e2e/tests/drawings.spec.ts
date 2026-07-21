import { test, expect } from "@playwright/test";

/** Opens the first real project and switches to the Plans & Drawings tab. */
async function openDrawingsTab(page: import("@playwright/test").Page) {
  await page.goto("/projects");
  await page
    .locator('main a[href^="/projects/"]:not([href="/projects/new"])')
    .first()
    .click();
  await page.getByRole("link", { name: "Plans & Drawings" }).click();
}

test("project detail exposes a Plans & Drawings tab", async ({ page }) => {
  await openDrawingsTab(page);
  await expect(page).toHaveURL(/tab=drawings/);
  await expect(page.getByText("Current Drawings").first()).toBeVisible();
  await expect(page.getByText("Superseded").first()).toBeVisible();
});

test("a Director sees the upload / revise control", async ({ page }) => {
  // The suite signs in as the demo Director, who may upload drawings.
  await openDrawingsTab(page);
  await expect(page.getByText("Upload / Revise Drawing")).toBeVisible();
  await expect(page.getByText(/Re-using an existing drawing number issues a new revision/i)).toBeVisible();
});

test("site updates offers quick access to plans once a project is chosen", async ({ page }) => {
  await page.goto("/site-updates");
  const plans = page.getByRole("link", { name: /View Plans & Drawings/i });
  await expect(plans).toBeVisible();
  await plans.click();
  await expect(page).toHaveURL(/tab=drawings/);
});
