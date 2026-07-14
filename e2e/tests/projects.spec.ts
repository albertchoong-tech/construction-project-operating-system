import { test, expect } from "@playwright/test";
import { gotoModule, expectHeading } from "../support/helpers";

test("projects list renders with a create action", async ({ page }) => {
  await gotoModule(page, "/projects", "Projects");
  await expect(page.getByRole("link", { name: /New Project/i })).toBeVisible();
});

test("a project detail page opens with its tabs and financial summary", async ({ page }) => {
  await page.goto("/projects");
  // Open the first project row (excluding the "New Project" link).
  const projectLink = page
    .locator('main a[href^="/projects/"]:not([href="/projects/new"])')
    .first();
  await expect(projectLink).toBeVisible();
  await projectLink.click();

  // Detail view: financial stat cards + tab navigation.
  await expect(page.getByText("Revised Contract", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Procurement" })).toBeVisible();
  await expectHeading(page, /.+/); // some project title heading is present
});
