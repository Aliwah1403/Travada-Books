import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
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
  PlusSignIcon,
  FolderAddIcon,
  SparklesIcon,
} from "@travada-books/ui/icons";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@travada-books/ui/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { TransactionSheet } from "@/components/transactions/transaction-sheet";
import { extractDocumentData, classifyDocument } from "@/lib/queries/ai";
import { DocumentPreviewSheet } from "@/components/vault/document-preview-sheet";
import {
  listDocuments,
  listFolders,
  createFolder,
  deleteFolder,
  deleteDocument,
  renameDocument,
  getDocumentSignedUrl,
  uploadDocument,
  setDocumentFolder,
  type VaultDocument,
  type VaultFolder,
  type VaultFilters,
} from "@/lib/queries/vault";

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
};

const SOURCE_CLASSES: Record<DocumentSource, string> = {
  upload: "bg-muted text-muted-foreground",
  transaction:
    "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  inbox: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
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
  onRename,
  onDelete,
  onExtract,
  onMoveToFolder,
  folders = [],
}: {
  onDownload: () => void;
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
      <DropdownMenuContent align='end' className='w-44'>
        <DropdownMenuItem onClick={onDownload} className='gap-2'>
          <Download01Icon size={13} className='shrink-0' />
          Download
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
    <span
      className='inline-block size-1.5 shrink-0 animate-pulse rounded-full bg-amber-400'
      title='AI classification in progress…'
    />
  );
}

// ─── Tag pills ────────────────────────────────────────────────────────────────

const MAX_VISIBLE_TAGS = 3;

function TagPills({ tags }: { tags: string[] | null }) {
  if (!tags?.length) return null;
  const visible = tags.slice(0, MAX_VISIBLE_TAGS);
  const overflow = tags.length - MAX_VISIBLE_TAGS;
  return (
    <div className='flex flex-wrap items-center gap-1'>
      {visible.map((tag) => (
        <span
          key={tag}
          className='rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground'
        >
          {tag}
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
  onRename,
  onDelete,
  onExtract,
  onMoveToFolder,
  folders,
}: {
  doc: VaultDocument;
  onOpen: (doc: VaultDocument) => void;
  onDownload: (doc: VaultDocument) => void;
  onRename: (doc: VaultDocument) => void;
  onDelete: (doc: VaultDocument) => void;
  onExtract?: (doc: VaultDocument) => void;
  onMoveToFolder?: (doc: VaultDocument, folderId: string | null) => void;
  folders?: VaultFolder[];
}) {
  return (
    <div
      className='group relative flex cursor-pointer flex-col gap-3 rounded-xl border bg-card p-4 transition-colors fine-hover:bg-accent/30 active:opacity-80'
      onClick={() => onOpen(doc)}
    >
      <div className='flex items-start justify-between gap-2'>
        <FileTypeIcon contentType={doc.content_type} size='md' />
        <div
          className='opacity-0 transition-opacity group-hover:opacity-100'
          onClick={(e) => e.stopPropagation()}
        >
          <DocActions
            onDownload={() => onDownload(doc)}
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
  onRename,
  onDelete,
  onExtract,
  onMoveToFolder,
  folders,
}: {
  doc: VaultDocument;
  onOpen: (doc: VaultDocument) => void;
  onDownload: (doc: VaultDocument) => void;
  onRename: (doc: VaultDocument) => void;
  onDelete: (doc: VaultDocument) => void;
  onExtract?: (doc: VaultDocument) => void;
  onMoveToFolder?: (doc: VaultDocument, folderId: string | null) => void;
  folders?: VaultFolder[];
}) {
  return (
    <div
      className='group flex cursor-pointer items-center gap-4 border-b px-4 py-3 last:border-0 fine-hover:bg-accent/30 transition-colors active:opacity-80'
      onClick={() => onOpen(doc)}
    >
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
              key={tag}
              className='rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground'
            >
              {tag}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export function VaultPage() {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // folder navigation stack — [] = root
  const [folderPath, setFolderPath] = useState<BreadcrumbEntry[]>([]);
  const currentFolderId = folderPath.at(-1)?.id ?? null;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [renamingDoc, setRenamingDoc] = useState<VaultDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<VaultDocument | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [txSheetOpen, setTxSheetOpen] = useState(false);
  const [txInitialData, setTxInitialData] = useState<Parameters<typeof TransactionSheet>[0]["initialData"]>(undefined);
  const [txInitialVaultDocs, setTxInitialVaultDocs] = useState<Parameters<typeof TransactionSheet>[0]["initialVaultDocs"]>(undefined);

  const searchTimer = useRef(0);
  function handleSearchChange(val: string) {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => setDebouncedSearch(val), 350);
  }

  // Reset search when navigating
  function navigateTo(index: number | null) {
    setSearch("");
    setDebouncedSearch("");
    if (index === null) {
      setFolderPath([]);
    } else {
      setFolderPath((p) => p.slice(0, index + 1));
    }
  }

  function navigateInto(folder: VaultFolder) {
    setSearch("");
    setDebouncedSearch("");
    setFolderPath((p) => [...p, { id: folder.id, name: folder.name }]);
  }

  const docFilters: VaultFilters = {
    folderId: currentFolderId ?? undefined,
    search: debouncedSearch || undefined,
  };

  const { data: docs = [], isLoading: docsLoading } = useQuery({
    queryKey: ["vault", orgId, currentFolderId, debouncedSearch],
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
    mutationFn: async (file: File) => {
      const filePath = await uploadDocument(orgId!, file, currentFolderId);
      // Fire-and-forget — classification runs in the background via Trigger.dev
      classifyDocument({ filePath }).catch(() => {});
      return filePath;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", orgId] });
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";
    for (const file of files) {
      toast.promise(uploadMutation.mutateAsync(file), {
        loading: `Uploading ${file.name}…`,
        success: `${file.name} uploaded`,
        error: `Failed to upload ${file.name}`,
      });
    }
  }

  const isFiltered = !!debouncedSearch;
  const isInsideFolder = folderPath.length > 0;

  return (
    <div className='flex flex-col gap-6 p-6'>
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
        accept='image/*,application/pdf'
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
      <div className='flex items-center gap-2'>
        <div className='relative flex-1 max-w-72'>
          <Search01Icon
            size={14}
            className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'
          />
          <Input
            placeholder={
              isInsideFolder ?
                `Search in ${folderPath.at(-1)!.name}…`
              : "Search documents…"
            }
            className='h-9 pl-8 pr-8 text-xs'
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
              }}
              className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors fine-hover:text-foreground'
            >
              <Cancel01Icon size={13} />
            </button>
          )}
        </div>

        <div className='ml-auto flex items-center gap-1 rounded-lg border p-1'>
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "flex size-7 items-center justify-center rounded-md transition-colors",
              viewMode === "grid" ?
                "bg-muted text-foreground"
              : "text-muted-foreground fine-hover:text-foreground",
            )}
          >
            <GridIcon size={14} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "flex size-7 items-center justify-center rounded-md transition-colors",
              viewMode === "list" ?
                "bg-muted text-foreground"
              : "text-muted-foreground fine-hover:text-foreground",
            )}
          >
            <ListViewIcon size={14} />
          </button>
        </div>
      </div>

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
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
          {docs.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onOpen={setPreviewDoc}
              onDownload={handleDownload}
              onRename={setRenamingDoc}
              onDelete={handleDelete}
              onExtract={handleExtractToTransaction}
              onMoveToFolder={handleMoveToFolder}
              folders={allFolders}
            />
          ))}
        </div>
      : <div className='overflow-hidden rounded-lg border'>
          <div className='flex items-center gap-4 border-b bg-muted/40 px-4 py-2'>
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
              onRename={setRenamingDoc}
              onDelete={handleDelete}
              onExtract={handleExtractToTransaction}
              onMoveToFolder={handleMoveToFolder}
              folders={allFolders}
            />
          ))}
        </div>
      }

      {docs.length > 0 && (
        <p className='text-xs text-muted-foreground'>
          {docs.length} document{docs.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
