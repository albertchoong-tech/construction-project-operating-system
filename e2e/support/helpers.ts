import { expect, type Page } from "@playwright/test";

/** Assert the page's <h1> (rendered by PageHeader) contains `name`. */
export async function expectHeading(page: Page, name: string | RegExp) {
  await expect(page.getByRole("heading", { level: 1, name }).first()).toBeVisible();
}

/**
 * Smoke a module: navigate to it and assert it renders as an authenticated
 * page (correct heading, sidebar present, no error boundary). The backbone of
 * most tests — add a module by adding one line to its spec.
 */
export async function gotoModule(page: Page, pathname: string, heading: string | RegExp) {
  await page.goto(pathname);
  await expectHeading(page, heading);
  // The app shell (sidebar nav) proves we're authenticated, not on /login.
  await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();
  // No Next.js error boundary leaked onto the page.
  await expect(page.getByText("Application error")).toHaveCount(0);
}
