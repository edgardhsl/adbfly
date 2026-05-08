import { invoke } from '@tauri-apps/api/core';
import type {
  AppConfig,
  DatabaseInfo,
  Device,
  DeviceFileEntry,
  DeviceFilePreview,
  DeviceFileProperties,
  DeviceOverview,
  FilterInfo,
  Package,
  SortInfo,
  SqlResult,
  TableData,
  TableSchema,
} from './types';
import {
  executeMockSql,
  copyMockDevicePath,
  createMockDeviceDirectory,
  deleteMockDevicePath,
  downloadMockDeviceFile,
  getMockAppConfig,
  getMockDeviceFileProperties,
  getMockDeviceFilePreview,
  getMockDeviceOverview,
  listMockDeviceFiles,
  getMockTableData,
  getMockTableSchema,
  getMockLogcatLogs,
  listMockDatabases,
  moveMockDevicePath,
  listMockDevices,
  listMockPackages,
  listMockTables,
  saveMockAppConfig,
  syncMockChanges,
  uploadMockDeviceFile,
} from "./mock-adb";

const isTauriRuntime = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const shouldUseMockAdb = () =>
  process.env.NEXT_PUBLIC_E2E_MOCK_ADB === "true" || !isTauriRuntime();

export async function listDevices(): Promise<Device[]> {
  if (shouldUseMockAdb()) return listMockDevices();
  return invoke('list_devices');
}

export async function listPackages(deviceId: string): Promise<Package[]> {
  if (shouldUseMockAdb()) return listMockPackages(deviceId);
  return invoke('list_packages', { deviceId });
}

export async function getDeviceOverview(deviceId: string): Promise<DeviceOverview> {
  if (shouldUseMockAdb()) return getMockDeviceOverview();
  return invoke('get_device_overview', { deviceId });
}

export async function listDeviceFiles(
  deviceId: string,
  path?: string
): Promise<DeviceFileEntry[]> {
  if (shouldUseMockAdb()) return listMockDeviceFiles(deviceId, path);
  return invoke("list_device_files", { deviceId, path });
}

export async function downloadDeviceFile(deviceId: string, remotePath: string): Promise<string> {
  if (shouldUseMockAdb()) return downloadMockDeviceFile(deviceId, remotePath);
  return invoke("download_device_file", { deviceId, remotePath });
}

export async function createDeviceDirectory(deviceId: string, remotePath: string): Promise<void> {
  if (shouldUseMockAdb()) return createMockDeviceDirectory(deviceId, remotePath);
  return invoke("create_device_directory", { deviceId, remotePath });
}

export async function uploadDeviceFile(
  deviceId: string,
  destinationDir: string,
  fileName: string,
  data: Uint8Array
): Promise<string> {
  if (shouldUseMockAdb()) return uploadMockDeviceFile(deviceId, destinationDir, fileName, data);
  return invoke("upload_device_file", {
    deviceId,
    destinationDir,
    fileName,
    data: Array.from(data),
  });
}

export async function deleteDevicePath(deviceId: string, remotePath: string): Promise<void> {
  if (shouldUseMockAdb()) return deleteMockDevicePath(deviceId, remotePath);
  return invoke("delete_device_path", { deviceId, remotePath });
}

export async function moveDevicePath(
  deviceId: string,
  sourcePath: string,
  destinationPath: string
): Promise<void> {
  if (shouldUseMockAdb()) return moveMockDevicePath(deviceId, sourcePath, destinationPath);
  return invoke("move_device_path", { deviceId, sourcePath, destinationPath });
}

export async function copyDevicePath(
  deviceId: string,
  sourcePath: string,
  destinationPath: string
): Promise<void> {
  if (shouldUseMockAdb()) return copyMockDevicePath(deviceId, sourcePath, destinationPath);
  return invoke("copy_device_path", { deviceId, sourcePath, destinationPath });
}

export async function getDeviceFileProperties(
  deviceId: string,
  remotePath: string
): Promise<DeviceFileProperties> {
  if (shouldUseMockAdb()) return getMockDeviceFileProperties(deviceId, remotePath);
  return invoke("get_device_file_properties", { deviceId, remotePath });
}

export async function getDeviceFilePreview(
  deviceId: string,
  remotePath: string,
  maxBytes = 8 * 1024 * 1024
): Promise<DeviceFilePreview> {
  if (shouldUseMockAdb()) return getMockDeviceFilePreview(deviceId, remotePath, maxBytes);
  return invoke("get_device_file_preview", { deviceId, remotePath, maxBytes });
}

export async function getLogcatLogs(
  deviceId: string,
  packageName?: string,
  limit = 200
): Promise<string[]> {
  if (shouldUseMockAdb()) return getMockLogcatLogs(deviceId, packageName, limit);
  return invoke("get_logcat_logs", { deviceId, packageName, limit });
}

export async function listDatabases(deviceId: string, packageName: string): Promise<DatabaseInfo[]> {
  if (shouldUseMockAdb()) return listMockDatabases(deviceId, packageName);
  return invoke('list_databases', { deviceId, packageName });
}

export async function listTables(
  deviceId: string,
  packageName: string,
  dbName: string,
  dbKey?: string
): Promise<string[]> {
  if (shouldUseMockAdb()) return listMockTables(deviceId, packageName, dbName);
  return invoke('list_tables', { deviceId, packageName, dbName, dbKey });
}

export async function getTableSchema(
  deviceId: string,
  packageName: string,
  dbName: string,
  table: string,
  dbKey?: string
): Promise<TableSchema> {
  if (shouldUseMockAdb()) return getMockTableSchema(deviceId, packageName, dbName, table);
  return invoke('get_table_schema', {
    deviceId,
    packageName,
    dbName,
    table,
    dbKey,
  });
}

export async function getTableData(
  deviceId: string,
  packageName: string,
  dbName: string,
  table: string,
  page: number,
  pageSize: number,
  sort?: SortInfo,
  filters?: FilterInfo[],
  dbKey?: string
): Promise<TableData> {
  if (shouldUseMockAdb()) {
    return getMockTableData(deviceId, packageName, dbName, table, page, pageSize, sort, filters);
  }
  return invoke('get_table_data', {
    deviceId,
    packageName,
    dbName,
    table,
    page,
    pageSize,
    sort,
    filters,
    dbKey,
  });
}

export async function executeSql(
  deviceId: string,
  packageName: string,
  dbName: string,
  sql: string,
  dbKey?: string
): Promise<SqlResult> {
  if (shouldUseMockAdb()) return executeMockSql();
  return invoke('execute_sql', {
    deviceId,
    packageName,
    dbName,
    sql,
    dbKey,
  });
}

export async function syncChanges(
  deviceId: string,
  packageName: string,
  dbName: string
): Promise<void> {
  if (shouldUseMockAdb()) return syncMockChanges();
  return invoke('sync_changes', {
    deviceId,
    packageName,
    dbName,
  });
}

export async function getAppConfig(): Promise<AppConfig> {
  if (shouldUseMockAdb()) return getMockAppConfig();
  return invoke('get_app_config');
}

export async function saveAppConfig(
  opensslDir: string,
  opensslLibDir: string,
  opensslIncludeDir: string,
  preferredLocale?: string
): Promise<AppConfig> {
  if (shouldUseMockAdb()) {
    return saveMockAppConfig(opensslDir, opensslLibDir, opensslIncludeDir, preferredLocale);
  }
  return invoke('save_app_config', {
    opensslDir,
    opensslLibDir,
    opensslIncludeDir,
    preferredLocale,
  });
}
