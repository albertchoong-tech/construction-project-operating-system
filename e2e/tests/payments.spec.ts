import { test } from "@playwright/test";
import { gotoModule } from "../support/helpers";

test("payments module renders", async ({ page }) => {
  await gotoModule(page, "/payments", "Payments");
});
