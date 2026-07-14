import { test } from "@playwright/test";
import { gotoModule } from "../support/helpers";

test("labour cost module renders", async ({ page }) => {
  await gotoModule(page, "/labour-costs", "Labour Cost");
});
