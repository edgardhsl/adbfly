import {
  ChevronRight,
  RefreshCcw,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { TranslationKeys } from "@/lib/i18n";
import type { Device, Package, Theme } from "@/lib/types";
import type { NavigationGroup, WorkspaceView } from "@/lib/workspace-navigation";

type WorkspaceSidebarProps = {
  theme: Theme;
  t: TranslationKeys;
  selectedDevice: string | null;
  currentDevice?: Device;
  selectedPackage: string | null;
  hasSelectedDevice: boolean;
  packageSearch: string;
  onPackageSearchChange: (value: string) => void;
  navGroups: NavigationGroup[];
  workspaceView: WorkspaceView;
  onWorkspaceViewChange: (view: WorkspaceView) => void;
  devices: Device[];
  filteredPackages: Package[];
  fetchingPackages: boolean;
  packagesError: boolean;
  onRetryPackages: () => void;
  onSelectDevice: (deviceId: string) => void;
  onSelectPackage: (pkg: string) => void;
  onRefreshDevices: () => void;
  loadingDevices: boolean;
};

export function WorkspaceSidebar({
  theme,
  t,
  selectedDevice,
  currentDevice,
  selectedPackage,
  hasSelectedDevice,
  packageSearch,
  onPackageSearchChange,
  navGroups,
  workspaceView,
  onWorkspaceViewChange,
  devices,
  filteredPackages,
  fetchingPackages,
  packagesError,
  onRetryPackages,
  onSelectDevice,
  onSelectPackage,
  onRefreshDevices,
  loadingDevices,
}: WorkspaceSidebarProps) {
  const hasDeviceSelected = !!selectedDevice;

  return (
    <aside
      className={cn(
        "relative z-20 flex h-full min-h-0 flex-col overflow-x-hidden border-r p-4 xl:p-5 backdrop-blur-[2px]",
        theme === "dark"
          ? "border-[#303030]/70 bg-[#1a1a1a]/68 backdrop-blur-lg"
          : "border-slate-300/85 bg-white/95"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white shadow-lg dark:border dark:border-indigo-300/30 dark:bg-indigo-500/25 dark:text-indigo-100">
          <img src="/images/logo.png" alt="ADB Fly" className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">ADB Fly</h1>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Android workstation</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{selectedDevice ?? t.sidebar.noDeviceSelected}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{currentDevice?.model ?? t.sidebar.connectDeviceShort}</p>
          </div>
          <span className={cn("mt-1 h-3 w-3 rounded-full", currentDevice ? "bg-[#4ade80] shadow-[0_0_0_4px_rgba(74,222,128,0.14)]" : "bg-slate-400/80")} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge
            variant="secondary"
            className={cn(
              "rounded-xl text-[11px]",
              theme === "dark"
                ? "border-[#3a3a3a] bg-[#232323] text-zinc-100 hover:bg-[#2a2a2a]"
                : "bg-slate-100 text-slate-600"
            )}
          >
            Android {currentDevice ? "15" : "-"}
          </Badge>
          <Badge
            variant="secondary"
            className={cn(
              "rounded-xl text-[11px]",
              theme === "dark"
                ? "border-[#3a3a3a] bg-[#232323] text-zinc-100 hover:bg-[#2a2a2a]"
                : "bg-slate-100 text-slate-600"
            )}
          >
            USB debugging {currentDevice ? "on" : "off"}
          </Badge>
        </div>
      </div>

      <ScrollArea className="mt-4 min-h-0 flex-1 pr-2 [&_[data-radix-scroll-area-viewport]]:overflow-x-hidden">
        <div className="space-y-5 pb-4">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{t.sidebar.devices}</p>
            <Select
              value={selectedDevice ?? ""}
              onValueChange={onSelectDevice}
              disabled={devices.length === 0}
            >
              <SelectTrigger
                className={cn(
                  "h-10 w-full max-w-full min-w-0 rounded-2xl text-xs focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 [&>span]:block [&>span]:max-w-[calc(100%-1.5rem)] [&>span]:overflow-hidden [&>span]:text-ellipsis [&>span]:whitespace-nowrap",
                  theme === "dark"
                    ? "border-[#3a3a3a] bg-[#1f1f1f] text-zinc-100"
                    : "border-slate-300/80 bg-white/70 text-slate-700"
                )}
              >
                <SelectValue placeholder={t.sidebar.selectDevicePlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {devices.length === 0 && (
                  <div className="px-2 py-2 text-sm text-muted-foreground">{t.sidebar.noDevices}</div>
                )}
                {devices.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-slate-300/70 dark:bg-slate-700/80" />

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{t.sidebar.selectedApp}</p>
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className={cn(
                  "h-10 rounded-2xl pl-10 text-xs focus-visible:border-primary focus-visible:ring-0",
                  theme === "dark"
                    ? "border-[#3a3a3a] bg-[#1f1f1f] text-zinc-100 placeholder:text-zinc-500"
                    : "border-slate-300/80 bg-white/70"
                )}
                placeholder={hasSelectedDevice ? t.sidebar.searchApps : t.sidebar.searchNeedDevice}
                value={packageSearch}
                onChange={(e) => onPackageSearchChange(e.target.value)}
                disabled={!hasSelectedDevice}
              />
            </div>

            {!hasDeviceSelected && (
              <div className="rounded-xl border border-slate-300/70 bg-white/70 p-3 text-[10px] text-slate-600 dark:border-[#3a3a3a] dark:bg-[#232323]/75 dark:text-zinc-300">
                {t.sidebar.searchNeedDevice}
              </div>
            )}

            {hasDeviceSelected && (
              <div className="space-y-1">
                <Select
                  value={selectedPackage ?? ""}
                  onValueChange={onSelectPackage}
                  disabled={filteredPackages.length === 0}
                >
                  <SelectTrigger
                    className={cn(
                      "h-10 w-full max-w-full min-w-0 rounded-2xl text-xs focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 [&>span]:block [&>span]:max-w-[calc(100%-1.5rem)] [&>span]:overflow-hidden [&>span]:text-ellipsis [&>span]:whitespace-nowrap",
                      theme === "dark"
                        ? "border-[#3a3a3a] bg-[#1f1f1f] text-zinc-100"
                        : "border-slate-300/80 bg-white/70 text-slate-700"
                    )}
                  >
                    <SelectValue placeholder={t.sidebar.selectAppPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPackages.length === 0 && (
                      <div className="px-2 py-2 text-sm text-muted-foreground">
                        {packageSearch.trim() ? t.table.noData : t.sidebar.noPackageSelected}
                      </div>
                    )}
                    {filteredPackages.slice(0, 150).map((pkg) => (
                      <SelectItem key={pkg.name} value={pkg.name}>
                        {pkg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {packagesError && !fetchingPackages && (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-2 text-[10px] text-destructive">
                    <span>{t.errors.loadFailed}</span>
                    <Button type="button" variant="outline" className="h-6 px-2 text-[10px]" onClick={onRetryPackages}>
                      {t.actions.retry}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator className="bg-slate-300/70 dark:bg-slate-700/80" />

          {navGroups.map((section) => (
            <div key={section.label}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{section.label}</p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isItemActive = item.kind === "view" && item.view === workspaceView;
                  const isEnabled = item.enabled;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.kind !== "view" || !isEnabled) return;
                        onWorkspaceViewChange(item.view);
                      }}
                      disabled={!isEnabled}
                      className={cn(
                        "flex w-full min-w-0 items-start gap-2 overflow-hidden rounded-xl px-2.5 py-2 text-left text-xs transition-colors",
                        isItemActive
                          ? "bg-primary/10 text-primary dark:bg-indigo-400/20 dark:text-indigo-100"
                          : "text-slate-600 hover:bg-slate-900/5 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-[#262626]",
                        !isEnabled && "cursor-not-allowed opacity-65 hover:bg-transparent hover:text-slate-500 dark:hover:text-slate-400"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.label}</p>
                        {item.helper && (
                          <p className="mt-0.5 whitespace-normal break-words text-[10px] leading-snug text-slate-500 dark:text-slate-400">
                            {item.helper}
                          </p>
                        )}
                      </div>
                      {isEnabled ? (
                        <ChevronRight className="ml-auto mt-0.5 h-4 w-4 shrink-0 opacity-50" />
                      ) : (
                        <Badge variant="secondary" className="ml-auto mt-0.5 shrink-0 rounded-full border border-slate-300/60 bg-transparent px-2 py-0 text-[10px] text-slate-500 dark:border-[#3a3a3a] dark:text-zinc-300">
                          {(item.kind === "action" ? item.blockedLabel : undefined) ?? t.actions.locked}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="shrink-0 pb-1 pt-3">
        <Button onClick={onRefreshDevices} className="h-11 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-900 dark:bg-indigo-500/80 dark:hover:bg-indigo-500">
          <RefreshCcw className={cn("mr-2 h-4 w-4", loadingDevices && "animate-spin")} />
          {t.sidebar.refreshAdb}
        </Button>
      </div>
    </aside>
  );
}
