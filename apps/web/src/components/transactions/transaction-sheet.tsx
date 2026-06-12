import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import {
  Attachment01Icon,
  Delete01Icon,
  ArrowDown01Icon,
  SparklesIcon,
} from "@travada-books/ui/icons";
import { cn } from "@travada-books/ui/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { DatePicker } from "@/components/shared/date-picker";
import {
  listTransactionCategories,
  createTransaction,
  updateTransaction,
  addAttachments,
  uploadTransactionAttachment,
  deleteAttachment,
  createTransactionCategory,
  type TransactionCategory,
  type AttachmentInput,
} from "@/lib/queries/transactions";
import { extractDocumentData } from "@/lib/queries/ai";
import { linkDocumentsToTransaction } from "@/lib/queries/vault";
import { supabase } from "@/lib/supabase";
import { listCustomers } from "@/lib/queries/customers";
import type {
  Transaction,
  TransactionStatus,
  PaymentMode,
  TransactionFrequency,
  TransactionAttachmentInfo,
} from "./transaction-columns";

type OpenInvoice = {
  id: string;
  invoice_number: string | null;
  customer_name: string | null;
  total: number | null;
  currency: string;
  due_date: string | null;
};

type ExtractedInitialData = {
  date?: string;
  amount?: number;
  type?: "income" | "expense";
  counterpartyName?: string;
  description?: string;
  referenceNumber?: string;
  currency?: string;
  taxAmount?: number;
  paymentMode?: PaymentMode;
};

type VaultDocRef = {
  id: string;
  org_id: string;
  file_path: string;
  name: string;
  file_size: number | null;
  content_type: string | null;
};

type TransactionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  initialData?: ExtractedInitialData;
  initialVaultDocs?: VaultDocRef[];
  onSaved?: () => void;
};

export function TransactionSheet({
  open,
  onOpenChange,
  transaction,
  initialData,
  initialVaultDocs,
  onSaved,
}: TransactionSheetProps) {
  const { org, orgId, user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!transaction;
  const today = new Date().toISOString().split("T")[0];

  const [txId] = useState(() => crypto.randomUUID());
  const [type, setType] = useState<"income" | "expense">("expense");
  const [date, setDate] = useState(today);
  const [status, setStatus] = useState<TransactionStatus>("completed");
  const [name, setName] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [counterpartySuggestionsOpen, setCounterpartySuggestionsOpen] = useState(false);
  const counterpartyBlurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(org?.base_currency ?? "KES");
  const [paymentMode, setPaymentMode] = useState<PaymentMode | "">("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [taxType, setTaxType] = useState<"vat" | "wht" | "other" | "">("");
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<TransactionFrequency | "">("");
  const [internal, setInternal] = useState(false);
  const [note, setNote] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [markInvoicePaid, setMarkInvoicePaid] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<
    TransactionAttachmentInfo[]
  >([]);
  const [attachmentsToRemove, setAttachmentsToRemove] = useState<
    TransactionAttachmentInfo[]
  >([]);
  const [vaultDocs, setVaultDocs] = useState<VaultDocRef[]>([]);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["transaction-categories", orgId],
    queryFn: () => listTransactionCategories(orgId!),
    enabled: !!orgId && open,
  });

  const { data: openInvoices = [] } = useQuery<OpenInvoice[]>({
    queryKey: ["open-invoices-for-linking", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, customer_name, total, currency, due_date")
        .eq("org_id", orgId!)
        .in("status", ["unpaid", "draft"])
        .order("due_date", { ascending: true });
      return (data as OpenInvoice[]) ?? [];
    },
    enabled: !!orgId && open && type === "income",
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", orgId],
    queryFn: () => listCustomers(orgId!),
    enabled: !!orgId && open,
    select: (data) => data.map((c) => ({ id: c.id, name: c.name })),
  });


  const counterpartySuggestions = useMemo(() => {
    if (!counterparty.trim() || customerId) return [];
    const q = counterparty.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6);
  }, [counterparty, customerId, customers]);

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
    return categories.filter((c: TransactionCategory) =>
      c.name.toLowerCase().includes(q),
    );
  }, [categories, categorySearch]);

  const filteredInvoices = useMemo(() => {
    if (!invoiceSearch.trim()) return openInvoices;
    const q = invoiceSearch.toLowerCase();
    return openInvoices.filter(
      (inv) =>
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.customer_name?.toLowerCase().includes(q),
    );
  }, [openInvoices, invoiceSearch]);

  const selectedCategory =
    categories.find((c: TransactionCategory) => c.id === categoryId) ?? null;
  const selectedInvoice =
    openInvoices.find((inv) => inv.id === invoiceId) ?? null;

  useEffect(() => {
    if (!open) return;
    if (transaction) {
      const parsed = new Date(transaction.date);
      const isoDate =
        !isNaN(parsed.getTime()) ? parsed.toISOString().split("T")[0] : today;
      setType(transaction.type);
      setDate(isoDate);
      setStatus(transaction.status);
      setName(transaction.name);
      setCounterparty(transaction.counterpartyName ?? "");
      setCustomerId(transaction.customerId ?? "");
      setAmount(String(transaction.amount));
      setCurrency(transaction.currency);
      setPaymentMode(transaction.paymentMode ?? "");
      setReferenceNumber(transaction.referenceNumber ?? "");
      setCategoryId(transaction.categoryId ?? "");
      setTaxAmount(transaction.taxAmount ? String(transaction.taxAmount) : "");
      setTaxRate(transaction.taxRate ? String(transaction.taxRate) : "");
      setTaxType(transaction.taxType ?? "");
      setRecurring(transaction.recurring);
      setFrequency(transaction.frequency ?? "");
      setInternal(transaction.internal);
      setNote(transaction.note ?? "");
      setInvoiceId(transaction.linkedInvoiceId ?? "");
      setMarkInvoicePaid(false);
      setPendingFiles([]);
      setExistingAttachments(transaction.attachments ?? []);
      setAttachmentsToRemove([]);
      setVaultDocs([]);
    } else {
      setType(initialData?.type ?? "expense");
      setDate(initialData?.date ?? today);
      setStatus("completed");
      setName(initialData?.description ?? "");
      setCounterparty(initialData?.counterpartyName ?? "");
      setCustomerId("");
      setAmount(initialData?.amount ? String(initialData.amount) : "");
      setCurrency(initialData?.currency ?? org?.base_currency ?? "KES");
      setPaymentMode(initialData?.paymentMode ?? "");
      setReferenceNumber(initialData?.referenceNumber ?? "");
      setCategoryId("");
      setTaxAmount(initialData?.taxAmount ? String(initialData.taxAmount) : "");
      setTaxRate("");
      setTaxType("");
      setRecurring(false);
      setFrequency("");
      setInternal(false);
      setNote("");
      setInvoiceId("");
      setMarkInvoicePaid(false);
      setPendingFiles([]);
      setExistingAttachments([]);
      setAttachmentsToRemove([]);
      setVaultDocs(initialVaultDocs ?? []);
    }
  }, [open, transaction?.id]);

  // When type changes to expense, clear invoice link
  useEffect(() => {
    if (type === "expense") {
      setInvoiceId("");
      setMarkInvoicePaid(false);
    }
  }, [type]);

  function handleTaxRateChange(val: string) {
    setTaxRate(val);
    const rate = parseFloat(val);
    const amt = parseFloat(amount);
    if (!isNaN(rate) && !isNaN(amt) && amt > 0) {
      setTaxAmount(((amt * rate) / 100).toFixed(2));
    }
  }

  function handleTaxAmountChange(val: string) {
    setTaxAmount(val);
    setTaxRate(""); // one-way: editing amount clears rate
  }

  const selectCustomer = useCallback((id: string, name: string) => {
    setCustomerId(id);
    setCounterparty(name);
    setCounterpartySuggestionsOpen(false);
  }, []);

  function handleCounterpartyChange(val: string) {
    setCounterparty(val);
    setCustomerId("");
    setCounterpartySuggestionsOpen(true);
  }

  function handleCounterpartyFocus() {
    if (counterpartyBlurTimeout.current) clearTimeout(counterpartyBlurTimeout.current);
    if (!customerId) setCounterpartySuggestionsOpen(true);
  }

  function handleCounterpartyBlur() {
    counterpartyBlurTimeout.current = setTimeout(() => {
      setCounterpartySuggestionsOpen(false);
    }, 150);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPendingFiles((prev) => [
      ...prev,
      ...files.filter((f) => f.size <= 10 * 1024 * 1024),
    ]);
    e.target.value = "";
  }

  function removeFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleExtractFromFile(file: File) {
    setExtracting(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }
      const base64 = btoa(binary);
      const extracted = await extractDocumentData({ fileData: base64, contentType: file.type });

      if (extracted.date) setDate(extracted.date);
      if (extracted.amount) setAmount(String(extracted.amount));
      if (extracted.type) setType(extracted.type);
      if (extracted.counterparty_name) setCounterparty(extracted.counterparty_name);
      if (extracted.description && !name.trim()) setName(extracted.description);
      if (extracted.reference_number) setReferenceNumber(extracted.reference_number);
      if (extracted.currency) setCurrency(extracted.currency);
      if (extracted.tax_amount) setTaxAmount(String(extracted.tax_amount));
      if (extracted.payment_mode) setPaymentMode(extracted.payment_mode as PaymentMode);

      toast.success("Data extracted", { description: "Review the pre-filled fields before saving." });
    } catch (err) {
      toast.error("Extraction failed", {
        description: err instanceof Error ? err.message : "Could not read data from this file.",
      });
    } finally {
      setExtracting(false);
    }
  }

  function markAttachmentForRemoval(att: TransactionAttachmentInfo) {
    setExistingAttachments((prev) => prev.filter((a) => a.id !== att.id));
    setAttachmentsToRemove((prev) => [...prev, att]);
  }

  async function handleSave() {
    if (!orgId || !user || !name.trim() || !amount) return;
    const amtValue = parseFloat(amount);
    if (isNaN(amtValue) || amtValue <= 0) return;

    setSaving(true);
    try {
      const txFields = {
        date,
        name: name.trim(),
        counterparty_name: counterparty.trim() || undefined,
        customer_id: customerId || undefined,
        amount: amtValue,
        currency,
        type,
        status,
        payment_mode: paymentMode || undefined,
        reference_number: referenceNumber.trim() || undefined,
        category_id: categoryId || undefined,
        invoice_id: type === "income" && invoiceId ? invoiceId : undefined,
        tax_amount: taxAmount ? parseFloat(taxAmount) : undefined,
        tax_rate: taxRate ? parseFloat(taxRate) : undefined,
        tax_type: taxType || undefined,
        recurring,
        frequency: recurring && frequency ? frequency : undefined,
        internal,
        note: note.trim() || undefined,
      };

      if (isEditing) {
        // 1. Delete removed attachments
        if (attachmentsToRemove.length > 0) {
          await Promise.all(attachmentsToRemove.map((a) => deleteAttachment(a.id, a.file_path)));
        }
        // 2. Update transaction row
        await updateTransaction(transaction.id, orgId, txFields);
        // 3. Upload new files — transaction exists so vault trigger FK succeeds
        if (pendingFiles.length > 0) {
          const uploads = await Promise.all(
            pendingFiles.map((f) => uploadTransactionAttachment(orgId, transaction.id, f)),
          );
          await addAttachments(transaction.id, orgId, uploads);
        }
        toast.success("Transaction updated");
      } else {
        // 1. Create transaction row first — vault trigger needs this FK to exist
        await createTransaction(orgId, user.id, {
          id: txId,
          ...txFields,
          markInvoicePaid: type === "income" && !!invoiceId && markInvoicePaid,
        });
        // 2. Upload files — transaction now exists, trigger succeeds
        if (pendingFiles.length > 0) {
          const uploads = await Promise.all(
            pendingFiles.map((f) => uploadTransactionAttachment(orgId, txId, f)),
          );
          await addAttachments(txId, orgId, uploads);
        }
        // 3. Link any vault docs that were the source of extraction
        if (vaultDocs.length > 0) {
          await linkDocumentsToTransaction(vaultDocs.map((d) => d.id), txId);
        }
        toast.success("Transaction saved");
      }

      queryClient.invalidateQueries({ queryKey: ["transactions", orgId] });
      if (invoiceId && markInvoicePaid) {
        queryClient.invalidateQueries({ queryKey: ["invoices", orgId] });
        queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to save transaction", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateCategory(categoryName: string) {
    if (!orgId) return;
    try {
      const newCat = await createTransactionCategory(orgId, {
        name: categoryName.trim(),
      });
      queryClient.invalidateQueries({
        queryKey: ["transaction-categories", orgId],
      });
      setCategoryId(newCat.id);
      setCategoryOpen(false);
      setCategorySearch("");
    } catch {
      toast.error("Failed to create category");
    }
  }

  const canSave = name.trim() && parseFloat(amount) > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className='w-full sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden'
      >
        <SheetTitle className='sr-only'>
          {isEditing ? "Edit Transaction" : "New Transaction"}
        </SheetTitle>

        <div className='flex-1 overflow-y-auto'>
          {/* Header: type toggle + amount + description */}
          <div className='px-6 pt-6 pb-5 border-b'>
            {/* Income / Expense toggle */}
            <div className='flex rounded-md  border-input overflow-hidden mb-5 w-fit gap-2'>
              <Button
                type='button'
                onClick={() => setType("income")}
                className={cn(
                  "px-4 py-1.5 text-xs font-medium transition-colors border-l border-input",
                )}
              >
                Income
              </Button>
              <Button
                type='button'
                variant="secondary"
                onClick={() => setType("expense")}
                className={cn(
                  "px-4 py-1.5 text-xs font-medium transition-colors",
                )}
              >
                Expense
              </Button>
            </div>

            {/* Description */}
            <input
              placeholder='Description'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className='w-full border-none bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground/50 mb-0.5'
            />

            {/* Counterparty — inline autocomplete from customers */}
            <div className='relative mb-5'>
              <input
                placeholder={type === "income" ? "Received from" : "Paid to"}
                value={counterparty}
                onChange={(e) => handleCounterpartyChange(e.target.value)}
                onFocus={handleCounterpartyFocus}
                onBlur={handleCounterpartyBlur}
                className='w-full border-none bg-transparent text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/40'
              />
              {counterpartySuggestionsOpen && counterpartySuggestions.length > 0 && (
                <div className='absolute left-0 top-full z-50 mt-1 w-full min-w-[200px] rounded-md border bg-popover shadow-md overflow-hidden'>
                  {counterpartySuggestions.map((c) => (
                    <button
                      key={c.id}
                      type='button'
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectCustomer(c.id, c.name)}
                      className='w-full px-3 py-2 text-left text-xs fine-hover:bg-accent fine-hover:text-accent-foreground transition-colors'
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Amount */}
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
                min='0'
                placeholder='0.00'
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={cn(
                  "flex-1 min-w-0 border-none bg-transparent text-4xl font-semibold tabular-nums outline-none placeholder:text-muted-foreground/30",
                  type === "income" ?
                    "text-green-600 dark:text-green-400"
                  : "text-foreground",
                )}
              />
            </div>
          </div>

          {/* Date + Status */}
          <div className='flex items-center gap-2 px-6 py-5'>
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

          {/* Fields */}
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
                        {selectedCategory ?
                          <div className='flex items-center gap-2 min-w-0'>
                            <div
                              className='size-2 rounded-full shrink-0'
                              style={{
                                backgroundColor:
                                  selectedCategory.color ?? "#888",
                              }}
                            />
                            <span className='truncate'>
                              {selectedCategory.name}
                            </span>
                          </div>
                        : <span className='text-muted-foreground'>Select</span>}
                        <ArrowDown01Icon
                          size={12}
                          className='shrink-0 text-muted-foreground ml-1'
                        />
                      </button>
                    }
                  />
                  <PopoverContent
                    className='w-56 p-0'
                    align='start'
                    sideOffset={4}
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder='Search category…'
                        value={categorySearch}
                        onValueChange={setCategorySearch}
                      />
                      <CommandList>
                        {filteredCategories.length > 0 ?
                          <CommandGroup>
                            {filteredCategories.map(
                              (cat: TransactionCategory) => (
                                <CommandItem
                                  key={cat.id}
                                  value={cat.id}
                                  onSelect={() => {
                                    setCategoryId(cat.id);
                                    setCategoryOpen(false);
                                    setCategorySearch("");
                                  }}
                                  className='flex items-center gap-2'
                                >
                                  <div
                                    className='size-2 rounded-full shrink-0'
                                    style={{
                                      backgroundColor: cat.color ?? "#888",
                                    }}
                                  />
                                  <span className='text-xs'>{cat.name}</span>
                                </CommandItem>
                              ),
                            )}
                          </CommandGroup>
                        : categorySearch.trim() ?
                          <CommandGroup>
                            <CommandItem
                              value={`create:${categorySearch}`}
                              onSelect={() =>
                                handleCreateCategory(categorySearch)
                              }
                              className='flex items-center gap-2'
                            >
                              <span className='text-xs'>
                                Create{" "}
                                <span className='font-medium'>
                                  "{categorySearch.trim()}"
                                </span>
                              </span>
                            </CommandItem>
                          </CommandGroup>
                        : <CommandEmpty>No categories.</CommandEmpty>}
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
                  onChange={(e) => handleTaxAmountChange(e.target.value)}
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

            {/* Invoice link — income only */}
            {type === "income" && (
              <div className='flex flex-col gap-1.5'>
                <Label className='text-xs'>Link to invoice</Label>
                <Popover
                  open={invoiceOpen}
                  onOpenChange={(o) => {
                    setInvoiceOpen(o);
                    if (!o) setInvoiceSearch("");
                  }}
                >
                  <PopoverTrigger
                    render={
                      <button
                        type='button'
                        className='flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring'
                      >
                        {selectedInvoice ?
                          <span className='truncate'>
                            {selectedInvoice.invoice_number ?? "Invoice"} —{" "}
                            {selectedInvoice.customer_name}
                          </span>
                        : <span className='text-muted-foreground'>
                            Select invoice (optional)
                          </span>
                        }
                        <ArrowDown01Icon
                          size={12}
                          className='shrink-0 text-muted-foreground ml-1'
                        />
                      </button>
                    }
                  />
                  <PopoverContent
                    className='w-72 p-0'
                    align='start'
                    sideOffset={4}
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder='Search by invoice # or customer…'
                        value={invoiceSearch}
                        onValueChange={setInvoiceSearch}
                      />
                      <CommandList>
                        {invoiceId && (
                          <CommandGroup>
                            <CommandItem
                              value='clear'
                              onSelect={() => {
                                setInvoiceId("");
                                setMarkInvoicePaid(false);
                                setInvoiceOpen(false);
                              }}
                              className='text-muted-foreground text-xs'
                            >
                              Clear selection
                            </CommandItem>
                          </CommandGroup>
                        )}
                        {filteredInvoices.length > 0 ?
                          <CommandGroup>
                            {filteredInvoices.map((inv) => (
                              <CommandItem
                                key={inv.id}
                                value={inv.id}
                                onSelect={() => {
                                  setInvoiceId(inv.id);
                                  setInvoiceOpen(false);
                                  setInvoiceSearch("");
                                }}
                              >
                                <div className='flex flex-col min-w-0'>
                                  <span className='text-xs font-medium'>
                                    {inv.invoice_number ?? "—"} ·{" "}
                                    {inv.customer_name}
                                  </span>
                                  {inv.due_date && (
                                    <span className='text-[10px] text-muted-foreground'>
                                      Due{" "}
                                      {new Date(
                                        inv.due_date,
                                      ).toLocaleDateString("en-KE")}
                                      {inv.total != null &&
                                        ` · ${inv.currency} ${inv.total.toLocaleString("en-KE")}`}
                                    </span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        : <CommandEmpty>No open invoices.</CommandEmpty>}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {invoiceId && !isEditing && (
                  <label className='flex items-center gap-2 cursor-pointer mt-0.5'>
                    <input
                      type='checkbox'
                      className='size-3.5 rounded accent-foreground'
                      checked={markInvoicePaid}
                      onChange={(e) => setMarkInvoicePaid(e.target.checked)}
                    />
                    <span className='text-xs text-muted-foreground'>
                      Mark invoice as paid when saving
                    </span>
                  </label>
                )}
              </div>
            )}

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

              {/* Vault docs pre-linked from extraction */}
              {vaultDocs.length > 0 && (
                <div className='flex flex-col gap-1'>
                  {vaultDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className='flex items-center gap-2 rounded-md border px-3 py-1.5'
                    >
                      <Attachment01Icon
                        size={12}
                        className='shrink-0 text-muted-foreground'
                      />
                      <span className='flex-1 truncate text-xs'>{doc.name}</span>
                      {doc.file_size && (
                        <span className='text-[10px] text-muted-foreground shrink-0'>
                          {(doc.file_size / 1024).toFixed(0)} KB
                        </span>
                      )}
                      <button
                        type='button'
                        onClick={() =>
                          setVaultDocs((prev) => prev.filter((d) => d.id !== doc.id))
                        }
                        className='text-muted-foreground fine-hover:text-destructive transition-colors shrink-0'
                      >
                        <Delete01Icon size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Existing attachments (edit mode) */}
              {existingAttachments.length > 0 && (
                <div className='flex flex-col gap-1'>
                  {existingAttachments.map((att) => (
                    <div
                      key={att.id}
                      className='flex items-center gap-2 rounded-md border px-3 py-1.5'
                    >
                      <Attachment01Icon
                        size={12}
                        className='shrink-0 text-muted-foreground'
                      />
                      <span className='flex-1 truncate text-xs'>
                        {att.file_name}
                      </span>
                      {att.file_size && (
                        <span className='text-[10px] text-muted-foreground shrink-0'>
                          {(att.file_size / 1024).toFixed(0)} KB
                        </span>
                      )}
                      <button
                        type='button'
                        onClick={() => markAttachmentForRemoval(att)}
                        className='text-muted-foreground fine-hover:text-destructive transition-colors shrink-0'
                      >
                        <Delete01Icon size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* New file uploads */}
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
              {pendingFiles.length > 0 && (
                <div className='flex flex-col gap-1'>
                  {pendingFiles.map((file, i) => {
                    const isExtractable =
                      file.type.startsWith("image/") ||
                      file.type === "application/pdf";
                    return (
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
                        {isExtractable && (
                          <button
                            type='button'
                            disabled={extracting}
                            onClick={() => handleExtractFromFile(file)}
                            className='flex items-center gap-1 text-[10px] text-muted-foreground fine-hover:text-foreground transition-colors shrink-0 disabled:opacity-40'
                            title='Extract transaction data with AI'
                          >
                            <SparklesIcon size={11} />
                            {extracting ? "Extracting…" : "Extract"}
                          </button>
                        )}
                        <button
                          type='button'
                          onClick={() => removeFile(i)}
                          className='text-muted-foreground fine-hover:text-destructive transition-colors'
                        >
                          <Delete01Icon size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='border-t px-6 py-4 flex items-center justify-end gap-2'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ?
              "Saving…"
            : isEditing ?
              "Save changes"
            : "Add transaction"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
