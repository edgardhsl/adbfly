import { expect, test } from "@playwright/test";
import { openSettingsTable } from "./helpers";

test.describe("Feature: Table Filter", () => {
  test("filters rows in mocked table", async ({ page }) => {
    await openSettingsTable(page);

    await page.getByRole("button", { name: /Manage filters|Gerenciar filtros|Gestionar filtros/i }).click();
    const filterInput = page.getByPlaceholder(/Filter value|Valor do filtro|Valor del filtro/i);
    await filterInput.fill("3");
    await page.getByRole("button", { name: /Add filter|Adicionar filtro|Agregar filtro/i }).click();
    await page.getByRole("button", { name: /Cancel|Cancelar/i }).click();

    await expect(page.getByText("app_mode")).toBeVisible();
    await expect(page.getByText("api_host")).toHaveCount(0);
  });
});
