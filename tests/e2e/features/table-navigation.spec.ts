import { expect, test } from "@playwright/test";
import { openSettingsTable } from "./helpers";

test.describe("Feature: Table Navigation", () => {
  test("navigates to a mocked table and renders rows", async ({ page }) => {
    await openSettingsTable(page);

    await expect(page.getByText("key_name")).toBeVisible();
    await expect(page.getByText("api_host")).toBeVisible();
  });
});
