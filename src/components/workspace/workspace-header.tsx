import { Fragment } from "react";
import { ChevronRight, Moon, SunMedium } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LanguageDropdown } from "@/components/ui/language-dropdown";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";
import type { Theme } from "@/lib/types";

type WorkspaceHeaderProps = {
  theme: Theme;
  breadcrumbItems: string[];
  workspaceDescription: string;
  isConnected: boolean;
  connectedLabel: string;
  disconnectedLabel: string;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onToggleTheme: () => void;
};

export function WorkspaceHeader({
  theme,
  breadcrumbItems,
  workspaceDescription,
  isConnected,
  connectedLabel,
  disconnectedLabel,
  locale,
  onLocaleChange,
  onToggleTheme,
}: WorkspaceHeaderProps) {
  return (
    <header
      className={cn(
        "relative z-50 border-b px-6 py-4 backdrop-blur-xl",
        theme === "dark" ? "border-[#2a2a2a]" : "border-slate-300/70"
      )}
    >
      <div className={cn("absolute inset-0", theme === "dark" ? "bg-[#171717]/92" : "bg-white/88")} />
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            {breadcrumbItems.map((crumb, index) => {
              const isLast = index === breadcrumbItems.length - 1;

              return (
                <Fragment key={`${crumb}-${index}`}>
                  {index > 0 && <ChevronRight className={cn("h-3 w-3", theme === "dark" ? "text-slate-500" : "text-slate-400")} />}
                  <span
                    className={cn(
                      "max-w-[220px] truncate",
                      theme === "dark" ? "text-slate-200" : "text-slate-700",
                      isLast && "font-semibold text-primary"
                    )}
                  >
                    {crumb}
                  </span>
                </Fragment>
              );
            })}
          </div>
          <p className={cn("mt-1 text-xs", theme === "dark" ? "text-slate-400" : "text-slate-600")}>
            {workspaceDescription}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn("rounded-xl", theme === "dark" ? "border-white/15 bg-white/10 text-zinc-100 dark:border-[#3a3a3a] dark:bg-[#262626]" : "border-slate-300 bg-white text-slate-700")}>
            {isConnected ? connectedLabel : disconnectedLabel}
          </Badge>
          <LanguageDropdown value={locale} onChange={(value) => onLocaleChange(value as Locale)} />
          <Separator orientation="vertical" className={cn("h-6", theme === "dark" ? "bg-white/20" : "bg-slate-300")} />
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            className={cn("h-8 w-8 rounded-xl", theme === "dark" ? "text-slate-200 hover:bg-white/10" : "text-slate-700 hover:bg-slate-900/10")}
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
