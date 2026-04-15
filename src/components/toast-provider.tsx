"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      richColors
      expand
      closeButton
      toastOptions={{
        classNames: {
          toast: "!bg-white dark:!bg-[#1f1f1f] !text-foreground !border !border-border !shadow-xl",
          title: "!font-semibold !text-foreground",
          description: "!text-muted-foreground",
          success: "!bg-emerald-50 dark:!bg-emerald-950 !text-emerald-900 dark:!text-emerald-100 !border-emerald-300 dark:!border-emerald-700",
          error: "!bg-rose-50 dark:!bg-rose-950 !border-rose-300 dark:!border-rose-700",
          warning: "!bg-amber-50 dark:!bg-amber-950 !border-amber-300 dark:!border-amber-700",
          info: "!bg-sky-50 dark:!bg-sky-950 !border-sky-300 dark:!border-sky-700",
        },
      }}
    />
  );
}
