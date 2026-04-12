import { Database, PackagePlus, ShieldCheck, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TranslationKeys } from "@/lib/i18n";

export type WorkspaceView = "overview" | "databases";

type NavigationItemBase = {
  id: string;
  icon: LucideIcon;
  label: string;
  helper?: string;
  enabled: boolean;
  visible: boolean;
};

export type ViewNavigationItem = NavigationItemBase & {
  kind: "view";
  view: WorkspaceView;
};

export type ActionNavigationItem = NavigationItemBase & {
  kind: "action";
  blockedLabel?: string;
};

export type NavigationItem = ViewNavigationItem | ActionNavigationItem;

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

type NavigationFlags = {
  canOpenOverview: boolean;
  canOpenDatabases: boolean;
  hasSelectedDevice: boolean;
};

export type UsageHistoryPoint = {
  time: string;
  cpu: number;
  memory: number;
};

export const OVERVIEW_USAGE_HISTORY: UsageHistoryPoint[] = [
  { time: "T-55m", cpu: 18, memory: 42 },
  { time: "T-45m", cpu: 24, memory: 46 },
  { time: "T-35m", cpu: 38, memory: 44 },
  { time: "T-25m", cpu: 31, memory: 50 },
  { time: "T-15m", cpu: 47, memory: 54 },
  { time: "T-05m", cpu: 36, memory: 52 },
];

export function buildNavigationGroups(
  t: TranslationKeys,
  flags: NavigationFlags
): NavigationGroup[] {
  const groups: Array<NavigationGroup & { hidden?: boolean }> = [
    {
      label: t.navigation.workspace,
      items: [
        {
          kind: "view",
          id: "overview",
          icon: Smartphone,
          label: t.navigation.overview,
          view: "overview",
          helper: t.navigation.overviewHelper,
          enabled: true,
          visible: flags.canOpenOverview,
        },
        {
          kind: "view",
          id: "databases",
          icon: Database,
          label: t.navigation.databases,
          view: "databases",
          helper: t.navigation.databasesHelper,
          enabled: true,
          visible: flags.canOpenDatabases,
        },
      ],
    },
    {
      label: t.navigation.operations,
      hidden: !flags.hasSelectedDevice,
      items: [
        {
          kind: "action",
          id: "install-apk",
          icon: PackagePlus,
          label: t.navigation.installApk,
          helper: t.navigation.installApkHelper,
          enabled: false,
          blockedLabel: t.actions.soon,
          visible: true,
        },
        {
          kind: "action",
          id: "adb-actions",
          icon: ShieldCheck,
          label: t.navigation.adbActions,
          helper: t.navigation.adbActionsHelper,
          enabled: false,
          blockedLabel: t.actions.soon,
          visible: true,
        },
      ],
    },
  ];

  return groups
    .map((group) => ({
      label: group.label,
      hidden: group.hidden,
      items: group.items.filter((item) => item.visible),
    }))
    .filter((group) => !group.hidden && group.items.length > 0)
    .map(({ hidden: _hidden, ...group }) => group);
}

export function buildBreadcrumbs(t: TranslationKeys, workspaceView: WorkspaceView): string[] {
  if (workspaceView === "databases") {
    return [t.breadcrumbs.workspace, t.breadcrumbs.databases];
  }

  return [t.breadcrumbs.workspace, t.breadcrumbs.overview];
}
