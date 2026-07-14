import { test, expect } from "@playwright/test";
import { gotoModule } from "../support/helpers";

test("purchase orders list renders with seeded orders", async ({ page }) => {
  await gotoModule(page, "/purchase-orders", "Purchase Orders");
  await expect(page.getByRole("link", { name: /New Purchase Order/i })).toBeVisible();
  // At least one PO code (PO-YYYY-NNN) is listed.
  await expect(page.getByRole("link", { name: /PO-\d{4}-\d{3}/ }).first()).toBeVisible();
});

test("a purchase order detail page opens", async ({ page }) => {
  await page.goto("/purchase-orders");
  await page.getByRole("link", { name: /PO-\d{4}-\d{3}/ }).first().click();
  await expect(page.getByRole("heading", { name: "Order Details" })).toBeVisible();
});
