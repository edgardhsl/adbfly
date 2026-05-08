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

const logcatByPackage: Record<string, string[]> = {
  "com.example.demo.app": [
    "04-15 14:08:11.233  4123  4123 I DemoApp: App initialized",
    "04-15 14:08:12.004  4123  4135 D DemoNetwork: Fetching remote config",
    "04-15 14:08:12.915  4123  4135 W DemoNetwork: Slow response detected (982ms)",
    "04-15 14:08:14.120  4123  4123 I DemoUI: Dashboard rendered",
    "04-15 14:08:15.401  4123  4178 E DemoDB: Failed to open optional cache table",
    "04-15 14:08:16.889  4123  4123 I DemoApp: User opened schema explorer",
  ],
  "com.example.tools.viewer": [
    "04-15 14:08:10.551  5230  5230 I ToolsViewer: Startup complete",
    "04-15 14:08:13.718  5230  5302 D ToolsSync: Background sync tick",
    "04-15 14:08:18.902  5230  5230 I ToolsViewer: Ready",
  ],
};

const mockFileTree: Record<string, DeviceFileEntry[]> = {
  "/sdcard": [
    { name: "Download", full_path: "/sdcard/Download", is_directory: true },
    { name: "Android", full_path: "/sdcard/Android", is_directory: true },
    { name: "Documents", full_path: "/sdcard/Documents", is_directory: true },
    { name: "notes.txt", full_path: "/sdcard/notes.txt", is_directory: false, size_bytes: 1642 },
  ],
  "/sdcard/Download": [
    { name: "build-debug.apk", full_path: "/sdcard/Download/build-debug.apk", is_directory: false, size_bytes: 7_422_912 },
    { name: "export.csv", full_path: "/sdcard/Download/export.csv", is_directory: false, size_bytes: 98_400 },
  ],
  "/sdcard/Android": [
    { name: "data", full_path: "/sdcard/Android/data", is_directory: true },
    { name: "media", full_path: "/sdcard/Android/media", is_directory: true },
  ],
  "/sdcard/Documents": [
    { name: "readme.md", full_path: "/sdcard/Documents/readme.md", is_directory: false, size_bytes: 3021 },
  ],
};

const ensureDir = (path: string) => {
  if (!mockFileTree[path]) {
    mockFileTree[path] = [];
  }
};

const parentDir = (path: string) => {
  if (path === "/") return "/";
  const index = path.lastIndexOf("/");
  if (index <= 0) return "/";
  return path.slice(0, index);
};

const basename = (path: string) => {
  const idx = path.lastIndexOf("/");
  return idx >= 0 ? path.slice(idx + 1) : path;
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

export async function getMockLogcatLogs(
  _deviceId: string,
  packageName?: string,
  limit = 200
): Promise<string[]> {
  await delay();
  const all = packageName
    ? (logcatByPackage[packageName] ?? [])
    : Object.values(logcatByPackage).flat();
  const suffix = Date.now().toString().slice(-3);
  const heartbeat = `04-15 14:08:${suffix}  9999  9999 D MockRuntime: heartbeat ${suffix}`;
  return [...all, heartbeat].slice(-Math.max(1, limit));
}

export async function listMockDeviceFiles(
  _deviceId: string,
  path?: string
): Promise<DeviceFileEntry[]> {
  await delay();
  const target = path?.trim() ? path.trim() : "/sdcard";
  return mockFileTree[target] ?? [];
}

export async function downloadMockDeviceFile(
  _deviceId: string,
  remotePath: string
): Promise<string> {
  await delay();
  return `/mock-downloads/${basename(remotePath) || "download.bin"}`;
}

export async function createMockDeviceDirectory(
  _deviceId: string,
  remotePath: string
): Promise<void> {
  await delay();
  const dir = parentDir(remotePath);
  ensureDir(dir);
  const name = basename(remotePath);
  if (!name) return;

  if (!(mockFileTree[dir] ?? []).some((entry) => entry.full_path === remotePath)) {
    mockFileTree[dir].push({
      name,
      full_path: remotePath,
      is_directory: true,
    });
  }
  ensureDir(remotePath);
}

export async function uploadMockDeviceFile(
  _deviceId: string,
  destinationDir: string,
  fileName: string,
  data: Uint8Array
): Promise<string> {
  await delay();
  ensureDir(destinationDir);
  const destinationPath = `${destinationDir.replace(/\/$/, "")}/${fileName}`;
  const list = mockFileTree[destinationDir];
  const existingIndex = list.findIndex((entry) => entry.full_path === destinationPath);
  const payload: DeviceFileEntry = {
    name: fileName,
    full_path: destinationPath,
    is_directory: false,
    size_bytes: data.byteLength,
  };
  if (existingIndex >= 0) {
    list[existingIndex] = payload;
  } else {
    list.push(payload);
  }
  return destinationPath;
}

export async function deleteMockDevicePath(
  _deviceId: string,
  remotePath: string
): Promise<void> {
  await delay();
  const dir = parentDir(remotePath);
  const name = basename(remotePath);
  const entries = mockFileTree[dir] ?? [];
  const target = entries.find((entry) => entry.name === name);
  mockFileTree[dir] = entries.filter((entry) => entry.name !== name);

  if (target?.is_directory) {
    const prefix = `${remotePath}/`;
    Object.keys(mockFileTree).forEach((key) => {
      if (key === remotePath || key.startsWith(prefix)) {
        delete mockFileTree[key];
      }
    });
  }
}

export async function moveMockDevicePath(
  _deviceId: string,
  sourcePath: string,
  destinationPath: string
): Promise<void> {
  await delay();
  const sourceDir = parentDir(sourcePath);
  const sourceName = basename(sourcePath);
  const destinationDir = parentDir(destinationPath);
  const destinationName = basename(destinationPath);

  const sourceEntries = mockFileTree[sourceDir] ?? [];
  const target = sourceEntries.find((entry) => entry.name === sourceName);
  if (!target) return;

  mockFileTree[sourceDir] = sourceEntries.filter((entry) => entry.name !== sourceName);
  ensureDir(destinationDir);
  mockFileTree[destinationDir].push({
    ...target,
    name: destinationName,
    full_path: destinationPath,
  });

  if (target.is_directory) {
    const movedSubtree = mockFileTree[sourcePath] ?? [];
    delete mockFileTree[sourcePath];
    mockFileTree[destinationPath] = movedSubtree.map((entry) => ({
      ...entry,
      full_path: entry.full_path.replace(`${sourcePath}/`, `${destinationPath}/`),
    }));

    const sourcePrefix = `${sourcePath}/`;
    const destinationPrefix = `${destinationPath}/`;
    for (const key of Object.keys(mockFileTree)) {
      if (!key.startsWith(sourcePrefix)) continue;
      const moved = mockFileTree[key];
      delete mockFileTree[key];
      mockFileTree[key.replace(sourcePrefix, destinationPrefix)] = moved.map((entry) => ({
        ...entry,
        full_path: entry.full_path.replace(sourcePrefix, destinationPrefix),
      }));
    }
  }
}

export async function copyMockDevicePath(
  _deviceId: string,
  sourcePath: string,
  destinationPath: string
): Promise<void> {
  await delay();
  const sourceDir = parentDir(sourcePath);
  const sourceName = basename(sourcePath);
  const destinationDir = parentDir(destinationPath);
  const destinationName = basename(destinationPath);
  const target = (mockFileTree[sourceDir] ?? []).find((entry) => entry.name === sourceName);
  if (!target) return;

  ensureDir(destinationDir);
  mockFileTree[destinationDir].push({
    ...target,
    name: destinationName,
    full_path: destinationPath,
  });

  if (target.is_directory) {
    const sourcePrefix = `${sourcePath}/`;
    const destinationPrefix = `${destinationPath}/`;
    mockFileTree[destinationPath] = (mockFileTree[sourcePath] ?? []).map((entry) => ({
      ...entry,
      full_path: entry.full_path.replace(sourcePrefix, destinationPrefix),
    }));

    for (const key of Object.keys(mockFileTree)) {
      if (!key.startsWith(sourcePrefix)) continue;
      const copiedKey = key.replace(sourcePrefix, destinationPrefix);
      mockFileTree[copiedKey] = (mockFileTree[key] ?? []).map((entry) => ({
        ...entry,
        full_path: entry.full_path.replace(sourcePrefix, destinationPrefix),
      }));
    }
  }
}

export async function getMockDeviceFileProperties(
  _deviceId: string,
  remotePath: string
): Promise<DeviceFileProperties> {
  await delay();
  const dir = parentDir(remotePath);
  const entry = (mockFileTree[dir] ?? []).find((item) => item.full_path === remotePath);

  return {
    name: basename(remotePath),
    full_path: remotePath,
    is_directory: entry?.is_directory ?? false,
    size_bytes: entry?.size_bytes,
    modified_at: "Apr 24 12:10",
    permissions: entry?.is_directory ? "drwxr-xr-x" : "-rw-r--r--",
  };
}

const textToBase64 = (value: string) => {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
  }
  return Buffer.from(value, "utf-8").toString("base64");
};

export async function getMockDeviceFilePreview(
  _deviceId: string,
  remotePath: string,
  maxBytes = 8 * 1024 * 1024
): Promise<DeviceFilePreview> {
  await delay();
  const name = basename(remotePath);
  const ext = (name.split(".").pop() || "").toLowerCase();
  const mimeByExt: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    mp4: "video/mp4",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/plain",
    json: "application/json",
    csv: "text/plain",
  };
  const mimeType = mimeByExt[ext] ?? "application/octet-stream";

  const contentText =
    mimeType === "application/json"
      ? JSON.stringify({ file: name, preview: true }, null, 2)
      : `Preview content for ${name}\nPath: ${remotePath}`;

  const bytes = new TextEncoder().encode(contentText);
  const clipped = bytes.slice(0, maxBytes);
  const contentBase64 = textToBase64(new TextDecoder().decode(clipped));

  return {
    name,
    full_path: remotePath,
    mime_type: mimeType,
    content_base64: contentBase64,
    truncated: clipped.length < bytes.length,
  };
}
