import { useState } from "react";
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
import { Tag01Icon, PlusSignIcon, Delete01Icon } from "@travada-books/ui/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@travada-books/ui/components/popover";
import { EmptyState } from "@/components/shared/empty-state";
import { ColorPicker, COLOR_PALETTE } from "@/components/shared/color-picker";

type CustomCategory = {
  id: string;
  name: string;
  color: string;
};

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
            type='button'
            className='size-4 rounded-full shrink-0 transition-[transform,opacity] active:scale-90 fine-hover:opacity-80'
            style={{ backgroundColor: selected }}
          />
        }
      />
      <PopoverContent
        side='bottom'
        align='start'
        sideOffset={6}
        className='w-auto p-0 border-0 bg-transparent shadow-none'
      >
        <ColorPicker color={selected} onChange={onSelect} />
      </PopoverContent>
    </Popover>
  );
}

type AddCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function AddCategoryDialog({ open, onOpenChange }: AddCategoryDialogProps) {
  const [fields, setFields] = useState<CategoryField[]>([
    { name: "", color: nextColor(0) },
  ]);

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

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className='max-w-sm'>
        <DialogHeader>
          <DialogTitle>Add Categories</DialogTitle>
        </DialogHeader>

        <div className='flex flex-col gap-4'>
          {fields.map((field, i) => (
            <div key={i} className='flex items-center gap-2'>
              <ColorDotPicker
                selected={field.color}
                onSelect={(c) => updateColor(i, c)}
              />
              <Input
                autoFocus={i === fields.length - 1}
                placeholder='Category name'
                value={field.name}
                onChange={(e) => updateName(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addField();
                  }
                }}
                className='text-xs'
              />
              {fields.length > 1 && (
                <button
                  type='button'
                  onClick={() => removeField(i)}
                  className='text-muted-foreground fine-hover:text-destructive transition-colors shrink-0'
                >
                  <Delete01Icon size={14} />
                </button>
              )}
            </div>
          ))}

          <button
            type='button'
            onClick={addField}
            className='flex items-center gap-1.5 text-xs text-muted-foreground fine-hover:text-foreground transition-colors w-fit'
          >
            <PlusSignIcon size={13} />
            Add another
          </button>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={handleClose}>
            Cancel
          </Button>
          <Button disabled={!hasAnyValue}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const CUSTOM_CATEGORIES: CustomCategory[] = [];

export function CategoriesSettingsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className='flex flex-col gap-8'>
      <div>
        <h2 className='text-sm font-semibold'>Custom Categories</h2>
        <p className='text-xs text-muted-foreground mt-0.5'>
          Add your own categories to appear alongside the defaults when
          recording transactions.
        </p>
      </div>

      <Separator />

      {CUSTOM_CATEGORIES.length > 0 ?
        <div className='rounded-lg border overflow-hidden divide-y'>
          {CUSTOM_CATEGORIES.map((cat) => (
            <div key={cat.id} className='flex items-center gap-2.5 px-3 py-2.5'>
              <div
                className='size-2.5 rounded-full shrink-0'
                style={{ backgroundColor: cat.color }}
              />
              <span className='flex-1 text-xs'>{cat.name}</span>
            </div>
          ))}
        </div>
      : <div className='rounded-lg border'>
          <EmptyState
            icon={Tag01Icon}
            title='No custom categories'
            description='Add your own to appear alongside the defaults.'
          />
        </div>
      }

      <Button
        variant='outline'
        size='sm'
        className='w-fit gap-1.5'
        onClick={() => setDialogOpen(true)}
      >
        <PlusSignIcon size={13} />
        Add category
      </Button>

      <AddCategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
