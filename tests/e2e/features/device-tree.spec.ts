import { expect, test } from "@playwright/test";
import { selectMockDevice } from "./helpers";

test.describe("Feature: Device Tree", () => {
  test("loads mocked device and package tree", async ({ page }) => {
    await selectMockDevice(page);
    await expect(page.locator("aside").getByText("mock-device-01")).toBeVisible();
  });
});
