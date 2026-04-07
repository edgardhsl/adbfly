import { invoke } from '@tauri-apps/api/core';
import type { 
  Device, 
  Package, 
  DatabaseInfo, 
  TableSchema, 
  TableData, 
  SqlResult,
  SortInfo,
  FilterInfo
} from './types';

export async function listDevices(): Promise<Device[]> {
  return invoke('list_devices');
}

export async function listPackages(deviceId: string): Promise<Package[]> {
  return invoke('list_packages', { deviceId });
}

export async function listDatabases(deviceId: string, packageName: string): Promise<DatabaseInfo[]> {
  return invoke('list_databases', { deviceId, packageName });
}

export async function listTables(deviceId: string, packageName: string, dbName: string): Promise<string[]> {
  return invoke('list_tables', { deviceId, packageName, dbName });
}

export async function getTableSchema(
  deviceId: string, 
  packageName: string, 
  dbName: string, 
  table: string
): Promise<TableSchema> {
  return invoke('get_table_schema', { deviceId, packageName, dbName, table });
}

export async function getTableData(
  deviceId: string,
  packageName: string,
  dbName: string,
  table: string,
  page: number,
  pageSize: number,
  sort?: SortInfo,
  filters?: FilterInfo[]
): Promise<TableData> {
  return invoke('get_table_data', { 
    deviceId, 
    packageName, 
    dbName, 
    table, 
    page, 
    pageSize, 
    sort, 
    filters 
  });
}

export async function executeSql(
  deviceId: string,
  packageName: string,
  dbName: string,
  sql: string
): Promise<SqlResult> {
  return invoke('execute_sql', { deviceId, packageName, dbName, sql });
}

export async function syncChanges(
  deviceId: string,
  packageName: string,
  dbName: string
): Promise<void> {
  return invoke('sync_changes', { deviceId, packageName, dbName });
}