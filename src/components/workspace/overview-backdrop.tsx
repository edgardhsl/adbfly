import { cn } from "@/lib/utils";
import type { Theme } from "@/lib/types";

type OverviewBackdropProps = {
  theme: Theme;
  message: string;
};

export function OverviewBackdrop({ theme, message }: OverviewBackdropProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-40 grid place-items-center backdrop-blur-[2px]",
        theme === "dark" ? "bg-black/35" : "bg-white/55"
      )}
    >
      <p
        className={cn(
          "rounded-xl px-4 py-2 text-sm font-semibold shadow-sm",
          theme === "dark"
            ? "border border-white/20 bg-black/35 text-white"
            : "border border-slate-300/80 bg-white/85 text-slate-800"
        )}
      >
        {message}
      </p>
    </div>
  );
}
