import { useState } from "react";
import { Button } from "@travada-books/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@travada-books/ui/components/dialog";
import {
  Cancel01Icon,
  Delete01Icon,
  Download01Icon,
  FolderAddIcon,
} from "@travada-books/ui/icons";
import type { VaultFolder } from "@/lib/queries/vault";

type BulkActionBarProps = {
  selectedCount: number;
  onClear: () => void;
  onDownload: () => void;
  onMoveToFolder: (folderId: string | null) => void;
  onDelete: () => void;
  folders: VaultFolder[];
  isDownloading?: boolean;
};

export function BulkActionBar({
  selectedCount,
  onClear,
  onDownload,
  onMoveToFolder,
  onDelete,
  folders,
  isDownloading,
}: BulkActionBarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <>
      <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-xl border bg-background/95 backdrop-blur-sm shadow-lg px-3 py-2 animate-in slide-in-from-bottom-3 fade-in-0 duration-200 [animation-timing-function:var(--ease-drawer)]'>
        {/* Selection count + clear */}
        <div className='flex items-center gap-2 pr-2'>
          <span className='text-xs font-medium text-foreground tabular-nums'>
            {selectedCount} selected
          </span>
          <button
            type='button'
            onClick={onClear}
            className='text-muted-foreground fine-hover:text-foreground transition-colors'
            aria-label='Clear selection'
          >
            <Cancel01Icon size={13} />
          </button>
        </div>

        <div className='w-px h-4 bg-border mx-1' />

        {/* Download */}
        <Button
          variant='ghost'
          size='sm'
          className='h-7 text-xs gap-1.5'
          onClick={onDownload}
          disabled={isDownloading}
        >
          <Download01Icon size={13} />
          Download
        </Button>

        {/* Move to folder */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant='ghost' size='sm' className='h-7 text-xs gap-1.5' />}
          >
            <FolderAddIcon size={13} />
            Move to folder
          </DropdownMenuTrigger>
          <DropdownMenuContent align='center' side='top' sideOffset={8} className='w-44'>
            {folders.map((folder) => (
              <DropdownMenuItem
                key={folder.id}
                className='text-xs'
                onClick={() => onMoveToFolder(folder.id)}
              >
                {folder.name}
              </DropdownMenuItem>
            ))}
            {folders.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              className='text-xs text-muted-foreground'
              onClick={() => onMoveToFolder(null)}
            >
              Remove from folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className='w-px h-4 bg-border mx-1' />

        {/* Delete */}
        <Button
          variant='ghost'
          size='sm'
          className='h-7 text-xs gap-1.5 text-destructive fine-hover:text-destructive fine-hover:bg-destructive/10'
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Delete01Icon size={13} />
          Delete
        </Button>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>
              Delete {selectedCount} document{selectedCount !== 1 ? "s" : ""}?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              {selectedCount === 1 ? "this document" : `these ${selectedCount} documents`}. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' size='sm' onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              size='sm'
              onClick={() => {
                setDeleteDialogOpen(false);
                onDelete();
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
