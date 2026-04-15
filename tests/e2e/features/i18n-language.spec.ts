import { expect, test } from "@playwright/test";

test.describe("Feature: Language Switch", () => {
  test("changes language from EN to PT", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /^EN$/i }).click();
    await page.getByRole("button", { name: /^PT$/i }).click();

    await expect(page.getByRole("button", { name: /Atualizar ADB/i })).toBeVisible();
  });
});
