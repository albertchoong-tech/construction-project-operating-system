import { test, expect, request as pwRequest, type Page } from "@playwright/test";
import { CREDENTIALS } from "../support/env";

/**
 * WRITE-PATH test — tagged @write, so it is excluded from CI and from a normal
 * local run (see grepInvert in playwright.config.ts). It creates and then
 * deletes its own drawings, and touches no other records.
 *
 *   E2E_WRITE=1 npx playwright test --grep @write
 *
 * Covers the one piece of Sprint 11.6 logic that read-only tests cannot reach:
 * issuing a revision must supersede the previous one rather than overwrite it,
 * and the unique partial index must leave exactly one `current` revision.
 *
 * Known residue: deleting a drawing removes the register row but not the
 * uploaded file in Storage, so each run leaves one tiny PNG behind.
 */

// 1x1 transparent PNG — smallest valid image we can upload.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function uploadRevision(page: Page, drawingNo: string, rev: string, title: string) {
  await page.getByLabel("Drawing title").fill(title);
  await page.getByLabel("Drawing number").fill(drawingNo);
  await page.getByLabel("Revision no.").fill(rev);
  await page.setInputFiles('input[type="file"]', {
    name: `${drawingNo}-${rev}.png`,
    mimeType: "image/png",
    buffer: PNG,
  });
  // Wait for the direct browser->Storage upload to finish before submitting.
  await expect(page.getByText(/uploaded \(/i)).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Save Drawing" }).click();
  await expect(page.getByText(drawingNo).first()).toBeVisible({ timeout: 20_000 });
}

/**
 * Removes the test's own rows via the API rather than the UI. Cleanup must not
 * depend on the screen under test — a UI failure would otherwise strand data.
 */
async function cleanUp(drawingNo: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;

  const ctx = await pwRequest.newContext();
  try {
    const auth = await ctx.post(`${url}/auth/v1/token?grant_type=password`, {
      headers: { apikey: key, "Content-Type": "application/json" },
      data: { email: CREDENTIALS.email, password: CREDENTIALS.password },
    });
    const token = (await auth.json())?.access_token;
    if (!token) return;
    await ctx.delete(`${url}/rest/v1/project_drawings?drawing_no=eq.${drawingNo}`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
    });
  } finally {
    await ctx.dispose();
  }
}

test("@write issuing a revision supersedes the previous drawing", async ({ page }) => {
  // Two direct browser->Storage uploads plus cleanup don't fit the 30s default;
  // without this the run is killed mid-test and leaves rows behind.
  test.setTimeout(150_000);

  // ActionButton confirms via a native dialog; Playwright can accept it.
  page.on("dialog", (d) => void d.accept());

  const drawingNo = `E2E-${Date.now().toString().slice(-6)}`;

  await page.goto("/projects");
  await page
    .locator('main a[href^="/projects/"]:not([href="/projects/new"])')
    .first()
    .click();
  await page.getByRole("link", { name: "Plans & Drawings" }).click();
  // Wait for the client-side navigation to land before capturing the URL —
  // otherwise we snapshot the previous tab and later goto()s miss the form.
  await expect(page).toHaveURL(/tab=drawings/);
  const drawingsUrl = page.url();

  try {
    // Revision A becomes the current drawing.
    await uploadRevision(page, drawingNo, "A", "E2E structural plan");
    await expect(page.locator("li").filter({ hasText: drawingNo }).first()).toContainText("CURRENT");

    // Revision B for the SAME number must supersede A, not replace it.
    await page.goto(drawingsUrl);
    await uploadRevision(page, drawingNo, "B", "E2E structural plan rev B");

    const rows = page.locator("li").filter({ hasText: drawingNo });
    await expect(rows.filter({ hasText: "CURRENT" })).toHaveCount(1); // unique index holds
    await expect(rows.filter({ hasText: "SUPERSEDED" })).toHaveCount(1); // history retained
    await expect(rows.filter({ hasText: "CURRENT" })).toContainText("Rev B");
    await expect(rows.filter({ hasText: "SUPERSEDED" })).toContainText("Rev A");
    await expect(page.getByText(/do not build from them/i)).toBeVisible();
  } finally {
    await cleanUp(drawingNo);
  }
});
