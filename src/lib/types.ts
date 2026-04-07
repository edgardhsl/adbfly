export interface Device {
  id: string;
  model: string;
  status: string;
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

export type Theme = 'light' | 'dark';