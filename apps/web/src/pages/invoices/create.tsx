import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trackEvent, LogEvents } from "@/lib/analytics";
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  CheckmarkCircle01Icon,
  Settings02Icon,
  PlusSignIcon,
  Delete01Icon,
  Sent02Icon,
  ClockCheckIcon,
  FileEditIcon,
} from "@travada-books/ui/icons";
import { CustomerCombobox, type SelectedCustomer } from "@/components/invoices/customer-combobox";
import { RecurringDialog, type RecurringFrequency, type RecurringSettings } from "@/components/invoices/recurring-dialog";
import { createInvoiceRecurring, addFrequency, type InvoiceRecurringFrequency } from "@/lib/queries/invoice-recurring";
import { ScheduleDialog } from "@/components/invoices/schedule-dialog";
import {
  InvoiceSettingsSheet,
  type InvoiceSettings,
  defaultInvoiceSettings,
} from "@/components/invoices/invoice-settings-sheet";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@travada-books/ui/components/dropdown-menu";
import { createInvoice, getNextInvoiceNumber } from "@/lib/queries/invoices";
import { lookupRate } from "@/lib/queries/exchange-rates";
import { getCustomer } from "@/lib/queries/customers";
import { getOrgInvoiceTemplate, upsertOrgInvoiceTemplate } from "@/lib/queries/invoice-templates";
import { useAuth, type UserOrg } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Spinner } from "@/components/shared/spinner";
import { toast } from "sonner";

type LineItem = {
  id: string;
  description: string;
  qty: string;
  rate: string;
  tax: string;
};

const currencies = ["KES", "USD", "EUR", "GBP", "ZAR", "UGX", "TZS"];

const DATE_FORMAT_MAP: Record<InvoiceSettings["dateFormat"], string> = {
  "DD/MM/YYYY": "dd/MM/yyyy",
  "MM/DD/YYYY": "MM/dd/yyyy",
  "YYYY-MM-DD": "yyyy-MM-dd",
};

function computeTotals(
  items: LineItem[],
  discountType: "%" | "fixed",
  discountValue: string,
  vatRate: string,
) {
  const subtotal = items.reduce(
    (sum, item) =>
      sum + (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0),
    0,
  );
  const lineItemTax = items.reduce((sum, item) => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const taxRate = parseFloat(item.tax) || 0;
    return sum + qty * rate * (taxRate / 100);
  }, 0);
  const discountAmt =
    discountType === "%"
      ? subtotal * ((parseFloat(discountValue) || 0) / 100)
      : parseFloat(discountValue) || 0;
  const vat = (subtotal - discountAmt) * ((parseFloat(vatRate) || 0) / 100);
  const taxAmount = lineItemTax + vat;
  const total = subtotal - discountAmt + taxAmount;
  return { subtotal, taxAmount, discountAmt, total };
}

function InvoicePreview({
  invoiceNumber,
  issueDate,
  dueDate,
  currency,
  items,
  discountType,
  discountValue,
  vatRate,
  paymentDetails,
  notes,
  dateFormat,
  showTaxColumn,
  showQtyColumn,
  customer,
  org,
  logoUrl,
}: {
  invoiceNumber: string;
  issueDate: Date | undefined;
  dueDate: Date | undefined;
  currency: string;
  items: LineItem[];
  discountType: "%" | "fixed";
  discountValue: string;
  vatRate: string;
  paymentDetails: string;
  notes: string;
  dateFormat: InvoiceSettings["dateFormat"];
  showTaxColumn: boolean;
  showQtyColumn: boolean;
  customer: SelectedCustomer | null;
  org: UserOrg | null;
  logoUrl: string | null;
}) {
  const { subtotal, taxAmount, discountAmt, total } = computeTotals(
    items,
    discountType,
    discountValue,
    vatRate,
  );
  const lineItemTax = items.reduce((sum, item) => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const taxRate = parseFloat(item.tax) || 0;
    return sum + qty * rate * (taxRate / 100);
  }, 0);
  const vat = taxAmount - lineItemTax;

  return (
    <div className="rounded-lg border bg-white p-8 text-sm dark:bg-card">
      <div className="flex items-start justify-between">
        <div>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={org?.name}
              className="h-8 w-auto max-w-[120px] object-contain"
            />
          ) : (
            <div className="flex size-8 items-center justify-center rounded bg-foreground text-background text-[10px] font-bold">
              {org?.name?.slice(0, 2).toUpperCase() ?? "TB"}
            </div>
          )}
          <div className="mt-2 space-y-0.5">
            <p className="font-semibold text-foreground">{org?.name ?? "Your Business"}</p>
            {org?.address_line1 && <p className="text-xs text-muted-foreground">{org.address_line1}</p>}
            {org?.address_line2 && <p className="text-xs text-muted-foreground">{org.address_line2}</p>}
            {(org?.city || org?.zip) && (
              <p className="text-xs text-muted-foreground">{[org.city, org.zip].filter(Boolean).join(" ")}</p>
            )}
            {org?.country_code && <p className="text-xs text-muted-foreground">{org.country_code}</p>}
            {org?.phone && <p className="text-xs text-muted-foreground">{org.phone}</p>}
            {org?.email && <p className="text-xs text-muted-foreground">{org.email}</p>}
            {org?.tax_id && <p className="text-xs text-muted-foreground">PIN: {org.tax_id}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-foreground">INVOICE</p>
          <p className="text-xs text-muted-foreground">{invoiceNumber || "INV-0001"}</p>
        </div>
      </div>

      <Separator className="my-5" />

      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <p className="font-medium text-foreground">Bill To</p>
          {customer ? (
            <div className="mt-1 space-y-0.5">
              <p className="font-medium text-foreground">{customer.name}</p>
              {customer.address_line1 && <p className="text-muted-foreground">{customer.address_line1}</p>}
              {customer.address_line2 && <p className="text-muted-foreground">{customer.address_line2}</p>}
              {(customer.city || customer.zip) && (
                <p className="text-muted-foreground">{[customer.city, customer.zip].filter(Boolean).join(" ")}</p>
              )}
              {customer.country && <p className="text-muted-foreground">{customer.country}</p>}
              {customer.phone && <p className="text-muted-foreground">{customer.phone}</p>}
              {(customer.billing_email || customer.email) && (
                <p className="text-muted-foreground">{customer.billing_email ?? customer.email}</p>
              )}
            </div>
          ) : (
            <p className="mt-1 text-muted-foreground/50 italic">No customer selected</p>
          )}
        </div>
        <div className="text-right">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Issue date:</span>
            <span className="font-medium">
              {issueDate ? format(issueDate, DATE_FORMAT_MAP[dateFormat]) : "—"}
            </span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-muted-foreground">Due date:</span>
            <span className="font-medium">
              {dueDate ? format(dueDate, DATE_FORMAT_MAP[dateFormat]) : "—"}
            </span>
          </div>
        </div>
      </div>

      <Separator className="my-5" />

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="w-1/2 pb-2 text-left font-medium">Description</th>
            {showQtyColumn && (
              <th className="whitespace-nowrap pb-2 pl-4 text-right font-medium">Qty</th>
            )}
            <th className="whitespace-nowrap pb-2 pl-4 text-right font-medium">Rate</th>
            {showTaxColumn && (
              <th className="whitespace-nowrap pb-2 pl-4 text-right font-medium">Tax</th>
            )}
            <th className="whitespace-nowrap pb-2 pl-4 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const amount = (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
            return (
              <tr key={item.id} className="border-b border-dashed">
                <td className="py-2 break-words">{item.description || "—"}</td>
                {showQtyColumn && (
                  <td className="whitespace-nowrap py-2 pl-4 text-right">{item.qty || "0"}</td>
                )}
                <td className="whitespace-nowrap py-2 pl-4 text-right">{item.rate || "0.00"}</td>
                {showTaxColumn && (
                  <td className="whitespace-nowrap py-2 pl-4 text-right">{item.tax || "0"}%</td>
                )}
                <td className="whitespace-nowrap py-2 pl-4 text-right">
                  {currency}{" "}
                  {amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 flex flex-col items-end gap-1.5 text-xs">
        <div className="flex w-48 justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{currency} {subtotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
        </div>
        {lineItemTax > 0 && (
          <div className="flex w-48 justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>{currency} {lineItemTax.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {discountAmt > 0 && (
          <div className="flex w-48 justify-between text-green-600 dark:text-green-400">
            <span>Discount{discountType === "%" ? ` (${discountValue}%)` : ""}</span>
            <span>− {currency} {discountAmt.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {vat > 0 && (
          <div className="flex w-48 justify-between">
            <span className="text-muted-foreground">VAT ({vatRate}%)</span>
            <span>{currency} {vat.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        <Separator className="my-1 w-48" />
        <div className="flex w-48 justify-between font-semibold text-sm">
          <span>Total</span>
          <span>{currency} {total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {paymentDetails && (
        <>
          <Separator className="my-5" />
          <div>
            <p className="text-xs font-medium text-foreground">Payment Details</p>
            <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{paymentDetails}</p>
          </div>
        </>
      )}

      {notes && (
        <>
          <Separator className="my-5" />
          <div>
            <p className="text-xs font-medium text-foreground">Notes</p>
            <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{notes}</p>
          </div>
        </>
      )}

      <Separator className="my-5" />
      <p className="text-center text-[10px] text-muted-foreground">Powered by Travada Books</p>
    </div>
  );
}

export function CreateInvoicePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId");
  const { orgId, user, org } = useAuth();
  const queryClient = useQueryClient();

  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);

  const { data: preselectedCustomer } = useQuery({
    queryKey: ["customer", preselectedCustomerId, orgId],
    queryFn: () => getCustomer(preselectedCustomerId!, orgId!),
    enabled: !!preselectedCustomerId && !!orgId,
  });

  useEffect(() => {
    if (preselectedCustomer && !selectedCustomer) {
      setSelectedCustomer({
        id: preselectedCustomer.id,
        name: preselectedCustomer.name,
        email: preselectedCustomer.email,
        billing_email: preselectedCustomer.billing_email,
        phone: preselectedCustomer.phone,
        address_line1: preselectedCustomer.address_line1,
        address_line2: preselectedCustomer.address_line2,
        city: preselectedCustomer.city,
        zip: preselectedCustomer.zip,
        country: preselectedCustomer.country,
      });
    }
  }, [preselectedCustomer, selectedCustomer]);
  const [currency, setCurrency] = useState("KES");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState<Date | undefined>(undefined);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [discountType, setDiscountType] = useState<"%" | "fixed">("%");
  const [discountValue, setDiscountValue] = useState("");
  const [vatRate, setVatRate] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [recurring, setRecurring] = useState<RecurringFrequency>("one_time");
  const [recurringSettings, setRecurringSettings] = useState<RecurringSettings | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<"draft" | "send" | "schedule">("draft");
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [invoiceSettingsOpen, setInvoiceSettingsOpen] = useState(false);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(defaultInvoiceSettings);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [items, setItems] = useState<LineItem[]>([
    { id: "1", description: "", qty: "1", rate: "", tax: "0" },
  ]);
  const [invoiceNumberError, setInvoiceNumberError] = useState<string | null>(null);
  const [isManualInvoiceNumber, setIsManualInvoiceNumber] = useState(false);

  const { data: nextNumber } = useQuery({
    queryKey: ["next-invoice-number", orgId, selectedCustomer?.id],
    queryFn: () => getNextInvoiceNumber(orgId!, selectedCustomer!.id),
    enabled: !!orgId && !!selectedCustomer?.id,
  });

  const { data: savedTemplate } = useQuery({
    queryKey: ["invoice-template", orgId],
    queryFn: () => getOrgInvoiceTemplate(orgId!),
    enabled: !!orgId,
  });

  useEffect(() => {
    if (savedTemplate) {
      setInvoiceSettings(savedTemplate);
      if (savedTemplate.defaultNote && !notes) setNotes(savedTemplate.defaultNote);
      if (savedTemplate.defaultPaymentDetails && !paymentDetails) setPaymentDetails(savedTemplate.defaultPaymentDetails);
    }
  }, [savedTemplate, notes]);

  useEffect(() => {
    if (nextNumber && !isManualInvoiceNumber) setInvoiceNumber(nextNumber);
  }, [nextNumber, isManualInvoiceNumber]);

  useEffect(() => {
    if (!issueDate || invoiceSettings.paymentTerms == null) return;
    const due = new Date(issueDate);
    due.setDate(due.getDate() + invoiceSettings.paymentTerms);
    setDueDate(due);
  }, [issueDate, invoiceSettings.paymentTerms]);

  const createMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["invoices", orgId] });
      toast.success("Invoice created");
      trackEvent(LogEvents.InvoiceCreated);
      navigate(`/invoices/${invoice.id}`);
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("already used")) {
        setInvoiceNumberError(msg);
      } else {
        toast.error("Failed to create invoice", { description: msg || "Please try again." });
      }
    },
  });

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), description: "", qty: "1", rate: "", tax: "0" },
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

  async function buildInput(action: "draft" | "send" | "schedule", scheduleDate?: Date) {
    const { subtotal, taxAmount, discountAmt, total } = computeTotals(
      items,
      discountType,
      discountValue,
      vatRate,
    );

    const lineItems = items.map((item) => ({
      description: item.description,
      quantity: parseFloat(item.qty) || 0,
      price: parseFloat(item.rate) || 0,
      tax_rate: parseFloat(item.tax) || 0,
    }));

    const isSend = action === "send";
    const isSchedule = action === "schedule";

    let exchangeRate: number | null = null
    let convertedAmount: number | null = null
    if (isSend && org) {
      try {
        exchangeRate = await lookupRate(currency, org.base_currency)
        convertedAmount = exchangeRate != null ? total * exchangeRate : null
      } catch {
        throw new Error("exchange_rate_lookup_failed")
      }
    }

    return {
      org_id: orgId!,
      user_id: user!.id,
      customer_id: selectedCustomer!.id,
      customer_name: selectedCustomer!.name,
      invoice_number: invoiceNumber,
      status: isSend ? "unpaid" : isSchedule ? "scheduled" : "draft",
      currency,
      issue_date: issueDate ? format(issueDate, "yyyy-MM-dd") : null,
      due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
      recurring,
      line_items: lineItems,
      subtotal,
      tax_amount: taxAmount,
      discount: discountAmt,
      total,
      payment_details: paymentDetails,
      note: notes,
      delivery_type: action === "draft" ? "none" : "email",
      scheduled_at: isSchedule && scheduleDate ? scheduleDate.toISOString() : null,
      send_template_id: null, // template picker coming in a later stage
      accept_payments: invoiceSettings.acceptPaymentsEnabled,
      invoice_template: invoiceSettings.invoiceTemplate,
      ...(isSend && { sent_at: new Date().toISOString() }),
      ...(isSend && {
        exchange_rate: exchangeRate,
        converted_amount: convertedAmount,
        base_currency: org?.base_currency ?? null,
      }),
      ...((isSend || isSchedule) && org && {
        from_details: {
          name: org.name,
          logo_url: org.logo_url ?? null,
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
      ...((isSend || isSchedule) && selectedCustomer && {
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

  async function handleSubmit(action: "draft" | "send" | "schedule", scheduleDate?: Date) {
    if (!selectedCustomer || !orgId || !user) return;
    try {
      const invoice = await createMutation.mutateAsync(await buildInput(action, scheduleDate));
      if (action === "send") {
        trackEvent(LogEvents.InvoiceSent);
        supabase.functions.invoke("send-invoice-email", { body: { invoiceId: invoice.id } }).catch(() => {
          toast.warning("Invoice created, but email delivery failed.");
        });
      }
      if (action === "schedule" && scheduleDate) {
        supabase.functions.invoke("trigger-scheduled-send", {
          body: { invoiceId: invoice.id, scheduledAt: scheduleDate.toISOString() },
        }).catch(() => {
          toast.warning("Invoice scheduled, but failed to queue the send job. Contact support.");
        });
      }
      if (recurring !== "one_time" && invoice.issue_date) {
        try {
          const freq = recurring as InvoiceRecurringFrequency;
          const nextDate = addFrequency(invoice.issue_date, freq);
          const series = await createInvoiceRecurring({
            org_id: orgId,
            user_id: user.id,
            customer_id: selectedCustomer.id,
            customer_name: selectedCustomer.name,
            currency: invoice.currency,
            line_items: invoice.line_items,
            subtotal: invoice.subtotal ?? 0,
            tax_amount: invoice.tax_amount ?? 0,
            discount: invoice.discount ?? 0,
            total: invoice.total ?? 0,
            payment_details: invoice.payment_details ?? "",
            note: invoice.note ?? "",
            accept_payments: invoice.accept_payments,
            invoice_template: invoice.invoice_template,
            from_details: invoice.from_details ?? null,
            customer_details: invoice.customer_details ?? null,
            source_issue_date: invoice.issue_date,
            source_due_date: invoice.due_date ?? null,
            frequency: freq,
            end_type: recurringSettings?.endsType === "on" ? "on_date"
              : recurringSettings?.endsType === "after" ? "after_count"
              : "never",
            end_on_date: recurringSettings?.endsOnDate
              ? format(recurringSettings.endsOnDate, "yyyy-MM-dd")
              : null,
            end_after_count: recurringSettings?.endsType === "after"
              ? parseInt(recurringSettings.endsAfterCount, 10) || null
              : null,
            status: "active",
            next_scheduled_at: new Date(nextDate + "T00:00:00Z").toISOString(),
          });
          // Link first invoice back to the series
          const { error: linkError } = await supabase
            .from("invoices")
            .update({ invoice_recurring_id: series.id, recurring_sequence: 1 })
            .eq("id", invoice.id);
          if (linkError) throw linkError;
        } catch {
          toast.warning("Invoice saved, but failed to set up recurring series. Contact support.");
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message === "exchange_rate_lookup_failed") {
        toast.error("Failed to fetch exchange rate", { description: "Please try again." });
      }
      // otherwise onError handles the toast
    }
  }

  const isSubmitting = createMutation.isPending;

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate("/invoices")}
          >
            <ArrowLeft01Icon size={14} />
          </Button>
          <div>
            <p className="text-sm font-semibold">New Invoice</p>
            <p className="text-xs text-muted-foreground">Generate and send new invoice.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => setInvoiceSettingsOpen(true)}
          >
            <Settings02Icon size={13} />
            Invoice Settings
          </Button>
          <div className="flex">
            <Button
              className="rounded-r-none border-r-0 gap-1.5"
              disabled={isSubmitting || !selectedCustomer}
              onClick={() => {
                if (deliveryMode === "schedule") setScheduleDialogOpen(true);
                else handleSubmit(deliveryMode);
              }}
            >
              {isSubmitting ? (
                <Spinner size={13} />
              ) : (
                <>
                  {deliveryMode === "draft" && <FileEditIcon size={13} />}
                  {deliveryMode === "send" && <Sent02Icon size={13} />}
                  {deliveryMode === "schedule" && <ClockCheckIcon size={13} />}
                </>
              )}
              {deliveryMode === "draft" && (isSubmitting ? "Creating…" : "Create Invoice")}
              {deliveryMode === "send" && (isSubmitting ? "Sending…" : "Create + Send")}
              {deliveryMode === "schedule" && (isSubmitting ? "Scheduling…" : "Schedule Send")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    className="rounded-l-none px-2"
                    disabled={isSubmitting}
                    aria-label="Change delivery mode"
                  />
                }
              >
                <ArrowDown01Icon size={13} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  className="flex items-center justify-between"
                  onClick={() => setDeliveryMode("draft")}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">Create Invoice</span>
                    <span className="text-[11px] text-muted-foreground">Save as draft</span>
                  </div>
                  {deliveryMode === "draft" && <CheckmarkCircle01Icon size={13} />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex items-center justify-between"
                  onClick={() => setDeliveryMode("send")}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">Create + Send</span>
                    <span className="text-[11px] text-muted-foreground">Send to customer now</span>
                  </div>
                  {deliveryMode === "send" && <CheckmarkCircle01Icon size={13} />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex items-center justify-between"
                  onClick={() => setDeliveryMode("schedule")}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">Schedule Send</span>
                    <span className="text-[11px] text-muted-foreground">Pick a date to send</span>
                  </div>
                  {deliveryMode === "schedule" && <CheckmarkCircle01Icon size={13} />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="justify-between"
                  onClick={() => setRecurringDialogOpen(true)}
                >
                  <div className="flex flex-col gap-0.5">
                    <span>Recurring</span>
                    {recurring !== "one_time" && (
                      <span className="text-[11px] text-muted-foreground">Active</span>
                    )}
                  </div>
                  {recurring !== "one_time" && <CheckmarkCircle01Icon size={14} />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <RecurringDialog
        open={recurringDialogOpen}
        onOpenChange={setRecurringDialogOpen}
        onSave={(settings) => {
          setRecurring(settings.frequency);
          setRecurringSettings(settings);
        }}
      />
      <ScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSave={(settings) => handleSubmit("schedule", settings.sendAt)}
      />
      <InvoiceSettingsSheet
        open={invoiceSettingsOpen}
        onOpenChange={(open) => {
          setInvoiceSettingsOpen(open);
          if (!open && settingsDirty && orgId) {
            setSettingsDirty(false);
            upsertOrgInvoiceTemplate(orgId, invoiceSettings).catch(() =>
              toast.error("Failed to save invoice settings"),
            );
          }
        }}
        settings={invoiceSettings}
        onSettingsChange={(s) => {
          setInvoiceSettings(s);
          setSettingsDirty(true);
        }}
        orgId={orgId ?? ""}
      />

      {/* Split panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Form */}
        <div className="flex w-1/2 flex-col gap-5 overflow-y-auto border-r p-6">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Bill To</Label>
            <CustomerCombobox
              value={selectedCustomer?.id ?? null}
              onChange={(customer) => { setSelectedCustomer(customer); setIsManualInvoiceNumber(false); }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoice-number" className="text-xs">Invoice #</Label>
              <Input
                id="invoice-number"
                value={invoiceNumber}
                onChange={(e) => { setInvoiceNumber(e.target.value); setInvoiceNumberError(null); setIsManualInvoiceNumber(true); }}
                placeholder="Select a customer first"
                className={invoiceNumberError ? "border-destructive text-xs" : "text-xs"}
              />
              {invoiceNumberError && (
                <p className="text-[11px] text-destructive">{invoiceNumberError}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Currency</Label>
              <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
                <SelectTrigger className="text-xs w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Issue Date</Label>
              <DatePicker value={issueDate} onChange={setIssueDate} placeholder="Pick issue date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Due Date</Label>
              <DatePicker value={dueDate} onChange={setDueDate} placeholder="Pick due date" />
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

          {/* Tax & Discounts */}
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
            <Label htmlFor="payment-details" className="text-xs">
              Payment Details (optional)
            </Label>
            <Textarea
              id="payment-details"
              placeholder={"Bank: Equity Bank\nAccount: 1234567890\nM-Pesa: 0700 000 000"}
              value={paymentDetails}
              onChange={(e) => setPaymentDetails(e.target.value)}
              className="text-xs"
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes" className="text-xs">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder={"Thank you for your business.\nPayment due within 30 days."}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs"
              rows={3}
            />
          </div>

        </div>

        {/* Right: Preview */}
        <div className="flex w-1/2 flex-col overflow-y-auto bg-muted/30 p-6">
          <p className="mb-4 text-xs font-medium text-muted-foreground">Preview</p>
          <InvoicePreview
            invoiceNumber={invoiceNumber}
            issueDate={issueDate}
            dueDate={dueDate}
            currency={currency}
            items={items}
            discountType={discountType}
            discountValue={discountValue}
            vatRate={vatRate}
            paymentDetails={paymentDetails}
            notes={notes}
            dateFormat={invoiceSettings.dateFormat}
            showTaxColumn={invoiceSettings.showTaxColumn}
            showQtyColumn={invoiceSettings.showQtyColumn}
            customer={selectedCustomer}
            org={org}
            logoUrl={invoiceSettings.logoUrl}
          />
        </div>
      </div>
    </div>
  );
}
