import type {
  AppConfig,
  DatabaseInfo,
  Device,
  DeviceOverview,
  FilterInfo,
  Package,
  SortInfo,
  SqlResult,
  TableData,
  TableSchema,
} from "./types";

type MockTable = {
  schema: TableSchema;
  rows: Record<string, unknown>[];
};

type MockDatabase = {
  info: DatabaseInfo;
  tables: Record<string, MockTable>;
};

const devices: Device[] = [
  {
    id: "mock-device-01",
    model: "Mock Android Device",
    status: "device",
  },
];

const packagesByDevice: Record<string, Package[]> = {
  "mock-device-01": [
    { name: "com.example.demo.app", label: "Demo App" },
    { name: "com.example.tools.viewer", label: "Tools Viewer" },
  ],
};

const databasesByPackage: Record<string, MockDatabase[]> = {
  "com.example.demo.app": [
    {
      info: {
        name: "demo_data.db",
        path: "/data/data/com.example.demo.app/databases/demo_data.db",
      },
      tables: {
        settings: {
          schema: {
            name: "settings",
            columns: [
              { name: "id", col_type: "INTEGER", nullable: false, primary_key: true },
              { name: "key_name", col_type: "TEXT", nullable: false, primary_key: false },
              { name: "key_value", col_type: "TEXT", nullable: true, primary_key: false },
            ],
          },
          rows: [
            { id: 1, key_name: "api_host", key_value: "example.local" },
            { id: 2, key_name: "api_port", key_value: "443" },
            { id: 3, key_name: "app_mode", key_value: "demo" },
          ],
        },
        assets: {
          schema: {
            name: "assets",
            columns: [
              { name: "asset_id", col_type: "TEXT", nullable: false, primary_key: true },
              { name: "asset_name", col_type: "TEXT", nullable: false, primary_key: false },
              { name: "asset_type", col_type: "INTEGER", nullable: false, primary_key: false },
            ],
          },
          rows: [
            {
              asset_id: "asset-001",
              asset_name: "sample_terminal",
              asset_type: 0,
            },
          ],
        },
      },
    },
  ],
  "com.example.tools.viewer": [],
};

const normalize = (value: unknown) => String(value ?? "").toLowerCase();

const applyFilters = (rows: Record<string, unknown>[], filters?: FilterInfo[]) => {
  if (!filters || filters.length === 0) return rows;
  return rows.filter((row) =>
    filters.every((filter) =>
      normalize(row[filter.column]).includes(normalize(filter.value))
    )
  );
};

const applySort = (rows: Record<string, unknown>[], sort?: SortInfo) => {
  if (!sort) return rows;
  const direction = sort.direction === "DESC" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = a[sort.column];
    const bv = b[sort.column];
    if (av === bv) return 0;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    return String(av).localeCompare(String(bv), undefined, { numeric: true }) * direction;
  });
};

const delay = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listMockDevices(): Promise<Device[]> {
  await delay();
  return devices;
}

export async function listMockPackages(deviceId: string): Promise<Package[]> {
  await delay();
  return packagesByDevice[deviceId] ?? [];
}

export async function getMockDeviceOverview(): Promise<DeviceOverview> {
  await delay();
  return {
    android_version: "15",
    cpu_abi: "x86_64",
    total_ram_mb: 8192,
    used_ram_mb: 3210,
    storage_total_gb: 128,
    storage_used_gb: 46,
    cpu_usage_percent: 22,
    memory_usage_percent: 39,
  };
}

export async function listMockDatabases(
  _deviceId: string,
  packageName: string
): Promise<DatabaseInfo[]> {
  await delay();
  return (databasesByPackage[packageName] ?? []).map((entry) => entry.info);
}

export async function listMockTables(
  _deviceId: string,
  packageName: string,
  dbName: string
): Promise<string[]> {
  await delay();
  const db = (databasesByPackage[packageName] ?? []).find((entry) => entry.info.name === dbName);
  if (!db) return [];
  return Object.keys(db.tables);
}

export async function getMockTableSchema(
  _deviceId: string,
  packageName: string,
  dbName: string,
  table: string
): Promise<TableSchema> {
  await delay();
  const db = (databasesByPackage[packageName] ?? []).find((entry) => entry.info.name === dbName);
  const schema = db?.tables[table]?.schema;
  if (!schema) {
    throw new Error(`Mock table schema not found for ${packageName}/${dbName}/${table}`);
  }
  return schema;
}

export async function getMockTableData(
  _deviceId: string,
  packageName: string,
  dbName: string,
  table: string,
  page: number,
  pageSize: number,
  sort?: SortInfo,
  filters?: FilterInfo[]
): Promise<TableData> {
  await delay();
  const db = (databasesByPackage[packageName] ?? []).find((entry) => entry.info.name === dbName);
  const tableRef = db?.tables[table];
  if (!tableRef) {
    return { columns: [], rows: [], total_rows: 0 };
  }

  const filtered = applyFilters(tableRef.rows, filters);
  const sorted = applySort(filtered, sort);
  const start = Math.max(0, (page - 1) * pageSize);
  const end = start + pageSize;
  return {
    columns: tableRef.schema.columns.map((col) => col.name),
    rows: sorted.slice(start, end),
    total_rows: sorted.length,
  };
}

export async function executeMockSql(): Promise<SqlResult> {
  await delay();
  return {
    success: true,
    message: "Mock SQL executed.",
    columns: [],
    rows: [],
    rows_affected: 1,
  };
}

export async function syncMockChanges(): Promise<void> {
  await delay();
}

export async function getMockAppConfig(): Promise<AppConfig> {
  await delay();
  return {
    openssl_dir: "",
    openssl_lib_dir: "",
    openssl_include_dir: "",
    preferred_locale: "en",
    config_file_path: "/tmp/adbfly.ini",
  };
}

export async function saveMockAppConfig(
  opensslDir: string,
  opensslLibDir: string,
  opensslIncludeDir: string,
  preferredLocale?: string
): Promise<AppConfig> {
  await delay();
  return {
    openssl_dir: opensslDir,
    openssl_lib_dir: opensslLibDir,
    openssl_include_dir: opensslIncludeDir,
    preferred_locale: preferredLocale ?? "en",
    config_file_path: "/tmp/adbfly.ini",
  };
}
