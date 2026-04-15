import { Page } from "@playwright/test";

export async function selectMockDevice(page: Page) {
  await page.goto("/");
  const deviceSelect = page.locator("aside").getByRole("combobox").first();
  await deviceSelect.click();
  await page.getByRole("option", { name: /Mock Android Device/i }).click();
}

export async function selectMockApp(page: Page) {
  const appSelect = page.locator("aside").getByRole("combobox").nth(1);
  await appSelect.click();
  await page.getByRole("option", { name: /com\.example\.demo\.app/i }).click();
}

export async function openSettingsTable(page: Page) {
  await selectMockDevice(page);
  await selectMockApp(page);
  await page.locator("aside").getByRole("button", { name: /Databases/i }).click();
  await page.getByRole("button", { name: /demo_data\.db/i }).click();
  await page.getByRole("button", { name: /settings/i }).click();
}
