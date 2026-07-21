import { test, expect } from "@playwright/test";
import { gotoModule } from "../support/helpers";

test("site updates hub renders with both update modes", async ({ page }) => {
  await gotoModule(page, "/site-updates", "Site Updates");
  await expect(page.getByRole("button", { name: "Progress Update", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Site Inspection", exact: true })).toBeVisible();
  // Progress is the default mode.
  await expect(page.getByText("Work completed").first()).toBeVisible();
  await expect(page.getByText("Completion %").first()).toBeVisible();
});

test("switching to inspection mode swaps in the inspection fields", async ({ page }) => {
  await page.goto("/site-updates");
  await page.getByRole("button", { name: "Site Inspection", exact: true }).click();
  await expect(page.getByText("Inspection result")).toBeVisible();
  await expect(page.getByText("Corrective action required")).toBeVisible();
  await expect(page.getByText("Responsible party")).toBeVisible();
  // Progress-only fields are gone — one form at a time, no duplicate submit.
  await expect(page.getByText("Work completed")).toHaveCount(0);
});

test("video capture controls and their limits are shown", async ({ page }) => {
  await page.goto("/site-updates");
  await expect(page.getByRole("button", { name: "Record Video" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose Video" })).toBeVisible();
  await expect(page.getByText(/max 90 seconds/i)).toBeVisible();
});

test("recent site updates feed filters by kind", async ({ page }) => {
  await page.goto("/site-updates");
  await expect(page.getByText("Recent Site Updates")).toBeVisible();
  await page.getByRole("link", { name: "Inspection", exact: true }).click();
  await expect(page).toHaveURL(/filter=inspection/);
  await page.getByRole("link", { name: "Progress", exact: true }).click();
  await expect(page).toHaveURL(/filter=progress/);
});

test("the original Site Progress and Inspections modules still work", async ({ page }) => {
  // Backward compatibility: the unified hub must not replace the existing views.
  await gotoModule(page, "/site-progress", "Site Progress");
  await gotoModule(page, "/inspections", "Inspections");
});
