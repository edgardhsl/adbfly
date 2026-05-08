export interface Device {
  id: string;
  model: string;
  status: string;
}

export interface DeviceOverview {
  android_version: string;
  cpu_abi: string;
  total_ram_mb: number;
  used_ram_mb: number;
  storage_total_gb: number;
  storage_used_gb: number;
  cpu_usage_percent: number;
  memory_usage_percent: number;
}

export interface DeviceFileEntry {
  name: string;
  full_path: string;
  is_directory: boolean;
  size_bytes?: number;
}

export interface DeviceFileProperties {
  name: string;
  full_path: string;
  is_directory: boolean;
  size_bytes?: number;
  modified_at?: string;
  permissions?: string;
}

export interface DeviceFilePreview {
  name: string;
  full_path: string;
  mime_type: string;
  content_base64: string;
  truncated: boolean;
}

export interface Package {
  name: string;
  label?: string;
}

export interface DatabaseInfo {
  name: string;
  path: string;
  size?: number;
}

export interface TableSchema {
  name: string;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  col_type: string;
  nullable: boolean;
  primary_key: boolean;
}

export interface TableData {
  columns: string[];
  rows: Record<string, unknown>[];
  total_rows: number;
}

export interface SqlResult {
  success: boolean;
  message: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rows_affected: number;
}

export interface SortInfo {
  column: string;
  direction: 'ASC' | 'DESC';
}

export interface FilterInfo {
  column: string;
  value: string;
}

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface AppConfig {
  openssl_dir: string;
  openssl_lib_dir: string;
  openssl_include_dir: string;
  preferred_locale: string;
  config_file_path: string;
}

export type Theme = 'light' | 'dark';
