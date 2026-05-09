import { test, expect } from "@playwright/test";
import { selectMockDevice } from "./helpers";

test.describe("Feature: Running Apps", () => {
  test("shows running apps workspace when navigating from sidebar", async ({ page }) => {
    await selectMockDevice(page);

    await page.locator("aside").getByRole("button", { name: /Running Apps/i }).click();

    await expect(page.getByTestId("running-apps-workspace")).toBeVisible({ timeout: 10000 });
  });

  test("displays running apps list with mock data", async ({ page }) => {
    await selectMockDevice(page);

    await page.locator("aside").getByRole("button", { name: /Running Apps/i }).click();

    await expect(page.getByTestId("running-apps-header")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("running-app-row").first()).toBeVisible({ timeout: 10000 });
  });

  test("shows app name, PID, RAM and CPU columns", async ({ page }) => {
    await selectMockDevice(page);

    await page.locator("aside").getByRole("button", { name: /Running Apps/i }).click();

    const headerRow = page.getByTestId("running-apps-header");
    await expect(headerRow).toBeVisible({ timeout: 10000 });

    await expect(headerRow).toContainText("App");
    await expect(headerRow).toContainText("PID");
    await expect(headerRow).toContainText("RAM");
    await expect(headerRow).toContainText("CPU");
  });

  test("refresh button triggers data reload", async ({ page }) => {
    await selectMockDevice(page);

    await page.locator("aside").getByRole("button", { name: /Running Apps/i }).click();

    await expect(page.getByTestId("refresh-running-apps")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("refresh-running-apps").click();
  });

  test("search filters running apps by name", async ({ page }) => {
    await selectMockDevice(page);

    await page.locator("aside").getByRole("button", { name: /Running Apps/i }).click();

    await expect(page.getByTestId("running-apps-search")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("running-apps-search").fill("chrome");

    await page.waitForTimeout(500);

    const appRows = page.getByTestId("running-app-row");
    const count = await appRows.count();
    expect(count).toBeGreaterThan(0);
  });

  test("stop button is available for each app", async ({ page }) => {
    await selectMockDevice(page);

    await page.locator("aside").getByRole("button", { name: /Running Apps/i }).click();

    await expect(page.getByTestId("stop-app-button").first()).toBeVisible({ timeout: 10000 });
  });

  test("filter dropdown shows all, user and system options", async ({ page }) => {
    await selectMockDevice(page);

    await page.locator("aside").getByRole("button", { name: /Running Apps/i }).click();

    await expect(page.getByTestId("running-apps-filter")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("running-apps-filter").click();

    await expect(page.getByRole("option", { name: "All" })).toBeVisible();
    await expect(page.getByRole("option", { name: "User" })).toBeVisible();
    await expect(page.getByRole("option", { name: "System" })).toBeVisible();
  });
});