import { test, expect } from "@playwright/test";
import { gotoModule } from "../support/helpers";

test("purchase requests list renders with a create action", async ({ page }) => {
  await gotoModule(page, "/purchase-requests", "Purchase Requests");
  await expect(page.getByRole("link", { name: /New Purchase Request/i })).toBeVisible();
});
