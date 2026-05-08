import { expect, test } from "@playwright/test";
import {
  createMockDeviceDirectory,
  listMockDeviceFiles,
  uploadMockDeviceFile,
} from "../../src/lib/mock-adb";

test.describe("Unit: Mock ADB File Explorer", () => {
  test("returns default root entries when no path is provided", async () => {
    const entries = await listMockDeviceFiles("mock-device-01");

    expect(entries.length).toBeGreaterThan(0);
    expect(entries.some((entry) => entry.name === "Download" && entry.is_directory)).toBeTruthy();
  });

  test("returns specific directory entries for nested path", async () => {
    const entries = await listMockDeviceFiles("mock-device-01", "/sdcard/Download");

    expect(entries.some((entry) => entry.name === "build-debug.apk" && !entry.is_directory)).toBeTruthy();
    expect(entries.some((entry) => entry.name === "export.csv" && !entry.is_directory)).toBeTruthy();
  });

  test("creates folder in current directory", async () => {
    await createMockDeviceDirectory("mock-device-01", "/sdcard/NewFolder");
    const entries = await listMockDeviceFiles("mock-device-01", "/sdcard");

    expect(entries.some((entry) => entry.name === "NewFolder" && entry.is_directory)).toBeTruthy();
  });

  test("uploads file to current directory", async () => {
    await uploadMockDeviceFile(
      "mock-device-01",
      "/sdcard/Documents",
      "report.txt",
      new Uint8Array([1, 2, 3, 4])
    );
    const entries = await listMockDeviceFiles("mock-device-01", "/sdcard/Documents");
    const uploaded = entries.find((entry) => entry.name === "report.txt");

    expect(uploaded).toBeTruthy();
    expect(uploaded?.size_bytes).toBe(4);
  });
});
