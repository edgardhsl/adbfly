"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Smartphone, 
  Database, 
  Table2, 
  RefreshCw, 
  Search,
  Moon,
  Sun,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  LayoutGrid,
  FolderOpen,
} from "lucide-react";
import { LanguageDropdown } from "@/components/ui/language-dropdown";
import { listDevices, listPackages, listDatabases, listTables, getTableData, getTableSchema, executeSql } from "@/lib/api";
import type { SortInfo, FilterInfo } from "@/lib/types";
import { cn, getValueLabel } from "@/lib/utils";
import { useI18n, I18nProvider } from "@/lib/I18nContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

function AppContent() {
  const { t, locale, setLocale } = useI18n();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [selectedDb, setSelectedDb] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [packageSearch, setPackageSearch] = useState("");
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [sortInfo, setSortInfo] = useState<SortInfo | null>(null);
  const [filters, setFilters] = useState<FilterInfo[]>([]);
  const [filterInput, setFilterInput] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [addRowDialog, setAddRowDialog] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, string>>({});
  const [expandedDevices, setExpandedDevices] = useState<Set<string>>(new Set());
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());
  const [expandedDbs, setExpandedDbs] = useState<Set<string>>(new Set());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const { data: devices = [], isLoading: loadingDevices, refetch: refetchDevices } = useQuery({
    queryKey: ["devices"],
    queryFn: listDevices,
  });

  const { data: packages = [], isFetching: fetchingPkgs } = useQuery({
    queryKey: ["packages", selectedDevice],
    queryFn: () => selectedDevice ? listPackages(selectedDevice) : Promise.resolve([]),
    enabled: !!selectedDevice,
  });

  const { data: databases = [], isFetching: fetchingDbs } = useQuery({
    queryKey: ["databases", selectedDevice, selectedPackage],
    queryFn: () => selectedDevice && selectedPackage ? listDatabases(selectedDevice, selectedPackage) : Promise.resolve([]),
    enabled: !!selectedDevice && !!selectedPackage,
  });

  const { data: tables = [], isFetching: fetchingTables } = useQuery({
    queryKey: ["tables", selectedDevice, selectedPackage, selectedDb],
    queryFn: () => selectedDevice && selectedPackage && selectedDb ? listTables(selectedDevice, selectedPackage, selectedDb) : Promise.resolve([]),
    enabled: !!selectedDevice && !!selectedPackage && !!selectedDb,
    retry: 2,
  });

  const { data: tableData, refetch: refetchTableData, isFetching: fetchingTable } = useQuery({
    queryKey: ["tableData", selectedDevice, selectedPackage, selectedDb, selectedTable, page, pageSize, sortInfo, filters],
    queryFn: () => {
      if (!selectedDevice || !selectedPackage || !selectedDb || !selectedTable) return Promise.resolve(null);
      return getTableData(selectedDevice, selectedPackage, selectedDb, selectedTable, page, pageSize, sortInfo || undefined, filters.length ? filters : undefined);
    },
    enabled: !!selectedDevice && !!selectedPackage && !!selectedDb && !!selectedTable,
  });

  const { data: tableSchema } = useQuery({
    queryKey: ["tableSchema", selectedDevice, selectedPackage, selectedDb, selectedTable],
    queryFn: () => {
      if (!selectedDevice || !selectedPackage || !selectedDb || !selectedTable) return Promise.resolve(null);
      return getTableSchema(selectedDevice, selectedPackage, selectedDb, selectedTable);
    },
    enabled: !!selectedDevice && !!selectedPackage && !!selectedDb && !!selectedTable,
  });

  const filteredPackages = packages.filter(p => 
    p.name.toLowerCase().includes(packageSearch.toLowerCase())
  );

  const handleSort = (column: string) => {
    setSortInfo(prev => ({
      column,
      direction: prev?.column === column && prev.direction === "ASC" ? "DESC" : "ASC",
    }));
  };

  const handleCellEdit = (row: number, col: string, value: unknown) => {
    setEditingCell({ row, col });
    setEditValue(value === null ? "" : String(value));
  };

  const handleCellSave = async () => {
    if (!editingCell || !selectedDevice || !selectedPackage || !selectedDb || !selectedTable) return;
    const pk = tableSchema?.columns.find(c => c.primary_key)?.name;
    if (!pk || !tableData) return;
    const rowData = tableData.rows[editingCell.row];
    const pkValue = rowData[pk];
    const sql = `UPDATE "${selectedTable}" SET "${editingCell.col}" = ${editValue === 'NULL' || editValue === '' ? 'NULL' : `'${editValue.replace(/'/g, "''")}'`} WHERE "${pk}" = ${typeof pkValue === 'number' ? pkValue : `'${pkValue}'`}`;
    try {
      const result = await executeSql(selectedDevice, selectedPackage, selectedDb, sql);
      console.log("Update result:", result);
      setEditingCell(null);
      setTimeout(() => refetchTableData(), 50);
    } catch (e) {
      console.error("Update error:", e);
    }
  };

  const handleAddRow = async () => {
    if (!selectedDevice || !selectedPackage || !selectedDb || !selectedTable) return;
    const cols = tableSchema?.columns.filter(c => !c.primary_key || c.col_type.toUpperCase() !== "INTEGER") || [];
    const values = cols.map(c => newRowData[c.name] === '' || newRowData[c.name] === undefined ? 'NULL' : `'${newRowData[c.name].replace(/'/g, "''")}'`).join(", ");
    const sql = `INSERT INTO "${selectedTable}" (${cols.map(c => `"${c.name}"`).join(", ")}) VALUES (${values})`;
    try {
      await executeSql(selectedDevice, selectedPackage, selectedDb, sql);
      setAddRowDialog(false);
      setNewRowData({});
      refetchTableData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteRow = async (rowIndex: number) => {
    if (!selectedDevice || !selectedPackage || !selectedDb || !selectedTable || !tableData) return;
    const pk = tableSchema?.columns.find(c => c.primary_key)?.name;
    if (!pk) return;
    const rowData = tableData.rows[rowIndex];
    const pkValue = rowData[pk];
    const sql = `DELETE FROM "${selectedTable}" WHERE "${pk}" = ${typeof pkValue === 'number' ? pkValue : `'${pkValue}'`}`;
    try {
      await executeSql(selectedDevice, selectedPackage, selectedDb, sql);
      refetchTableData();
    } catch (e) {
      console.error(e);
    }
  };

  const [filterColumn, setFilterColumn] = useState<string>("");

  const applyFilter = () => {
    if (!filterInput.trim()) {
      setFilters([]);
      setPage(1);
      return;
    }
    const col = filterColumn || tableData?.columns[0] || "id";
    console.log("Applying filter:", col, filterInput);
    setFilters([{ column: col, value: filterInput }]);
    setPage(1);
  };

  const clearFilter = () => {
    setFilterInput("");
    setFilters([]);
    setFilterColumn("");
    setPage(1);
  };

  const selectDevice = (deviceId: string) => {
    setSelectedDevice(deviceId);
    setSelectedPackage(null);
    setSelectedDb(null);
    setSelectedTable(null);
    setExpandedDevices(prev => new Set(Array.from(prev).concat(deviceId)));
  };

  const selectPackage = (pkg: string) => {
    setSelectedPackage(pkg);
    setSelectedDb(null);
    setSelectedTable(null);
    setExpandedPackages(prev => new Set(Array.from(prev).concat(pkg)));
  };

  const selectDb = (db: string) => {
    setSelectedDb(db);
    setSelectedTable(null);
    setExpandedDbs(prev => new Set(Array.from(prev).concat(db)));
  };

  const selectTable = (table: string) => {
    setSelectedTable(table);
    setPage(1);
    setSortInfo(null);
    setFilters([]);
    setFilterInput("");
  };

  const currentDevice = devices.find(d => d.id === selectedDevice);

  return (
    <div className="h-screen flex flex-col bg-surface font-body text-on-surface selection:bg-primary/20">
      {/* Sidebar - Tree Navigation */}
      <aside className="h-screen w-64 flex flex-col fixed left-0 top-0 bg-slate-100 dark:bg-slate-900 border-none font-headline text-sm font-medium tracking-tight z-50 overflow-hidden">
        <div className="flex flex-col h-full py-6">
          {/* Brand */}
          <div className="px-6 mb-10">
            <div className="flex items-center gap-3">
              <Database className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-xl font-bold tracking-tighter text-indigo-600 dark:text-indigo-400">{t.app.title}</h1>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">
              {t.app.version} {currentDevice ? t.app.connected : t.app.disconnected}
            </p>
          </div>

          {/* Device List */}
          <div className="flex-1 overflow-y-auto px-3">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t.sidebar.devices}</span>
              <button 
                onClick={() => refetchDevices()}
                className="p-1 rounded hover:bg-slate-200/50 transition-colors text-slate-400 hover:text-slate-600"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loadingDevices && "animate-spin")} />
              </button>
            </div>

            {devices.length === 0 && !loadingDevices && (
              <p className="text-xs text-slate-400 px-2 py-3">{t.sidebar.noDevices}</p>
            )}

            {devices.map(device => {
              const isExpanded = expandedDevices.has(device.id);
              const isSelected = selectedDevice === device.id;
              const devicePackages = isSelected ? packages : [];

              return (
                <div key={device.id}>
                  <button
                    onClick={() => {
                      if (isExpanded) {
                        setExpandedDevices(prev => {
                          const next = new Set(prev);
                          next.delete(device.id);
                          return next;
                        });
                      } else {
                        selectDevice(device.id);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                      isSelected 
                        ? "text-indigo-700 dark:text-indigo-300 font-bold border-r-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                    )}
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                    <Smartphone className="w-5 h-5 shrink-0" />
                    <span className="truncate">{device.model}</span>
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0 ml-auto",
                      device.status === "device" ? "bg-emerald-500" : "bg-slate-300"
                    )} />
                  </button>

                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-slate-200/50 pl-3">
                      {/* App Search */}
                      <div className="relative mb-2">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                        <input 
                          className="w-full pl-7 pr-2 py-1.5 bg-slate-200/50 dark:bg-slate-800/50 rounded text-[11px] border-none focus:ring-1 focus:ring-indigo-500/30 focus:outline-none"
                          placeholder={t.sidebar.searchApps}
                          value={packageSearch}
                          onChange={(e) => setPackageSearch(e.target.value)}
                        />
                      </div>

                      {devicePackages.length === 0 && isSelected && (
                        <p className="text-[11px] text-slate-400 py-2">{t.sidebar.loadingApps}</p>
                      )}

                      {filteredPackages.map(pkg => {
                        const isPkgExpanded = expandedPackages.has(pkg.name);
                        const isPkgSelected = selectedPackage === pkg.name;
                        const pkgDbs = isPkgSelected ? databases : [];

                        return (
                          <div key={pkg.name}>
                            <button
                              onClick={() => {
                                if (isPkgExpanded) {
                                  setExpandedPackages(prev => {
                                    const next = new Set(prev);
                                    next.delete(pkg.name);
                                    return next;
                                  });
                                } else {
                                  selectPackage(pkg.name);
                                }
                              }}
                              className={cn(
                                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors",
                                isPkgSelected 
                                  ? "text-indigo-700 dark:text-indigo-300 font-medium bg-indigo-50/50 dark:bg-indigo-900/20"
                                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                              )}
                            >
                              {isPkgExpanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
                              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate font-mono text-[11px]">{pkg.name}</span>
                            </button>

                            {isPkgExpanded && (
                              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-200/50 pl-3">
                                {fetchingDbs && isPkgSelected && (
                                  <p className="text-[10px] text-slate-400 py-1 flex items-center gap-1">
                                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                    Loading...
                                  </p>
                                )}
                                {!fetchingDbs && pkgDbs.length === 0 && isPkgSelected && (
                                  <p className="text-[10px] text-slate-400 py-1">{t.sidebar.noDatabases}</p>
                                )}
                                {pkgDbs.map(db => {
                                  const isDbExpanded = expandedDbs.has(db.name);
                                  const isDbSelected = selectedDb === db.name;
                                  const dbTables = isDbSelected ? tables : [];

                                  return (
                                    <div key={db.name}>
                                      <button
                                        onClick={() => {
                                          if (isDbExpanded) {
                                            setExpandedDbs(prev => {
                                              const next = new Set(prev);
                                              next.delete(db.name);
                                              return next;
                                            });
                                          } else {
                                            selectDb(db.name);
                                          }
                                        }}
                                        className={cn(
                                          "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors",
                                          isDbSelected 
                                            ? "text-indigo-700 dark:text-indigo-300 font-medium bg-indigo-50/50 dark:bg-indigo-900/20"
                                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                                        )}
                                      >
                                        {isDbExpanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
                                        <FolderOpen className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                                        <span className="truncate font-mono text-[10px]">{db.name}</span>
                                      </button>

                                        {isDbExpanded && (
                                          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-200/50 pl-3">
                                            {fetchingTables && isDbSelected && (
                                              <p className="text-[10px] text-slate-400 py-1 flex items-center gap-1">
                                                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                                {t.table.loading}
                                              </p>
                                            )}
                                            {!fetchingTables && dbTables.length === 0 && isDbSelected && (
                                              <p className="text-[10px] text-slate-400 py-1">{t.sidebar.noTables}</p>
                                            )}
                                          {dbTables.map(table => (
                                            <button
                                              key={table}
                                              onClick={() => selectTable(table)}
                                              className={cn(
                                                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors",
                                                selectedTable === table
                                                  ? "text-indigo-700 dark:text-indigo-300 font-medium bg-indigo-50/50 dark:bg-indigo-900/20"
                                                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                                              )}
                                            >
                                              <Table2 className="w-3.5 h-3.5 shrink-0" />
                                              <span className="truncate font-mono text-[10px]">{table}</span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom CTA */}
          <div className="px-6 mt-auto pt-6 border-t border-slate-200/10">
            <button 
              onClick={() => refetchDevices()}
              className="w-full py-2 px-4 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95"
            >
              <RefreshCw className={cn("w-4 h-4", loadingDevices && "animate-spin")} />
              {t.sidebar.refreshAdb}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-40 bg-surface-container-lowest/70 backdrop-blur-xl border-b border-slate-200/15">
          <div className="flex justify-between items-center w-full px-6 h-12">
            <div className="flex items-center gap-2 text-sm">
              {selectedDevice && (
                <>
                  <span className="text-slate-400">{currentDevice?.model}</span>
                  {selectedPackage && (
                    <>
                      <ChevronRight className="w-3 h-3 text-slate-300" />
                      <span className="font-mono text-xs text-slate-500 truncate max-w-[200px]">{selectedPackage}</span>
                    </>
                  )}
                  {selectedDb && (
                    <>
                      <ChevronRight className="w-3 h-3 text-slate-300" />
                      <span className="font-mono text-xs text-slate-500">{selectedDb}</span>
                    </>
                  )}
                  {selectedTable && (
                    <>
                      <ChevronRight className="w-3 h-3 text-slate-300" />
                      <span className="font-mono text-xs text-primary font-semibold">{selectedTable}</span>
                    </>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <LanguageDropdown
                value={locale}
                onChange={(val) => setLocale(val as "pt-BR" | "en" | "es")}
              />
              <button
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {!selectedTable && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Database className="w-12 h-12 mx-auto mb-3 text-surface-dim" />
                <h2 className="text-xl font-bold font-headline text-on-surface mb-1">
                  {!selectedDevice ? t.main.noDevice : !selectedPackage ? t.main.selectApp : !selectedDb ? t.main.selectDatabase : t.main.selectTable}
                </h2>
                <p className="text-sm text-slate-400">
                  {!selectedDevice ? t.main.connectDevice : t.main.navigateTree}
                </p>
              </div>
            </div>
          )}

          {selectedTable && tableData && (
            <div>
              {/* Toolbar */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center bg-surface-container-lowest rounded-lg border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
                  <Search className="px-3 text-slate-400 w-4 h-4 shrink-0" />
                  <select 
                    className="bg-transparent border-none focus:ring-0 text-xs font-mono text-slate-500 dark:text-slate-400 py-2 pr-2 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
                    value={filterColumn}
                    onChange={(e) => setFilterColumn(e.target.value)}
                  >
                    <option value="">{t.toolbar.allColumns}</option>
                    {tableData?.columns.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                  <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />
                  <input 
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-mono placeholder:text-slate-300 dark:placeholder:text-slate-600 py-2 text-slate-700 dark:text-slate-300"
                    placeholder={t.toolbar.filterPlaceholder}
                    value={filterInput}
                    onChange={(e) => setFilterInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyFilter()}
                  />
                  <button 
                    onClick={applyFilter}
                    className="mx-1 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    {t.toolbar.apply}
                  </button>
                  {filters.length > 0 && (
                    <button 
                      onClick={() => { setFilters([]); setFilterInput(""); setPage(1); }}
                      className="mr-1 px-2 py-1 text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {t.toolbar.clear}
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => setAddRowDialog(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-primary to-primary-container hover:shadow-lg hover:shadow-primary/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t.toolbar.addRow}
                </button>
              </div>

              {/* Data Table */}
              <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-xl shadow-[0px_12px_32px_rgba(44,52,55,0.06)] overflow-hidden border border-slate-100 dark:border-slate-700/50">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-indigo-50 dark:bg-indigo-950/30">
                        {tableData.columns.map(col => (
                          <th 
                            key={col}
                            className="px-4 py-3 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border-r border-b border-indigo-100 dark:border-indigo-900/50"
                            onClick={() => handleSort(col)}
                          >
                            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                              {col}
                              {sortInfo?.column === col && (
                                <span className="text-primary">{sortInfo.direction === "ASC" ? "↑" : "↓"}</span>
                              )}
                            </div>
                          </th>
                        ))}
                        <th className="px-4 py-3 w-16 border-b border-indigo-100 dark:border-indigo-900/50">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300"></div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {fetchingTable ? (
                        <tr>
                          <td colSpan={tableData.columns.length + 1} className="px-4 py-12 text-center text-slate-400">
                            <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin" />
                            {t.table.loading}
                          </td>
                        </tr>
                      ) : tableData.rows.length > 0 ? (
                        tableData.rows.map((row, rowIdx) => (
                          <tr key={rowIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 group">
                            {tableData.columns.map((col, colIdx) => (
                              <td 
                                key={col}
                                className={cn(
                                  "px-4 py-2 border-r border-b border-slate-100 dark:border-slate-700/50",
                                  colIdx === 0 && "bg-slate-50/50 dark:bg-slate-800/30 font-semibold text-slate-700 dark:text-slate-300"
                                )}
                                onClick={() => handleCellEdit(rowIdx, col, row[col])}
                              >
                                {editingCell?.row === rowIdx && editingCell?.col === col ? (
                                  <div className="flex items-center border-2 border-primary rounded-lg bg-surface-container-lowest shadow-lg shadow-primary/10 p-0.5">
                                    <input 
                                      className="flex-1 border-none focus:ring-0 focus:outline-none text-sm font-mono py-1 px-2 text-primary font-semibold bg-transparent"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleCellSave();
                                        if (e.key === "Escape") setEditingCell(null);
                                      }}
                                      autoFocus
                                    />
                                    <button 
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCellSave(); }}
                                      className="w-6 h-6 flex items-center justify-center rounded bg-primary text-white hover:bg-primary/90"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setEditingCell(null); }}
                                      className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className={cn(
                                    "text-sm font-mono",
                                    row[col] === null ? "text-slate-400 dark:text-slate-600 italic" : "text-on-surface dark:text-slate-300"
                                  )}>
                                    {getValueLabel(row[col])}
                                  </span>
                                )}
                              </td>
                            ))}
                            <td className="px-4 py-2">
                              <button 
                                onClick={() => handleDeleteRow(rowIdx)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-error/10 text-error transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={tableData.columns.length + 1} className="px-4 py-12 text-center text-slate-400">
                            {t.table.noData}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {tableData && tableData.rows.length > 0 && (
                  <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center border-t border-slate-100 dark:border-slate-700/50">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                      {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, tableData.total_rows)} {t.table.of} {tableData.total_rows.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <select 
                        className="text-xs bg-transparent border-none focus:ring-0 text-slate-500 dark:text-slate-400 font-semibold"
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                      >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-on-surface dark:hover:text-slate-200 shadow-sm border border-slate-100 dark:border-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                      >
                        {t.table.prev}
                      </button>
                      <button 
                        onClick={() => setPage(p => p + 1)}
                        disabled={!tableData || page >= Math.ceil(tableData.total_rows / pageSize)}
                        className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-on-surface dark:hover:text-slate-200 shadow-sm border border-slate-100 dark:border-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                      >
                        {t.table.next}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Row Dialog */}
      {addRowDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-on-surface/20 backdrop-blur-sm" onClick={() => setAddRowDialog(false)} />
          <div className="relative bg-surface-container-lowest rounded-xl shadow-[0px_12px_32px_rgba(44,52,55,0.06)] w-full max-w-lg p-6">
            <h3 className="text-base font-bold font-headline text-on-surface mb-4">{t.dialog.addNewRow}</h3>
            <div className="grid gap-3 max-h-[60vh] overflow-y-auto">
              {tableSchema?.columns.filter(c => !c.primary_key || c.col_type.toUpperCase() !== "INTEGER").map(col => (
                <div key={col.name} className="grid gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{col.name}</label>
                  <input
                    type={col.col_type.toUpperCase().includes("INT") ? "number" : "text"}
                    className="h-9 px-3 rounded-lg bg-surface-container-low border-none text-sm focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30 transition-all"
                    placeholder={col.name}
                    value={newRowData[col.name] || ""}
                    onChange={(e) => setNewRowData(d => ({ ...d, [col.name]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button 
                onClick={() => setAddRowDialog(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                {t.dialog.cancel}
              </button>
              <button 
                onClick={handleAddRow}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-primary to-primary-container hover:shadow-lg hover:shadow-primary/20 transition-all"
              >
                {t.dialog.addRow}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AppContent />
      </I18nProvider>
    </QueryClientProvider>
  );
}
