import { useState, useRef, useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@travada-books/ui/components/sheet";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import { Label } from "@travada-books/ui/components/label";
import { Textarea } from "@travada-books/ui/components/textarea";
import { Switch } from "@travada-books/ui/components/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@travada-books/ui/components/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@travada-books/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@travada-books/ui/components/command";
import { CURRENCY_LIST } from "@travada-books/ui/components/currency-select";
import { Attachment01Icon, Delete01Icon, ArrowDown01Icon } from "@travada-books/ui/icons";
import { cn } from "@travada-books/ui/lib/utils";
import { COLOR_PALETTE } from "@/components/shared/color-picker";
import { useAuth } from "@/contexts/auth-context";
import { DatePicker } from "@/components/shared/date-picker";
import type {
  Transaction,
  TransactionStatus,
  PaymentMode,
  TransactionFrequency,
} from "./transaction-columns";

type TransactionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
};

type Category = { slug: string; name: string; color: string };

const DEFAULT_CATEGORIES: Category[] = [
  { slug: "consulting-fees",       name: "Consulting Fees",          color: "#6366f1" },
  { slug: "sales-revenue",         name: "Sales Revenue",            color: "#8b5cf6" },
  { slug: "service-income",        name: "Service Income",           color: "#10b981" },
  { slug: "rental-income",         name: "Rental Income",            color: "#f43f5e" },
  { slug: "commission",            name: "Commission",               color: "#14b8a6" },
  { slug: "interest-income",       name: "Interest Income",          color: "#f59e0b" },
  { slug: "refund-received",       name: "Refund Received",          color: "#84cc16" },
  { slug: "grant",                 name: "Grant / Donation",         color: "#3b82f6" },
  { slug: "other-income",          name: "Other Income",             color: "#a855f7" },
  { slug: "rent",                  name: "Rent & Facilities",        color: "#f97316" },
  { slug: "software",              name: "Software & Subscriptions", color: "#06b6d4" },
  { slug: "utilities",             name: "Utilities",                color: "#f43f5e" },
  { slug: "internet",              name: "Internet & Phone",         color: "#8b5cf6" },
  { slug: "travel",                name: "Travel & Transport",       color: "#3b82f6" },
  { slug: "meals",                 name: "Meals & Entertainment",    color: "#ec4899" },
  { slug: "marketing",             name: "Marketing & Advertising",  color: "#f43f5e" },
  { slug: "salary",                name: "Salaries & Wages",         color: "#f97316" },
  { slug: "contractor",            name: "Contractors & Freelancers",color: "#f59e0b" },
  { slug: "equipment",             name: "Equipment & Hardware",     color: "#84cc16" },
  { slug: "office-supplies",       name: "Office Supplies",          color: "#10b981" },
  { slug: "professional-services", name: "Professional Services",    color: "#14b8a6" },
  { slug: "insurance",             name: "Insurance",                color: "#06b6d4" },
  { slug: "bank-fees",             name: "Bank & M-Pesa Fees",       color: "#3b82f6" },
  { slug: "taxes",                 name: "Taxes & Licenses",         color: "#a855f7" },
  { slug: "training",              name: "Training & Education",     color: "#6366f1" },
  { slug: "shipping",              name: "Shipping & Delivery",      color: "#8b5cf6" },
  { slug: "other-expenses",        name: "Other Expenses",           color: "#ec4899" },
];

export function TransactionSheet({
  open,
  onOpenChange,
  transaction,
}: TransactionSheetProps) {
  const { org } = useAuth();
  const isEditing = !!transaction;
  const today = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(today);
  const [status, setStatus] = useState<TransactionStatus>("completed");
  const [name, setName] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(org?.base_currency ?? "KES");
  const [paymentMode, setPaymentMode] = useState<PaymentMode | "">("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [taxType, setTaxType] = useState<"vat" | "wht" | "other" | "">("");
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<TransactionFrequency | "">("");
  const [internal, setInternal] = useState(false);
  const [note, setNote] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredCurrencies = useMemo(() => {
    if (!currencySearch.trim()) return CURRENCY_LIST;
    const q = currencySearch.toLowerCase();
    return CURRENCY_LIST.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.keywords?.toLowerCase().includes(q) ?? false),
    );
  }, [currencySearch]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const q = categorySearch.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, categorySearch]);

  const selectedCategory = categories.find((c) => c.slug === categorySlug) ?? null;

  // Populate or reset state when the sheet opens or the transaction changes
  useEffect(() => {
    if (!open) return;
    if (transaction) {
      const parsed = new Date(transaction.date);
      const isoDate =
        !isNaN(parsed.getTime()) ? parsed.toISOString().split("T")[0] : today;
      setDate(isoDate);
      setStatus(transaction.status);
      setName(transaction.name);
      setCounterparty(transaction.counterpartyName ?? "");
      setAmount(String(transaction.amount));
      setCurrency(transaction.currency);
      setPaymentMode(transaction.paymentMode ?? "");
      setReferenceNumber(transaction.referenceNumber ?? "");
      setCategorySlug(categories.find((c) => c.name === transaction.categoryName)?.slug ?? "");
      setTaxAmount(transaction.taxAmount ? String(transaction.taxAmount) : "");
      setTaxRate(transaction.taxRate ? String(transaction.taxRate) : "");
      setTaxType(transaction.taxType ?? "");
      setRecurring(transaction.recurring);
      setFrequency(transaction.frequency ?? "");
      setInternal(transaction.internal);
      setNote("");
      setAttachments([]);
    } else {
      setDate(today);
      setStatus("completed");
      setName("");
      setCounterparty("");
      setAmount("");
      setCurrency(org?.base_currency ?? "KES");
      setPaymentMode("");
      setReferenceNumber("");
      setCategorySlug("");
      setTaxAmount("");
      setTaxRate("");
      setTaxType("");
      setRecurring(false);
      setFrequency("");
      setInternal(false);
      setNote("");
      setAttachments([]);
    }
  }, [open, transaction?.id]);

  const amountValue = parseFloat(amount) || 0;
  const isIncome = amountValue > 0;

  function handleTaxRateChange(val: string) {
    setTaxRate(val);
    const rate = parseFloat(val);
    const amt = Math.abs(parseFloat(amount));
    if (!isNaN(rate) && !isNaN(amt)) {
      setTaxAmount(((amt * rate) / 100).toFixed(2));
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setAttachments((prev) => [
      ...prev,
      ...files.filter((f) => f.size <= 10 * 1024 * 1024),
    ]);
    e.target.value = "";
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
      }}
    >
      <SheetContent
        side='right'
        className='w-full sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden'
      >
        <SheetTitle className='sr-only'>
          {isEditing ? "Edit Transaction" : "New Transaction"}
        </SheetTitle>

        {/* Scrollable body */}
        <div className='flex-1 overflow-y-auto'>
          {/* Midday-style detail header */}
          <div className='px-6 pt-6 pb-5 border-b'>
            {/* Description — heading-style input */}
            <input
              placeholder='Description'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className='w-full border-none bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground/50 mb-0.5'
            />

            {/* Counterparty — small, muted */}
            <input
              placeholder='To / From'
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              className='w-full border-none bg-transparent text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/40 mb-5'
            />

            {/* Amount — large, sign-colored */}
            <div className='flex items-baseline gap-2'>
              <Popover
                open={currencyOpen}
                onOpenChange={(o) => {
                  setCurrencyOpen(o);
                  if (!o) setCurrencySearch("");
                }}
              >
                <PopoverTrigger
                  render={
                    <button
                      type='button'
                      className='shrink-0 text-sm font-medium text-muted-foreground border-b border-dashed border-muted-foreground/40 fine-hover:text-foreground fine-hover:border-foreground/40 transition-colors pb-px'
                    >
                      {currency}
                    </button>
                  }
                />
                <PopoverContent
                  className='w-64 p-0'
                  align='start'
                  sideOffset={8}
                >
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder='Search currency…'
                      value={currencySearch}
                      onValueChange={setCurrencySearch}
                    />
                    <CommandList>
                      {filteredCurrencies.length === 0 ?
                        <CommandEmpty>No currency found.</CommandEmpty>
                      : <CommandGroup>
                          {filteredCurrencies.map((c) => (
                            <CommandItem
                              key={c.code}
                              value={c.code}
                              data-checked={currency === c.code}
                              onSelect={() => {
                                setCurrency(c.code);
                                setCurrencyOpen(false);
                                setCurrencySearch("");
                              }}
                            >
                              <span className='text-muted-foreground w-8 shrink-0 text-left text-xs'>
                                {c.code}
                              </span>
                              <span className='text-xs'>{c.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      }
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <input
                type='number'
                step='0.01'
                placeholder='0.00'
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={cn(
                  "flex-1 min-w-0 border-none bg-transparent text-4xl font-semibold tabular-nums outline-none placeholder:text-muted-foreground/30",
                  isIncome ?
                    "text-green-600 dark:text-green-400"
                  : "text-foreground",
                )}
              />
            </div>
            <p className='text-[10px] text-muted-foreground/50 mt-1.5'>
              Negative = expense · Positive = income
            </p>
          </div>

          {/* Date + Status */}
          <div className='flex items-center gap-2 px-6 py-5 '>
            <DatePicker
              className='h-10'
              value={date ? new Date(date) : undefined}
              onChange={(d) =>
                setDate(d ? d.toISOString().split("T")[0] : today)
              }
              placeholder='Date'
            />
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as TransactionStatus)}
            >
              <SelectTrigger className='text-xs h-9 w-1/2'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='completed' className='text-xs'>
                  Completed
                </SelectItem>
                <SelectItem value='pending' className='text-xs'>
                  Pending
                </SelectItem>
                <SelectItem value='excluded' className='text-xs'>
                  Excluded
                </SelectItem>
                <SelectItem value='archived' className='text-xs'>
                  Archived
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Form fields */}
          <div className='px-6 py-5 flex flex-col gap-4'>
            {/* Category + Payment mode */}
            <div className='grid grid-cols-2 gap-3'>
              <div className='flex flex-col gap-1.5'>
                <Label className='text-xs'>Category</Label>
                <Popover
                  open={categoryOpen}
                  onOpenChange={(o) => {
                    setCategoryOpen(o);
                    if (!o) setCategorySearch("");
                  }}
                >
                  <PopoverTrigger
                    render={
                      <button
                        type='button'
                        className='flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring'
                      >
                        {selectedCategory ? (
                          <div className='flex items-center gap-2 min-w-0'>
                            <div
                              className='size-2 rounded-full shrink-0'
                              style={{ backgroundColor: selectedCategory.color }}
                            />
                            <span className='truncate'>{selectedCategory.name}</span>
                          </div>
                        ) : (
                          <span className='text-muted-foreground'>Select</span>
                        )}
                        <ArrowDown01Icon size={12} className='shrink-0 text-muted-foreground ml-1' />
                      </button>
                    }
                  />
                  <PopoverContent className='w-56 p-0' align='start' sideOffset={4}>
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder='Search category…'
                        value={categorySearch}
                        onValueChange={setCategorySearch}
                      />
                      <CommandList>
                        {filteredCategories.length > 0 ? (
                          <CommandGroup>
                            {filteredCategories.map((cat) => (
                              <CommandItem
                                key={cat.slug}
                                value={cat.slug}
                                onSelect={() => {
                                  setCategorySlug(cat.slug);
                                  setCategoryOpen(false);
                                  setCategorySearch("");
                                }}
                                className='flex items-center gap-2'
                              >
                                <div
                                  className='size-2 rounded-full shrink-0'
                                  style={{ backgroundColor: cat.color }}
                                />
                                <span className='text-xs'>{cat.name}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        ) : categorySearch.trim() ? (
                          <CommandGroup>
                            <CommandItem
                              value={`create:${categorySearch}`}
                              onSelect={() => {
                                const trimmed = categorySearch.trim();
                                const slug = trimmed
                                  .toLowerCase()
                                  .replace(/\s+/g, "-")
                                  .replace(/[^a-z0-9-]/g, "");
                                const color = COLOR_PALETTE[categories.length % COLOR_PALETTE.length];
                                const newCat: Category = { slug, name: trimmed, color };
                                setCategories((prev) => [...prev, newCat]);
                                setCategorySlug(slug);
                                setCategoryOpen(false);
                                setCategorySearch("");
                              }}
                              className='flex items-center gap-2'
                            >
                              <span className='text-xs'>
                                Create <span className='font-medium'>"{categorySearch.trim()}"</span>
                              </span>
                            </CommandItem>
                          </CommandGroup>
                        ) : (
                          <CommandEmpty>No categories found.</CommandEmpty>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className='flex flex-col gap-1.5'>
                <Label className='text-xs'>Payment mode</Label>
                <Select
                  value={paymentMode}
                  onValueChange={(v) => setPaymentMode(v as PaymentMode)}
                >
                  <SelectTrigger className='text-xs w-full'>
                    <SelectValue placeholder='Select' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='mpesa' className='text-xs'>
                      M-Pesa
                    </SelectItem>
                    <SelectItem value='bank_transfer' className='text-xs'>
                      Bank Transfer
                    </SelectItem>
                    <SelectItem value='cash' className='text-xs'>
                      Cash
                    </SelectItem>
                    <SelectItem value='cheque' className='text-xs'>
                      Cheque
                    </SelectItem>
                    <SelectItem value='card' className='text-xs'>
                      Card
                    </SelectItem>
                    <SelectItem value='other' className='text-xs'>
                      Other
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reference number */}
            <div className='flex flex-col gap-1.5'>
              <Label htmlFor='tx-ref' className='text-xs'>
                Reference no.
              </Label>
              <Input
                id='tx-ref'
                placeholder='e.g. QGH7X23YK'
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>

            {/* Tax */}
            <div className='grid grid-cols-2 gap-3'>
              <div className='flex flex-col gap-1.5'>
                <Label className='text-xs'>Tax rate (%)</Label>
                <Input
                  type='number'
                  min='0'
                  step='0.01'
                  placeholder='e.g. 16'
                  value={taxRate}
                  onChange={(e) => handleTaxRateChange(e.target.value)}
                />
              </div>
              <div className='flex flex-col gap-1.5'>
                <Label className='text-xs'>Tax amount</Label>
                <Input
                  type='number'
                  min='0'
                  step='0.01'
                  placeholder='0.00'
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                />
              </div>
            </div>
            <div className='flex flex-col gap-1.5'>
              <Label className='text-xs'>Tax type</Label>
              <Select
                value={taxType}
                onValueChange={(v) => setTaxType(v as "vat" | "wht" | "other")}
              >
                <SelectTrigger className='text-xs w-1/2'>
                  <SelectValue placeholder='Select type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='vat' className='text-xs'>
                    VAT (16%)
                  </SelectItem>
                  <SelectItem value='wht' className='text-xs'>
                    Withholding Tax
                  </SelectItem>
                  <SelectItem value='other' className='text-xs'>
                    Other
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recurring */}
            <div className='flex items-center justify-between'>
              <div className='flex flex-col gap-0.5'>
                <Label className='text-xs'>Recurring</Label>
                <span className='text-[11px] text-muted-foreground'>
                  Mark as a repeating transaction
                </span>
              </div>
              <Switch checked={recurring} onCheckedChange={setRecurring} />
            </div>
            {recurring && (
              <Select
                value={frequency}
                onValueChange={(v) => setFrequency(v as TransactionFrequency)}
              >
                <SelectTrigger className='text-xs w-1/2'>
                  <SelectValue placeholder='Select frequency' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='weekly' className='text-xs'>
                    Weekly
                  </SelectItem>
                  <SelectItem value='biweekly' className='text-xs'>
                    Every 2 weeks
                  </SelectItem>
                  <SelectItem value='semi_monthly' className='text-xs'>
                    Twice a month
                  </SelectItem>
                  <SelectItem value='monthly' className='text-xs'>
                    Monthly
                  </SelectItem>
                  <SelectItem value='annually' className='text-xs'>
                    Annually
                  </SelectItem>
                  <SelectItem value='irregular' className='text-xs'>
                    Irregular
                  </SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Exclude from P&L */}
            <div className='flex items-start justify-between gap-4'>
              <div className='flex flex-col gap-0.5'>
                <Label className='text-xs'>Exclude from P&amp;L</Label>
                <span className='text-[11px] text-muted-foreground'>
                  For transfers between your own accounts
                </span>
              </div>
              <Switch checked={internal} onCheckedChange={setInternal} />
            </div>

            {/* Link to invoice */}
            <div className='flex flex-col gap-1.5'>
              <Label className='text-xs'>Link to invoice</Label>
              <Select>
                <SelectTrigger className='text-xs w-1/2'>
                  <SelectValue placeholder='Select invoice (optional)' />
                </SelectTrigger>
                <SelectContent>
                  <div className='py-3 text-center text-xs text-muted-foreground'>
                    No open invoices
                  </div>
                </SelectContent>
              </Select>
            </div>

            {/* Note */}
            <div className='flex flex-col gap-1.5'>
              <Label className='text-xs'>Note</Label>
              <Textarea
                placeholder='Add a note…'
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* Attachments */}
            <div className='flex flex-col gap-1.5'>
              <Label className='text-xs'>Attachments</Label>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/*,application/pdf'
                multiple
                className='hidden'
                onChange={handleFileChange}
              />
              <button
                type='button'
                onClick={() => fileInputRef.current?.click()}
                className='flex flex-col items-center justify-center gap-1.5 w-full rounded-lg border border-dashed p-5 text-center transition-colors fine-hover:bg-muted/50'
              >
                <Attachment01Icon size={16} className='text-muted-foreground' />
                <span className='text-xs text-muted-foreground'>
                  Click to upload receipt or document
                </span>
                <span className='text-[10px] text-muted-foreground'>
                  PDF, PNG, JPG · Max 10 MB
                </span>
              </button>
              {attachments.length > 0 && (
                <div className='flex flex-col gap-1 mt-1'>
                  {attachments.map((file, i) => (
                    <div
                      key={i}
                      className='flex items-center gap-2 rounded-md border px-3 py-1.5'
                    >
                      <Attachment01Icon
                        size={12}
                        className='shrink-0 text-muted-foreground'
                      />
                      <span className='flex-1 truncate text-xs'>
                        {file.name}
                      </span>
                      <button
                        type='button'
                        onClick={() => removeAttachment(i)}
                        className='text-muted-foreground fine-hover:text-destructive transition-colors'
                      >
                        <Delete01Icon size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className='border-t px-6 py-4 flex items-center justify-end gap-2'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!name.trim() || !amount || amountValue === 0}>
            {isEditing ? "Save changes" : "Add transaction"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
