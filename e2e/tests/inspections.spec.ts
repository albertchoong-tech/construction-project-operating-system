import { test } from "@playwright/test";
import { gotoModule } from "../support/helpers";

test("inspections module renders", async ({ page }) => {
  await gotoModule(page, "/inspections", "Inspections");
});
