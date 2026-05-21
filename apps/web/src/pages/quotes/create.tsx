import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  Settings02Icon,
  PlusSignIcon,
  Delete01Icon,
  Sent02Icon,
  FloppyDiskIcon,
} from "@travada-books/ui/icons";
import { CustomerCombobox } from "@/components/invoices/customer-combobox";
import { DatePicker } from "@/components/shared/date-picker";
import { incrementInvoiceNumber } from "@/lib/invoice-number";
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

type LineItem = {
  id: string;
  description: string;
  qty: string;
  rate: string;
  tax: string;
};

const currencies = ["KES", "USD", "EUR", "GBP", "ZAR", "UGX", "TZS"];

function QuotePreview({
  quoteNumber,
  issueDate,
  validUntil,
  currency,
  items,
  discountType,
  discountValue,
  vatRate,
  notes,
}: {
  quoteNumber: string;
  issueDate: string;
  validUntil: string;
  currency: string;
  items: LineItem[];
  discountType: "%" | "fixed";
  discountValue: string;
  vatRate: string;
  notes: string;
}) {
  const subtotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    return sum + qty * rate;
  }, 0);
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
  const total = subtotal - discountAmt + lineItemTax + vat;

  return (
    <div className="rounded-lg border bg-white p-8 text-sm dark:bg-card">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <img
            src="https://res.cloudinary.com/dzycxaapd/image/upload/v1745650899/Travada-Green-Alternative_wpsyqb.png"
            alt="Business logo"
            className="h-8 w-auto max-w-[120px] object-contain"
          />
          <p className="mt-2 font-semibold text-foreground">
            Your Business Name
          </p>
          <p className="text-xs text-muted-foreground">Nairobi, Kenya</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-foreground">QUOTATION</p>
          <p className="text-xs text-muted-foreground">
            {quoteNumber || "QUO-0001"}
          </p>
        </div>
      </div>

      <Separator className="my-5" />

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <p className="font-medium text-foreground">Prepared For</p>
          <p className="mt-1 text-muted-foreground">Customer Name</p>
          <p className="text-muted-foreground">customer@email.com</p>
        </div>
        <div className="text-right">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Issue date:</span>
            <span className="font-medium">{issueDate || "—"}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-muted-foreground">Valid until:</span>
            <span className="font-medium">{validUntil || "—"}</span>
          </div>
        </div>
      </div>

      <Separator className="my-5" />

      {/* Line items */}
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="w-1/2 pb-2 text-left font-medium">Description</th>
            <th className="whitespace-nowrap pb-2 pl-4 text-right font-medium">
              Qty
            </th>
            <th className="whitespace-nowrap pb-2 pl-4 text-right font-medium">
              Rate
            </th>
            <th className="whitespace-nowrap pb-2 pl-4 text-right font-medium">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const amount =
              (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
            return (
              <tr key={item.id} className="border-b border-dashed">
                <td className="py-2 break-words">{item.description || "—"}</td>
                <td className="whitespace-nowrap py-2 pl-4 text-right">
                  {item.qty || "0"}
                </td>
                <td className="whitespace-nowrap py-2 pl-4 text-right">
                  {item.rate || "0.00"}
                </td>
                <td className="whitespace-nowrap py-2 pl-4 text-right">
                  {currency}{" "}
                  {amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-4 flex flex-col items-end gap-1.5 text-xs">
        <div className="flex w-48 justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>
            {currency}{" "}
            {subtotal.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
          </span>
        </div>
        {lineItemTax > 0 && (
          <div className="flex w-48 justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>
              {currency}{" "}
              {lineItemTax.toLocaleString("en-KE", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        )}
        {discountAmt > 0 && (
          <div className="flex w-48 justify-between text-green-600 dark:text-green-400">
            <span>
              Discount{discountType === "%" ? ` (${discountValue}%)` : ""}
            </span>
            <span>
              − {currency}{" "}
              {discountAmt.toLocaleString("en-KE", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        )}
        {vat > 0 && (
          <div className="flex w-48 justify-between">
            <span className="text-muted-foreground">VAT ({vatRate}%)</span>
            <span>
              {currency}{" "}
              {vat.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
        <Separator className="my-1 w-48" />
        <div className="flex w-48 justify-between font-semibold text-sm">
          <span>Total</span>
          <span>
            {currency}{" "}
            {total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {notes && (
        <>
          <Separator className="my-5" />
          <div>
            <p className="text-xs font-medium text-foreground">Notes</p>
            <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
              {notes}
            </p>
          </div>
        </>
      )}

      <Separator className="my-5" />
      <p className="text-center text-[10px] text-muted-foreground">
        Powered by Travada Books
      </p>
    </div>
  );
}

export function CreateQuotePage() {
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [currency, setCurrency] = useState("KES");
  const lastQuoteNumber = "QUO-0005";
  const [quoteNumber, setQuoteNumber] = useState(() =>
    incrementInvoiceNumber(lastQuoteNumber),
  );
  const [issueDate, setIssueDate] = useState<Date | undefined>(undefined);
  const [validUntil, setValidUntil] = useState<Date | undefined>(undefined);
  const [discountType, setDiscountType] = useState<"%" | "fixed">("%");
  const [discountValue, setDiscountValue] = useState("");
  const [vatRate, setVatRate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { id: "1", description: "", qty: "1", rate: "", tax: "0" },
  ]);

  const addItem = () => {
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
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate("/quotes")}
          >
            <ArrowLeft01Icon size={14} />
          </Button>
          <div>
            <p className="text-sm font-semibold">New Quote</p>
            <p className="text-xs text-muted-foreground">
              Create and send a quote to your client.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-1.5">
            <Settings02Icon size={13} />
            Quote Settings
          </Button>
          <div className="flex">
            <Button
              className="rounded-r-none border-r-0 gap-1.5"
              onClick={() => {/* TODO: save as draft */}}
            >
              <FloppyDiskIcon size={13} />
              Save as Draft
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    className="rounded-l-none px-2"
                    aria-label="More send options"
                  />
                }
              >
                <ArrowDown01Icon size={13} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  className="flex flex-col items-start gap-0.5"
                  onClick={() => {/* TODO: send quote */}}
                >
                  <span className="font-medium flex items-center gap-1.5">
                    <Sent02Icon size={13} />
                    Send Quote
                  </span>
                  <span className="text-[11px] text-muted-foreground pl-5">
                    Save and send to client now
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Split panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Form */}
        <div className="flex w-1/2 flex-col gap-5 overflow-y-auto border-r p-6">
          {/* To */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Prepared For</Label>
            <CustomerCombobox value={customerId} onChange={setCustomerId} />
          </div>

          {/* Quote meta */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="quote-number" className="text-xs">
                Quote #
              </Label>
              <Input
                id="quote-number"
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Currency</Label>
              <Select
                value={currency}
                onValueChange={(v) => v && setCurrency(v)}
              >
                <SelectTrigger className="text-xs w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Issue Date</Label>
              <DatePicker
                value={issueDate}
                onChange={setIssueDate}
                placeholder="Pick issue date"
              />
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
              <div
                key={item.id}
                className="grid grid-cols-[1fr_60px_80px_60px_32px] gap-2"
              >
                <Input
                  placeholder="Item description"
                  value={item.description}
                  onChange={(e) =>
                    updateItem(item.id, "description", e.target.value)
                  }
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
            <Button
              variant="outline"
              size="sm"
              className="mt-1 w-fit gap-1"
              onClick={addItem}
            >
              <PlusSignIcon size={12} />
              Add line item
            </Button>
          </div>

          <Separator />

          {/* Tax / VAT & Discount */}
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
                    <SelectItem value="%" className="text-xs">
                      %
                    </SelectItem>
                    <SelectItem value="fixed" className="text-xs">
                      {currency}
                    </SelectItem>
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

          {/* Notes */}
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

        {/* Right: Preview */}
        <div className="flex w-1/2 flex-col overflow-y-auto bg-muted/30 p-6">
          <p className="mb-4 text-xs font-medium text-muted-foreground">
            Preview
          </p>
          <QuotePreview
            quoteNumber={quoteNumber}
            issueDate={issueDate ? format(issueDate, "dd/MM/yyyy") : ""}
            validUntil={validUntil ? format(validUntil, "dd/MM/yyyy") : ""}
            currency={currency}
            items={items}
            discountType={discountType}
            discountValue={discountValue}
            vatRate={vatRate}
            notes={notes}
          />
        </div>
      </div>
    </div>
  );
}
