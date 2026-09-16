import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDataTableFilters } from "@bazza-ui/filters";
import type { FiltersState } from "@bazza-ui/filters";
import { toast } from "sonner";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { Checkbox } from "@travada-books/ui/components/checkbox";
import { Filter } from "@/components/ui/filter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@travada-books/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu";
import {
  SafeIcon,
  Search01Icon,
  Cancel01Icon,
  Upload01Icon,
  File01Icon,
  Image01Icon,
  Pdf01Icon,
  PencilEdit01Icon,
  ListViewIcon,
  GridIcon,
  Download01Icon,
  Delete01Icon,
  MoreVerticalIcon,
  Link01Icon,
  PlusSignIcon,
  FolderAddIcon,
  SparklesIcon,
  Doc01Icon,
  FileSpreadsheetIcon,
  Ppt01Icon,
  Csv01Icon,
  FilterIcon,
} from "@travada-books/ui/icons";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Spinner } from "@/components/shared/spinner";
import { FileDropzone } from "@/components/shared/file-dropzone";
import { cn } from "@travada-books/ui/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useRealtime, useDebouncedCallback } from "@/hooks/use-realtime";
import { TransactionSheet } from "@/components/transactions/transaction-sheet";
import { extractDocumentData, classifyDocument, parseVaultFilters } from "@/lib/queries/ai";
import { DocumentPreviewSheet } from "@/components/vault/document-preview-sheet";
import { createVaultColumnsConfig } from "@/components/vault/vault-filter-columns";
import { BulkActionBar } from "@/components/vault/bulk-action-bar";
import {
  listDocuments,
  listFolders,
  listDocumentTags,
  createFolder,
  deleteFolder,
  deleteDocument,
  bulkDeleteDocuments,
  renameDocument,
  getDocumentSignedUrl,
  uploadDocument,
  setDocumentFolder,
  bulkSetDocumentFolder,
  createDocumentShare,
  type VaultDocument,
  type VaultFolder,
  type VaultFilters,
  type DocumentTag,
} from "@/lib/queries/vault";

const VAULT_UPLOAD_ACCEPT = [
  "image/*",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "application/csv",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isImage(contentType: string | null): boolean {
  return !!contentType?.startsWith("image/");
}

function isPdf(contentType: string | null): boolean {
  return contentType === "application/pdf";
}

function isDocx(contentType: string | null): boolean {
  return contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

function isXlsx(contentType: string | null): boolean {
  return contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

function isPptx(contentType: string | null): boolean {
  return contentType === "application/vnd.openxmlformats-officedocument.presentationml.presentation";
}

function isCsv(contentType: string | null): boolean {
  return contentType === "text/csv" || contentType === "application/csv";
}

// ---Folder icon------------------
function FolderIcon({ size, selected }: { size: "sm" | "lg"; selected?: boolean }) {
  const sizeClass = size === "lg" ? "w-20 h-16" : "w-12 h-10";

  return (
    <svg
      viewBox='0 0 56 44'
      className={cn(
        sizeClass,
        "transition-colors",
        selected ?
          "text-neutral-600 dark:text-neutral-300"
        : "text-neutral-400 dark:text-neutral-500",
      )}
      fill='none'
    >
      {/* Back panel */}
      <path
        d='M2 8C2 5.79086 3.79086 4 6 4H20L26 11H50C52.2091 11 54 12.7909 54 15V36C54 38.2091 52.2091 40 50 40H6C3.79086 40 2 38.2091 2 36V8Z'
        fill='currentColor'
        opacity='0.45'
      />
      {/* Front panel */}
      <path
        d='M2 17C2 14.7909 3.79086 13 6 13H50C52.2091 13 54 14.7909 54 17V36C54 38.2091 52.2091 40 50 40H6C3.79086 40 2 38.2091 2 36V17Z'
        fill='currentColor'
      />
      {/* Top lip highlight */}
      <path
        d='M6 13H50C52.2091 13 54 14.7909 54 17V20H2V17C2 14.7909 3.79086 13 6 13Z'
        fill='white'
        opacity='0.12'
      />
    </svg>
  );
}

// ─── File type icon ───────────────────────────────────────────────────────────

function FileTypeIcon({
  contentType,
  size = "md",
}: {
  contentType: string | null;
  size?: "sm" | "md";
}) {
  const dims = { sm: "size-8", md: "size-12" }[size];
  const iconSize = { sm: 14, md: 20 }[size];

  if (isPdf(contentType)) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950",
          dims,
        )}
      >
        <Pdf01Icon size={iconSize} className='text-red-500' />
      </div>
    );
  }
  if (isImage(contentType)) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950",
          dims,
        )}
      >
        <Image01Icon size={iconSize} className='text-blue-500' />
      </div>
    );
  }
  if (isDocx(contentType)) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-950",
          dims,
        )}
      >
        <Doc01Icon size={iconSize} className='text-sky-500' />
      </div>
    );
  }
  if (isXlsx(contentType)) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950",
          dims,
        )}
      >
        <FileSpreadsheetIcon size={iconSize} className='text-green-600' />
      </div>
    );
  }
  if (isPptx(contentType)) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950",
          dims,
        )}
      >
        <Ppt01Icon size={iconSize} className='text-orange-500' />
      </div>
    );
  }
  if (isCsv(contentType)) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-950",
          dims,
        )}
      >
        <Csv01Icon size={iconSize} className='text-teal-600' />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-muted",
        dims,
      )}
    >
      <File01Icon size={iconSize} className='text-muted-foreground' />
    </div>
  );
}

// ─── Source badge ─────────────────────────────────────────────────────────────

type DocumentSource = VaultDocument["source"];

const SOURCE_LABELS: Record<DocumentSource, string> = {
  upload: "Upload",
  transaction: "Transaction",
  inbox: "Inbox",
  capture: "Capture",
};

const SOURCE_CLASSES: Record<DocumentSource, string> = {
  upload: "bg-muted text-muted-foreground",
  transaction:
    "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  inbox: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  capture: "bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400",
};

function SourceBadge({ source }: { source: DocumentSource }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
        SOURCE_CLASSES[source],
      )}
    >
      {SOURCE_LABELS[source]}
    </span>
  );
}

// ─── Rename dialog ────────────────────────────────────────────────────────────

function RenameDialog({
  doc,
  open,
  onOpenChange,
  onSave,
}: {
  doc: VaultDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, name: string) => void;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open && doc) setValue(doc.name);
  }, [open, doc]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || !doc || trimmed === doc.name) {
      onOpenChange(false);
      return;
    }
    onSave(doc.id, trimmed);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>Rename document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            placeholder='Document name'
            className='text-sm'
          />
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type='submit' size='sm' disabled={!value.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create folder dialog ─────────────────────────────────────────────────────

function CreateFolderDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSave(trimmed);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            placeholder='Folder name'
            className='text-sm'
          />
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type='submit' size='sm' disabled={!value.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Document actions ─────────────────────────────────────────────────────────

function DocActions({
  onDownload,
  onCopyLink,
  onRename,
  onDelete,
  onExtract,
  onMoveToFolder,
  folders = [],
}: {
  onDownload: () => void;
  onCopyLink: () => void;
  onRename: () => void;
  onDelete: () => void;
  onExtract?: () => void;
  onMoveToFolder?: (folderId: string | null) => void;
  folders?: VaultFolder[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className='flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors fine-hover:bg-muted fine-hover:text-foreground focus-visible:outline-none' />
        }
      >
        <MoreVerticalIcon size={14} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-full'>
        <DropdownMenuItem onClick={onDownload} className='gap-2'>
          <Download01Icon size={13} className='shrink-0' />
          Download
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCopyLink} className='gap-2'>
          <Link01Icon size={13} className='shrink-0' />
          Copy share link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onRename} className='gap-2'>
          <PencilEdit01Icon size={13} className='shrink-0' />
          Rename
        </DropdownMenuItem>
        {onExtract && (
          <DropdownMenuItem onClick={onExtract} className='gap-2'>
            <SparklesIcon size={13} className='shrink-0' />
            Extract to transaction
          </DropdownMenuItem>
        )}
        {onMoveToFolder && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className='gap-2'>
              <FolderAddIcon size={13} className='shrink-0' />
              Move to folder
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className='w-44'>
              {folders.map((folder) => (
                <DropdownMenuItem
                  key={folder.id}
                  onClick={() => onMoveToFolder(folder.id)}
                  className='gap-2'
                >
                  {folder.name}
                </DropdownMenuItem>
              ))}
              {folders.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => onMoveToFolder(null)}
                className='gap-2 text-muted-foreground'
              >
                Remove from folder
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className='gap-2 text-destructive focus:text-destructive'
        >
          <Delete01Icon size={13} className='shrink-0' />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Processing indicator ─────────────────────────────────────────────────────

function ProcessingDot() {
  return (
    <span className='shrink-0 text-muted-foreground' title='AI classification in progress…'>
      <Spinner size={12} />
    </span>
  );
}

// ─── Tag pills ────────────────────────────────────────────────────────────────

const MAX_VISIBLE_TAGS = 3;

function TagPills({ tags }: { tags: DocumentTag[] | null }) {
  if (!tags?.length) return null;
  const visible = tags.slice(0, MAX_VISIBLE_TAGS);
  const overflow = tags.length - MAX_VISIBLE_TAGS;
  return (
    <div className='flex flex-wrap items-center gap-1'>
      {visible.map((tag) => (
        <span
          key={tag.id}
          className='rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground'
        >
          {tag.name}
        </span>
      ))}
      {overflow > 0 && (
        <span className='rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground'>
          +{overflow}
        </span>
      )}
    </div>
  );
}

// ─── Grid card ────────────────────────────────────────────────────────────────

function DocumentCard({
  doc,
  onOpen,
  onDownload,
  onCopyLink,
  onRename,
  onDelete,
  onExtract,
  onMoveToFolder,
  folders,
  selected,
  onToggleSelect,
}: {
  doc: VaultDocument;
  onOpen: (doc: VaultDocument) => void;
  onDownload: (doc: VaultDocument) => void;
  onCopyLink: (doc: VaultDocument) => void;
  onRename: (doc: VaultDocument) => void;
  onDelete: (doc: VaultDocument) => void;
  onExtract?: (doc: VaultDocument) => void;
  onMoveToFolder?: (doc: VaultDocument, folderId: string | null) => void;
  folders?: VaultFolder[];
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex cursor-pointer flex-col gap-3 rounded-xl border bg-card p-4 transition-colors fine-hover:bg-accent/30 active:opacity-80",
        selected && "border-primary/50 bg-accent/30",
      )}
      onClick={() => onOpen(doc)}
    >
      <div className='flex items-start justify-between gap-2'>
        <div className='relative shrink-0'>
          <FileTypeIcon contentType={doc.content_type} size='md' />
          {onToggleSelect && (
            <div
              className={cn(
                "absolute -left-1.5 -top-1.5 rounded-full bg-background transition-opacity",
                selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={!!selected}
                onCheckedChange={() => onToggleSelect(doc.id)}
                className='bg-background shadow-sm'
              />
            </div>
          )}
        </div>
        <div
          className='opacity-0 transition-opacity group-hover:opacity-100'
          onClick={(e) => e.stopPropagation()}
        >
          <DocActions
            onDownload={() => onDownload(doc)}
            onCopyLink={() => onCopyLink(doc)}
            onRename={() => onRename(doc)}
            onDelete={() => onDelete(doc)}
            onExtract={onExtract ? () => onExtract(doc) : undefined}
            onMoveToFolder={onMoveToFolder ? (fid) => onMoveToFolder(doc, fid) : undefined}
            folders={folders}
          />
        </div>
      </div>

      <div className='min-w-0 flex-1'>
        <div className='flex items-start gap-1.5'>
          {(doc.processing_status === "pending" || doc.processing_status === "processing") && (
            <ProcessingDot />
          )}
          <p className='line-clamp-2 text-xs font-medium leading-relaxed'>
            {doc.title ?? doc.name}
          </p>
        </div>
        {doc.summary && (
          <p className='mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground'>
            {doc.summary}
          </p>
        )}
      </div>

      <TagPills tags={doc.tags} />

      <div className='flex items-center justify-between gap-2'>
        <SourceBadge source={doc.source} />
        <span className='text-[10px] text-muted-foreground'>
          {formatBytes(doc.file_size)}
        </span>
      </div>

      <p className='text-[10px] text-muted-foreground'>
        {formatDate(doc.created_at)}
      </p>
    </div>
  );
}

// ─── List row ─────────────────────────────────────────────────────────────────

function DocumentRow({
  doc,
  onOpen,
  onDownload,
  onCopyLink,
  onRename,
  onDelete,
  onExtract,
  onMoveToFolder,
  folders,
  selected,
  onToggleSelect,
}: {
  doc: VaultDocument;
  onOpen: (doc: VaultDocument) => void;
  onDownload: (doc: VaultDocument) => void;
  onCopyLink: (doc: VaultDocument) => void;
  onRename: (doc: VaultDocument) => void;
  onDelete: (doc: VaultDocument) => void;
  onExtract?: (doc: VaultDocument) => void;
  onMoveToFolder?: (doc: VaultDocument, folderId: string | null) => void;
  folders?: VaultFolder[];
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-4 border-b px-4 py-3 last:border-0 fine-hover:bg-accent/30 transition-colors active:opacity-80",
        selected && "bg-accent/30",
      )}
      onClick={() => onOpen(doc)}
    >
      {onToggleSelect && (
        <div
          className={cn(
            "shrink-0 transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox checked={!!selected} onCheckedChange={() => onToggleSelect(doc.id)} />
        </div>
      )}
      <FileTypeIcon contentType={doc.content_type} size='sm' />

      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-1.5'>
          {(doc.processing_status === "pending" || doc.processing_status === "processing") && (
            <ProcessingDot />
          )}
          <p className='truncate text-xs font-medium'>{doc.title ?? doc.name}</p>
        </div>
      </div>

      {doc.tags && doc.tags.length > 0 && (
        <div className='hidden shrink-0 items-center gap-1 sm:flex'>
          {doc.tags.slice(0, 2).map((tag) => (
            <span
              key={tag.id}
              className='rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground'
            >
              {tag.name}
            </span>
          ))}
          {doc.tags.length > 2 && (
            <span className='rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground'>
              +{doc.tags.length - 2}
            </span>
          )}
        </div>
      )}

      <SourceBadge source={doc.source} />

      <span className='w-16 shrink-0 text-right text-xs text-muted-foreground'>
        {formatBytes(doc.file_size)}
      </span>

      <span className='w-28 shrink-0 text-right text-xs text-muted-foreground'>
        {formatDate(doc.created_at)}
      </span>

      <div
        className='opacity-0 transition-opacity group-hover:opacity-100'
        onClick={(e) => e.stopPropagation()}
      >
        <DocActions
          onDownload={() => onDownload(doc)}
          onCopyLink={() => onCopyLink(doc)}
          onRename={() => onRename(doc)}
          onDelete={() => onDelete(doc)}
          onExtract={onExtract ? () => onExtract(doc) : undefined}
          onMoveToFolder={onMoveToFolder ? (fid) => onMoveToFolder(doc, fid) : undefined}
          folders={folders}
        />
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className='flex flex-col gap-3 rounded-xl border bg-card p-4'
        >
          <div className='size-12 animate-pulse rounded-lg bg-muted' />
          <div className='space-y-1.5'>
            <div className='h-2.5 w-full animate-pulse rounded bg-muted' />
            <div className='h-2.5 w-3/4 animate-pulse rounded bg-muted' />
          </div>
          <div className='flex items-center justify-between'>
            <div className='h-4 w-16 animate-pulse rounded bg-muted' />
            <div className='h-3 w-10 animate-pulse rounded bg-muted' />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Folder grid ─────────────────────────────────────────────────────────────

type BreadcrumbEntry = { id: string; name: string };

function FolderGrid({
  folders,
  onNavigate,
  onDelete,
  onCreateClick,
}: {
  folders: VaultFolder[];
  onNavigate: (folder: VaultFolder) => void;
  onDelete: (folder: VaultFolder) => void;
  onCreateClick: () => void;
}) {
  return (
    <div className='flex items-end gap-4 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden'>
      {folders.map((folder) => (
        <div
          key={folder.id}
          className='group relative shrink-0 flex flex-col items-center gap-1.5 cursor-pointer'
          onClick={() => onNavigate(folder)}
        >
          <FolderIcon size='lg' />
          {!folder.is_system && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(folder);
              }}
              className='absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-background border text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 fine-hover:text-foreground'
              title={`Delete "${folder.name}"`}
            >
              <Cancel01Icon size={8} />
            </button>
          )}
          <span className='max-w-20 truncate text-center text-[11px] font-medium leading-tight text-muted-foreground transition-colors fine-hover:text-foreground'>
            {folder.name}
          </span>
        </div>
      ))}

      {/* New folder */}
      <button
        onClick={onCreateClick}
        className='shrink-0 flex flex-col items-center gap-1.5 text-neutral-400 transition-colors fine-hover:text-neutral-600 dark:text-neutral-600 dark:fine-hover:text-neutral-400'
      >
        <div className='w-20 h-16 flex items-center justify-center rounded-lg border-2 border-dashed border-current'>
          <PlusSignIcon size={14} />
        </div>
        <span className='text-[11px] font-medium'>New</span>
      </button>
    </div>
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({
  path,
  onNavigateTo,
}: {
  path: BreadcrumbEntry[];
  onNavigateTo: (index: number | null) => void;
}) {
  return (
    <nav className='flex items-center gap-1 text-sm'>
      <button
        onClick={() => onNavigateTo(null)}
        className='text-muted-foreground transition-colors fine-hover:text-foreground'
      >
        All
      </button>
      {path.map((entry, i) => (
        <span key={entry.id} className='flex items-center gap-1'>
          <span className='text-muted-foreground/50'>/</span>
          {i === path.length - 1 ? (
            <span className='font-medium text-foreground'>{entry.name}</span>
          ) : (
            <button
              onClick={() => onNavigateTo(i)}
              className='text-muted-foreground transition-colors fine-hover:text-foreground'
            >
              {entry.name}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}

// ─── Filter helpers ───────────────────────────────────────────────────────────

function serializeFilters(state: FiltersState): string {
  return JSON.stringify(
    state.map((f) => ({
      ...f,
      values: f.values.map((v) => (v instanceof Date ? v.toISOString() : v)),
    })),
  );
}

function deserializeFilters(param: string | null): FiltersState {
  if (!param) return [];
  try {
    const parsed = JSON.parse(param) as Array<{
      columnId: string;
      type: string;
      operator: string;
      values: unknown[];
    }>;
    return parsed.map((f) => ({
      ...f,
      values:
        f.type === "date" || f.columnId === "date"
          ? f.values.map((v) => (typeof v === "string" ? new Date(v) : v))
          : f.values,
    })) as FiltersState;
  } catch {
    return [];
  }
}

function toISODate(v: unknown): string {
  if (v instanceof Date) return v.toISOString().split("T")[0];
  if (typeof v === "string") return v.split("T")[0];
  return "";
}

function translateFilters(state: FiltersState, search?: string): VaultFilters {
  const out: VaultFilters = {};
  if (search) out.search = search;

  for (const { columnId, operator, values } of state) {
    switch (columnId) {
      case "date": {
        const v0 = values[0];
        const v1 = values[1];
        if (operator === "is between" && v0 && v1) {
          out.dateFrom = toISODate(v0);
          out.dateTo = toISODate(v1);
        } else if (operator === "is" && v0) {
          out.dateFrom = toISODate(v0);
          out.dateTo = toISODate(v0);
        } else if ((operator === "is after" || operator === "is on or after") && v0) {
          out.dateFrom = toISODate(v0);
        } else if ((operator === "is before" || operator === "is on or before") && v0) {
          out.dateTo = toISODate(v0);
        }
        break;
      }
      case "tag":
        if (values.length) out.tagIds = values as string[];
        break;
    }
  }

  return out;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function VaultPage() {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // folder navigation stack — [] = root
  const [folderPath, setFolderPath] = useState<BreadcrumbEntry[]>([]);
  const currentFolderId = folderPath.at(-1)?.id ?? null;

  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [isAIParsing, setIsAIParsing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // ── Filter state (URL-backed) ─────────────────────────────────────────────
  const filtersState = deserializeFilters(searchParams.get("filters"));

  function setFiltersState(next: FiltersState) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next.length === 0) {
          params.delete("filters");
        } else {
          params.set("filters", serializeFilters(next));
        }
        return params;
      },
      { replace: true },
    );
  }
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [renamingDoc, setRenamingDoc] = useState<VaultDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<VaultDocument | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [txSheetOpen, setTxSheetOpen] = useState(false);
  const [txInitialData, setTxInitialData] = useState<Parameters<typeof TransactionSheet>[0]["initialData"]>(undefined);
  const [txInitialVaultDocs, setTxInitialVaultDocs] = useState<Parameters<typeof TransactionSheet>[0]["initialVaultDocs"]>(undefined);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: orgTags = [] } = useQuery({
    queryKey: ["document-tags", orgId],
    queryFn: () => listDocumentTags(orgId!),
    enabled: !!orgId,
  });

  const columnsConfig = useMemo(
    () => createVaultColumnsConfig(orgTags.map((t) => ({ id: t.id, name: t.name }))),
    [orgTags],
  );

  const { columns, filters, actions, strategy } = useDataTableFilters({
    strategy: "server",
    columnsConfig,
    filters: filtersState,
    onFiltersChange: setFiltersState,
    entityName: "Document",
  });

  async function handleSearchSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) { clearSearch(); return; }

    if (trimmed.split(/\s+/).length === 1) {
      setSearch(trimmed);
      return;
    }

    setIsAIParsing(true);
    try {
      const parsed = await parseVaultFilters({
        input: trimmed,
        currentDate: new Date().toISOString().split("T")[0],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setSearch(parsed.name ?? "");
      const newFilters: FiltersState = [];
      if (parsed.dateFrom && parsed.dateTo) {
        newFilters.push({ columnId: "date", type: "date", operator: "is between", values: [new Date(parsed.dateFrom), new Date(parsed.dateTo)] });
      } else if (parsed.dateFrom) {
        newFilters.push({ columnId: "date", type: "date", operator: "is on or after", values: [new Date(parsed.dateFrom)] });
      } else if (parsed.dateTo) {
        newFilters.push({ columnId: "date", type: "date", operator: "is on or before", values: [new Date(parsed.dateTo)] });
      }
      setFiltersState(newFilters);
    } catch {
      setSearch(trimmed);
    } finally {
      setIsAIParsing(false);
    }
  }

  function handleSearchInputChange(val: string) {
    setInput(val);
    if (!val) clearSearch();
  }

  function clearSearch() {
    setInput("");
    setSearch("");
    setFiltersState([]);
    searchInputRef.current?.focus();
  }

  // Reset search when navigating
  function navigateTo(index: number | null) {
    clearSearch();
    setSelectedIds(new Set());
    if (index === null) {
      setFolderPath([]);
    } else {
      setFolderPath((p) => p.slice(0, index + 1));
    }
  }

  function navigateInto(folder: VaultFolder) {
    clearSearch();
    setSelectedIds(new Set());
    setFolderPath((p) => [...p, { id: folder.id, name: folder.name }]);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const supabaseFilters = useMemo(
    () => translateFilters(filtersState, search || undefined),
    [filtersState, search],
  );

  const docFilters: VaultFilters = useMemo(
    () => ({ ...supabaseFilters, folderId: currentFolderId ?? undefined }),
    [supabaseFilters, currentFolderId],
  );

  const {
    data: docs = [],
    isLoading: docsLoading,
    isError: docsError,
    refetch: refetchDocs,
  } = useQuery({
    queryKey: ["vault", orgId, docFilters],
    queryFn: () => listDocuments(orgId!, docFilters),
    enabled: !!orgId,
    placeholderData: (prev) => prev,
    refetchInterval: (query) => {
      const data = query.state.data as VaultDocument[] | undefined;
      const hasPending = data?.some(
        (d) => d.processing_status === "pending" || d.processing_status === "processing",
      );
      return hasPending ? 3000 : false;
    },
  });

  // Documents get processed/tagged server-side (AI classification, CSV/PDF
  // import extraction) with no client mutation to invalidate on completion —
  // keep the list fresh via realtime, debounced to collapse bursts.
  const debouncedInvalidateVault = useDebouncedCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["vault", orgId] });
  }, 1000);
  useRealtime({
    channelName: "vault-documents",
    table: "documents",
    events: ["INSERT", "UPDATE"],
    filter: orgId ? `org_id=eq.${orgId}` : undefined,
    onEvent: debouncedInvalidateVault,
  });

  // Keep previewDoc in sync with fresh list data so sheet reflects updates immediately
  useEffect(() => {
    if (!previewDoc) return;
    const fresh = docs.find((d) => d.id === previewDoc.id);
    if (fresh && fresh !== previewDoc) setPreviewDoc(fresh);
  }, [docs]);

  // Fetch folders at the current level
  const { data: folders = [] } = useQuery({
    queryKey: ["vault-folders", orgId, currentFolderId],
    queryFn: () => listFolders(orgId!, currentFolderId),
    enabled: !!orgId,
  });

  // All folders (flat list) for the preview sheet folder picker
  const { data: allFolders = [] } = useQuery({
    queryKey: ["vault-folders-all", orgId],
    queryFn: async () => {
      const { data } = await import("@/lib/supabase").then(({ supabase }) =>
        supabase
          .from("vault_folders")
          .select("id, org_id, name, is_system, parent_id, created_at")
          .eq("org_id", orgId!)
          .order("name"),
      );
      return (data ?? []) as VaultFolder[];
    },
    enabled: !!orgId,
  });

  const deleteMutation = useMutation({
    mutationFn: (doc: VaultDocument) => deleteDocument(doc.id, doc.file_path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", orgId] });
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      renameDocument(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", orgId] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDocument(orgId!, file, currentFolderId),
    onSuccess: (filePath) => {
      queryClient.invalidateQueries({ queryKey: ["vault", orgId] });
      classifyDocument({ filePath }).catch((err) => {
        console.error("classify-document failed:", err);
      });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => createFolder(orgId!, name, currentFolderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-folders", orgId] });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => deleteFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault-folders", orgId] });
      queryClient.invalidateQueries({ queryKey: ["vault", orgId] });
    },
  });

  const moveFolderMutation = useMutation({
    mutationFn: ({ filePath, folderId }: { filePath: string; folderId: string | null }) =>
      setDocumentFolder(filePath, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", orgId] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (selectedDocs: VaultDocument[]) => bulkDeleteDocuments(selectedDocs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", orgId] });
      clearSelection();
    },
  });

  const bulkMoveFolderMutation = useMutation({
    mutationFn: ({ filePaths, folderId }: { filePaths: string[]; folderId: string | null }) =>
      bulkSetDocumentFolder(filePaths, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", orgId] });
      clearSelection();
    },
  });

  const bulkDownloadMutation = useMutation({
    mutationFn: async (selectedDocs: VaultDocument[]) => {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      await Promise.all(
        selectedDocs.map(async (doc) => {
          const url = await getDocumentSignedUrl(doc.file_path);
          const res = await fetch(url);
          zip.file(doc.name, await res.blob());
        }),
      );
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vault-documents-${selectedDocs.length}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  function handleCopyLink(doc: VaultDocument) {
    toast.promise(
      createDocumentShare(doc.id).then((token) => {
        const url = `${window.location.origin}/d/${token}`;
        navigator.clipboard.writeText(url);
      }),
      {
        loading: "Creating share link…",
        success: "Link copied to clipboard",
        error: "Failed to create share link",
      },
    );
  }

  function handleDownload(doc: VaultDocument) {
    toast.promise(
      getDocumentSignedUrl(doc.file_path).then((url) => {
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.name;
        a.target = "_blank";
        a.click();
      }),
      {
        loading: "Preparing download…",
        success: "Download started",
        error: "Failed to get download link",
      },
    );
  }

  function handleDelete(doc: VaultDocument) {
    toast.promise(deleteMutation.mutateAsync(doc), {
      loading: "Deleting document…",
      success: "Document deleted",
      error: "Failed to delete document",
    });
  }

  function handleRename(id: string, name: string) {
    toast.promise(renameMutation.mutateAsync({ id, name }), {
      loading: "Renaming…",
      success: "Document renamed",
      error: "Failed to rename document",
    });
  }

  function handleCreateFolder(name: string) {
    toast.promise(createFolderMutation.mutateAsync(name), {
      loading: "Creating folder…",
      success: "Folder created",
      error: "Failed to create folder",
    });
  }

  function handleDeleteFolder(folder: VaultFolder) {
    toast.promise(deleteFolderMutation.mutateAsync(folder.id), {
      loading: `Deleting "${folder.name}"…`,
      success: "Folder deleted",
      error: "Failed to delete folder",
    });
  }

  function handleExtractToTransaction(doc: VaultDocument) {
    const isExtractable =
      doc.content_type?.startsWith("image/") ||
      doc.content_type === "application/pdf";
    if (!isExtractable) {
      toast.error("Only images and PDFs can be extracted");
      return;
    }
    toast.promise(
      extractDocumentData({ filePath: doc.file_path }).then((extracted) => {
        setTxInitialData({
          date: extracted.date ?? undefined,
          amount: extracted.amount ?? undefined,
          type: extracted.type ?? undefined,
          counterpartyName: extracted.counterparty_name ?? undefined,
          description: extracted.description ?? undefined,
          referenceNumber: extracted.reference_number ?? undefined,
          currency: extracted.currency ?? undefined,
          taxAmount: extracted.tax_amount ?? undefined,
          paymentMode: extracted.payment_mode ?? undefined,
        });
        setTxInitialVaultDocs([{ id: doc.id, org_id: doc.org_id, file_path: doc.file_path, name: doc.name, file_size: doc.file_size, content_type: doc.content_type }]);
        setTxSheetOpen(true);
      }),
      {
        loading: "Extracting data from document…",
        success: "Data extracted — review the pre-filled fields",
        error: "Could not extract data from this file",
      },
    );
  }

  function handleMoveToFolder(doc: VaultDocument, folderId: string | null) {
    const folderName = folderId
      ? allFolders.find((f) => f.id === folderId)?.name ?? "folder"
      : null;
    toast.promise(
      moveFolderMutation.mutateAsync({ filePath: doc.file_path, folderId }),
      {
        loading: folderId ? `Moving to ${folderName}…` : "Removing from folder…",
        success: folderId ? `Moved to ${folderName}` : "Removed from folder",
        error: "Failed to move file",
      },
    );
  }

  function handleBulkDelete() {
    const selectedDocs = docs.filter((d) => selectedIds.has(d.id));
    toast.promise(bulkDeleteMutation.mutateAsync(selectedDocs), {
      loading: `Deleting ${selectedDocs.length} document${selectedDocs.length !== 1 ? "s" : ""}…`,
      success: "Documents deleted",
      error: "Failed to delete documents",
    });
  }

  function handleBulkMoveToFolder(folderId: string | null) {
    const selectedDocs = docs.filter((d) => selectedIds.has(d.id));
    const folderName = folderId
      ? allFolders.find((f) => f.id === folderId)?.name ?? "folder"
      : null;
    toast.promise(
      bulkMoveFolderMutation.mutateAsync({
        filePaths: selectedDocs.map((d) => d.file_path),
        folderId,
      }),
      {
        loading: folderId
          ? `Moving ${selectedDocs.length} file${selectedDocs.length !== 1 ? "s" : ""} to ${folderName}…`
          : `Removing ${selectedDocs.length} file${selectedDocs.length !== 1 ? "s" : ""} from folder…`,
        success: folderId ? `Moved to ${folderName}` : "Removed from folder",
        error: "Failed to move files",
      },
    );
  }

  function handleBulkDownload() {
    const selectedDocs = docs.filter((d) => selectedIds.has(d.id));
    toast.promise(bulkDownloadMutation.mutateAsync(selectedDocs), {
      loading: `Preparing ${selectedDocs.length} file${selectedDocs.length !== 1 ? "s" : ""}…`,
      success: "Download started",
      error: "Failed to download files",
    });
  }

  function uploadFiles(files: File[]) {
    for (const file of files) {
      toast.promise(uploadMutation.mutateAsync(file), {
        loading: `Uploading ${file.name}…`,
        success: `${file.name} uploaded`,
        error: `Failed to upload ${file.name}`,
      });
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";
    uploadFiles(files);
  }

  const isFiltered = !!search || filtersState.length > 0;
  const isInsideFolder = folderPath.length > 0;

  if (docsError && docs.length === 0) {
    return (
      <div className='flex flex-col gap-6 p-6'>
        <ErrorState onRetry={refetchDocs} />
      </div>
    );
  }

  return (
    <FileDropzone
      className='flex flex-col gap-6 p-6'
      onDropFiles={uploadFiles}
      accept={VAULT_UPLOAD_ACCEPT}
      overlayText='Drop files to upload'
    >
      <TransactionSheet
        open={txSheetOpen}
        onOpenChange={setTxSheetOpen}
        initialData={txInitialData}
        initialVaultDocs={txInitialVaultDocs}
      />
      <DocumentPreviewSheet
        doc={previewDoc}
        open={!!previewDoc}
        onOpenChange={(open) => {
          if (!open) setPreviewDoc(null);
        }}
        onDeleted={() => setPreviewDoc(null)}
        onOpenDoc={setPreviewDoc}
        folders={allFolders}
      />

      <RenameDialog
        doc={renamingDoc}
        open={!!renamingDoc}
        onOpenChange={(open) => {
          if (!open) setRenamingDoc(null);
        }}
        onSave={handleRename}
      />

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onSave={handleCreateFolder}
      />

      <input
        ref={fileInputRef}
        type='file'
        multiple
        accept='image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/csv,application/csv,.docx,.xlsx,.pptx,.csv'
        className='hidden'
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className='flex items-center justify-between gap-4'>
        <div className='flex flex-col gap-1'>
          {isInsideFolder ? (
            <Breadcrumb path={folderPath} onNavigateTo={navigateTo} />
          ) : (
            <>
              <h1 className='text-lg font-semibold'>Vault</h1>
              <p className='text-xs text-muted-foreground'>
                Secure document storage for your organization
              </p>
            </>
          )}
        </div>
        <Button
          className='h-9 gap-2'
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
        >
          <Upload01Icon size={14} />
          Upload
        </Button>
      </div>

      {/* Folder grid — always shown */}
      <FolderGrid
        folders={folders}
        onNavigate={navigateInto}
        onDelete={handleDeleteFolder}
        onCreateClick={() => setCreateFolderOpen(true)}
      />

      {/* Toolbar */}
      <Filter.Provider
        columns={columns}
        filters={filters}
        actions={actions}
        strategy={strategy}
        entityName="Document"
      >
        <div className='flex flex-col gap-2'>
          {/* Row 1: search + filter menu + view toggle */}
          <div className='flex items-center gap-2'>
            <form onSubmit={handleSearchSubmit} className='relative'>
              {isAIParsing ? (
                <span className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'>
                  <Spinner size={14} />
                </span>
              ) : (
                <Search01Icon
                  size={14}
                  className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
                />
              )}
              <Input
                ref={searchInputRef}
                placeholder={isInsideFolder ? `Search in ${folderPath.at(-1)!.name}…` : "Search documents…"}
                className={cn(
                  "h-9 w-72 pl-8 text-xs",
                  (input || search) ? "pr-14" : "pr-9",
                )}
                value={input}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={isAIParsing}
              />
              {(input || search) && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className='absolute right-9 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors fine-hover:text-foreground'
                >
                  <Cancel01Icon size={13} />
                </button>
              )}
              <Filter.Menu>
                <button
                  type="button"
                  className={cn(
                    "absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors",
                    filtersState.length > 0
                      ? "text-primary"
                      : "text-muted-foreground fine-hover:text-foreground",
                  )}
                >
                  <FilterIcon size={13} />
                  {filtersState.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-primary" />
                  )}
                </button>
              </Filter.Menu>
            </form>

            <div className='ml-auto flex items-center gap-1 rounded-lg border p-1'>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md transition-colors",
                  viewMode === "grid"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground fine-hover:text-foreground",
                )}
              >
                <GridIcon size={14} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md transition-colors",
                  viewMode === "list"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground fine-hover:text-foreground",
                )}
              >
                <ListViewIcon size={14} />
              </button>
            </div>
          </div>

          {/* Row 2: active filter chips */}
          {filtersState.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Filter.List>
                {({ filter, column }) => (
                  <Filter.Item filter={filter} column={column}>
                    <Filter.Subject />
                    <Filter.Operator />
                    <Filter.Value />
                    <Filter.Remove />
                  </Filter.Item>
                )}
              </Filter.List>
              <div
                className="contents"
                onClick={() => { setInput(""); setSearch(""); }}
              >
                <Filter.Actions />
              </div>
            </div>
          )}
        </div>
      </Filter.Provider>

      {/* Documents */}
      {docsLoading ?
        <SkeletonGrid />
      : docs.length === 0 ?
        <EmptyState
          icon={SafeIcon}
          title={isFiltered ? "No documents found" : isInsideFolder ? "This folder is empty" : "Your vault is empty"}
          description={
            isFiltered ?
              "Try a different search term"
            : isInsideFolder ?
              "Upload files here or move existing documents into this folder"
            : "Upload documents or attach files to transactions — they'll appear here automatically"
          }
          action={
            !isFiltered ?
              <Button
                size='sm'
                className='gap-2'
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload01Icon size={13} />
                Upload a document
              </Button>
            : undefined
          }
        />
      : viewMode === "grid" ?
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4'>
          {docs.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onOpen={setPreviewDoc}
              onDownload={handleDownload}
              onCopyLink={handleCopyLink}
              onRename={setRenamingDoc}
              onDelete={handleDelete}
              onExtract={handleExtractToTransaction}
              onMoveToFolder={handleMoveToFolder}
              folders={allFolders}
              selected={selectedIds.has(doc.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      : <div className='overflow-hidden rounded-lg border'>
          <div className='flex items-center gap-4 border-b bg-muted/40 px-4 py-2'>
            <div className='size-4 shrink-0' />
            <div className='size-8 shrink-0' />
            <span className='flex-1 text-[11px] font-medium text-muted-foreground'>
              Name
            </span>
            <span className='text-[11px] font-medium text-muted-foreground'>
              Source
            </span>
            <span className='w-16 shrink-0 text-right text-[11px] font-medium text-muted-foreground'>
              Size
            </span>
            <span className='w-28 shrink-0 text-right text-[11px] font-medium text-muted-foreground'>
              Date
            </span>
            <div className='size-7 shrink-0' />
          </div>
          {docs.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              onOpen={setPreviewDoc}
              onDownload={handleDownload}
              onCopyLink={handleCopyLink}
              onRename={setRenamingDoc}
              onDelete={handleDelete}
              onExtract={handleExtractToTransaction}
              onMoveToFolder={handleMoveToFolder}
              folders={allFolders}
              selected={selectedIds.has(doc.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      }

      {docs.length > 0 && (
        <p className='text-xs text-muted-foreground'>
          {docs.length} document{docs.length !== 1 ? "s" : ""}
        </p>
      )}

      <BulkActionBar
        selectedCount={selectedIds.size}
        onClear={clearSelection}
        onDownload={handleBulkDownload}
        onMoveToFolder={handleBulkMoveToFolder}
        onDelete={handleBulkDelete}
        folders={allFolders}
        isDownloading={bulkDownloadMutation.isPending}
      />
    </FileDropzone>
  );
}
