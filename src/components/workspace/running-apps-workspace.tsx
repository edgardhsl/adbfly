"use client";

import { useState } from "react";
import { RefreshCw, StopCircle, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { RunningApp, Theme } from "@/lib/types";
import type { TranslationKeys } from "@/lib/i18n";

type RunningAppsWorkspaceProps = {
  theme: Theme;
  t: TranslationKeys;
  deviceId: string;
  runningApps: RunningApp[];
  loading: boolean;
  onRefresh: () => void;
  onForceStop: (packageName: string) => Promise<void>;
};

function formatRam(kb: number): string {
  if (kb >= 1024 * 1024) {
    return `${(kb / 1024 / 1024).toFixed(1)} GB`;
  }
  return `${(kb / 1024).toFixed(0)} MB`;
}

export function RunningAppsWorkspace({
  theme,
  t,
  deviceId,
  runningApps,
  loading,
  onRefresh,
  onForceStop,
}: RunningAppsWorkspaceProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "user" | "system">("all");
  const [stoppingPkgs, setStoppingPkgs] = useState<Set<string>>(new Set());

  const filteredApps = runningApps.filter((app) => {
    const matchesSearch =
      search === "" ||
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.package_name.toLowerCase().includes(search.toLowerCase());

    return matchesSearch;
  });

  const handleForceStop = async (packageName: string) => {
    setStoppingPkgs((prev) => new Set(prev).add(packageName));
    try {
      await onForceStop(packageName);
      toast.success(t.actions.forceStopped || "App stopped");
    } catch (err) {
      toast.error(t.errors.deleteFailed || "Failed to stop app");
    } finally {
      setStoppingPkgs((prev) => {
        const next = new Set(prev);
        next.delete(packageName);
        return next;
      });
    }
  };

  return (
    <div
      data-testid="running-apps-workspace"
      className={cn(
        "flex h-full min-h-0 flex-col",
        theme === "dark" ? "bg-[#1a1a1a]" : "bg-slate-50"
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-3 border-b px-5 py-4",
          theme === "dark"
            ? "border-[#303030]/70 bg-[#1f1f1f]/50"
            : "border-slate-200 bg-white"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2
              className={cn(
                "text-lg font-semibold",
                theme === "dark" ? "text-slate-100" : "text-slate-900"
              )}
            >
              {t.navigation.runningApps}
            </h2>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                theme === "dark"
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "bg-indigo-100 text-indigo-700"
              )}
            >
              {filteredApps.length}
            </span>
          </div>
          <Button
            data-testid="refresh-running-apps"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className={cn(
              "gap-2",
              theme === "dark"
                ? "border-[#303030] hover:bg-[#2a2a2a]"
                : "hover:bg-slate-100"
            )}
          >
            <RefreshCw
              className={cn("h-4 w-4", loading && "animate-spin")}
            />
            {t.actions.refresh}
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className={cn(
                "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              )}
            />
            <Input
              data-testid="running-apps-search"
              placeholder={t.actions.search || "Search..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "pl-9",
                theme === "dark"
                  ? "border-[#303030] bg-[#252525] text-slate-200 placeholder:text-slate-500"
                  : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
              )}
            />
          </div>
          <Select
            value={filterType}
            onValueChange={(v) => setFilterType(v as "all" | "user" | "system")}
          >
            <SelectTrigger
              data-testid="running-apps-filter"
              className={cn(
                "w-[140px]",
                theme === "dark"
                  ? "border-[#303030] bg-[#252525] text-slate-200"
                  : "border-slate-200 bg-white"
              )}
            >
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className={theme === "dark" ? "bg-[#252525] border-[#303030]" : "bg-white"}
            >
              <SelectItem
                value="all"
                className={theme === "dark" ? "text-slate-200" : ""}
              >
                All
              </SelectItem>
              <SelectItem
                value="user"
                className={theme === "dark" ? "text-slate-200" : ""}
              >
                User
              </SelectItem>
              <SelectItem
                value="system"
                className={theme === "dark" ? "text-slate-200" : ""}
              >
                System
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {loading && runningApps.length === 0 ? (
            <div
              className={cn(
                "flex h-32 items-center justify-center text-sm",
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              )}
            >
              Loading...
            </div>
          ) : filteredApps.length === 0 ? (
            <div
              className={cn(
                "flex h-32 items-center justify-center text-sm",
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              )}
            >
              No apps found
            </div>
          ) : (
            <div className="space-y-1">
              <div
                data-testid="running-apps-header"
                className={cn(
                  "grid gap-2 rounded-lg px-3 py-2 text-xs font-medium uppercase",
                  theme === "dark"
                    ? "bg-[#252525] text-slate-400"
                    : "bg-slate-100 text-slate-500"
                )}
                style={{
                  gridTemplateColumns: "1fr 80px 100px 80px 80px",
                }}
              >
                <span>App</span>
                <span>PID</span>
                <span>RAM</span>
                <span>CPU</span>
                <span></span>
              </div>

              {filteredApps.map((app) => (
                <div
                  data-testid="running-app-row"
                  key={app.pid}
                  className={cn(
                    "group grid items-center gap-2 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-100/50",
                    theme === "dark"
                      ? "hover:bg-[#252525]/80"
                      : "hover:bg-slate-100"
                  )}
                  style={{
                    gridTemplateColumns: "1fr 80px 100px 80px 80px",
                  }}
                >
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "truncate font-medium",
                        theme === "dark" ? "text-slate-200" : "text-slate-900"
                      )}
                    >
                      {app.name}
                    </div>
                    <div
                      className={cn(
                        "truncate text-xs",
                        theme === "dark" ? "text-slate-500" : "text-slate-500"
                      )}
                    >
                      {app.package_name}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "font-mono text-sm",
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    )}
                  >
                    {app.pid}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-sm",
                      theme === "dark" ? "text-amber-400" : "text-amber-600"
                    )}
                  >
                    {formatRam(app.ram_kb)}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-sm",
                      app.cpu_percent > 5
                        ? theme === "dark"
                          ? "text-red-400"
                          : "text-red-600"
                        : theme === "dark"
                          ? "text-emerald-400"
                          : "text-emerald-600"
                    )}
                  >
                    {app.cpu_percent.toFixed(1)}%
                  </span>
                  <Button
                    data-testid="stop-app-button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleForceStop(app.package_name)}
                    disabled={stoppingPkgs.has(app.package_name)}
                    className={cn(
                      "h-7 gap-1 opacity-0 transition-opacity group-hover:opacity-100",
                      theme === "dark"
                        ? "hover:bg-red-500/20 hover:text-red-400"
                        : "hover:bg-red-50 hover:text-red-600"
                    )}
                  >
                    <StopCircle className="h-3.5 w-3.5" />
                    {stoppingPkgs.has(app.package_name) ? "..." : t.actions.stop || "Stop"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}