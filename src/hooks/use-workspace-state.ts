import { useMemo } from "react";
import type { Device } from "@/lib/types";
import type { TranslationKeys } from "@/lib/i18n";
import { buildBreadcrumbs, buildNavigationGroups, type WorkspaceView } from "@/lib/workspace-navigation";

type UseWorkspaceStateParams = {
  t: TranslationKeys;
  workspaceView: WorkspaceView;
  devicesCount: number;
  currentDevice?: Device;
  selectedPackage: string | null;
};

export function useWorkspaceState({
  t,
  workspaceView,
  devicesCount,
  currentDevice,
  selectedPackage,
}: UseWorkspaceStateParams) {
  return useMemo(() => {
    const isDatabaseView = workspaceView === "databases";
    const showOverview = workspaceView === "overview";
    const hasAnyDevice = devicesCount > 0;
    const hasSelectedDevice = !!currentDevice;
    const hasSelectedApp = !!selectedPackage;
    const canOpenOverview = hasSelectedDevice;
    const canOpenDatabases = hasSelectedDevice && hasSelectedApp;

    const navGroups = buildNavigationGroups(t, {
      canOpenOverview,
      canOpenDatabases,
      hasSelectedDevice,
    });

    const breadcrumbItems = buildBreadcrumbs(t, workspaceView);

    const workspaceDescription = showOverview
      ? t.main.overviewDescription
      : t.main.databasesDescription;

    return {
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
    };
  }, [currentDevice, devicesCount, selectedPackage, t, workspaceView]);
}
