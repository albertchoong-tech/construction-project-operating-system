import { test } from "@playwright/test";
import { gotoModule } from "../support/helpers";

test("variation orders module renders", async ({ page }) => {
  await gotoModule(page, "/variation-orders", "Variation Orders");
});
