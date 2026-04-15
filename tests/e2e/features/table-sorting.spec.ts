import { expect, test } from "@playwright/test";
import { openSettingsTable } from "./helpers";

test.describe("Feature: Table Sorting", () => {
  test("sorts table columns and shows direction indicator", async ({ page }) => {
    await openSettingsTable(page);

    const keyNameHeader = page.locator("th").filter({ hasText: /key_name/i }).first();
    await expect(keyNameHeader).toBeVisible();

    await keyNameHeader.click();
    await expect(keyNameHeader).toContainText("↑");

    await keyNameHeader.click();
    await expect(keyNameHeader).toContainText("↓");
  });
});
