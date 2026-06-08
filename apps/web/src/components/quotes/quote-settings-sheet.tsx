import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@travada-books/ui/components/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@travada-books/ui/components/select";
import { cn } from "@travada-books/ui/lib/utils";
import { Label } from "@travada-books/ui/components/label";
import { Separator } from "@travada-books/ui/components/separator";
import { Input } from "@travada-books/ui/components/input";
import { Textarea } from "@travada-books/ui/components/textarea";

export type QuoteSettings = {
  quoteTemplate: string;
  defaultNote: string;
  cc: string;
  bcc: string;
  validityDays: number | null;
  quoteNumberPrefix: string;
  quoteNumberDigits: 3 | 4 | 5;
};

export const defaultQuoteSettings: QuoteSettings = {
  quoteTemplate: "classic",
  defaultNote: "",
  cc: "",
  bcc: "",
  validityDays: null,
  quoteNumberPrefix: "QUO-",
  quoteNumberDigits: 4,
};

const VALIDITY_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
];

const templates = [
  { id: "classic", label: "Classic" },
  { id: "modern", label: "Modern" },
  { id: "minimal", label: "Minimal" },
  { id: "bold", label: "Bold" },
];

function TemplateThumbnail({ id }: { id: string }) {
  if (id === "classic") {
    return (
      <div className='flex h-full flex-col gap-1 p-1.5'>
        <div className='flex items-start justify-between'>
          <div className='size-3 rounded-sm bg-muted-foreground/30' />
          <div className='h-1.5 w-8 rounded bg-muted-foreground/20' />
        </div>
        <div className='mt-0.5 h-px w-full bg-muted-foreground/15' />
        <div className='flex flex-col gap-0.5'>
          <div className='h-1 w-10 rounded bg-muted-foreground/20' />
          <div className='h-1 w-7 rounded bg-muted-foreground/15' />
        </div>
        <div className='mt-auto flex flex-col items-end gap-0.5'>
          <div className='h-1 w-8 rounded bg-muted-foreground/20' />
          <div className='h-1 w-6 rounded bg-muted-foreground/15' />
          <div className='h-1.5 w-10 rounded bg-muted-foreground/30' />
        </div>
      </div>
    );
  }
  if (id === "modern") {
    return (
      <div className='flex h-full flex-col gap-1 p-1.5'>
        <div className='flex h-4 w-full items-center rounded-sm bg-muted-foreground/20 px-1.5'>
          <div className='h-1.5 w-6 rounded bg-muted-foreground/40' />
        </div>
        <div className='mt-0.5 flex flex-col gap-0.5'>
          <div className='h-1 w-12 rounded bg-muted-foreground/20' />
          <div className='h-1 w-8 rounded bg-muted-foreground/15' />
        </div>
        <div className='mt-auto flex flex-col items-end gap-0.5'>
          <div className='h-1 w-8 rounded bg-muted-foreground/20' />
          <div className='h-1.5 w-10 rounded bg-primary/40' />
        </div>
      </div>
    );
  }
  if (id === "minimal") {
    return (
      <div className='flex h-full flex-col gap-1 p-1.5'>
        <div className='h-1.5 w-8 rounded bg-muted-foreground/30' />
        <div className='h-px w-full bg-muted-foreground/15' />
        <div className='flex flex-col gap-0.5'>
          <div className='h-1 w-10 rounded bg-muted-foreground/15' />
          <div className='h-1 w-7 rounded bg-muted-foreground/10' />
        </div>
        <div className='mt-auto flex flex-col items-end gap-0.5'>
          <div className='h-px w-full bg-muted-foreground/15' />
          <div className='h-1.5 w-10 rounded bg-muted-foreground/25' />
        </div>
      </div>
    );
  }
  if (id === "bold") {
    return (
      <div className='flex h-full flex-col gap-1 p-1.5'>
        <div className='flex items-start justify-between'>
          <div className='h-4 w-5 rounded-sm bg-foreground/30' />
          <div className='flex flex-col items-end gap-0.5'>
            <div className='h-1.5 w-8 rounded bg-foreground/20' />
            <div className='h-1 w-5 rounded bg-muted-foreground/15' />
          </div>
        </div>
        <div className='mt-0.5 h-px w-full bg-muted-foreground/15' />
        <div className='flex flex-col gap-0.5'>
          <div className='h-1 w-10 rounded bg-muted-foreground/20' />
          <div className='h-1 w-7 rounded bg-muted-foreground/15' />
        </div>
        <div className='mt-auto flex flex-col items-end gap-0.5'>
          <div className='h-1.5 w-10 rounded bg-foreground/25' />
        </div>
      </div>
    );
  }
  return null;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: QuoteSettings;
  onSettingsChange: (settings: QuoteSettings) => void;
};

export function QuoteSettingsSheet({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}: Props) {
  function update<K extends keyof QuoteSettings>(
    key: K,
    value: QuoteSettings[K],
  ) {
    onSettingsChange({ ...settings, [key]: value });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='sm:max-w-xs overflow-y-auto'>
        <SheetHeader>
          <SheetTitle>Quote Settings</SheetTitle>
        </SheetHeader>

        <div className='flex flex-col gap-6 px-4 pb-6'>
          {/* Templates */}
          <div className='flex flex-col gap-3'>
            <p className='text-xs font-medium'>Quote Template</p>
            <div className='grid grid-cols-2 gap-2'>
              {templates.map((t) => (
                <button
                  key={t.id}
                  type='button'
                  onClick={() => update("quoteTemplate", t.id)}
                  className={cn(
                    "flex flex-col overflow-hidden rounded-lg border bg-card transition-all",
                    settings.quoteTemplate === t.id ?
                      "border-primary ring-1 ring-primary"
                    : "border-border hover:border-muted-foreground/40",
                  )}
                >
                  <div className='h-16 w-full bg-muted/50'>
                    <TemplateThumbnail id={t.id} />
                  </div>
                  <p className='border-t px-2 py-1.5 text-center text-[11px] font-medium'>
                    {t.label}
                  </p>
                </button>
              ))}
            </div>
            <p className='text-[11px] text-muted-foreground'>
              More templates coming soon.
            </p>
          </div>

          <Separator />

          {/* Validity period */}
          <div className='flex flex-col gap-2'>
            <div className='flex flex-col gap-0.5'>
              <Label className='text-xs font-medium'>Default Validity Period</Label>
              <p className='text-[11px] text-muted-foreground'>
                "Valid Until" auto-calculates from the issue date.
              </p>
            </div>
            <Select
              value={
                settings.validityDays != null ?
                  String(settings.validityDays)
                : "none"
              }
              onValueChange={(v) =>
                update("validityDays", v === "none" ? null : Number(v))
              }
            >
              <SelectTrigger className='text-xs w-1/2'>
                <SelectValue placeholder='No default' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='none' className='text-xs'>
                  No default
                </SelectItem>
                {VALIDITY_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className='text-xs'
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Quote number format */}
          <div className='flex flex-col gap-2'>
            <div className='flex flex-col gap-0.5'>
              <Label className='text-xs font-medium'>Quote Number</Label>
              <p className='text-[11px] text-muted-foreground'>
                Format used when generating quote numbers.
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <Input
                value={settings.quoteNumberPrefix}
                onChange={(e) => update("quoteNumberPrefix", e.target.value)}
                placeholder='QUO-'
                className='text-xs w-24'
                maxLength={10}
              />
              <Select
                value={String(settings.quoteNumberDigits)}
                onValueChange={(v) =>
                  update("quoteNumberDigits", Number(v) as 3 | 4 | 5)
                }
              >
                <SelectTrigger className='text-xs w-20'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='3' className='text-xs'>3 digits</SelectItem>
                  <SelectItem value='4' className='text-xs'>4 digits</SelectItem>
                  <SelectItem value='5' className='text-xs'>5 digits</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className='text-[11px] text-muted-foreground'>
              Preview:{" "}
              <span className='font-medium text-foreground'>
                {(settings.quoteNumberPrefix || "QUO-") +
                  "1".padStart(settings.quoteNumberDigits, "0")}
              </span>
            </p>
          </div>

          <Separator />

          {/* Default note */}
          <div className='flex flex-col gap-2'>
            <div className='flex flex-col gap-0.5'>
              <Label className='text-xs font-medium'>Default Note</Label>
              <p className='text-[11px] text-muted-foreground'>
                Pre-filled on every new quote. Edit per quote as needed.
              </p>
            </div>
            <Textarea
              value={settings.defaultNote}
              onChange={(e) => update("defaultNote", e.target.value)}
              placeholder='e.g. This quote is valid for 30 days from the issue date.'
              className='text-xs'
              rows={3}
            />
          </div>

          <Separator />

          {/* Send copy */}
          <div className='flex flex-col gap-3'>
            <div>
              <p className='text-xs font-medium'>Send Copy</p>
              <p className='mt-0.5 text-[11px] text-muted-foreground'>
                Comma-separated email addresses.
              </p>
            </div>
            <div className='flex flex-col gap-2'>
              <div className='flex flex-col gap-1.5'>
                <Label htmlFor='quote-cc' className='text-xs font-normal'>
                  CC
                </Label>
                <Input
                  id='quote-cc'
                  value={settings.cc}
                  onChange={(e) => update("cc", e.target.value)}
                  placeholder='finance@company.com, cfo@company.com'
                  className='text-xs'
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <Label htmlFor='quote-bcc' className='text-xs font-normal'>
                  BCC
                </Label>
                <Input
                  id='quote-bcc'
                  value={settings.bcc}
                  onChange={(e) => update("bcc", e.target.value)}
                  placeholder='records@company.com'
                  className='text-xs'
                />
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
