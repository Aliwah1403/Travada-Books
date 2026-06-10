import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { Separator } from "@travada-books/ui/components/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@travada-books/ui/components/dialog";
import { Tag01Icon, PlusSignIcon, Delete01Icon, LockPasswordIcon } from "@travada-books/ui/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@travada-books/ui/components/popover";
import { EmptyState } from "@/components/shared/empty-state";
import { ColorPicker, COLOR_PALETTE } from "@/components/shared/color-picker";
import { useAuth } from "@/contexts/auth-context";
import {
  listTransactionCategories,
  createTransactionCategory,
  deleteTransactionCategory,
  updateTransactionCategory,
  type TransactionCategory,
} from "@/lib/queries/transactions";

type CategoryField = {
  name: string;
  color: string;
};

function nextColor(index: number) {
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

type ColorDotPickerProps = {
  selected: string;
  onSelect: (color: string) => void;
};

function ColorDotPicker({ selected, onSelect }: ColorDotPickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="size-4 rounded-full shrink-0 transition-[transform,opacity] active:scale-90 fine-hover:opacity-80"
            style={{ backgroundColor: selected }}
          />
        }
      />
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="w-auto p-0 border-0 bg-transparent shadow-none"
      >
        <ColorPicker color={selected} onChange={onSelect} />
      </PopoverContent>
    </Popover>
  );
}

type AddCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  onCreated: () => void;
};

function AddCategoryDialog({ open, onOpenChange, orgId, onCreated }: AddCategoryDialogProps) {
  const [fields, setFields] = useState<CategoryField[]>([
    { name: "", color: nextColor(0) },
  ]);
  const [saving, setSaving] = useState(false);

  function handleClose() {
    onOpenChange(false);
    setFields([{ name: "", color: nextColor(0) }]);
  }

  function updateName(index: number, value: string) {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, name: value } : f)),
    );
  }

  function updateColor(index: number, color: string) {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, color } : f)),
    );
  }

  function addField() {
    setFields((prev) => [...prev, { name: "", color: nextColor(prev.length) }]);
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  const hasAnyValue = fields.some((f) => f.name.trim().length > 0);

  async function handleSave() {
    const toCreate = fields.filter((f) => f.name.trim().length > 0);
    if (!toCreate.length) return;
    setSaving(true);
    try {
      await Promise.all(
        toCreate.map((f) =>
          createTransactionCategory(orgId, { name: f.name.trim(), color: f.color }),
        ),
      );
      onCreated();
      handleClose();
      toast.success(
        toCreate.length === 1
          ? "Category added"
          : `${toCreate.length} categories added`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add categories");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Categories</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {fields.map((field, i) => (
            <div key={i} className="flex items-center gap-2">
              <ColorDotPicker
                selected={field.color}
                onSelect={(c) => updateColor(i, c)}
              />
              <Input
                autoFocus={i === fields.length - 1}
                placeholder="Category name"
                value={field.name}
                onChange={(e) => updateName(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addField();
                  }
                }}
                className="text-xs"
              />
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeField(i)}
                  className="text-muted-foreground fine-hover:text-destructive transition-colors shrink-0"
                >
                  <Delete01Icon size={14} />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addField}
            className="flex items-center gap-1.5 text-xs text-muted-foreground fine-hover:text-foreground transition-colors w-fit"
          >
            <PlusSignIcon size={13} />
            Add another
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!hasAnyValue || saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type CategoryRowProps = {
  category: TransactionCategory;
  orgId: string;
  onDeleted: () => void;
  onUpdated: () => void;
};

function CategoryRow({ category, orgId, onDeleted, onUpdated }: CategoryRowProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteTransactionCategory(category.id, orgId);
      onDeleted();
      toast.success("Category deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setDeleting(false);
    }
  }

  async function handleColorChange(color: string) {
    try {
      await updateTransactionCategory(category.id, orgId, { color });
      onUpdated();
    } catch {
      toast.error("Failed to update color");
    }
  }

  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5">
      {category.system ? (
        <div
          className="size-2.5 rounded-full shrink-0"
          style={{ backgroundColor: category.color ?? "#888" }}
        />
      ) : (
        <ColorDotPicker
          selected={category.color ?? "#888"}
          onSelect={handleColorChange}
        />
      )}
      <span className="flex-1 text-xs">{category.name}</span>
      {category.system ? (
        <LockPasswordIcon size={12} className="text-muted-foreground/50 shrink-0" />
      ) : (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-muted-foreground fine-hover:text-destructive transition-colors shrink-0 disabled:opacity-40"
        >
          <Delete01Icon size={13} />
        </button>
      )}
    </div>
  );
}

export function CategoriesSettingsPage() {
  const { orgId } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["transaction-categories", orgId],
    queryFn: () => listTransactionCategories(orgId!),
    enabled: !!orgId,
  });

  const systemCategories = categories.filter((c) => c.system);
  const customCategories = categories.filter((c) => !c.system);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["transaction-categories", orgId] });
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-sm font-semibold">Transaction Categories</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          System categories are built-in and cannot be renamed or deleted. Custom categories can be
          added, recolored, or removed.
        </p>
      </div>

      <Separator />

      {/* System categories */}
      {systemCategories.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            System ({systemCategories.length})
          </h3>
          <div className="rounded-lg border overflow-hidden divide-y">
            {systemCategories.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                orgId={orgId!}
                onDeleted={invalidate}
                onUpdated={invalidate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom categories */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Custom ({customCategories.length})
        </h3>
        {isLoading ? (
          <div className="rounded-lg border overflow-hidden divide-y">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2.5">
                <div className="size-2.5 rounded-full bg-muted animate-pulse" />
                <div className="h-3 w-32 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : customCategories.length > 0 ? (
          <div className="rounded-lg border overflow-hidden divide-y">
            {customCategories.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                orgId={orgId!}
                onDeleted={invalidate}
                onUpdated={invalidate}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border">
            <EmptyState
              icon={Tag01Icon}
              title="No custom categories"
              description="Add your own to appear alongside the defaults."
            />
          </div>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-fit gap-1.5"
        onClick={() => setDialogOpen(true)}
      >
        <PlusSignIcon size={13} />
        Add category
      </Button>

      {orgId && (
        <AddCategoryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          orgId={orgId}
          onCreated={invalidate}
        />
      )}
    </div>
  );
}
