import { test, expect } from "@playwright/test";
import { gotoModule } from "../support/helpers";

test("reports hub renders its report cards", async ({ page }) => {
  await gotoModule(page, "/reports", "Reports");
  await expect(page.getByText("Monthly Financial Report")).toBeVisible();
  await expect(page.getByText(/Payments Export/)).toBeVisible();
  await expect(page.getByText(/Labour Costs Export/)).toBeVisible();
});

test("a CSV export endpoint returns a CSV for an authorised user", async ({ page }) => {
  // Uses the authenticated session's cookies (page.request shares context).
  const res = await page.request.get("/api/reports/labour");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("csv");
});
