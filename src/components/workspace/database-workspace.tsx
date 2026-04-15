import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Check, ChevronDown, ChevronRight, Database, KeyRound, Layers, ListFilter, PanelLeftClose, PanelLeftOpen, Plus, RefreshCw, TableProperties, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TranslationKeys } from "@/lib/i18n";
import type { DatabaseInfo, FilterInfo, TableData, TableSchema } from "@/lib/types";
import { cn, getValueLabel } from "@/lib/utils";
import type { Theme } from "@/lib/types";
import type { Dispatch, SetStateAction } from "react";
const DatabaseSchemaDiagram = dynamic(
  () => import("@/components/workspace/database-schema-diagram").then((module) => module.DatabaseSchemaDiagram),
  { ssr: false }
);

const TABLE_ROW_HEIGHT = 42;
const TABLE_OVERSCAN = 10;

type DatabaseWorkspaceProps = {
  theme: Theme;
  t: TranslationKeys;
  canOpenDatabases: boolean;
  hasAnyDevice: boolean;
  hasSelectedDevice: boolean;
  hasSelectedApp: boolean;
  selectedPackage: string | null;
  databases: DatabaseInfo[];
  tables: string[];
  tablesError: boolean;
  fetchingDbs: boolean;
  selectedDb: string | null;
  requiresSqlCipherKey: boolean;
  databaseKey: string;
  onApplyDatabaseKey: (key: string) => void;
  expandedDbs: Set<string>;
  setExpandedDbs: Dispatch<SetStateAction<Set<string>>>;
  onSelectDb: (db: string) => void;
  onSelectTable: (table: string) => void;
  selectedTable: string | null;
  tableData: TableData | null | undefined;
  tableSchema: TableSchema | null | undefined;
  diagramSchemas: Record<string, TableSchema>;
  diagramLoading: boolean;
  onOpenDiagram: () => void;
  filters: FilterInfo[];
  onAddFilter: (filter: FilterInfo) => void;
  onRemoveFilter: (index: number) => void;
  onClearFilters: () => void;
  isAddingInlineRow: boolean;
  newRowData: Record<string, string>;
  onAddRowOpen: () => void;
  onAddRowCancel: () => void;
  onAddRowSubmit: () => void;
  onNewRowValueChange: (column: string, value: string) => void;
  pendingRowsCount: number;
  savingPendingRows: boolean;
  onCommitPendingChanges: () => void;
  onClearPendingChanges: () => void;
  onSort: (column: string) => void;
  sortInfo: { column: string; direction: "ASC" | "DESC" } | null;
  showInitialTableLoading: boolean;
  getRowKey: (row: Record<string, unknown>, rowIndex: number) => string;
  getPendingDisplayValue: (row: Record<string, unknown>, rowIndex: number, col: string) => unknown;
  isBooleanColumn: (columnName: string) => boolean;
  toBooleanState: (value: unknown) => boolean;
  editingCell: { row: number; col: string } | null;
  editValue: string;
  onEditValueChange: (value: string) => void;
  onCellEdit: (row: number, col: string, value: unknown) => void;
  onCellSave: () => void;
  onCancelCellEdit: () => void;
  onDeleteRow: (rowIndex: number) => void;
  pendingRowEdits: Record<string, { pkValue: unknown; changes: Record<string, string> }>;
  page: number;
  pageSize: number;
  onPageSizeChange: (value: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
};

export function DatabaseWorkspace({
  theme,
  t,
  canOpenDatabases,
  hasAnyDevice,
  hasSelectedDevice,
  hasSelectedApp,
  selectedPackage,
  databases,
  tables,
  tablesError,
  fetchingDbs,
  selectedDb,
  requiresSqlCipherKey,
  databaseKey,
  onApplyDatabaseKey,
  expandedDbs,
  setExpandedDbs,
  onSelectDb,
  onSelectTable,
  selectedTable,
  tableData,
  tableSchema,
  diagramSchemas,
  diagramLoading,
  onOpenDiagram,
  filters,
  onAddFilter,
  onRemoveFilter,
  onClearFilters,
  isAddingInlineRow,
  newRowData,
  onAddRowOpen,
  onAddRowCancel,
  onAddRowSubmit,
  onNewRowValueChange,
  pendingRowsCount,
  savingPendingRows,
  onCommitPendingChanges,
  onClearPendingChanges,
  onSort,
  sortInfo,
  showInitialTableLoading,
  getRowKey,
  getPendingDisplayValue,
  isBooleanColumn,
  toBooleanState,
  editingCell,
  editValue,
  onEditValueChange,
  onCellEdit,
  onCellSave,
  onCancelCellEdit,
  onDeleteRow,
  pendingRowEdits,
  page,
  pageSize,
  onPageSizeChange,
  onPrevPage,
  onNextPage,
}: DatabaseWorkspaceProps) {
  const [isSchemaSidebarCollapsed, setIsSchemaSidebarCollapsed] = useState(false);
  const [confirmDeleteRowIndex, setConfirmDeleteRowIndex] = useState<number | null>(null);
  const [confirmDiscardPending, setConfirmDiscardPending] = useState(false);
  const [isDiagramOpen, setIsDiagramOpen] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [dbKeyInput, setDbKeyInput] = useState(databaseKey);
  const [newFilterColumn, setNewFilterColumn] = useState("");
  const [newFilterValue, setNewFilterValue] = useState("");
  const [filtersLaneEl, setFiltersLaneEl] = useState<HTMLDivElement | null>(null);
  const [manageFiltersButtonEl, setManageFiltersButtonEl] = useState<HTMLButtonElement | null>(null);
  const [clearFiltersButtonEl, setClearFiltersButtonEl] = useState<HTMLButtonElement | null>(null);
  const [visibleFilterCount, setVisibleFilterCount] = useState<number>(filters.length);
  const [tableViewportEl, setTableViewportEl] = useState<HTMLDivElement | null>(null);
  const [tableScrollTop, setTableScrollTop] = useState(0);
  const [tableViewportHeight, setTableViewportHeight] = useState(420);
  const filterChipMeasureRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    setDbKeyInput(databaseKey);
  }, [databaseKey, selectedDb]);

  useEffect(() => {
    filterChipMeasureRefs.current = filterChipMeasureRefs.current.slice(0, filters.length);
  }, [filters.length]);

  useEffect(() => {
    if (!tableViewportEl) return;

    const updateMetrics = () => {
      setTableViewportHeight(tableViewportEl.clientHeight || 420);
      setTableScrollTop(tableViewportEl.scrollTop);
    };

    updateMetrics();
    tableViewportEl.addEventListener("scroll", updateMetrics, { passive: true });

    const observer = new ResizeObserver(updateMetrics);
    observer.observe(tableViewportEl);

    return () => {
      tableViewportEl.removeEventListener("scroll", updateMetrics);
      observer.disconnect();
    };
  }, [tableViewportEl]);

  useEffect(() => {
    if (!tableViewportEl) return;
    tableViewportEl.scrollTop = 0;
    setTableScrollTop(0);
  }, [tableViewportEl, selectedTable, page, pageSize]);

  const hiddenFiltersCount = Math.max(0, filters.length - visibleFilterCount);

  const totalRows = tableData?.rows.length ?? 0;
  const virtualWindow = useMemo(() => {
    if (!tableData || totalRows === 0) {
      return {
        start: 0,
        end: 0,
        paddingTop: 0,
        paddingBottom: 0,
      };
    }

    const firstVisible = Math.floor(tableScrollTop / TABLE_ROW_HEIGHT);
    const visibleCount = Math.ceil(tableViewportHeight / TABLE_ROW_HEIGHT);
    const start = Math.max(0, firstVisible - TABLE_OVERSCAN);
    const end = Math.min(totalRows, firstVisible + visibleCount + TABLE_OVERSCAN);

    return {
      start,
      end,
      paddingTop: start * TABLE_ROW_HEIGHT,
      paddingBottom: Math.max(0, (totalRows - end) * TABLE_ROW_HEIGHT),
    };
  }, [tableData, tableScrollTop, tableViewportHeight, totalRows]);

  const visibleRows = useMemo(() => {
    if (!tableData || totalRows === 0) return [];

    return tableData.rows
      .slice(virtualWindow.start, virtualWindow.end)
      .map((row, index) => ({ row, rowIdx: virtualWindow.start + index }));
  }, [tableData, totalRows, virtualWindow.end, virtualWindow.start]);

  const hiddenFiltersChipLabel = useMemo(
    () => `${hiddenFiltersCount} ${t.toolbar.filtersCountSuffix}`,
    [hiddenFiltersCount, t.toolbar.filtersCountSuffix]
  );

  useEffect(() => {
    if (!filtersLaneEl || !manageFiltersButtonEl) return;

    const gapPx = 8;
    const estimateSummaryWidth = (hiddenCount: number) => {
      const text = `${hiddenCount} ${t.toolbar.filtersCountSuffix}`;
      return Math.max(78, 36 + text.length * 7);
    };

    const calculateVisibleFilters = () => {
      if (!filters.length) {
        setVisibleFilterCount(0);
        return;
      }

      const laneWidth = filtersLaneEl.clientWidth;
      const manageWidth = manageFiltersButtonEl.offsetWidth;
      const clearWidth = clearFiltersButtonEl?.offsetWidth ?? 0;
      const fixedWidth = manageWidth + clearWidth + gapPx * 2;
      const availableForChips = Math.max(0, laneWidth - fixedWidth);
      const chipWidths = filters.map((_, index) => filterChipMeasureRefs.current[index]?.offsetWidth ?? 120);

      let count = 0;
      let used = 0;
      for (let index = 0; index < chipWidths.length; index += 1) {
        const next = chipWidths[index];
        const projected = used + (count > 0 ? gapPx : 0) + next;
        if (projected > availableForChips) break;
        used = projected;
        count += 1;
      }

      if (count >= filters.length) {
        setVisibleFilterCount(filters.length);
        return;
      }

      let adjusted = count;
      while (adjusted >= 0) {
        const visibleWidths = chipWidths.slice(0, adjusted);
        const visibleUsed = visibleWidths.reduce((sum, width, index) => sum + width + (index > 0 ? gapPx : 0), 0);
        const hiddenCount = filters.length - adjusted;
        const summaryWidth = estimateSummaryWidth(hiddenCount);
        const projected = visibleUsed + (adjusted > 0 ? gapPx : 0) + summaryWidth;
        if (projected <= availableForChips) break;
        adjusted -= 1;
      }

      setVisibleFilterCount(Math.max(0, adjusted));
    };

    calculateVisibleFilters();

    const observer = new ResizeObserver(() => {
      calculateVisibleFilters();
    });

    observer.observe(filtersLaneEl);
    observer.observe(manageFiltersButtonEl);
    if (clearFiltersButtonEl) observer.observe(clearFiltersButtonEl);

    return () => observer.disconnect();
  }, [clearFiltersButtonEl, filters, filtersLaneEl, manageFiltersButtonEl, t.toolbar.filtersCountSuffix]);

  if (!canOpenDatabases) {
    return (
      <Card className="mx-auto w-full max-w-4xl border-border bg-surface backdrop-blur-xl">
        <CardContent className={cn("space-y-2 py-12 text-center", theme === "dark" ? "text-zinc-300" : "text-slate-600")}>
          <p className={cn("text-sm font-semibold", theme === "dark" ? "text-zinc-100" : "text-slate-900")}>{t.main.databasesLockedTitle}</p>
          <p className={cn("text-xs", theme === "dark" ? "text-zinc-300" : "text-slate-600")}>
            {!hasAnyDevice && t.main.lockConnectAndRefresh}
            {hasAnyDevice && !hasSelectedDevice && t.main.lockSelectConnectedDevice}
            {hasSelectedDevice && !hasSelectedApp && t.main.lockSelectAppPackage}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsSchemaSidebarCollapsed((prev) => !prev)}
          className={cn(
            "h-8 rounded-lg",
            theme === "dark"
              ? "border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
          )}
        >
          {isSchemaSidebarCollapsed ? <PanelLeftOpen className="mr-1 h-4 w-4" /> : <PanelLeftClose className="mr-1 h-4 w-4" />}
          {t.sidebar.schemaExplorer}
        </Button>
        {selectedDb && (
          <Button
            variant="secondary"
            onClick={() => {
              onOpenDiagram();
              setIsDiagramOpen(true);
            }}
            className={cn("h-8 shrink-0 rounded-lg px-3 text-xs", theme === "dark" ? "border border-white/10 bg-white/10 text-zinc-100 hover:bg-white/15" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100")}
          >
            <Database className="mr-1 h-4 w-4" />
            {t.toolbar.viewDiagram}
          </Button>
        )}
      </div>

      <div className={cn("grid min-h-0 flex-1 gap-3", isSchemaSidebarCollapsed ? "grid-cols-1" : "grid-cols-[270px_minmax(0,1fr)]")}>
        {!isSchemaSidebarCollapsed && (
          <Card className="overflow-hidden border-border bg-surface backdrop-blur-xl">
            <CardHeader className="space-y-1 border-b border-border px-4 py-3">
              <CardTitle className={cn("text-sm", theme === "dark" ? "text-zinc-100" : "text-slate-900")}>{t.sidebar.schemaExplorer}</CardTitle>
              <CardDescription className={cn("text-xs", theme === "dark" ? "text-zinc-400" : "text-slate-600")}>{t.sidebar.schemaExplorerDescription}</CardDescription>
            </CardHeader>
            <CardContent className="p-2.5">
              {!selectedPackage && (
                <p className={cn("rounded-xl border p-3 text-[11px]", theme === "dark" ? "border-white/10 text-zinc-400" : "border-slate-200 text-slate-600")}>
                  {t.main.lockSelectAppPackage}
                </p>
              )}

              {selectedPackage && (
                <div className="space-y-2">
                  <div className={cn("rounded-xl border px-2 py-2 text-[11px] font-mono", theme === "dark" ? "border-white/10 text-zinc-300" : "border-slate-200 text-slate-700")}>
                    {selectedPackage}
                  </div>
                  {selectedDb && requiresSqlCipherKey && (
                    <div className={cn("space-y-2 rounded-xl border p-2", theme === "dark" ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50")}>
                      <p className={cn("text-[10px] font-semibold uppercase tracking-[0.08em]", theme === "dark" ? "text-zinc-400" : "text-slate-600")}>
                        {t.sidebar.sqlCipherKey}
                      </p>
                      <div className="flex items-center gap-1">
                        <Input
                          type="password"
                          value={dbKeyInput}
                          onChange={(event) => setDbKeyInput(event.target.value)}
                          placeholder={t.sidebar.sqlCipherKeyPlaceholder}
                          className={cn("h-8 text-[11px]", theme === "dark" ? "border-[#3a3a3a] bg-[#232323] text-zinc-100 placeholder:text-zinc-500" : "border-slate-300 bg-white text-slate-700 placeholder:text-slate-400")}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => onApplyDatabaseKey(dbKeyInput)}
                          className={cn("h-8 px-2 text-[11px]", theme === "dark" ? "bg-white/10 text-zinc-100 hover:bg-white/20" : "bg-white text-slate-700 hover:bg-slate-100")}
                        >
                          <KeyRound className="mr-1 h-3.5 w-3.5" />
                          {t.actions.unlock}
                        </Button>
                      </div>
                    </div>
                  )}
                  {fetchingDbs && (
                    <p className={cn("text-[11px]", theme === "dark" ? "text-zinc-400" : "text-slate-500")}>{t.table.loading}</p>
                  )}
                  <div className="space-y-1">
                    {databases.map((db) => {
                      const isDbExpanded = expandedDbs.has(db.name);
                      const isDbSelected = selectedDb === db.name;
                      const dbTables = isDbSelected ? tables : [];

                      return (
                        <div key={db.name}>
                          <button
                            type="button"
                            onClick={() => {
                              if (isDbExpanded) {
                                setExpandedDbs((prev) => {
                                  const next = new Set(prev);
                                  next.delete(db.name);
                                  return next;
                                });
                                return;
                              }
                              onSelectDb(db.name);
                            }}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs",
                              isDbSelected
                                ? "bg-primary/10 text-primary"
                                : theme === "dark"
                                  ? "text-zinc-300 hover:bg-white/10"
                                  : "text-slate-700 hover:bg-slate-100"
                            )}
                          >
                            {isDbExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            <Database className="h-3.5 w-3.5" />
                            <span className="truncate font-mono text-[10px]">{db.name}</span>
                          </button>

                          {isDbExpanded && (
                            <div className={cn("ml-4 mt-1 space-y-1 border-l pl-2", theme === "dark" ? "border-white/10" : "border-slate-200")}>
                              {tablesError && isDbSelected && <p className="text-[10px] text-destructive">{t.errors.loadFailed}</p>}
                              {dbTables.map((table) => (
                                <button
                                  type="button"
                                  key={table}
                                  onClick={() => onSelectTable(table)}
                                  className={cn(
                                    "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs",
                                    selectedTable === table
                                      ? "bg-primary/10 font-semibold text-primary"
                                      : theme === "dark"
                                        ? "text-zinc-300 hover:bg-white/10"
                                        : "text-slate-700 hover:bg-slate-100"
                                  )}
                                >
                                  <TableProperties className="h-3.5 w-3.5" />
                                  <span className="truncate font-mono text-[10px]">{table}</span>
                                </button>
                              ))}
                              {isDbSelected && dbTables.length === 0 && !tablesError && (
                                <p className={cn("px-2 py-1 text-[10px]", theme === "dark" ? "text-zinc-500" : "text-slate-500")}>{t.sidebar.noTables}</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {!fetchingDbs && databases.length === 0 && (
                      <p className={cn("px-2 py-1 text-[10px]", theme === "dark" ? "text-zinc-500" : "text-slate-500")}>{t.sidebar.noDatabases}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="min-w-0 min-h-0 flex flex-col gap-3">
      {!selectedTable && (
        <Card className="border-border bg-surface backdrop-blur-xl">
          <CardContent className={cn("py-10 text-center", theme === "dark" ? "text-zinc-300" : "text-slate-600")}>{t.main.selectTableFromSidebar}</CardContent>
        </Card>
      )}

      {selectedTable && tableData && (
        <>
          <div className="rounded-xl border border-border bg-surface p-2.5 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <div ref={setFiltersLaneEl} className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                <Button
                  ref={setManageFiltersButtonEl}
                  variant="secondary"
                  onClick={() => setIsFiltersModalOpen(true)}
                  aria-label={t.toolbar.manageFilters}
                  title={t.toolbar.manageFilters}
                  className={cn("h-9 w-9 shrink-0 rounded-lg p-0", theme === "dark" ? "border border-[#3a3a3a] bg-[#262626] text-zinc-100 hover:bg-[#2d2d2d]" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100")}
                >
                  <ListFilter className="h-4 w-4" />
                </Button>

                {filters.length === 0 && (
                  <span className={cn("text-xs", theme === "dark" ? "text-zinc-400" : "text-slate-500")}>{t.toolbar.noFiltersApplied}</span>
                )}

                {filters.slice(0, visibleFilterCount).map((filter, index) => (
                  <Badge key={`${filter.column}-${filter.value}-${index}`} variant="secondary" className={cn("shrink-0 gap-1 rounded-full px-2 py-1 text-[11px]", theme === "dark" ? "bg-white/10 text-zinc-200" : "bg-slate-100 text-slate-700")}>
                    <span className="max-w-[180px] truncate">{filter.column}: {filter.value}</span>
                    <button type="button" onClick={() => onRemoveFilter(index)} className={cn("rounded-full p-0.5", theme === "dark" ? "hover:bg-white/10" : "hover:bg-slate-200")}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}

                {hiddenFiltersCount > 0 && (
                  <Badge variant="secondary" className={cn("shrink-0 rounded-full px-2 py-1 text-[11px]", theme === "dark" ? "bg-white/10 text-zinc-200" : "bg-slate-100 text-slate-700")}>
                    {hiddenFiltersChipLabel}
                  </Badge>
                )}

                {filters.length > 0 && (
                  <Button
                    ref={setClearFiltersButtonEl}
                    variant="ghost"
                    onClick={onClearFilters}
                    aria-label={t.toolbar.clearFilters}
                    title={t.toolbar.clearFilters}
                    className={cn("h-8 w-8 shrink-0 rounded-lg p-0", theme === "dark" ? "text-zinc-300 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Button onClick={onAddRowOpen} disabled={isAddingInlineRow} className="h-9 shrink-0 rounded-lg bg-indigo-500 px-3 text-xs text-white hover:bg-indigo-400 disabled:opacity-70">
                <Plus className="mr-1 h-4 w-4" />
                {t.toolbar.addNew}
              </Button>
              {pendingRowsCount > 0 && (
                <>
                  <Button onClick={onCommitPendingChanges} disabled={savingPendingRows} className="h-9 rounded-lg bg-emerald-500 px-3 text-xs text-emerald-950 hover:bg-emerald-400">
                    {savingPendingRows ? <RefreshCw className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}{t.actions.save} ({pendingRowsCount})
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirmDiscardPending(true)} disabled={savingPendingRows} className={cn("h-9 rounded-lg px-3 text-xs", theme === "dark" ? "bg-white/15 text-zinc-100 hover:bg-white/20" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}>
                    <X className="mr-1 h-4 w-4" />{t.toolbar.discard}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="sr-only">
            {filters.map((filter, index) => (
              <span
                key={`measure-${filter.column}-${filter.value}-${index}`}
                ref={(el) => {
                  filterChipMeasureRefs.current[index] = el;
                }}
                className="inline-flex rounded-full px-2 py-1 text-[11px]"
              >
                {filter.column}: {filter.value}
              </span>
            ))}
          </div>

          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border-border bg-surface backdrop-blur-xl">
            <CardHeader className={cn("border-b px-4 py-3", theme === "dark" ? "border-white/10" : "border-slate-200")}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className={cn("text-base", theme === "dark" ? "text-zinc-100" : "text-slate-900")}>{selectedTable} {t.main.tableTitleSuffix}</CardTitle>
                  <CardDescription className={cn(theme === "dark" ? "text-zinc-400" : "text-slate-600")}>{t.main.tableFocusedDescription}</CardDescription>
                </div>
                <Badge variant="secondary" className={cn("rounded-xl", theme === "dark" ? "bg-white/10 text-zinc-200" : "bg-slate-100 text-slate-700")}>{tableData.total_rows} rows</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              <div ref={setTableViewportEl} className="min-h-0 flex-1 w-full overflow-auto">
                <table className="w-max min-w-full text-left">
                  <thead className="sticky top-0 z-10">
                    <tr className={cn("border-b bg-primary/10 backdrop-blur-sm", theme === "dark" ? "border-white/15" : "border-slate-200")}>
                      {tableData.columns.map((col) => (
                        <th key={col} onClick={() => onSort(col)} className={cn("cursor-pointer whitespace-nowrap border-r px-3 py-2.5 text-[11px] tracking-[0.04em]", theme === "dark" ? "border-white/10 text-zinc-200 hover:bg-white/5" : "border-slate-200 text-slate-700 hover:bg-slate-100")}>
                          {col} {sortInfo?.column === col ? (sortInfo.direction === "ASC" ? "↑" : "↓") : ""}
                        </th>
                      ))}
                      <th className="w-14 px-3 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {isAddingInlineRow && (
                      <tr className={cn("border-b", theme === "dark" ? "border-white/10 bg-indigo-500/10" : "border-slate-200 bg-indigo-500/5")}>
                        {tableData.columns.map((col) => {
                          const columnMeta = tableSchema?.columns.find((column) => column.name === col);
                          const isAutoPk = !!(columnMeta?.primary_key && /int/i.test(columnMeta.col_type));
                          const isNumeric = !!columnMeta?.col_type.toUpperCase().includes("INT");

                          return (
                            <td key={`new-${col}`} className={cn("whitespace-nowrap border-r px-3 py-2", theme === "dark" ? "border-white/10" : "border-slate-200")}>
                              {isAutoPk ? (
                                <span className={cn("text-[10px] uppercase tracking-wide", theme === "dark" ? "text-zinc-500" : "text-slate-400")}>auto</span>
                              ) : (
                                <Input
                                  type={isNumeric ? "number" : "text"}
                                  value={newRowData[col] ?? ""}
                                  onChange={(event) => onNewRowValueChange(col, event.target.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      onAddRowSubmit();
                                    }

                                    if (event.key === "Escape") {
                                      event.preventDefault();
                                      onAddRowCancel();
                                    }
                                  }}
                                  placeholder={col}
                                  className={cn("h-8 text-xs", theme === "dark" ? "border-[#3a3a3a] bg-[#2a2a2a] text-zinc-100 placeholder:text-zinc-500" : "border-slate-300 bg-white text-slate-700 placeholder:text-slate-400")}
                                />
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={onAddRowSubmit} className="grid h-7 w-7 place-items-center rounded bg-emerald-500 text-emerald-950 hover:bg-emerald-400">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={onAddRowCancel} className={cn("grid h-7 w-7 place-items-center rounded", theme === "dark" ? "bg-[#2f2f2f] text-zinc-200 hover:bg-[#393939]" : "bg-slate-200 text-slate-700 hover:bg-slate-300")}>
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {showInitialTableLoading ? (
                      <tr><td colSpan={tableData.columns.length + 1} className="px-4 py-12 text-center text-slate-400">{t.table.loading}</td></tr>
                    ) : tableData.rows.length > 0 ? (
                      <>
                        {virtualWindow.paddingTop > 0 && (
                          <tr>
                            <td colSpan={tableData.columns.length + 1} style={{ height: virtualWindow.paddingTop }} />
                          </tr>
                        )}

                        {visibleRows.map(({ row, rowIdx }) => {
                        const rowKey = getRowKey(row, rowIdx);
                        const rowHasPendingChanges = !!pendingRowEdits[rowKey];
                        const rowIsEditing = editingCell?.row === rowIdx;

                        return (
                          <tr
                            key={rowKey}
                            className={cn(
                              "group border-b",
                              theme === "dark" ? "border-white/10 hover:bg-white/5" : "border-slate-200 hover:bg-slate-50",
                              rowHasPendingChanges && "bg-amber-300/15",
                              rowIsEditing && (theme === "dark" ? "bg-indigo-500/12" : "bg-indigo-50")
                            )}
                          >
                            {tableData.columns.map((col, colIdx) => {
                              const value = getPendingDisplayValue(row, rowIdx, col);
                              const isBoolean = isBooleanColumn(col);

                              return (
                                <td key={col} className={cn("whitespace-nowrap border-r px-3 py-2", theme === "dark" ? "border-white/10" : "border-slate-200", colIdx === 0 && (theme === "dark" ? "font-semibold text-zinc-100" : "font-semibold text-slate-900"))} onDoubleClick={() => onCellEdit(rowIdx, col, value)}>
                                  {editingCell?.row === rowIdx && editingCell?.col === col ? (
                                    <div className={cn(
                                      "flex items-center gap-1",
                                      theme === "dark" ? "text-zinc-100" : "text-slate-800"
                                    )}>
                                      <input
                                        type="text"
                                        className={cn(
                                          "min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-xs focus:outline-none",
                                          theme === "dark" ? "text-zinc-100" : "text-slate-800"
                                        )}
                                        value={editValue}
                                        onChange={(e) => onEditValueChange(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") onCellSave();
                                          if (e.key === "Escape") onCancelCellEdit();
                                        }}
                                        autoFocus
                                      />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          onCellSave();
                                        }}
                                        className={cn(
                                          "grid h-5 w-5 shrink-0 place-items-center rounded transition-colors",
                                          theme === "dark"
                                            ? "text-emerald-300 hover:bg-emerald-500/15"
                                            : "text-emerald-700 hover:bg-emerald-100"
                                        )}
                                      >
                                        <Check className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onCancelCellEdit();
                                        }}
                                        className={cn(
                                          "grid h-5 w-5 shrink-0 place-items-center rounded transition-colors",
                                          theme === "dark"
                                            ? "text-zinc-300 hover:bg-white/10"
                                            : "text-slate-600 hover:bg-slate-100"
                                        )}
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ) : isBoolean && value !== null ? (
                                    <div className="flex items-center gap-2 text-slate-200">
                                      <Checkbox checked={toBooleanState(value)} disabled />
                                      <span>{String(getValueLabel(value)).toLowerCase()}</span>
                                    </div>
                                  ) : (
                                    <span className={cn("text-xs", theme === "dark" ? "text-zinc-200" : "text-slate-700", value === null && (theme === "dark" ? "italic text-zinc-500" : "italic text-slate-400"), pendingRowEdits[rowKey]?.changes[col] !== undefined && "text-amber-300")}>{getValueLabel(value)}</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-3 py-2">
                              <button type="button" onClick={() => setConfirmDeleteRowIndex(rowIdx)} className="grid h-7 w-7 place-items-center rounded-lg text-rose-300 opacity-0 hover:bg-rose-500/20 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
                            </td>
                          </tr>
                        );
                      })}

                        {virtualWindow.paddingBottom > 0 && (
                          <tr>
                            <td colSpan={tableData.columns.length + 1} style={{ height: virtualWindow.paddingBottom }} />
                          </tr>
                        )}
                      </>
                    ) : (
                      <tr><td colSpan={tableData.columns.length + 1} className="px-4 py-12 text-center text-slate-400">{t.table.noData}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {tableData.rows.length > 0 && (
                <div className={cn("flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2", theme === "dark" ? "border-[#3a3a3a] bg-[#1d1d1d]" : "border-slate-200 bg-slate-50")}>
                  <span className={cn("text-[11px]", theme === "dark" ? "text-zinc-400" : "text-slate-600")}>{(page - 1) * pageSize + 1} - {Math.min(page * pageSize, tableData.total_rows)} {t.table.of} {tableData.total_rows.toLocaleString()}</span>
                  <div className="flex items-center gap-2">
                    <div className={cn("flex items-center gap-1 rounded-xl border px-2 py-1", theme === "dark" ? "border-[#3a3a3a] bg-[#262626]" : "border-slate-200 bg-white")}>
                      <Layers className={cn("h-3.5 w-3.5", theme === "dark" ? "text-zinc-400" : "text-slate-500")} />
                      <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
                        <SelectTrigger className={cn("h-7 w-[78px] border-none bg-transparent text-xs", theme === "dark" ? "text-zinc-100" : "text-slate-700")}><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" size="sm" onClick={onPrevPage} disabled={page <= 1} className={cn("h-8 rounded-lg", theme === "dark" ? "border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100")}>{t.table.prev}</Button>
                    <Button variant="outline" size="sm" onClick={onNextPage} disabled={page >= Math.ceil(tableData.total_rows / pageSize)} className={cn("h-8 rounded-lg", theme === "dark" ? "border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100")}>{t.table.next}</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
        </div>
      </div>

      <Dialog open={confirmDeleteRowIndex !== null} onOpenChange={(open) => !open && setConfirmDeleteRowIndex(null)}>
        <DialogContent className={cn(theme === "dark" ? "border-[#3a3a3a] bg-[#1f1f1f] text-zinc-100" : "bg-white text-slate-900")}>
          <DialogHeader>
            <DialogTitle>{t.dialog.confirmDeleteRowTitle}</DialogTitle>
            <DialogDescription className={cn(theme === "dark" ? "text-zinc-400" : "text-slate-600")}>
              {t.dialog.confirmDeleteRowDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmDeleteRowIndex(null)}>
              {t.dialog.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDeleteRowIndex !== null) {
                  onDeleteRow(confirmDeleteRowIndex);
                }
                setConfirmDeleteRowIndex(null);
              }}
            >
              {t.actions.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDiagramOpen} onOpenChange={setIsDiagramOpen}>
        <DialogContent className={cn("max-w-[92vw] p-4", theme === "dark" ? "border-[#3a3a3a] bg-[#1a1a1a] text-zinc-100" : "bg-white text-slate-900")}>
          <DialogHeader className="pb-2">
            <DialogTitle>{t.toolbar.viewDiagram}</DialogTitle>
            <DialogDescription className={cn(theme === "dark" ? "text-zinc-400" : "text-slate-600")}>
              {t.toolbar.viewDiagramDescription}
            </DialogDescription>
          </DialogHeader>
          {diagramLoading ? (
            <div className={cn("grid h-[72vh] place-items-center rounded-xl border text-sm", theme === "dark" ? "border-white/10 text-zinc-400" : "border-slate-200 text-slate-500")}>
              {t.table.loading}
            </div>
          ) : (
            <DatabaseSchemaDiagram theme={theme} schemas={diagramSchemas} emptyLabel={t.toolbar.noDiagramData} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isFiltersModalOpen} onOpenChange={setIsFiltersModalOpen}>
        <DialogContent className={cn(theme === "dark" ? "border-[#3a3a3a] bg-[#1f1f1f] text-zinc-100" : "bg-white text-slate-900")}>
          <DialogHeader>
            <DialogTitle>{t.toolbar.manageFilters}</DialogTitle>
            <DialogDescription className={cn(theme === "dark" ? "text-zinc-400" : "text-slate-600")}>
              {t.toolbar.manageFiltersDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Select value={newFilterColumn || "__all__"} onValueChange={(value) => setNewFilterColumn(value === "__all__" ? "" : value)}>
                <SelectTrigger className={cn("h-9 w-[180px] shrink-0 text-xs", theme === "dark" ? "border-[#3a3a3a] bg-[#2a2a2a] text-zinc-100" : "border-slate-300 bg-white text-slate-700")}>
                  <SelectValue placeholder={t.toolbar.allColumns} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t.toolbar.allColumns}</SelectItem>
                  {tableData?.columns.map((col) => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className={cn("h-9 min-w-0 flex-1 text-xs", theme === "dark" ? "border-[#3a3a3a] bg-[#2a2a2a] text-zinc-100 placeholder:text-zinc-500" : "border-slate-300 bg-white text-slate-700 placeholder:text-slate-400")}
                placeholder={t.toolbar.filterValuePlaceholder}
                value={newFilterValue}
                onChange={(e) => setNewFilterValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  if (!newFilterValue.trim()) return;
                  onAddFilter({
                    column: newFilterColumn || tableData?.columns[0] || "id",
                    value: newFilterValue.trim(),
                  });
                  setNewFilterValue("");
                }}
              />
              <Button
                type="button"
                onClick={() => {
                  if (!newFilterValue.trim()) return;
                  onAddFilter({
                    column: newFilterColumn || tableData?.columns[0] || "id",
                    value: newFilterValue.trim(),
                  });
                  setNewFilterValue("");
                }}
                className="h-9 shrink-0 rounded-lg"
              >
                {t.toolbar.addFilterRule}
              </Button>
            </div>

            <div className={cn("max-h-44 space-y-2 overflow-auto rounded-xl border p-2", theme === "dark" ? "border-white/10" : "border-slate-200")}>
              {filters.length === 0 && (
                <p className={cn("px-1 py-2 text-xs", theme === "dark" ? "text-zinc-500" : "text-slate-500")}>{t.toolbar.noFiltersApplied}</p>
              )}
              {filters.map((filter, index) => (
                <div key={`${filter.column}-${filter.value}-${index}`} className={cn("flex items-center justify-between rounded-lg px-2 py-1.5 text-xs", theme === "dark" ? "bg-white/5 text-zinc-200" : "bg-slate-50 text-slate-700")}>
                  <span className="truncate">{filter.column}: {filter.value}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => onRemoveFilter(index)} className={cn("h-7 px-2", theme === "dark" ? "text-zinc-300 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100")}>
                    {t.actions.delete}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={onClearFilters} disabled={filters.length === 0}>
              {t.toolbar.clearFilters}
            </Button>
            <Button onClick={() => setIsFiltersModalOpen(false)}>
              {t.dialog.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDiscardPending} onOpenChange={setConfirmDiscardPending}>
        <DialogContent className={cn(theme === "dark" ? "border-[#3a3a3a] bg-[#1f1f1f] text-zinc-100" : "bg-white text-slate-900")}>
          <DialogHeader>
            <DialogTitle>{t.dialog.confirmDiscardChangesTitle}</DialogTitle>
            <DialogDescription className={cn(theme === "dark" ? "text-zinc-400" : "text-slate-600")}>
              {t.dialog.confirmDiscardChangesDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmDiscardPending(false)}>
              {t.dialog.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onClearPendingChanges();
                setConfirmDiscardPending(false);
              }}
            >
              {t.toolbar.discard}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
