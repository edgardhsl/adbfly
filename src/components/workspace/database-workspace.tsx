import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Database, Layers, PanelLeftClose, PanelLeftOpen, Plus, RefreshCw, Search, TableProperties, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TranslationKeys } from "@/lib/i18n";
import type { DatabaseInfo, TableData, TableSchema } from "@/lib/types";
import { cn, getValueLabel } from "@/lib/utils";
import type { Theme } from "@/lib/types";
import type { Dispatch, SetStateAction } from "react";

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
  expandedDbs: Set<string>;
  setExpandedDbs: Dispatch<SetStateAction<Set<string>>>;
  onSelectDb: (db: string) => void;
  onSelectTable: (table: string) => void;
  selectedTable: string | null;
  tableData: TableData | null | undefined;
  tableSchema: TableSchema | null | undefined;
  filterColumn: string;
  onFilterColumnChange: (value: string) => void;
  filterInput: string;
  onFilterInputChange: (value: string) => void;
  onApplyFilter: () => void;
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
  expandedDbs,
  setExpandedDbs,
  onSelectDb,
  onSelectTable,
  selectedTable,
  tableData,
  tableSchema,
  filterColumn,
  onFilterColumnChange,
  filterInput,
  onFilterInputChange,
  onApplyFilter,
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
    <div className="space-y-4">
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
      </div>

      <div className={cn("grid gap-4", isSchemaSidebarCollapsed ? "grid-cols-1" : "grid-cols-[280px_minmax(0,1fr)]")}>
        {!isSchemaSidebarCollapsed && (
          <Card className="overflow-hidden border-border bg-surface backdrop-blur-xl">
            <CardHeader className="space-y-1 border-b border-border">
              <CardTitle className={cn("text-sm", theme === "dark" ? "text-zinc-100" : "text-slate-900")}>{t.sidebar.schemaExplorer}</CardTitle>
              <CardDescription className={cn("text-xs", theme === "dark" ? "text-zinc-400" : "text-slate-600")}>{t.sidebar.schemaExplorerDescription}</CardDescription>
            </CardHeader>
            <CardContent className="p-3">
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

        <div className="min-w-0 space-y-4">
      {!selectedTable && (
        <Card className="border-border bg-surface backdrop-blur-xl">
          <CardContent className={cn("py-12 text-center", theme === "dark" ? "text-zinc-300" : "text-slate-600")}>{t.main.selectTableFromSidebar}</CardContent>
        </Card>
      )}

      {selectedTable && tableData && (
        <>
          <div className="rounded-2xl border border-border bg-surface p-3 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-3">
              <div
                className={cn(
                  "flex min-w-[320px] flex-1 flex-wrap items-center gap-2 rounded-xl border px-2 py-2",
                  theme === "dark"
                    ? "border-[#3a3a3a] bg-[#1f1f1f]"
                    : "border-slate-300/70 bg-white/70"
                )}
              >
                <Search className="ml-1 h-4 w-4 text-slate-400" />
                <Select value={filterColumn || "__all__"} onValueChange={(value) => onFilterColumnChange(value === "__all__" ? "" : value)}>
                  <SelectTrigger className={cn("h-8 w-[170px] text-xs", theme === "dark" ? "border-[#3a3a3a] bg-[#2a2a2a] text-zinc-100" : "border-slate-300 bg-white text-slate-700")}>
                    <SelectValue placeholder={t.toolbar.allColumns} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t.toolbar.allColumns}</SelectItem>
                    {tableData.columns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className={cn("h-8 min-w-[220px] flex-1 text-xs", theme === "dark" ? "border-[#3a3a3a] bg-[#2a2a2a] text-zinc-100 placeholder:text-zinc-500" : "border-slate-300 bg-white text-slate-700 placeholder:text-slate-400")}
                  placeholder={t.toolbar.filterPlaceholder}
                  value={filterInput}
                  onChange={(e) => onFilterInputChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onApplyFilter()}
                />
              </div>

              <Button variant="secondary" onClick={onApplyFilter} className="h-10 rounded-xl bg-white/90 text-slate-900 hover:bg-white dark:border dark:border-[#3a3a3a] dark:bg-[#262626] dark:text-zinc-100 dark:hover:bg-[#2d2d2d]">
                {t.toolbar.applyFilters}
              </Button>
              <Button onClick={onAddRowOpen} disabled={isAddingInlineRow} className="h-10 rounded-xl bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-70">
                <Plus className="mr-1 h-4 w-4" />
                {t.toolbar.addRow}
              </Button>

              {pendingRowsCount > 0 && (
                <>
                  <Button onClick={onCommitPendingChanges} disabled={savingPendingRows} className="h-10 rounded-xl bg-emerald-500 text-emerald-950 hover:bg-emerald-400">
                    {savingPendingRows ? <RefreshCw className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}{t.actions.save} ({pendingRowsCount})
                  </Button>
                  <Button variant="secondary" onClick={() => setConfirmDiscardPending(true)} disabled={savingPendingRows} className={cn("h-10 rounded-xl", theme === "dark" ? "bg-white/15 text-zinc-100 hover:bg-white/20" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}>
                    <X className="mr-1 h-4 w-4" />{t.toolbar.discard}
                  </Button>
                </>
              )}
            </div>
          </div>

          <Card className="overflow-hidden rounded-3xl border-border bg-surface backdrop-blur-xl">
            <CardHeader className={cn("border-b", theme === "dark" ? "border-white/10" : "border-slate-200")}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className={cn(theme === "dark" ? "text-zinc-100" : "text-slate-900")}>{selectedTable} {t.main.tableTitleSuffix}</CardTitle>
                  <CardDescription className={cn(theme === "dark" ? "text-zinc-400" : "text-slate-600")}>{t.main.tableFocusedDescription}</CardDescription>
                </div>
                <Badge variant="secondary" className={cn("rounded-xl", theme === "dark" ? "bg-white/10 text-zinc-200" : "bg-slate-100 text-slate-700")}>{tableData.total_rows} rows</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="w-full">
                <table className="w-max min-w-full text-left">
                  <thead>
                    <tr className={cn("border-b bg-primary/10", theme === "dark" ? "border-white/15" : "border-slate-200")}>
                      {tableData.columns.map((col) => (
                        <th key={col} onClick={() => onSort(col)} className={cn("cursor-pointer whitespace-nowrap border-r px-4 py-3 text-[11px] uppercase tracking-[0.16em]", theme === "dark" ? "border-white/10 text-zinc-200 hover:bg-white/5" : "border-slate-200 text-slate-700 hover:bg-slate-100")}>
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
                      tableData.rows.map((row, rowIdx) => {
                        const rowKey = getRowKey(row, rowIdx);
                        const rowHasPendingChanges = !!pendingRowEdits[rowKey];

                        return (
                          <tr key={rowKey} className={cn("group border-b", theme === "dark" ? "border-white/10 hover:bg-white/5" : "border-slate-200 hover:bg-slate-50", rowHasPendingChanges && "bg-amber-300/15")}>
                            {tableData.columns.map((col, colIdx) => {
                              const value = getPendingDisplayValue(row, rowIdx, col);
                              const isBoolean = isBooleanColumn(col);

                              return (
                                <td key={col} className={cn("whitespace-nowrap border-r px-4 py-2.5", theme === "dark" ? "border-white/10" : "border-slate-200", colIdx === 0 && (theme === "dark" ? "font-semibold text-zinc-100" : "font-semibold text-slate-900"))} onDoubleClick={() => onCellEdit(rowIdx, col, value)}>
                                  {editingCell?.row === rowIdx && editingCell?.col === col ? (
                                    <div className="flex items-center gap-1 rounded-lg border border-indigo-400/70 bg-slate-950/80 p-1">
                                      <input
                                        type="text"
                                        className="flex-1 border-none bg-transparent px-2 py-1 text-xs text-slate-100 focus:outline-none"
                                        value={editValue}
                                        onChange={(e) => onEditValueChange(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") onCellSave();
                                          if (e.key === "Escape") onCancelCellEdit();
                                        }}
                                        autoFocus
                                      />
                                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCellSave(); }} className="grid h-6 w-6 place-items-center rounded bg-indigo-500 text-white"><Check className="h-3 w-3" /></button>
                                      <button type="button" onClick={(e) => { e.stopPropagation(); onCancelCellEdit(); }} className="grid h-6 w-6 place-items-center rounded bg-slate-700 text-slate-100"><X className="h-3 w-3" /></button>
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
                      })
                    ) : (
                      <tr><td colSpan={tableData.columns.length + 1} className="px-4 py-12 text-center text-slate-400">{t.table.noData}</td></tr>
                    )}
                  </tbody>
                </table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              {tableData.rows.length > 0 && (
                <div className={cn("flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3", theme === "dark" ? "border-[#3a3a3a] bg-[#1d1d1d]" : "border-slate-200 bg-slate-50")}>
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
