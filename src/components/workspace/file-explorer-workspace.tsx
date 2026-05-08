import { useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Check, File, Folder, Home, RefreshCcw, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { TranslationKeys } from "@/lib/i18n";
import type { DeviceFileEntry, DeviceFilePreview, DeviceFileProperties, Theme } from "@/lib/types";

type FileExplorerWorkspaceProps = {
  theme: Theme;
  t: TranslationKeys;
  hasSelectedDevice: boolean;
  currentPath: string;
  entries: DeviceFileEntry[];
  loading: boolean;
  loadError: boolean;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onOpenEntry: (entry: DeviceFileEntry) => void;
  onNavigateUp: () => void;
  onGoRoot: () => void;
  onRetry: () => void;
  onDownload: (entry: DeviceFileEntry) => Promise<void>;
  onCreateFolder: (remotePath: string) => Promise<void>;
  onUploadFile: (file: File, destinationDir: string) => Promise<void>;
  onDelete: (entry: DeviceFileEntry) => Promise<void>;
  onMove: (entry: DeviceFileEntry, destinationPath: string) => Promise<void>;
  onCopy: (entry: DeviceFileEntry, destinationPath: string) => Promise<void>;
  onGetProperties: (entry: DeviceFileEntry) => Promise<DeviceFileProperties>;
  onPreview: (entry: DeviceFileEntry) => Promise<DeviceFilePreview>;
};

const formatBytes = (value?: number) => {
  if (!value || value <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let idx = 0;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx += 1;
  }
  const normalized = idx === 0 ? Math.round(size).toString() : size.toFixed(1);
  return `${normalized} ${units[idx]}`;
};

export function FileExplorerWorkspace({
  theme,
  t,
  hasSelectedDevice,
  currentPath,
  entries,
  loading,
  loadError,
  searchQuery,
  onSearchQueryChange,
  onOpenEntry,
  onNavigateUp,
  onGoRoot,
  onRetry,
  onDownload,
  onCreateFolder,
  onUploadFile,
  onDelete,
  onMove,
  onCopy,
  onGetProperties,
  onPreview,
}: FileExplorerWorkspaceProps) {
  const [pendingAction, setPendingAction] = useState<{ type: "move" | "copy"; entry: DeviceFileEntry } | null>(null);
  const [destinationPath, setDestinationPath] = useState("");
  const [isCreatingFolderInline, setIsCreatingFolderInline] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [properties, setProperties] = useState<DeviceFileProperties | null>(null);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [preview, setPreview] = useState<DeviceFilePreview | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadTargetDirectory, setUploadTargetDirectory] = useState<string>(currentPath);
  const inlineFolderInputRef = useRef<HTMLInputElement | null>(null);

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => entry.name.toLowerCase().includes(query));
  }, [entries, searchQuery]);

  const handleDelete = async (entry: DeviceFileEntry) => {
    const confirmed = window.confirm(`${t.actions.delete}: ${entry.name}?`);
    if (!confirmed) return;
    await onDelete(entry);
  };

  const handleOpenMove = (entry: DeviceFileEntry) => {
    setPendingAction({ type: "move", entry });
    setDestinationPath(entry.full_path);
  };

  const handleOpenCopy = (entry: DeviceFileEntry) => {
    const suggestedName = `${entry.name}_copy`;
    const suggestedPath = `${currentPath.replace(/\/$/, "")}/${suggestedName}`;
    setPendingAction({ type: "copy", entry });
    setDestinationPath(suggestedPath);
  };

  const handleSubmitPathAction = async () => {
    if (!pendingAction || !destinationPath.trim()) return;
    if (pendingAction.type === "move") {
      await onMove(pendingAction.entry, destinationPath.trim());
    } else {
      await onCopy(pendingAction.entry, destinationPath.trim());
    }
    setPendingAction(null);
    setDestinationPath("");
  };

  const handleOpenProperties = async (entry: DeviceFileEntry) => {
    const value = await onGetProperties(entry);
    setProperties(value);
    setIsPropertiesOpen(true);
  };

  const handleOpenPreview = async (entry: DeviceFileEntry) => {
    if (entry.is_directory) return;
    const value = await onPreview(entry);
    setPreview(value);
    setIsPreviewOpen(true);
  };

  const handleCreateFolderInline = async () => {
    const normalized = newFolderName.trim();
    if (!normalized) return;
    const fullPath = `${currentPath.replace(/\/$/, "")}/${normalized}`;
    await onCreateFolder(fullPath);
    setNewFolderName("");
    setIsCreatingFolderInline(false);
  };

  const handleUploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await onUploadFile(file, uploadTargetDirectory);
    event.target.value = "";
  };

  const handleInlineFolderKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleCreateFolderInline();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setIsCreatingFolderInline(false);
      setNewFolderName("");
    }
  };

  if (!hasSelectedDevice) {
    return (
      <div
        className={cn(
          "grid min-h-[340px] place-items-center rounded-lg border p-6 text-center",
          theme === "dark" ? "border-[#2f2f2f] bg-[#171717]" : "border-slate-300 bg-white"
        )}
      >
        <div>
          <p className={cn("text-sm font-semibold", theme === "dark" ? "text-zinc-100" : "text-slate-900")}>
            {t.main.lockConnectAndRefresh}
          </p>
          <p className={cn("mt-1 text-xs", theme === "dark" ? "text-zinc-400" : "text-slate-500")}>
            {t.main.connectDeviceOverlay}
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <header className="space-y-1">
        <h2 className={cn("text-sm font-semibold", theme === "dark" ? "text-zinc-50" : "text-slate-900")}>
          {t.main.fileExplorerTitle}
        </h2>
        <p className={cn("text-xs", theme === "dark" ? "text-zinc-400" : "text-slate-600")}>
          {t.main.fileExplorerSubtitle}
        </p>
      </header>

      <div
        className={cn(
          "rounded-lg border p-3",
          theme === "dark" ? "border-[#2f2f2f] bg-[#171717]" : "border-slate-300 bg-white"
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="h-8 px-2 text-xs" onClick={onNavigateUp}>
            <Undo2 className="mr-1 h-3.5 w-3.5" />
            ..
          </Button>
          <Button type="button" variant="outline" className="h-8 px-2 text-xs" onClick={onGoRoot}>
            <Home className="mr-1 h-3.5 w-3.5" />
            {t.main.fileExplorerOpenRoot}
          </Button>
          <Button type="button" variant="outline" className="h-8 px-2 text-xs" onClick={onRetry}>
            <RefreshCcw className={cn("mr-1 h-3.5 w-3.5", loading && "animate-spin")} />
            {t.actions.retry}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 px-2 text-xs"
            onClick={() => {
              setIsCreatingFolderInline(true);
              setNewFolderName("");
              queueMicrotask(() => inlineFolderInputRef.current?.focus());
            }}
          >
            {t.actions.createFolder}
          </Button>
          <input
            ref={uploadInputRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              void handleUploadFile(event);
            }}
          />
          <Input
            className="h-8 max-w-sm text-xs"
            placeholder={t.main.fileExplorerSearchPlaceholder}
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </div>

        <p className={cn("mt-3 break-all text-[11px]", theme === "dark" ? "text-zinc-400" : "text-slate-600")}>
          <span className="font-semibold">{t.main.fileExplorerCurrentPath}: </span>
          {currentPath}
        </p>

        <ScrollArea className="mt-3 h-[440px] rounded-md border border-slate-300/70 dark:border-[#343434]">
          <div className="p-2">
            {loadError && (
              <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-2 text-xs text-rose-500">
                {t.errors.loadFailed}
              </div>
            )}

            {!loadError && filteredEntries.length === 0 && (
              <div className={cn("px-2 py-3 text-xs", theme === "dark" ? "text-zinc-400" : "text-slate-500")}>
                {t.main.fileExplorerEmpty}
              </div>
            )}

            {!loadError && isCreatingFolderInline && (
              <div
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-xs",
                  theme === "dark" ? "bg-[#242424] text-zinc-200" : "bg-slate-100 text-slate-700"
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Folder className="h-4 w-4 shrink-0 text-amber-500" />
                  <Input
                    ref={inlineFolderInputRef}
                    value={newFolderName}
                    onChange={(event) => setNewFolderName(event.target.value)}
                    onKeyDown={handleInlineFolderKeyDown}
                    placeholder={t.main.fileExplorerCreateFolderPlaceholder}
                    className="h-7 w-[280px] text-xs"
                  />
                </span>
                <span className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => void handleCreateFolderInline()}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setIsCreatingFolderInline(false);
                      setNewFolderName("");
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </span>
              </div>
            )}

            {!loadError &&
              filteredEntries.map((entry) => (
                <ContextMenu key={entry.full_path}>
                  <ContextMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onOpenEntry(entry)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-xs transition-colors",
                        theme === "dark"
                          ? "text-zinc-200 hover:bg-[#242424]"
                          : "text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {entry.is_directory ? (
                          <Folder className="h-4 w-4 shrink-0 text-amber-500" />
                        ) : (
                          <File className="h-4 w-4 shrink-0 text-slate-500" />
                        )}
                        <span className="truncate">{entry.name}</span>
                      </span>
                      <span className={cn("shrink-0 text-[11px]", theme === "dark" ? "text-zinc-400" : "text-slate-500")}>
                        {entry.is_directory ? "-" : formatBytes(entry.size_bytes)}
                      </span>
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent className={cn(theme === "dark" ? "border-[#3a3a3a] bg-[#1f1f1f] text-zinc-100" : "")}>
                    <ContextMenuItem
                      disabled={entry.is_directory}
                      onSelect={() => {
                        void handleOpenPreview(entry);
                      }}
                    >
                      {t.actions.preview}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      disabled={entry.is_directory}
                      onSelect={() => {
                        void onDownload(entry);
                      }}
                    >
                      {t.actions.download}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    {entry.is_directory && (
                      <ContextMenuItem
                        onSelect={() => {
                          setUploadTargetDirectory(entry.full_path);
                          uploadInputRef.current?.click();
                        }}
                      >
                        {t.actions.uploadFile}
                      </ContextMenuItem>
                    )}
                    {entry.is_directory && <ContextMenuSeparator />}
                    <ContextMenuItem
                      onSelect={() => {
                        handleOpenMove(entry);
                      }}
                    >
                      {t.actions.move}
                    </ContextMenuItem>
                    <ContextMenuItem
                      onSelect={() => {
                        handleOpenCopy(entry);
                      }}
                    >
                      {t.actions.copy}
                    </ContextMenuItem>
                    <ContextMenuItem
                      onSelect={() => {
                        void handleDelete(entry);
                      }}
                      className="text-rose-500 focus:text-rose-500"
                    >
                      {t.actions.delete}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onSelect={() => {
                        void handleOpenProperties(entry);
                      }}
                    >
                      {t.actions.properties}
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
          </div>
        </ScrollArea>
      </div>

      <Dialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent className={cn(theme === "dark" ? "border-[#3a3a3a] bg-[#1f1f1f] text-zinc-100" : "bg-white text-slate-900")}>
          <DialogHeader>
            <DialogTitle>{pendingAction?.type === "move" ? t.actions.move : t.actions.copy}</DialogTitle>
            <DialogDescription className={cn(theme === "dark" ? "text-zinc-400" : "text-slate-600")}>
              {pendingAction?.entry.full_path}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={destinationPath}
            onChange={(event) => setDestinationPath(event.target.value)}
            placeholder={t.main.fileExplorerDestinationPlaceholder}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingAction(null)}>
              {t.dialog.cancel}
            </Button>
            <Button type="button" onClick={() => void handleSubmitPathAction()}>
              {t.actions.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPropertiesOpen} onOpenChange={setIsPropertiesOpen}>
        <DialogContent className={cn(theme === "dark" ? "border-[#3a3a3a] bg-[#1f1f1f] text-zinc-100" : "bg-white text-slate-900")}>
          <DialogHeader>
            <DialogTitle>{t.main.fileExplorerPropertiesTitle}</DialogTitle>
          </DialogHeader>
          {properties && (
            <div className={cn("space-y-1 text-xs", theme === "dark" ? "text-zinc-300" : "text-slate-700")}>
              <p><span className="font-semibold">Name:</span> {properties.name}</p>
              <p><span className="font-semibold">Path:</span> {properties.full_path}</p>
              <p><span className="font-semibold">Type:</span> {properties.is_directory ? "directory" : "file"}</p>
              <p><span className="font-semibold">Size:</span> {formatBytes(properties.size_bytes)}</p>
              <p><span className="font-semibold">{t.main.fileExplorerPropertiesModified}:</span> {properties.modified_at ?? "-"}</p>
              <p><span className="font-semibold">{t.main.fileExplorerPropertiesPermissions}:</span> {properties.permissions ?? "-"}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent
          className={cn(
            "h-[94vh] w-[98vw] max-w-[98vw] p-3",
            theme === "dark" ? "border-[#3a3a3a] bg-[#1a1a1a] text-zinc-100" : "bg-white text-slate-900"
          )}
        >
          <DialogHeader className="pb-1">
            <DialogTitle>{t.main.fileExplorerPreviewTitle}</DialogTitle>
            <DialogDescription className={cn("break-all", theme === "dark" ? "text-zinc-400" : "text-slate-600")}>
              {preview?.full_path}
            </DialogDescription>
          </DialogHeader>

          {preview?.truncated && (
            <p className={cn("text-xs", theme === "dark" ? "text-amber-300" : "text-amber-700")}>
              {t.main.fileExplorerPreviewTruncated}
            </p>
          )}

          <div className={cn("mt-2 h-[calc(94vh-120px)] overflow-auto rounded-md border p-2", theme === "dark" ? "border-[#333]" : "border-slate-300")}>
            {preview && renderPreviewContent(preview, t)}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function decodeBase64ToText(base64: string) {
  try {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

function renderPreviewContent(preview: DeviceFilePreview, t: TranslationKeys) {
  const src = `data:${preview.mime_type};base64,${preview.content_base64}`;

  if (preview.mime_type.startsWith("image/")) {
    return <img src={src} alt={preview.name} className="h-full w-full object-contain" />;
  }

  if (preview.mime_type.startsWith("video/")) {
    return <video src={src} controls className="h-full w-full" />;
  }

  if (preview.mime_type.startsWith("audio/")) {
    return (
      <div className="grid h-full place-items-center">
        <audio src={src} controls className="w-full max-w-xl" />
      </div>
    );
  }

  if (preview.mime_type === "application/pdf") {
    return <iframe src={src} title={preview.name} className="h-full w-full" />;
  }

  if (
    preview.mime_type.startsWith("text/") ||
    preview.mime_type === "application/json" ||
    preview.mime_type === "application/xml"
  ) {
    return (
      <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed">
        {decodeBase64ToText(preview.content_base64)}
      </pre>
    );
  }

  return <p className="text-xs text-slate-500">{t.main.fileExplorerPreviewUnsupported}</p>;
}
