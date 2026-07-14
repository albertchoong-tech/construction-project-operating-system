import { test, expect } from "@playwright/test";

test("director dashboard shows KPI cards and the approval queue", async ({ page }) => {
  await page.goto("/");
  for (const kpi of ["Active Projects", "Pending Approvals", "Outstanding Receivables"]) {
    await expect(page.getByText(kpi).first()).toBeVisible();
  }
  // The oldest-first approval queue card is present.
  await expect(page.getByText(/Pending Approvals \(\d+\)/)).toBeVisible();
});

test("primary navigation links are present", async ({ page }) => {
  await page.goto("/");
  for (const item of ["Projects", "Purchase Orders", "Reports", "Team"]) {
    await expect(page.getByRole("link", { name: item }).first()).toBeVisible();
  }
  // Sanity: the sign-out control exists (we're authenticated).
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});
