"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";
import { type ChartConfig } from "@/components/ui/chart";
import { listDevices, listPackages, getDeviceOverview, listDatabases, listTables, getTableData, getTableSchema, executeSql } from "@/lib/api";
import type { SortInfo, FilterInfo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useI18n, I18nProvider } from "@/lib/I18nContext";
import { OVERVIEW_USAGE_HISTORY, type UsageHistoryPoint, type WorkspaceView } from "@/lib/workspace-navigation";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { OverviewSection } from "@/components/workspace/overview-section";
import { OverviewBackdrop } from "@/components/workspace/overview-backdrop";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { DatabaseWorkspace } from "@/components/workspace/database-workspace";
import { useWorkspaceState } from "@/hooks/use-workspace-state";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

function AppContent() {
  type PendingRowEdit = {
    pkValue: unknown;
    changes: Record<string, string>;
  };

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
  const [isAddingInlineRow, setIsAddingInlineRow] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, string>>({});
  const [expandedDbs, setExpandedDbs] = useState<Set<string>>(new Set());
  const [pendingRowEdits, setPendingRowEdits] = useState<Record<string, PendingRowEdit>>({});
  const [savingPendingRows, setSavingPendingRows] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("overview");
  const [liveUsageHistory, setLiveUsageHistory] = useState<UsageHistoryPoint[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const { data: devices = [], isLoading: loadingDevices, refetch: refetchDevices } = useQuery({
    queryKey: ["devices"],
    queryFn: listDevices,
  });

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const registerListener = async () => {
      try {
        unlisten = await listen("adb-devices-changed", () => {
          void refetchDevices();
        });
      } catch {
        // Running outside Tauri (e.g. browser preview)
      }
    };

    void registerListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [refetchDevices]);

  useEffect(() => {
    if (!selectedDevice) return;
    const stillConnected = devices.some((device) => device.id === selectedDevice);
    if (stillConnected) return;

    setSelectedDevice(null);
    setSelectedPackage(null);
    setSelectedDb(null);
    setSelectedTable(null);
    setWorkspaceView("overview");
    setIsAddingInlineRow(false);
    setNewRowData({});
    setEditingCell(null);
    setPendingRowEdits({});
    setLiveUsageHistory([]);
  }, [devices, selectedDevice]);

  const {
    data: packages = [],
    isFetching: fetchingPackages,
    isError: packagesError,
    refetch: refetchPackages,
  } = useQuery({
    queryKey: ["packages", selectedDevice],
    queryFn: () => selectedDevice ? listPackages(selectedDevice) : Promise.resolve([]),
    enabled: !!selectedDevice,
    refetchInterval: selectedDevice ? 10000 : false,
    retry: 2,
  });

  const {
    data: deviceOverview = null,
    isError: overviewError,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ["deviceOverview", selectedDevice],
    queryFn: () => selectedDevice ? getDeviceOverview(selectedDevice) : Promise.resolve(null),
    enabled: !!selectedDevice,
    refetchInterval: selectedDevice ? 3000 : false,
    refetchIntervalInBackground: true,
    retry: 2,
  });

  useEffect(() => {
    if (!selectedDevice || !deviceOverview) return;

    const now = new Date();
    const label = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    setLiveUsageHistory((previous) => {
      const next = [
        ...previous,
        {
          time: label,
          cpu: Number(deviceOverview.cpu_usage_percent.toFixed(1)),
          memory: Number(deviceOverview.memory_usage_percent.toFixed(1)),
        },
      ];

      return next.slice(-24);
    });
  }, [deviceOverview, selectedDevice]);

  const { data: databases = [], isFetching: fetchingDbs } = useQuery({
    queryKey: ["databases", selectedDevice, selectedPackage],
    queryFn: () => selectedDevice && selectedPackage ? listDatabases(selectedDevice, selectedPackage) : Promise.resolve([]),
    enabled: !!selectedDevice && !!selectedPackage,
  });

  const { data: tables = [], isError: tablesError } = useQuery({
    queryKey: ["tables", selectedDevice, selectedPackage, selectedDb],
    queryFn: () => selectedDevice && selectedPackage && selectedDb ? listTables(selectedDevice, selectedPackage, selectedDb) : Promise.resolve([]),
    enabled: !!selectedDevice && !!selectedPackage && !!selectedDb,
    retry: false,
  });

  const { data: tableData, refetch: refetchTableData, isFetching: fetchingTable } = useQuery({
    queryKey: ["tableData", selectedDevice, selectedPackage, selectedDb, selectedTable, page, pageSize, sortInfo, filters],
    queryFn: () => {
      if (!selectedDevice || !selectedPackage || !selectedDb || !selectedTable) return Promise.resolve(null);
      return getTableData(selectedDevice, selectedPackage, selectedDb, selectedTable, page, pageSize, sortInfo || undefined, filters.length ? filters : undefined);
    },
    enabled: !!selectedDevice && !!selectedPackage && !!selectedDb && !!selectedTable,
    placeholderData: (previousData) => previousData,
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

  const pkColumn = tableSchema?.columns.find((c) => c.primary_key)?.name;

  const escapeSqlText = (value: unknown) => String(value).replace(/'/g, "''");

  const toSqlValue = (value: string) =>
    value === "NULL" || value === "" ? "NULL" : `'${escapeSqlText(value)}'`;

  const getRowKey = (row: Record<string, unknown>, rowIndex: number) => {
    if (!pkColumn) return `row:${rowIndex}`;
    return `pk:${String(row[pkColumn])}`;
  };

  const getPendingDisplayValue = (row: Record<string, unknown>, rowIndex: number, col: string) => {
    const rowKey = getRowKey(row, rowIndex);
    const pendingValue = pendingRowEdits[rowKey]?.changes[col];
    return pendingValue === undefined ? row[col] : pendingValue;
  };

  const pendingRowsCount = Object.keys(pendingRowEdits).length;
  const showInitialTableLoading = fetchingTable && (!tableData || tableData.rows.length === 0);

  const clearPendingChanges = (showFeedback = false) => {
    if (showFeedback && pendingRowsCount > 0) {
      toast.info("Alteracoes descartadas", {
        description: `${pendingRowsCount} linha(s) pendente(s) removida(s).`,
      });
    }
    setPendingRowEdits({});
    setEditingCell(null);
  };

  const handleSort = (column: string) => {
    setSortInfo(prev => ({
      column,
      direction: prev?.column === column && prev.direction === "ASC" ? "DESC" : "ASC",
    }));
  };

  const handleCellEdit = (row: number, col: string, value: unknown) => {
    const hasPrimaryKey = !!tableSchema?.columns.some((c) => c.primary_key);
    if (!hasPrimaryKey) {
      toast.warning("Tabela sem chave primaria", {
        description: "A edicao inline nao esta disponivel para esta tabela.",
      });
      return;
    }

    setEditingCell({ row, col });
    setEditValue(value === null ? "" : String(value));
  };

  const handleCellSave = () => {
    if (!editingCell || !tableData || !pkColumn) return;

    const rowData = tableData.rows[editingCell.row];
    if (!rowData) return;

    const rowKey = getRowKey(rowData, editingCell.row);
    const pkValue = rowData[pkColumn];

    if (pkValue === null || pkValue === undefined) {
      toast.error("Falha ao preparar alteracao", {
        description: "Chave primaria invalida para esta linha.",
      });
      return;
    }

    setPendingRowEdits((prev) => ({
      ...prev,
      [rowKey]: {
        pkValue,
        changes: {
          ...(prev[rowKey]?.changes || {}),
          [editingCell.col]: editValue,
        },
      },
    }));

    setEditingCell(null);
  };

  const handleCommitPendingChanges = async () => {
    if (!selectedDevice || !selectedPackage || !selectedDb || !selectedTable || !pkColumn) return;

    const entries = Object.entries(pendingRowEdits);
    if (entries.length === 0) {
      toast("Nenhuma alteracao pendente", {
        description: "Edite uma ou mais celulas antes de salvar.",
      });
      return;
    }

    setSavingPendingRows(true);

    const failed: Record<string, PendingRowEdit> = {};

    for (const [rowKey, rowEdit] of entries) {
      const assignments = Object.entries(rowEdit.changes)
        .map(([column, value]) => `"${column}" = ${toSqlValue(value)}`)
        .join(", ");

      if (!assignments) continue;

      const pkWhere = typeof rowEdit.pkValue === "number"
        ? String(rowEdit.pkValue)
        : `'${escapeSqlText(rowEdit.pkValue)}'`;

      const sql = `UPDATE "${selectedTable}" SET ${assignments} WHERE "${pkColumn}" = ${pkWhere}`;

      try {
        const result = await executeSql(selectedDevice, selectedPackage, selectedDb, sql);
        if (!result.success) {
          throw new Error(result.message || "Falha ao executar UPDATE");
        }
      } catch (error) {
        console.error("Commit row error:", error);
        failed[rowKey] = rowEdit;
      }
    }

    setPendingRowEdits(failed);
    setSavingPendingRows(false);

    if (Object.keys(failed).length > 0) {
      toast.error("Commit parcial", {
        description: `Falha ao salvar ${Object.keys(failed).length} linha(s).`,
      });
    } else {
      toast.success("Alteracoes salvas", {
        description: `${entries.length} linha(s) atualizada(s) com sucesso.`,
      });
    }

    void refetchTableData();
  };

  const handleAddRow = async () => {
    if (!selectedDevice || !selectedPackage || !selectedDb || !selectedTable) return;
    const cols = tableSchema?.columns.filter(c => !c.primary_key || c.col_type.toUpperCase() !== "INTEGER") || [];
    if (cols.length === 0) {
      toast.warning("Nao ha colunas editaveis", {
        description: "Esta tabela nao possui colunas disponiveis para insercao manual.",
      });
      return;
    }
    const values = cols.map(c => newRowData[c.name] === '' || newRowData[c.name] === undefined ? 'NULL' : `'${newRowData[c.name].replace(/'/g, "''")}'`).join(", ");
    const sql = `INSERT INTO "${selectedTable}" (${cols.map(c => `"${c.name}"`).join(", ")}) VALUES (${values})`;
    try {
      await executeSql(selectedDevice, selectedPackage, selectedDb, sql);
      setIsAddingInlineRow(false);
      setNewRowData({});
      toast.success("Linha adicionada", {
        description: "A nova linha foi salva na tabela.",
      });
      void refetchTableData();
    } catch (e) {
      console.error(e);
      toast.error("Falha ao adicionar linha", {
        description: String(e),
      });
    }
  };

  const handleDeleteRow = async (rowIndex: number) => {
    if (!selectedDevice || !selectedPackage || !selectedDb || !selectedTable || !tableData) return;
    const pk = tableSchema?.columns.find(c => c.primary_key)?.name;
    if (!pk) {
      toast.warning("Tabela sem chave primaria", {
        description: "Nao foi possivel excluir: chave primaria nao encontrada.",
      });
      return;
    }
    const rowData = tableData.rows[rowIndex];
    const pkValue = rowData[pk];
    const sql = `DELETE FROM "${selectedTable}" WHERE "${pk}" = ${typeof pkValue === 'number' ? pkValue : `'${pkValue}'`}`;
    try {
      await executeSql(selectedDevice, selectedPackage, selectedDb, sql);
      const rowKey = getRowKey(rowData, rowIndex);
      setPendingRowEdits((prev) => {
        const next = { ...prev };
        delete next[rowKey];
        return next;
      });
      toast.success("Linha removida", {
        description: "A linha foi excluida com sucesso.",
      });
      refetchTableData();
    } catch (e) {
      console.error(e);
      toast.error("Falha ao excluir linha", {
        description: String(e),
      });
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

  const selectDevice = (deviceId: string) => {
    setSelectedDevice(deviceId);
    setSelectedPackage(null);
    setSelectedDb(null);
    setSelectedTable(null);
    setPackageSearch("");
    setWorkspaceView("overview");
    setIsAddingInlineRow(false);
    setNewRowData({});
    setLiveUsageHistory([]);
    clearPendingChanges();
  };

  const selectPackage = (pkg: string) => {
    setSelectedPackage(pkg);
    setSelectedDb(null);
    setSelectedTable(null);
    setWorkspaceView("overview");
    setIsAddingInlineRow(false);
    setNewRowData({});
    clearPendingChanges();
  };

  const selectDb = (db: string) => {
    setSelectedDb(db);
    setSelectedTable(null);
    setWorkspaceView("databases");
    setIsAddingInlineRow(false);
    setNewRowData({});
    clearPendingChanges();
    setExpandedDbs(prev => new Set(Array.from(prev).concat(db)));
  };

  const selectTable = (table: string) => {
    setSelectedTable(table);
    setWorkspaceView("databases");
    setIsAddingInlineRow(false);
    setNewRowData({});
    setPage(1);
    setSortInfo(null);
    setFilters([]);
    setFilterInput("");
    clearPendingChanges();
  };

  const currentDevice = devices.find(d => d.id === selectedDevice);

  const isBooleanColumn = (columnName: string) => {
    const type = tableSchema?.columns.find((column) => column.name === columnName)?.col_type ?? "";
    return /bool/i.test(type);
  };

  const toBooleanState = (value: unknown) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      return ["1", "true", "yes", "on"].includes(normalized);
    }
    return false;
  };

  const {
    isDatabaseView,
    showOverview,
    hasAnyDevice,
    hasSelectedDevice,
    hasSelectedApp,
    canOpenOverview,
    canOpenDatabases,
    navGroups,
    breadcrumbItems,
    workspaceDescription,
  } = useWorkspaceState({
    t,
    workspaceView,
    devicesCount: devices.length,
    currentDevice,
    selectedPackage,
  });

  const usageHistory = canOpenOverview ? liveUsageHistory : OVERVIEW_USAGE_HISTORY;

  const resourceChartConfig = {
    cpu: {
      label: t.main.cpuUsage,
      color: "var(--primary)",
    },
    memory: {
      label: t.main.memoryUsage,
      color: "var(--success)",
    },
  } satisfies ChartConfig;

  return (
    <div
      className={cn(
        "h-screen w-screen overflow-hidden text-[12px] text-on-surface",
        theme === "dark" ? "bg-[#121212]" : "bg-[#fafafa]"
      )}
    >
      <div className="relative grid h-full w-full grid-cols-[320px_1fr]">
        <WorkspaceSidebar
          theme={theme}
          t={t}
          selectedDevice={selectedDevice}
          currentDevice={currentDevice}
          selectedPackage={selectedPackage}
          hasSelectedDevice={hasSelectedDevice}
          packageSearch={packageSearch}
          onPackageSearchChange={setPackageSearch}
          navGroups={navGroups}
          workspaceView={workspaceView}
          onWorkspaceViewChange={setWorkspaceView}
          devices={devices}
          filteredPackages={filteredPackages}
          fetchingPackages={fetchingPackages}
          packagesError={packagesError}
          onRetryPackages={() => {
            void refetchPackages();
          }}
          onSelectDevice={selectDevice}
          onSelectPackage={selectPackage}
          onRefreshDevices={() => refetchDevices()}
          loadingDevices={loadingDevices}
        />

        <main
          className={cn(
            "relative z-20 flex h-full min-w-0 flex-col overflow-hidden",
            theme === "dark" ? "bg-[#121212]" : "bg-[#fafafa]"
          )}
        >
          <WorkspaceHeader
            theme={theme}
            breadcrumbItems={breadcrumbItems}
            workspaceDescription={workspaceDescription}
            isConnected={!!currentDevice}
            connectedLabel={t.app.connected}
            disconnectedLabel={t.app.disconnected}
            locale={locale}
            onLocaleChange={setLocale}
            onToggleTheme={() => setTheme(theme === "light" ? "dark" : "light")}
          />

          <div className="relative z-20 flex-1 overflow-auto p-6">
            {showOverview && (
              <OverviewSection
                theme={theme}
                t={t}
                canOpenOverview={canOpenOverview}
                usageHistory={usageHistory}
                resourceChartConfig={resourceChartConfig}
                deviceOverview={deviceOverview}
                overviewError={overviewError}
                onRetryOverview={() => {
                  void refetchOverview();
                }}
              />
            )}

            {isDatabaseView && (
              <DatabaseWorkspace
                theme={theme}
                t={t}
                canOpenDatabases={canOpenDatabases}
                hasAnyDevice={hasAnyDevice}
                hasSelectedDevice={hasSelectedDevice}
                hasSelectedApp={hasSelectedApp}
                selectedPackage={selectedPackage}
                databases={databases}
                tables={tables}
                tablesError={tablesError}
                fetchingDbs={fetchingDbs}
                selectedDb={selectedDb}
                expandedDbs={expandedDbs}
                setExpandedDbs={setExpandedDbs}
                onSelectDb={selectDb}
                onSelectTable={selectTable}
                selectedTable={selectedTable}
                tableData={tableData}
                tableSchema={tableSchema}
                filterColumn={filterColumn}
                onFilterColumnChange={setFilterColumn}
                filterInput={filterInput}
                onFilterInputChange={setFilterInput}
                onApplyFilter={applyFilter}
                isAddingInlineRow={isAddingInlineRow}
                newRowData={newRowData}
                onAddRowOpen={() => {
                  setIsAddingInlineRow(true);
                  setNewRowData({});
                }}
                onAddRowCancel={() => {
                  setIsAddingInlineRow(false);
                  setNewRowData({});
                }}
                onAddRowSubmit={handleAddRow}
                onNewRowValueChange={(column, value) => {
                  setNewRowData((prev) => ({ ...prev, [column]: value }));
                }}
                pendingRowsCount={pendingRowsCount}
                savingPendingRows={savingPendingRows}
                onCommitPendingChanges={handleCommitPendingChanges}
                onClearPendingChanges={() => clearPendingChanges(true)}
                onSort={handleSort}
                sortInfo={sortInfo}
                showInitialTableLoading={showInitialTableLoading}
                getRowKey={getRowKey}
                getPendingDisplayValue={getPendingDisplayValue}
                isBooleanColumn={isBooleanColumn}
                toBooleanState={toBooleanState}
                editingCell={editingCell}
                editValue={editValue}
                onEditValueChange={setEditValue}
                onCellEdit={handleCellEdit}
                onCellSave={handleCellSave}
                onCancelCellEdit={() => setEditingCell(null)}
                onDeleteRow={handleDeleteRow}
                pendingRowEdits={pendingRowEdits}
                page={page}
                pageSize={pageSize}
                onPageSizeChange={(value) => { setPageSize(value); setPage(1); }}
                onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
                onNextPage={() => setPage((p) => p + 1)}
              />
            )}

            {showOverview && !canOpenOverview && (
              <OverviewBackdrop theme={theme} message={t.main.connectDeviceOverlay} />
            )}
          </div>
        </main>
      </div>
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
