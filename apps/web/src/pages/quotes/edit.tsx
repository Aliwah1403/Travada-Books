import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trackEvent, LogEvents } from "@/lib/analytics";
import {
  ArrowLeft01Icon,
  PlusSignIcon,
  Delete01Icon,
  FloppyDiskIcon,
  Settings02Icon,
} from "@travada-books/ui/icons";
import { CurrencySelect } from "@travada-books/ui/components/currency-select";
import { CustomerCombobox } from "@/components/invoices/customer-combobox";
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
import { Skeleton } from "@travada-books/ui/components/skeleton";
import { toast } from "sonner";
import { cn } from "@travada-books/ui/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { getQuote, updateQuote } from "@/lib/queries/quotes";
import { getOrgQuoteTemplate, upsertOrgQuoteTemplate } from "@/lib/queries/quote-templates";
import { QuoteSettingsSheet } from "@/components/quotes/quote-settings-sheet";
import {
  defaultQuoteSettings,
  type QuoteSettings,
} from "@/components/quotes/quote-settings";

type LineItem = {
  id: string;
  description: string;
  qty: string;
  rate: string;
  tax: string;
};


function buildTotals(
  items: LineItem[],
  discountType: "%" | "fixed",
  discountValue: string,
  vatRate: string,
) {
  const subtotal = items.reduce(
    (sum, item) => sum + (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0),
    0,
  );
  const lineItemTax = items.reduce(
    (sum, item) =>
      sum +
      (parseFloat(item.qty) || 0) *
        (parseFloat(item.rate) || 0) *
        ((parseFloat(item.tax) || 0) / 100),
    0,
  );
  const discountAmt =
    discountType === "%"
      ? subtotal * ((parseFloat(discountValue) || 0) / 100)
      : parseFloat(discountValue) || 0;
  const vat = (subtotal - discountAmt) * ((parseFloat(vatRate) || 0) / 100);
  return {
    subtotal,
    tax_amount: lineItemTax + vat,
    discount: discountAmt,
    total: subtotal - discountAmt + lineItemTax + vat,
  };
}

export function EditQuotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { orgId } = useAuth();
  const [initialized, setInitialized] = useState(false);

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [currency, setCurrency] = useState("KES");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [quoteNumberError, setQuoteNumberError] = useState<string | null>(null);
  const [issueDate, setIssueDate] = useState<Date | undefined>(undefined);
  const [validUntil, setValidUntil] = useState<Date | undefined>(undefined);
  const [discountType, setDiscountType] = useState<"%" | "fixed">("%");
  const [discountValue, setDiscountValue] = useState("");
  const [vatRate, setVatRate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { id: "1", description: "", qty: "1", rate: "", tax: "0" },
  ]);

  const { data: quote, isLoading } = useQuery({
    queryKey: ["quote", id],
    queryFn: () => getQuote(id!, orgId!),
    enabled: !!id && !!orgId,
  });

  const [quoteSettingsOpen, setQuoteSettingsOpen] = useState(false);
  const [quoteSettings, setQuoteSettings] = useState<QuoteSettings>(defaultQuoteSettings);
  const [settingsDirty, setSettingsDirty] = useState(false);

  const { data: quoteTemplate } = useQuery({
    queryKey: ["quote-template", orgId],
    queryFn: () => getOrgQuoteTemplate(orgId!),
    enabled: !!orgId,
  });

  useEffect(() => {
    if (quoteTemplate) setQuoteSettings(quoteTemplate);
  }, [quoteTemplate]);

  // Pre-populate form from existing quote
  useEffect(() => {
    if (!quote || initialized) return;
    setCustomerId(quote.customer_id);
    setCurrency(quote.currency);
    setQuoteNumber(quote.quote_number ?? "");
    if (quote.issue_date) setIssueDate(new Date(quote.issue_date));
    if (quote.valid_until) setValidUntil(new Date(quote.valid_until));
    setNotes(quote.note ?? "");

    const rawItems = (quote.line_items ?? []) as Array<{
      description: string;
      quantity: number;
      price: number;
      tax_rate: number;
    }>;
    if (rawItems.length > 0) {
      setItems(
        rawItems.map((item, i) => ({
          id: String(i + 1),
          description: item.description,
          qty: String(item.quantity),
          rate: String(item.price),
          tax: String(item.tax_rate),
        })),
      );
    }

    // Reverse-compute discount
    if (quote.discount && quote.discount > 0) {
      setDiscountType("fixed");
      setDiscountValue(String(quote.discount));
    }

    setInitialized(true);
  }, [quote, initialized]);

  const { mutate: saveEdit, isPending } = useMutation({
    mutationFn: () => {
      if (!id) throw new Error("No quote id");
      const totals = buildTotals(items, discountType, discountValue, vatRate);
      const dbItems = items.map((item) => ({
        description: item.description,
        quantity: parseFloat(item.qty) || 0,
        price: parseFloat(item.rate) || 0,
        tax_rate: parseFloat(item.tax) || 0,
      }));

      return updateQuote(id, orgId!, {
        quote_number: quoteNumber,
        currency,
        issue_date: issueDate ? format(issueDate, "yyyy-MM-dd") : null,
        valid_until: validUntil ? format(validUntil, "yyyy-MM-dd") : null,
        line_items: dbItems,
        ...totals,
        note: notes || null,
        // Reset declined quotes to draft so they can be reviewed and resent
        ...(quote?.status === "declined" ? { status: "draft" } : {}),
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["quote", id] });
      queryClient.invalidateQueries({ queryKey: ["quotes", orgId] });
      trackEvent(LogEvents.QuoteCreated);
      navigate(`/quotes/${updated.id}`);
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("already been used")) {
        setQuoteNumberError(msg);
      } else {
        toast.error("Failed to save quote. Please try again.");
      }
    },
  });

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), description: "", qty: "1", rate: "", tax: "0" },
    ]);
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const updateItem = (itemId: string, field: keyof LineItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b px-6 py-3">
          <Skeleton className="h-7 w-7 rounded" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 border-r p-6 space-y-4">
            <Skeleton className="h-10 rounded" />
            <Skeleton className="h-10 rounded" />
            <Skeleton className="h-32 rounded" />
          </div>
          <div className="w-1/2 p-6">
            <Skeleton className="h-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Quote not found.</p>
      </div>
    );
  }

  // Accepted quotes are permanently locked (invoice was created)
  if (quote.status === "accepted") {
    navigate(`/quotes/${id}`);
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(`/quotes/${id}`)}>
            <ArrowLeft01Icon size={14} />
          </Button>
          <div>
            <p className="text-sm font-semibold">Edit Quote</p>
            <p className="text-xs text-muted-foreground font-mono">{quote.quote_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setQuoteSettingsOpen(true)}
          >
            <Settings02Icon size={13} />
            Quote Settings
          </Button>
          <Button
            className="gap-1.5"
            onClick={() => saveEdit()}
            disabled={isPending || !customerId || !quoteNumber}
          >
            <FloppyDiskIcon size={13} />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Split panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Form */}
        <div className="flex w-1/2 flex-col gap-5 overflow-y-auto border-r p-6">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Prepared For</Label>
            <CustomerCombobox value={customerId} onChange={setCustomerId} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quote-number" className="text-xs">
                Quote #
              </Label>
              <Input
                id="quote-number"
                value={quoteNumber}
                onChange={(e) => {
                  setQuoteNumber(e.target.value);
                  setQuoteNumberError(null);
                }}
                className={cn("text-xs", quoteNumberError && "border-destructive")}
              />
              {quoteNumberError && (
                <p className="text-xs text-destructive">{quoteNumberError}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Currency</Label>
              <CurrencySelect value={currency} onValueChange={(v) => v && setCurrency(v)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Issue Date</Label>
              <DatePicker value={issueDate} onChange={setIssueDate} placeholder="Pick issue date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Valid Until</Label>
              <DatePicker
                value={validUntil}
                onChange={setValidUntil}
                placeholder="Pick expiry date"
              />
            </div>
          </div>

          <Separator />

          {/* Line items */}
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1fr_60px_80px_60px_32px] gap-2 text-xs font-medium text-muted-foreground">
              <span>Description</span>
              <span>Qty</span>
              <span>Rate</span>
              <span />
            </div>
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_60px_80px_60px_32px] gap-2">
                <Input
                  placeholder="Item description"
                  value={item.description}
                  onChange={(e) => updateItem(item.id, "description", e.target.value)}
                  className="text-xs"
                />
                <Input
                  placeholder="1"
                  value={item.qty}
                  onChange={(e) => updateItem(item.id, "qty", e.target.value)}
                  className="text-xs"
                />
                <Input
                  placeholder="0.00"
                  value={item.rate}
                  onChange={(e) => updateItem(item.id, "rate", e.target.value)}
                  className="text-xs"
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeItem(item.id)}
                  disabled={items.length === 1}
                >
                  <Delete01Icon size={12} />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="mt-1 w-fit gap-1" onClick={addItem}>
              <PlusSignIcon size={12} />
              Add line item
            </Button>
          </div>

          <Separator />

          {/* Tax / Discount */}
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Tax & Discounts
            </p>

            <div className="flex items-center gap-2">
              <Label className="w-20 shrink-0 text-xs">Discount</Label>
              <div className="flex flex-1 items-center gap-1.5">
                <Select
                  value={discountType}
                  onValueChange={(v) => setDiscountType(v as "%" | "fixed")}
                >
                  <SelectTrigger className="w-16 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="%" className="text-xs">%</SelectItem>
                    <SelectItem value="fixed" className="text-xs">{currency}</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Label className="w-20 shrink-0 text-xs">VAT / Tax %</Label>
              <Input
                placeholder="e.g. 16"
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                className="flex-1 text-xs"
              />
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes" className="text-xs">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Terms, conditions, or anything you'd like to include on the quote."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs"
              rows={3}
            />
          </div>
        </div>

        {/* Right: placeholder preview */}
        <div className="flex w-1/2 items-center justify-center bg-muted/30 p-6">
          <p className="text-xs text-muted-foreground">Preview updates on save</p>
        </div>
      </div>

      <QuoteSettingsSheet
        open={quoteSettingsOpen}
        onOpenChange={(open) => {
          setQuoteSettingsOpen(open);
          if (!open && settingsDirty && orgId) {
            setSettingsDirty(false);
            queryClient.setQueryData(["quote-template", orgId], quoteSettings);
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
        lockNumberFormat
      />
    </div>
  );
}
