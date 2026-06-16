import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trackEvent, LogEvents } from "@/lib/analytics";
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  CheckmarkCircle01Icon,
  PlusSignIcon,
  Delete01Icon,
  Sent02Icon,
  FileEditIcon,
  Settings02Icon,
} from "@travada-books/ui/icons";
import { CurrencySelect } from "@travada-books/ui/components/currency-select";
import {
  CustomerCombobox,
  type SelectedCustomer,
} from "@/components/invoices/customer-combobox";
import { DatePicker } from "@/components/shared/date-picker";
import { format } from "date-fns";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { Label } from "@travada-books/ui/components/label";
import { Textarea } from "@travada-books/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@travada-books/ui/components/select";
import { Separator } from "@travada-books/ui/components/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@travada-books/ui/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { createQuote, getNextQuoteNumber } from "@/lib/queries/quotes";
import { lookupRate } from "@/lib/queries/exchange-rates";
import { getOrgInvoiceTemplate } from "@/lib/queries/invoice-templates";
import {
  getOrgQuoteTemplate,
  upsertOrgQuoteTemplate,
} from "@/lib/queries/quote-templates";
import { QuoteSettingsSheet } from "@/components/quotes/quote-settings-sheet";
import {
  defaultQuoteSettings,
  type QuoteSettings,
} from "@/components/quotes/quote-settings";
import { LineItem, QuotePreview } from "@/components/quotes/quote-preview";
import { computeQuoteTotals } from "@/components/quotes/quote-utils";
import { supabase } from "@/lib/supabase";

export function CreateQuotePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { orgId, user, org } = useAuth();

  const [selectedCustomer, setSelectedCustomer] =
    useState<SelectedCustomer | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<"draft" | "send">("draft");
  const [currency, setCurrency] = useState(org?.base_currency ?? "KES");
  useEffect(() => {
    if (org?.base_currency) setCurrency(org.base_currency);
  }, [org?.base_currency]);
  const [quoteNumber, setQuoteNumber] = useState("");
  const [quoteNumberError, setQuoteNumberError] = useState<string | null>(null);
  const [isManualQuoteNumber, setIsManualQuoteNumber] = useState(false);
  const [issueDate, setIssueDate] = useState<Date | undefined>(undefined);
  const [validUntil, setValidUntil] = useState<Date | undefined>(undefined);
  const [discountType, setDiscountType] = useState<"%" | "fixed">("%");
  const [discountValue, setDiscountValue] = useState("");
  const [vatRate, setVatRate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { id: "1", description: "", qty: "1", rate: "", tax: "0" },
  ]);

  const { data: nextQuoteNumber } = useQuery({
    queryKey: ["next-quote-number", orgId],
    queryFn: () => getNextQuoteNumber(orgId!),
    enabled: !!orgId,
  });

  const { data: quotesExist } = useQuery({
    queryKey: ["quotes-exist", orgId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId!);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    enabled: !!orgId,
  });

  const { data: invoiceTemplate } = useQuery({
    queryKey: ["invoice-template", orgId],
    queryFn: () => getOrgInvoiceTemplate(orgId!),
    enabled: !!orgId,
  });
  const logoUrl = invoiceTemplate?.logoUrl ?? null;

  const [quoteSettingsOpen, setQuoteSettingsOpen] = useState(false);
  const [quoteSettings, setQuoteSettings] =
    useState<QuoteSettings>(defaultQuoteSettings);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const { data: quoteTemplate } = useQuery({
    queryKey: ["quote-template", orgId],
    queryFn: () => getOrgQuoteTemplate(orgId!),
    enabled: !!orgId,
  });

  useEffect(() => {
    if (quoteTemplate && !settingsLoaded) {
      setQuoteSettings(quoteTemplate);
      setSettingsLoaded(true);
      if (!notes && quoteTemplate.defaultNote)
        setNotes(quoteTemplate.defaultNote);
    }
  }, [quoteTemplate, settingsLoaded, notes]);

  useEffect(() => {
    setSettingsLoaded(false);
    setQuoteSettings(defaultQuoteSettings);
    setSettingsDirty(false);
    setQuoteSettingsOpen(false);
    setNotes("");
  }, [orgId]);

  useEffect(() => {
    if (!issueDate || quoteSettings.validityDays == null) return;
    const due = new Date(issueDate);
    due.setDate(due.getDate() + quoteSettings.validityDays);
    setValidUntil(due);
  }, [issueDate, quoteSettings.validityDays]);

  useEffect(() => {
    if (nextQuoteNumber && !isManualQuoteNumber)
      setQuoteNumber(nextQuoteNumber);
  }, [nextQuoteNumber, isManualQuoteNumber]);

  async function buildInput(action: "draft" | "send") {
    const totals = computeQuoteTotals(items, discountType, discountValue, vatRate);
    const lineItems = items.map((item) => ({
      description: item.description,
      quantity: parseFloat(item.qty) || 0,
      price: parseFloat(item.rate) || 0,
      tax_rate: parseFloat(item.tax) || 0,
    }));
    const isSend = action === "send";

    let exchangeRate: number | null = null;
    let convertedAmount: number | null = null;
    if (org) {
      try {
        exchangeRate = await lookupRate(currency, org.base_currency);
        convertedAmount = exchangeRate != null ? totals.total * exchangeRate : null;
      } catch {
        // non-fatal: stats will fall back to raw total
      }
    }

    return {
      org_id: orgId!,
      user_id: user!.id,
      customer_id: selectedCustomer!.id,
      customer_name: selectedCustomer!.name,
      quote_number: quoteNumber,
      currency,
      issue_date: issueDate ? format(issueDate, "yyyy-MM-dd") : null,
      valid_until: validUntil ? format(validUntil, "yyyy-MM-dd") : null,
      line_items: lineItems,
      ...totals,
      exchange_rate: exchangeRate,
      converted_amount: convertedAmount,
      base_currency: org?.base_currency ?? null,
      note: notes || null,
      internal_note: null,
      ...(isSend && { sent_at: new Date().toISOString() }),
      ...(isSend &&
        org && {
          from_details: {
            name: org.name,
            logo_url: logoUrl,
            address_line1: org.address_line1 ?? null,
            address_line2: org.address_line2 ?? null,
            city: org.city ?? null,
            zip: org.zip ?? null,
            country_code: org.country_code ?? null,
            phone: org.phone ?? null,
            email: org.email ?? null,
            tax_id: org.tax_id ?? null,
          },
        }),
      ...(isSend &&
        selectedCustomer && {
          customer_details: {
            name: selectedCustomer.name,
            email: selectedCustomer.email ?? null,
            billing_email: selectedCustomer.billing_email ?? null,
            phone: selectedCustomer.phone ?? null,
            address_line1: selectedCustomer.address_line1 ?? null,
            address_line2: selectedCustomer.address_line2 ?? null,
            city: selectedCustomer.city ?? null,
            zip: selectedCustomer.zip ?? null,
            country: selectedCustomer.country ?? null,
          },
        }),
    };
  }

  const { mutate: handleSubmit, isPending } = useMutation({
    mutationFn: async (action: "draft" | "send") => createQuote(await buildInput(action)),
    onSuccess: (quote, action) => {
      queryClient.invalidateQueries({ queryKey: ["quotes", orgId] });
      queryClient.invalidateQueries({ queryKey: ["next-quote-number", orgId] });
      trackEvent(LogEvents.QuoteCreated);
      if (action === "send") {
        trackEvent(LogEvents.QuoteSent);
        supabase.functions
          .invoke("send-quote-email", { body: { quoteId: quote.id } })
          .catch(() => {
            toast.warning("Quote created, but email delivery failed.");
          });
      }
      navigate(`/quotes/${quote.id}`);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Failed to save quote";
      if (msg.includes("already been used")) {
        setQuoteNumberError(msg);
      } else {
        toast.error(msg);
      }
    },
  });

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        description: "",
        qty: "1",
        rate: "",
        tax: "0",
      },
    ]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateItem(id: string, field: keyof LineItem, value: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Page header */}
      <div className='flex items-center justify-between border-b px-6 py-3'>
        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            size='icon-sm'
            onClick={() => navigate("/quotes")}
          >
            <ArrowLeft01Icon size={14} />
          </Button>
          <div>
            <p className='text-sm font-semibold'>New Quote</p>
            <p className='text-xs text-muted-foreground'>
              Create and send a quote to your client.
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            className='gap-1.5 text-xs'
            onClick={() => setQuoteSettingsOpen(true)}
          >
            <Settings02Icon size={13} />
            Quote Settings
          </Button>
          <div className='flex'>
            <Button
              className='rounded-r-none border-r-0 gap-1.5'
              onClick={() => handleSubmit(deliveryMode)}
              disabled={isPending || !selectedCustomer}
            >
              {deliveryMode === "draft" ?
                <FileEditIcon size={13} />
              : <Sent02Icon size={13} />}
              {isPending ?
                deliveryMode === "draft" ?
                  "Saving…"
                : "Sending…"
              : deliveryMode === "draft" ?
                "Save as Draft"
              : "Send Quote"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    className='rounded-l-none px-2'
                    disabled={isPending}
                    aria-label='Change delivery mode'
                  />
                }
              >
                <ArrowDown01Icon size={13} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-52'>
                <DropdownMenuItem
                  className='flex items-center justify-between'
                  onClick={() => setDeliveryMode("draft")}
                >
                  <div className='flex flex-col gap-0.5'>
                    <span className='font-medium'>Save as Draft</span>
                    <span className='text-[11px] text-muted-foreground'>
                      Save without sending
                    </span>
                  </div>
                  {deliveryMode === "draft" && (
                    <CheckmarkCircle01Icon size={13} />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className='flex items-center justify-between'
                  onClick={() => setDeliveryMode("send")}
                >
                  <div className='flex flex-col gap-0.5'>
                    <span className='font-medium'>Send Quote</span>
                    <span className='text-[11px] text-muted-foreground'>
                      Save and send to client now
                    </span>
                  </div>
                  {deliveryMode === "send" && (
                    <CheckmarkCircle01Icon size={13} />
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Split panel */}
      <div className='flex flex-1 overflow-hidden'>
        {/* Left: Form */}
        <div className='flex w-1/2 flex-col gap-5 overflow-y-auto border-r p-6'>
          <div className='flex flex-col gap-1.5'>
            <Label className='text-xs text-muted-foreground'>
              Prepared For
            </Label>
            <CustomerCombobox
              value={selectedCustomer?.id ?? null}
              onChange={(customer) => {
                setSelectedCustomer(customer);
                setIsManualQuoteNumber(false);
              }}
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='flex flex-col gap-1.5'>
              <Label htmlFor='quote-number' className='text-xs'>
                Quote #
              </Label>
              <Input
                id='quote-number'
                value={quoteNumber}
                onChange={(e) => {
                  setQuoteNumber(e.target.value);
                  setQuoteNumberError(null);
                  setIsManualQuoteNumber(true);
                }}
                placeholder='Select a customer first'
                disabled={!selectedCustomer}
                className={cn(
                  "text-xs",
                  quoteNumberError && "border-destructive",
                )}
              />
              {quoteNumberError && (
                <p className='text-[11px] text-destructive'>
                  {quoteNumberError}
                </p>
              )}
            </div>
            <div className='flex flex-col gap-1.5'>
              <Label className='text-xs'>Currency</Label>
              <CurrencySelect
                value={currency}
                onValueChange={(v) => v && setCurrency(v)}
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='flex flex-col gap-1.5'>
              <Label className='text-xs'>Issue Date</Label>
              <DatePicker
                value={issueDate}
                onChange={setIssueDate}
                placeholder='Pick issue date'
              />
            </div>
            <div className='flex flex-col gap-1.5'>
              <Label className='text-xs'>Valid Until</Label>
              <DatePicker
                value={validUntil}
                onChange={setValidUntil}
                placeholder='Pick expiry date'
              />
            </div>
          </div>

          <Separator />

          {/* Line items */}
          <div className='flex flex-col gap-2'>
            <div className='grid grid-cols-[1fr_60px_80px_60px_32px] gap-2 text-xs font-medium text-muted-foreground'>
              <span>Description</span>
              <span>Qty</span>
              <span>Rate</span>
              <span />
            </div>
            {items.map((item) => (
              <div
                key={item.id}
                className='grid grid-cols-[1fr_60px_80px_60px_32px] gap-2'
              >
                <Input
                  placeholder='Item description'
                  value={item.description}
                  onChange={(e) =>
                    updateItem(item.id, "description", e.target.value)
                  }
                  className='text-xs'
                />
                <Input
                  placeholder='1'
                  value={item.qty}
                  onChange={(e) => updateItem(item.id, "qty", e.target.value)}
                  className='text-xs'
                />
                <Input
                  placeholder='0.00'
                  value={item.rate}
                  onChange={(e) => updateItem(item.id, "rate", e.target.value)}
                  className='text-xs'
                />
                <Button
                  variant='ghost'
                  size='icon-sm'
                  onClick={() => removeItem(item.id)}
                  disabled={items.length === 1}
                >
                  <Delete01Icon size={12} />
                </Button>
              </div>
            ))}
            <Button
              variant='outline'
              size='sm'
              className='mt-1 w-fit gap-1'
              onClick={addItem}
            >
              <PlusSignIcon size={12} />
              Add line item
            </Button>
          </div>

          <Separator />

          {/* Tax & Discounts */}
          <div className='flex flex-col gap-3'>
            <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
              Tax & Discounts
            </p>
            <div className='flex items-center gap-2'>
              <Label className='w-20 shrink-0 text-xs'>Discount</Label>
              <div className='flex flex-1 items-center gap-1.5'>
                <Select
                  value={discountType}
                  onValueChange={(v) => setDiscountType(v as "%" | "fixed")}
                >
                  <SelectTrigger className='w-16 text-xs'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='%' className='text-xs'>
                      %
                    </SelectItem>
                    <SelectItem value='fixed' className='text-xs'>
                      {currency}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder='0'
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className='text-xs'
                />
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Label className='w-20 shrink-0 text-xs'>VAT / Tax %</Label>
              <Input
                placeholder='e.g. 16'
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                className='flex-1 text-xs'
              />
            </div>
          </div>

          <Separator />

          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='notes' className='text-xs'>
              Notes (optional)
            </Label>
            <Textarea
              id='notes'
              placeholder="Terms, conditions, or anything you'd like to include on the quote."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className='text-xs'
              rows={3}
            />
          </div>
        </div>

        {/* Right: Preview */}
        <div className='flex w-1/2 flex-col overflow-y-auto bg-muted/30 p-6'>
          <p className='mb-4 text-xs font-medium text-muted-foreground'>
            Preview
          </p>
          <QuotePreview
            quoteNumber={quoteNumber}
            issueDate={issueDate}
            validUntil={validUntil}
            currency={currency}
            items={items}
            discountType={discountType}
            discountValue={discountValue}
            vatRate={vatRate}
            notes={notes}
            customer={selectedCustomer}
            org={org}
            logoUrl={logoUrl}
          />
        </div>
      </div>

      <QuoteSettingsSheet
        open={quoteSettingsOpen}
        onOpenChange={(open) => {
          setQuoteSettingsOpen(open);
          if (!open && settingsDirty && orgId) {
            setSettingsDirty(false);
            queryClient.setQueryData(["quote-template", orgId], quoteSettings);
            if (!isManualQuoteNumber) {
              const n = parseInt(quoteNumber.replace(/\D/g, ""), 10) || 1;
              setQuoteNumber(quoteSettings.quoteNumberPrefix + String(n).padStart(quoteSettings.quoteNumberDigits, "0"));
            }
            upsertOrgQuoteTemplate(orgId, quoteSettings).catch(() =>
              toast.error("Failed to save quote settings"),
            );
          }
        }}
        settings={quoteSettings}
        onSettingsChange={(s) => {
          setQuoteSettings(s);
          setSettingsDirty(true);
        }}
        lockNumberFormat={quotesExist === true}
      />
    </div>
  );
}
