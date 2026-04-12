import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import type { TranslationKeys } from "@/lib/i18n";
import type { DeviceOverview, Theme } from "@/lib/types";
import type { UsageHistoryPoint } from "@/lib/workspace-navigation";
import { Cpu, HardDrive, MemoryStick, Smartphone } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

type OverviewSectionProps = {
  theme: Theme;
  t: TranslationKeys;
  canOpenOverview: boolean;
  usageHistory: UsageHistoryPoint[];
  resourceChartConfig: ChartConfig;
  deviceOverview: DeviceOverview | null;
  overviewError: boolean;
  onRetryOverview: () => void;
};

const CONTEXTS = ["preferences", "remote_config", "device_info"];

export function OverviewSection({
  theme,
  t,
  canOpenOverview,
  usageHistory,
  resourceChartConfig,
  deviceOverview,
  overviewError,
  onRetryOverview,
}: OverviewSectionProps) {
  const formatStorage = () => {
    if (!deviceOverview || deviceOverview.storage_total_gb <= 0) return "--";
    return `${deviceOverview.storage_used_gb.toFixed(1)} / ${deviceOverview.storage_total_gb.toFixed(1)} GB`;
  };

  const formatRam = () => {
    if (!deviceOverview || deviceOverview.total_ram_mb <= 0) return "--";
    const totalGb = deviceOverview.total_ram_mb / 1024;
    return `${totalGb.toFixed(1)} GB`;
  };

  const stats = canOpenOverview
    ? [
        { label: "Android", value: deviceOverview?.android_version || "--", icon: Smartphone },
        { label: "CPU / ABI", value: deviceOverview?.cpu_abi || "--", icon: Cpu },
        { label: "RAM", value: formatRam(), icon: MemoryStick },
        { label: "Storage", value: formatStorage(), icon: HardDrive },
      ]
    : [
        { label: "Android", value: "--", icon: Smartphone },
        { label: "CPU / ABI", value: "--", icon: Cpu },
        { label: "RAM", value: "--", icon: MemoryStick },
        { label: "Storage", value: "--", icon: HardDrive },
      ];

  return (
    <div className={cn("space-y-4", !canOpenOverview && "relative")}>
      {!canOpenOverview && (
        <p className={cn("text-xs", theme === "dark" ? "text-zinc-400" : "text-slate-500")}>
          {t.main.overviewPreviewHint}
        </p>
      )}

      <div className={cn("grid gap-4 xl:grid-cols-[1.25fr_0.75fr]", !canOpenOverview && "pointer-events-none opacity-60")}>
        <Card className="border-border bg-surface backdrop-blur-xl">
          <CardHeader>
            <CardTitle className={cn(theme === "dark" ? "text-zinc-100" : "text-slate-900")}>
              {t.main.workspaceOverviewTitle}
            </CardTitle>
            <CardDescription className={cn(theme === "dark" ? "text-zinc-400" : "text-slate-600")}>
              {t.main.workspaceOverviewSubtitle}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl border border-border bg-surface-container-low p-3">
                  <div className={cn("flex items-center justify-between text-xs", theme === "dark" ? "text-zinc-300" : "text-slate-600")}>
                    <span>{stat.label}</span>
                    <Icon className={cn("h-4 w-4", theme === "dark" ? "text-primary" : "text-indigo-600")} />
                  </div>
                  <p className={cn("mt-3 text-xs font-semibold", theme === "dark" ? "text-zinc-100" : "text-slate-900")}>
                    {stat.value}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border bg-surface backdrop-blur-xl">
          <CardHeader>
            <CardTitle className={cn(theme === "dark" ? "text-zinc-100" : "text-slate-900")}>
              {t.main.openContextsTitle}
            </CardTitle>
            <CardDescription className={cn(theme === "dark" ? "text-zinc-400" : "text-slate-600")}>
              {t.main.openContextsSubtitle}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {CONTEXTS.map((context) => (
              <Badge key={context} variant="secondary" className="mr-2 rounded-xl border border-border bg-surface-container-low text-on-surface-variant">
                {context}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className={cn("border-border bg-surface backdrop-blur-xl", !canOpenOverview && "pointer-events-none opacity-60")}>
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-zinc-100">{t.main.resourceHistoryTitle}</CardTitle>
          <CardDescription className="text-slate-600 dark:text-zinc-400">{t.main.resourceHistorySubtitle}</CardDescription>
          {canOpenOverview && overviewError && (
            <div className="flex items-center gap-2 pt-1">
              <p className="text-[11px] text-destructive">{t.errors.loadFailed}</p>
              <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={onRetryOverview}>
                {t.actions.retry}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface-container-low p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-700 dark:text-zinc-200">{t.main.cpuUsage}</p>
              {canOpenOverview && usageHistory.length > 0 && (
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">{usageHistory[usageHistory.length - 1].cpu}%</span>
              )}
            </div>
            <ChartContainer config={resourceChartConfig} className="h-[220px] min-h-[200px]">
              <AreaChart data={usageHistory} margin={canOpenOverview ? { left: 8, right: 10, top: 4, bottom: 4 } : { left: 8, right: 6, top: 2, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.25} />
                <XAxis
                  dataKey="time"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  tickFormatter={(value) => value.replace("T-", "-")}
                  tick={canOpenOverview ? { fill: theme === "dark" ? "#a3a3a3" : "#64748b", fontSize: 10 } : false}
                />
                <YAxis
                  width={canOpenOverview ? 42 : 0}
                  hide={!canOpenOverview}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fill: theme === "dark" ? "#a3a3a3" : "#64748b", fontSize: 10 }}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="cpu" stroke="var(--color-cpu)" fill="var(--color-cpu)" fillOpacity={0.16} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
            {canOpenOverview && usageHistory.length === 0 && (
              <p className="mt-1 text-[10px] text-slate-500 dark:text-zinc-400">{t.table.loading}</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface-container-low p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-700 dark:text-zinc-200">{t.main.memoryUsage}</p>
              {canOpenOverview && usageHistory.length > 0 && (
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">{usageHistory[usageHistory.length - 1].memory}%</span>
              )}
            </div>
            <ChartContainer config={resourceChartConfig} className="h-[220px] min-h-[200px]">
              <AreaChart data={usageHistory} margin={canOpenOverview ? { left: 8, right: 10, top: 4, bottom: 4 } : { left: 8, right: 6, top: 2, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.25} />
                <XAxis
                  dataKey="time"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  tickFormatter={(value) => value.replace("T-", "-")}
                  tick={canOpenOverview ? { fill: theme === "dark" ? "#a3a3a3" : "#64748b", fontSize: 10 } : false}
                />
                <YAxis
                  width={canOpenOverview ? 42 : 0}
                  hide={!canOpenOverview}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fill: theme === "dark" ? "#a3a3a3" : "#64748b", fontSize: 10 }}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="memory" stroke="var(--color-memory)" fill="var(--color-memory)" fillOpacity={0.16} strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
            {canOpenOverview && usageHistory.length === 0 && (
              <p className="mt-1 text-[10px] text-slate-500 dark:text-zinc-400">{t.table.loading}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
