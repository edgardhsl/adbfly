import { expect, test } from "@playwright/test";
import { selectMockDevice } from "./helpers";

test.describe("Feature: Sidebar Global Search", () => {
  test("enables app search only after selecting a device", async ({ page }) => {
    await page.goto("/");

    const appSearch = page.locator("aside input").first();
    await expect(appSearch).toBeDisabled();

    await selectMockDevice(page);
    await expect(appSearch).toBeEnabled();

    await appSearch.fill("tools");
    const appSelect = page.locator("aside").getByRole("combobox").nth(1);
    await appSelect.click();
    await expect(page.getByRole("option", { name: /com\.example\.tools\.viewer/i })).toBeVisible();
  });
});
