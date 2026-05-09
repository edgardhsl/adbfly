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
    const isFileExplorerView = workspaceView === "fileExplorer";
    const isRunningAppsView = workspaceView === "runningApps";
    const isLogcatView = workspaceView === "logcat";
    const isSettingsView = workspaceView === "settings";
    const showOverview = workspaceView === "overview";
    const hasAnyDevice = devicesCount > 0;
    const hasSelectedDevice = !!currentDevice;
    const hasSelectedApp = !!selectedPackage;
    const canOpenOverview = hasSelectedDevice;
    const canOpenDatabases = hasSelectedDevice && hasSelectedApp;
    const canOpenFileExplorer = hasSelectedDevice;
    const canOpenRunningApps = hasSelectedDevice;
    const canOpenLogcat = hasSelectedDevice;

    const navGroups = buildNavigationGroups(t, {
      canOpenOverview,
      canOpenDatabases,
      canOpenFileExplorer,
      canOpenRunningApps,
      canOpenLogcat,
      hasSelectedDevice,
    });

    const breadcrumbItems = buildBreadcrumbs(t, workspaceView);

    const workspaceDescription = showOverview
      ? t.main.overviewDescription
      : isDatabaseView
        ? t.main.databasesDescription
        : isFileExplorerView
          ? t.main.fileExplorerDescription
        : isRunningAppsView
          ? t.main.runningAppsDescription
        : isLogcatView
          ? t.main.logcatDescription
        : t.main.settingsDescription;

    return {
      isDatabaseView,
      isRunningAppsView,
      isLogcatView,
      isFileExplorerView,
      isSettingsView,
      showOverview,
      hasAnyDevice,
      hasSelectedDevice,
      hasSelectedApp,
      canOpenOverview,
      canOpenDatabases,
      canOpenFileExplorer,
      canOpenRunningApps,
      canOpenLogcat,
      navGroups,
      breadcrumbItems,
      workspaceDescription,
    };
  }, [currentDevice, devicesCount, selectedPackage, t, workspaceView]);
}
