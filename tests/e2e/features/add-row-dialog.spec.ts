import { expect, test } from "@playwright/test";
import { openSettingsTable } from "./helpers";

test.describe("Feature: Add Row Dialog", () => {
  test("opens and cancels inline add row", async ({ page }) => {
    await openSettingsTable(page);

    const addRowInline = page.locator("tbody tr:has(input)").first();
    await expect(addRowInline).toHaveCount(0);

    await page.getByRole("button", { name: /Adicionar Linha|Add Row|Agregar Fila|Novo|New/i }).click();
    await expect(addRowInline).toBeVisible();

    await addRowInline.locator("button").nth(1).click();
    await expect(addRowInline).toHaveCount(0);
  });
});
