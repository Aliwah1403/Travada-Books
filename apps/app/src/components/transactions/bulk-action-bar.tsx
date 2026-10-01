import { useState, useMemo } from "react";
import { Button } from "@travada-books/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
  Tag01Icon,
  CheckmarkCircle01Icon,
  Wallet01Icon,
  RepeatIcon,
  Download01Icon,
} from "@travada-books/ui/icons";
import type { TransactionCategory } from "@/lib/queries/transactions";
import type { TransactionStatus, PaymentMode, TransactionFrequency } from "./transaction-columns";

const STATUS_OPTIONS: { value: TransactionStatus; label: string }[] = [
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "excluded", label: "Excluded" },
  { value: "archived", label: "Archived" },
];

const PAYMENT_OPTIONS: { value: PaymentMode; label: string }[] = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

const FREQUENCY_OPTIONS: { value: TransactionFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "semi_monthly", label: "Semi-monthly" },
  { value: "annually", label: "Annually" },
  { value: "irregular", label: "Irregular" },
];

type BulkActionBarProps = {
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
  onExport: () => void;
  onSetCategory: (categoryId: string) => void;
  onSetStatus: (status: TransactionStatus) => void;
  onSetPaymentMode: (mode: PaymentMode) => void;
  onSetRecurring: (recurring: boolean, frequency?: TransactionFrequency) => void;
  categories: TransactionCategory[];
};

export function BulkActionBar({
  selectedCount,
  onClear,
  onDelete,
  onExport,
  onSetCategory,
  onSetStatus,
  onSetPaymentMode,
  onSetRecurring,
  categories,
}: BulkActionBarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [catSearch, setCatSearch] = useState("");

  const filteredCategories = useMemo(
    () => catSearch.trim()
      ? categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
      : categories,
    [categories, catSearch],
  );

  if (selectedCount === 0) return null;

  return (
    <>
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-xl border bg-background/95 backdrop-blur-sm shadow-lg px-3 py-2 animate-in slide-in-from-bottom-3 fade-in-0 duration-200 [animation-timing-function:var(--ease-drawer)]"
      >
        {/* Selection count + clear */}
        <div className="flex items-center gap-2 pr-2">
          <span className="text-xs font-medium text-foreground tabular-nums">
            {selectedCount} selected
          </span>
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground fine-hover:text-foreground transition-colors"
            aria-label="Clear selection"
          >
            <Cancel01Icon size={13} />
          </button>
        </div>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Categorize */}
        <DropdownMenu
          open={categoryPickerOpen}
          onOpenChange={(open) => {
            if (!open) setCatSearch("");
            setCategoryPickerOpen(open);
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5">
              <Tag01Icon size={13} />
              Categorize
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" sideOffset={8} className="w-52">
            <div className="px-1 pb-1">
              <input
                autoFocus
                placeholder="Search categories…"
                value={catSearch}
                onChange={e => setCatSearch(e.target.value)}
                onKeyDown={e => e.stopPropagation()}
                className="w-full rounded-md bg-input/20 dark:bg-input/30 px-2 py-1 text-xs outline-none placeholder:text-muted-foreground"
              />
            </div>
            {filteredCategories.length === 0 && (
              <div className="py-3 text-center text-xs text-muted-foreground">No categories found.</div>
            )}
            {filteredCategories.map((cat) => (
              <DropdownMenuItem
                key={cat.id}
                className="text-xs gap-2"
                onClick={() => onSetCategory(cat.id)}
              >
                <div
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color ?? "#71717a" }}
                />
                {cat.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Actions dropdown — status, payment mode, recurring */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5">
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" side="top" sideOffset={8} className="w-48">

            {/* Status */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="text-xs gap-2">
                <CheckmarkCircle01Icon size={13} className="text-muted-foreground" />
                Set status
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-40">
                {STATUS_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    className="text-xs"
                    onClick={() => onSetStatus(opt.value)}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Payment mode */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="text-xs gap-2">
                <Wallet01Icon size={13} className="text-muted-foreground" />
                Payment mode
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-40">
                {PAYMENT_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    className="text-xs"
                    onClick={() => onSetPaymentMode(opt.value)}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Recurring */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="text-xs gap-2">
                <RepeatIcon size={13} className="text-muted-foreground" />
                Recurring
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-44">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[11px] text-muted-foreground font-normal">
                    Set frequency
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      className="text-xs"
                      onClick={() => onSetRecurring(true, opt.value)}
                    >
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-xs"
                    onClick={() => onSetRecurring(false)}
                  >
                    Not recurring
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={onExport}
        >
          <Download01Icon size={13} />
          Export
        </Button>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Delete */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 text-destructive fine-hover:text-destructive fine-hover:bg-destructive/10"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Delete01Icon size={13} />
          Delete
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {selectedCount} transaction{selectedCount !== 1 ? "s" : ""}?</DialogTitle>
            <DialogDescription>
              This will permanently delete {selectedCount === 1 ? "this transaction" : `these ${selectedCount} transactions`} and any attachments. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
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
