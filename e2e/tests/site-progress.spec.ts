import { test } from "@playwright/test";
import { gotoModule } from "../support/helpers";

test("site progress module renders", async ({ page }) => {
  await gotoModule(page, "/site-progress", "Site Progress");
});
