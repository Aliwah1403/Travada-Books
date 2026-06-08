import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
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
import { TickIcon } from "@travada-books/ui/icons";
import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@travada-books/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@travada-books/ui/components/tooltip";

export type InvoiceSettings = {
  invoiceTemplate: string;
  dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  paymentTerms: number | null;
  defaultNote: string;
  defaultPaymentDetails: string;
  showTaxColumn: boolean;
  showQtyColumn: boolean;
  acceptPaymentsEnabled: boolean;
  selectedPaymentIntegration: string | null;
  cc: string;
  bcc: string;
  logoUrl: string | null;
  reminderDaysAfterDue: 3 | 5 | 7 | 10 | null;
  invoiceNumberPrefix: string;
  invoiceNumberDigits: 3 | 4 | 5;
};

export const defaultInvoiceSettings: InvoiceSettings = {
  invoiceTemplate: "classic",
  dateFormat: "DD/MM/YYYY",
  paymentTerms: null,
  defaultNote: "",
  defaultPaymentDetails: "",
  showTaxColumn: false,
  showQtyColumn: true,
  acceptPaymentsEnabled: false,
  selectedPaymentIntegration: null,
  cc: "",
  bcc: "",
  logoUrl: null,
  reminderDaysAfterDue: null,
  invoiceNumberPrefix: "INV-",
  invoiceNumberDigits: 4,
};

const PAYMENT_TERMS_OPTIONS = [
  { value: "0", label: "Due on receipt" },
  { value: "7", label: "Net 7" },
  { value: "14", label: "Net 14" },
  { value: "21", label: "Net 21" },
  { value: "30", label: "Net 30" },
  { value: "60", label: "Net 60" },
];

// Mock: integrations the business has configured. Replace with real data when backend is ready.
const connectedIntegrations = [
  { id: "mpesa", label: "M-Pesa", description: "Safaricom M-Pesa" },
  { id: "stripe", label: "Stripe", description: "Cards & bank transfers" },
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
        <div className='mt-auto flex flex-col gap-0.5 items-end'>
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
        <div className='h-4 w-full rounded-sm bg-muted-foreground/20 flex items-center px-1.5'>
          <div className='h-1.5 w-6 rounded bg-muted-foreground/40' />
        </div>
        <div className='flex flex-col gap-0.5 mt-0.5'>
          <div className='h-1 w-12 rounded bg-muted-foreground/20' />
          <div className='h-1 w-8 rounded bg-muted-foreground/15' />
        </div>
        <div className='mt-auto flex flex-col gap-0.5 items-end'>
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
        <div className='mt-auto flex flex-col gap-0.5 items-end'>
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
        <div className='mt-auto flex flex-col gap-0.5 items-end'>
          <div className='h-1.5 w-10 rounded bg-foreground/25' />
        </div>
      </div>
    );
  }
  return null;
}

function SettingsSwitch({
  checked,
  onCheckedChange,
  id,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id: string;
}) {
  return (
    <SwitchPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "data-checked:bg-primary bg-input",
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-background shadow-sm ring-0 transition-transform",
          "data-checked:translate-x-4 translate-x-0",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: InvoiceSettings;
  onSettingsChange: (settings: InvoiceSettings) => void;
  orgId: string;
  lockNumberFormat?: boolean;
};

export function InvoiceSettingsSheet({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  orgId,
  lockNumberFormat = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function update<K extends keyof InvoiceSettings>(
    key: K,
    value: InvoiceSettings[K],
  ) {
    onSettingsChange({ ...settings, [key]: value });
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File must be 2 MB or smaller");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const ext = file.name.split(".").pop();
    const path = `logos/${orgId}/invoice-logo.${ext}`;

    setUploading(true);
    const { error } = await supabase.storage
      .from("org-assets")
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error("Failed to upload logo");
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("org-assets").getPublicUrl(path);
    // Bust cache so the new image loads immediately
    update("logoUrl", `${data.publicUrl}?t=${Date.now()}`);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleLogoRemove() {
    if (!settings.logoUrl) return;
    const ext = settings.logoUrl.split("invoice-logo.")[1]?.split("?")[0];
    if (ext) {
      const { error } = await supabase.storage
        .from("org-assets")
        .remove([`logos/${orgId}/invoice-logo.${ext}`]);
      if (error) {
        console.error("Failed to delete logo from storage:", error);
        toast.warning("Logo removed from your settings, but the file could not be deleted from storage.");
      }
    }
    update("logoUrl", null);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='sm:max-w-xs overflow-y-auto'>
        <SheetHeader>
          <SheetTitle>Invoice Settings</SheetTitle>
        </SheetHeader>

        <div className='flex flex-col gap-6 px-4 pb-6'>
          {/* Logo */}
          <div className='flex flex-col gap-2'>
            <p className='text-xs font-medium'>Invoice Logo</p>
            <p className='text-[11px] text-muted-foreground'>
              Shown at the top of every invoice. Leave empty for no logo.
            </p>
            <div className='flex items-center gap-3 mt-1'>
              <div className='flex size-14 shrink-0 items-center justify-center rounded-lg border bg-muted overflow-hidden'>
                {settings.logoUrl ?
                  <img
                    src={settings.logoUrl}
                    alt='Invoice logo'
                    className='size-full object-contain'
                  />
                : <span className='text-[10px] text-muted-foreground'>
                    No logo
                  </span>
                }
              </div>
              <div className='flex flex-col gap-1.5'>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/png,image/jpeg,image/jpg,image/webp,image/svg+xml'
                  className='hidden'
                  onChange={handleLogoUpload}
                />
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='text-xs h-7'
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ?
                    "Uploading…"
                  : settings.logoUrl ?
                    "Replace"
                  : "Upload"}
                </Button>
                {settings.logoUrl && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='text-xs h-7 text-destructive hover:text-destructive'
                    onClick={handleLogoRemove}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <p className='text-[11px] text-muted-foreground'>
              PNG, JPG, WebP or SVG · max 2 MB
            </p>
          </div>

          <Separator />

          {/* Templates */}
          <div className='flex flex-col gap-3'>
            <p className='text-xs font-medium'>Invoice Template</p>
            <div className='grid grid-cols-2 gap-2'>
              {templates.map((t) => (
                <button
                  key={t.id}
                  type='button'
                  onClick={() => update("invoiceTemplate", t.id)}
                  className={cn(
                    "flex flex-col overflow-hidden rounded-lg border bg-card transition-all",
                    settings.invoiceTemplate === t.id ?
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

          {/* Date format */}
          <div className='flex flex-col gap-2'>
            <Label className='text-xs font-medium'>Date Format</Label>
            <Select
              value={settings.dateFormat}
              onValueChange={(v) =>
                v && update("dateFormat", v as InvoiceSettings["dateFormat"])
              }
            >
              <SelectTrigger className='text-xs w-1/2'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='DD/MM/YYYY' className='text-xs'>
                  DD/MM/YYYY
                </SelectItem>
                <SelectItem value='MM/DD/YYYY' className='text-xs'>
                  MM/DD/YYYY
                </SelectItem>
                <SelectItem value='YYYY-MM-DD' className='text-xs'>
                  YYYY-MM-DD
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Invoice Number Format */}
          <div className='flex flex-col gap-2'>
            <div className='flex flex-col gap-0.5'>
              <Label className='text-xs font-medium'>Invoice Number</Label>
              <p className='text-[11px] text-muted-foreground'>
                Format used when generating invoice numbers.
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex items-center gap-2",
                    lockNumberFormat && "cursor-not-allowed opacity-50",
                  )}
                >
                  <Input
                    value={settings.invoiceNumberPrefix}
                    onChange={(e) => update("invoiceNumberPrefix", e.target.value)}
                    placeholder='INV-'
                    className='text-xs w-24'
                    maxLength={10}
                    disabled={lockNumberFormat}
                  />
                  <Select
                    value={String(settings.invoiceNumberDigits)}
                    onValueChange={(v) =>
                      update("invoiceNumberDigits", Number(v) as 3 | 4 | 5)
                    }
                    disabled={lockNumberFormat}
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
              </TooltipTrigger>
              {lockNumberFormat && (
                <TooltipContent side='bottom'>
                  Format is locked once invoices have been created
                </TooltipContent>
              )}
            </Tooltip>
            <p className='text-[11px] text-muted-foreground'>
              Preview:{" "}
              <span className='font-medium text-foreground'>
                {(settings.invoiceNumberPrefix || "INV-") +
                  "1".padStart(settings.invoiceNumberDigits, "0")}
              </span>
            </p>
          </div>

          <Separator />

          {/* Payment terms */}
          <div className='flex flex-col gap-2'>
            <div className='flex flex-col gap-0.5'>
              <Label className='text-xs font-medium'>Payment Terms</Label>
              <p className='text-[11px] text-muted-foreground'>
                Due date auto-calculates from the issue date.
              </p>
            </div>
            <Select
              value={
                settings.paymentTerms != null ?
                  String(settings.paymentTerms)
                : "none"
              }
              onValueChange={(v) =>
                update("paymentTerms", v === "none" ? null : Number(v))
              }
            >
              <SelectTrigger className='text-xs w-1/2'>
                <SelectValue placeholder='No default' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='none' className='text-xs'>
                  No default
                </SelectItem>
                {PAYMENT_TERMS_OPTIONS.map((opt) => (
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

          {/* Auto reminders */}
          <div className='flex flex-col gap-2'>
            <div className='flex flex-col gap-0.5'>
              <Label className='text-xs font-medium'>Auto Reminders</Label>
              <p className='text-[11px] text-muted-foreground'>
                Automatically send a payment reminder after the invoice due
                date.
              </p>
            </div>
            <Select
              value={
                settings.reminderDaysAfterDue != null ?
                  String(settings.reminderDaysAfterDue)
                : "off"
              }
              onValueChange={(v) => {
                const ALLOWED = [3, 5, 7, 10] as const;
                const n = Number(v);
                const validated = (ALLOWED as readonly number[]).includes(n)
                  ? (n as 3 | 5 | 7 | 10)
                  : null;
                update("reminderDaysAfterDue", v === "off" ? null : validated);
              }}
            >
              <SelectTrigger className='text-xs w-1/2'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='off' className='text-xs'>
                  Off
                </SelectItem>
                <SelectItem value='3' className='text-xs'>
                  3 days after due date
                </SelectItem>
                <SelectItem value='5' className='text-xs'>
                  5 days after due date
                </SelectItem>
                <SelectItem value='7' className='text-xs'>
                  7 days after due date
                </SelectItem>
                <SelectItem value='10' className='text-xs'>
                  10 days after due date
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Column visibility */}
          <div className='flex flex-col gap-3'>
            <p className='text-xs font-medium'>Columns</p>
            <div className='flex flex-col gap-3'>
              <div className='flex items-center justify-between gap-3'>
                <Label
                  htmlFor='show-tax-col'
                  className='text-xs font-normal cursor-pointer'
                >
                  Show tax column
                </Label>
                <SettingsSwitch
                  id='show-tax-col'
                  checked={settings.showTaxColumn}
                  onCheckedChange={(v) => update("showTaxColumn", v)}
                />
              </div>
              <div className='flex items-center justify-between gap-3'>
                <Label
                  htmlFor='show-qty-col'
                  className='text-xs font-normal cursor-pointer'
                >
                  Show quantity column
                </Label>
                <SettingsSwitch
                  id='show-qty-col'
                  checked={settings.showQtyColumn}
                  onCheckedChange={(v) => update("showQtyColumn", v)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Accept payment */}
          <div className='flex flex-col gap-3'>
            <div className='flex items-start justify-between gap-3'>
              <div className='flex flex-col gap-1'>
                <p className='text-xs font-medium'>Accept Payments</p>
                <p className='text-[11px] text-muted-foreground'>
                  Adds a Pay Invoice button to the customer's invoice link.
                </p>
              </div>
              <SettingsSwitch
                id='accept-payments'
                checked={settings.acceptPaymentsEnabled}
                onCheckedChange={(v) => {
                  onSettingsChange({
                    ...settings,
                    acceptPaymentsEnabled: v,
                    selectedPaymentIntegration:
                      v ? settings.selectedPaymentIntegration : null,
                  });
                }}
              />
            </div>

            {settings.acceptPaymentsEnabled && (
              <div className='flex flex-col gap-1.5'>
                {connectedIntegrations.length === 0 ?
                  <p className='text-[11px] text-muted-foreground rounded-md border border-dashed p-3 text-center'>
                    No payment integrations set up yet. Go to Settings →
                    Integrations to connect one.
                  </p>
                : <div className='flex flex-col gap-1.5'>
                    <p className='text-[11px] text-muted-foreground'>
                      Select payment method
                    </p>
                    {connectedIntegrations.map((integration) => (
                      <button
                        key={integration.id}
                        type='button'
                        onClick={() =>
                          update("selectedPaymentIntegration", integration.id)
                        }
                        className={cn(
                          "flex items-center justify-between rounded-md border px-3 py-2 text-left transition-colors",
                          (
                            settings.selectedPaymentIntegration ===
                              integration.id
                          ) ?
                            "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/40",
                        )}
                      >
                        <div>
                          <p className='text-xs font-medium'>
                            {integration.label}
                          </p>
                          <p className='text-[11px] text-muted-foreground'>
                            {integration.description}
                          </p>
                        </div>
                        {settings.selectedPaymentIntegration ===
                          integration.id && (
                          <TickIcon className='size-4 stroke-primary shrink-0' />
                        )}
                      </button>
                    ))}
                  </div>
                }
              </div>
            )}
          </div>

          <Separator />

          {/* Default note */}
          <div className='flex flex-col gap-2'>
            <div className='flex flex-col gap-0.5'>
              <Label className='text-xs font-medium'>Default Note</Label>
              <p className='text-[11px] text-muted-foreground'>
                Pre-filled on every new invoice. Edit per invoice as needed.
              </p>
            </div>
            <Textarea
              value={settings.defaultNote}
              onChange={(e) => update("defaultNote", e.target.value)}
              placeholder='e.g. Payment due within 30 days. Bank transfer preferred.'
              className='text-xs'
              rows={3}
            />
          </div>

          <Separator />

          {/* Default payment details */}
          <div className='flex flex-col gap-2'>
            <div className='flex flex-col gap-0.5'>
              <Label className='text-xs font-medium'>Default Payment Details</Label>
              <p className='text-[11px] text-muted-foreground'>
                Pre-filled on every new invoice. Edit per invoice as needed.
              </p>
            </div>
            <Textarea
              value={settings.defaultPaymentDetails}
              onChange={(e) => update("defaultPaymentDetails", e.target.value)}
              placeholder={"Bank: Equity Bank\nAccount: 1234567890\nM-Pesa: 0700 000 000"}
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
                <Label htmlFor='invoice-cc' className='text-xs font-normal'>
                  CC
                </Label>
                <Input
                  id='invoice-cc'
                  value={settings.cc}
                  onChange={(e) => update("cc", e.target.value)}
                  placeholder='finance@company.com, cfo@company.com'
                  className='text-xs'
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <Label htmlFor='invoice-bcc' className='text-xs font-normal'>
                  BCC
                </Label>
                <Input
                  id='invoice-bcc'
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
