import { useState, useRef } from "react";
import Papa from "papaparse";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@travada-books/ui/components/dialog";
import { Button } from "@travada-books/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@travada-books/ui/components/select";
import {
  Upload01Icon,
  Alert02Icon,
} from "@travada-books/ui/icons";
import { Spokes } from "@travada-books/ui/components/spokes";
import { cn } from "@travada-books/ui/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { suggestCsvMapping, type CsvMapping } from "@/lib/queries/ai";
import { supabase } from "@/lib/supabase";
import { uploadFileForImport } from "@/lib/queries/vault";
import { showImportProgressToast } from "./import-progress-toast";

type ImportTab = "csv" | "pdf";

// ─── Types ────────────────────────────────────────────────────────────────────

type ParsedRow = {
  id: string;
  date: string;
  name: string;
  counterparty_name?: string;
  amount: number;
  currency: string;
  type: "income" | "expense";
  reference_number?: string;
  note?: string;
};

// ─── Parsing helpers ──────────────────────────────────────────────────────────

const MONTH_NAMES: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

function parseDate(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();

  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Compact ISO: YYYYMMDD
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }

  // DD/MM/YYYY or MM/DD/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const numericParts = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (numericParts) {
    const a = parseInt(numericParts[1]);
    const b = parseInt(numericParts[2]);
    const year =
      numericParts[3].length === 2 ? `20${numericParts[3]}` : numericParts[3];
    if (a > 12 && b <= 12)
      return `${year}-${numericParts[2].padStart(2, "0")}-${numericParts[1].padStart(2, "0")}`;
    if (b > 12 && a <= 12)
      return `${year}-${numericParts[1].padStart(2, "0")}-${numericParts[2].padStart(2, "0")}`;
    // Ambiguous — default to DD/MM (international convention)
    return `${year}-${numericParts[2].padStart(2, "0")}-${numericParts[1].padStart(2, "0")}`;
  }

  // "1 Oct 2025" or "1-Oct-2025"
  const dayMonthYear = s.match(
    /^(\d{1,2})[\s\-\/]([A-Za-z]{3,})[\s\-\.,]*(\d{4})$/,
  );
  if (dayMonthYear) {
    const month = MONTH_NAMES[dayMonthYear[2].toLowerCase().slice(0, 3)];
    if (month)
      return `${dayMonthYear[3]}-${month}-${dayMonthYear[1].padStart(2, "0")}`;
  }

  // "Oct 1, 2025" or "October 1 2025"
  const monthDayYear = s.match(/^([A-Za-z]{3,})[\s\-](\d{1,2})[,\s]+(\d{4})$/);
  if (monthDayYear) {
    const month = MONTH_NAMES[monthDayYear[1].toLowerCase().slice(0, 3)];
    if (month)
      return `${monthDayYear[3]}-${month}-${monthDayYear[2].padStart(2, "0")}`;
  }

  // Last resort: Date constructor
  const d = new Date(s);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1970) {
    return d.toISOString().slice(0, 10);
  }

  return null;
}

function parseAmount(raw: string): number | null {
  if (!raw) return null;

  // Normalize special minus characters (−, –, —) to ASCII hyphen
  let s = raw.replace(/[−–—]/g, "-").trim();

  // Strip everything except digits, . , - +
  s = s.replace(/[^\d.,\-+]/g, "");

  if (!s || s === "-" || s === "+") return null;

  const lastComma = s.lastIndexOf(",");
  const lastPeriod = s.lastIndexOf(".");

  let cleaned: string;
  if (lastComma > lastPeriod) {
    // EU format: 1.234,56 — comma is decimal separator
    cleaned = s.replace(/\./g, "").replace(",", ".");
  } else {
    // US/standard format: 1,234.56 — period is decimal separator
    cleaned = s.replace(/,/g, "");
  }

  const result = parseFloat(cleaned);
  return isNaN(result) ? null : result;
}

function buildRows(
  rawRows: Record<string, string>[],
  mapping: CsvMapping,
  defaultCurrency: string,
): ParsedRow[] {
  const rows: ParsedRow[] = [];

  for (const raw of rawRows) {
    const date = parseDate(mapping.date ? (raw[mapping.date] ?? "") : "");
    if (!date) continue;

    let amount = 0;
    let type: "income" | "expense" = "expense";

    if (mapping.debit_column && mapping.credit_column) {
      const debit = parseAmount(raw[mapping.debit_column] ?? "") ?? 0;
      const credit = parseAmount(raw[mapping.credit_column] ?? "") ?? 0;
      if (debit > 0) {
        amount = debit;
        type = "expense";
      } else if (credit > 0) {
        amount = credit;
        type = "income";
      } else continue;
    } else if (mapping.amount) {
      const rawAmt = parseAmount(raw[mapping.amount] ?? "");
      if (rawAmt === null || rawAmt === 0) continue;
      amount = Math.abs(rawAmt);
      if (mapping.type) {
        const tv = (raw[mapping.type] ?? "").toLowerCase();
        type =
          (
            tv.includes("credit") ||
            tv.includes("income") ||
            tv.includes("receipt")
          ) ?
            "income"
          : "expense";
      } else {
        type =
          mapping.amount_sign ?
            rawAmt > 0 ?
              "income"
            : "expense"
          : rawAmt > 0 ? "expense"
          : "income";
      }
    } else continue;

    rows.push({
      id: crypto.randomUUID(),
      date,
      name:
        (mapping.description ? raw[mapping.description] : undefined)?.trim() ||
        "Imported transaction",
      counterparty_name:
        mapping.counterparty ?
          raw[mapping.counterparty]?.trim() || undefined
        : undefined,
      amount,
      currency: (() => {
        if (!mapping.currency) return defaultCurrency || "KES";
        const isColumn = Object.keys(raw).includes(mapping.currency);
        return (isColumn ? raw[mapping.currency]?.trim().toUpperCase() : mapping.currency.toUpperCase()) || defaultCurrency || "KES";
      })(),
      type,
      reference_number:
        mapping.reference ?
          raw[mapping.reference]?.trim() || undefined
        : undefined,
      note: mapping.notes ? raw[mapping.notes]?.trim() || undefined : undefined,
    });
  }

  return rows;
}

// ─── Mapping row ──────────────────────────────────────────────────────────────

const NONE = "__none__";

type FieldType = "date" | "amount" | "text";

function MappingRow({
  systemLabel,
  csvValue,
  headers,
  suggesting,
  onChange,
  firstRow,
  fieldType,
  inverted,
}: {
  systemLabel: string;
  csvValue: string | undefined;
  headers: string[];
  suggesting: boolean;
  onChange: (val: string | undefined) => void;
  firstRow?: Record<string, string>;
  fieldType?: FieldType;
  inverted?: boolean;
}) {
  const rawPreview =
    csvValue && firstRow ? (firstRow[csvValue]?.trim() ?? "") : null;

  let preview: { ok: boolean; display: string } | null = null;
  if (rawPreview !== null && rawPreview !== "" && fieldType) {
    if (fieldType === "date") {
      const parsed = parseDate(rawPreview);
      preview =
        parsed ?
          { ok: true, display: parsed }
        : { ok: false, display: `Can't parse "${rawPreview}"` };
    } else if (fieldType === "amount") {
      const parsed = parseAmount(rawPreview);
      if (parsed === null) {
        preview = { ok: false, display: `Can't parse "${rawPreview}"` };
      } else {
        const final = inverted ? -parsed : parsed;
        const sign = final >= 0 ? "+" : "";
        preview = { ok: true, display: `${sign}${final.toFixed(2)}` };
      }
    } else {
      preview =
        rawPreview ? { ok: true, display: rawPreview.slice(0, 50) } : null;
    }
  }

  return (
    <div className='flex flex-col gap-1'>
      <div className='grid grid-cols-[1fr_auto_1fr] items-center gap-3'>
        <Select
          value={csvValue ?? NONE}
          onValueChange={(v) => onChange(v === NONE ? undefined : v)}
          disabled={suggesting}
        >
          <SelectTrigger className='h-9 text-xs w-full'>
            {suggesting ?
              <span className='flex items-center gap-1.5 text-muted-foreground'>
                <Spokes className='h-[11px] w-[11px]' />
                Analyzing…
              </span>
            : <SelectValue placeholder='Select column' />}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE} className='text-xs text-muted-foreground'>
              — not mapped —
            </SelectItem>
            {headers.map((h) => (
              <SelectItem key={h} value={h} className='text-xs'>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className='text-muted-foreground text-xs select-none'>→</span>
        <div className='h-9 flex items-center rounded-md border border-dashed px-3 text-xs text-muted-foreground bg-muted/30'>
          {systemLabel}
        </div>
      </div>
      {preview && (
        <div
          className={cn(
            "flex items-center gap-1 pl-1 text-[10px]",
            preview.ok ? "text-muted-foreground" : "text-destructive",
          )}
        >
          {!preview.ok && <Alert02Icon size={10} className='shrink-0' />}
          <span className='truncate'>{preview.display}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

interface ImportCsvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportCsvDialog({ open, onOpenChange }: ImportCsvDialogProps) {
  const { orgId, org } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<ImportTab>("csv");

  // CSV state
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<CsvMapping>({});
  const [suggesting, setSuggesting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // PDF state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfConfirming, setPdfConfirming] = useState(false);

  const defaultCurrency = org?.base_currency ?? "KES";
  const hasFile = file !== null && headers.length > 0;
  const firstRow = rawRows[0];

  function reset() {
    setFile(null);
    setFileName("");
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setSuggesting(false);
    setConfirming(false);
    setPdfFile(null);
    setPdfConfirming(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  }

  function handleClose(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    reset();

    const isCsv =
      picked.type === "text/csv" || picked.name.toLowerCase().endsWith(".csv");
    if (!isCsv) {
      toast.error("Please select a CSV file.");
      return;
    }

    setFile(picked);
    setFileName(picked.name);

    Papa.parse<Record<string, string>>(picked, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const hdrs = results.meta.fields ?? [];
        const rows = results.data as Record<string, string>[];
        setHeaders(hdrs);
        setRawRows(rows);

        setSuggesting(true);
        try {
          const suggested = await suggestCsvMapping(hdrs, rows.slice(0, 5));
          setMapping(suggested);
        } catch {
          // silent — user maps manually
        } finally {
          setSuggesting(false);
        }
      },
    });
  }

  async function handleConfirm() {
    if (!orgId || !file) return;
    const previewRows = buildRows(rawRows, mapping, defaultCurrency);
    if (previewRows.length === 0) {
      toast.error("No valid rows found. Check your column mapping.");
      return;
    }

    setConfirming(true);
    try {
      const filePath = await uploadFileForImport(orgId, file);
      const { data, error } = await supabase.functions.invoke<{
        runId: string;
        publicToken?: string;
      }>("trigger-csv-import", {
        body: {
          filePath,
          mapping,
          defaultCurrency,
          rowCount: previewRows.length,
        },
      });
      if (error) throw error;

      handleClose(false);

      if (data?.runId && data.publicToken) {
        showImportProgressToast({
          runId: data.runId,
          publicToken: data.publicToken,
          orgId,
          rowCount: previewRows.length,
        });
      } else {
        // Fallback if realtime token unavailable
        toast.success(
          `Importing ${previewRows.length} transactions in the background.`,
          { duration: 6000 },
        );
        setTimeout(
          () =>
            queryClient.invalidateQueries({
              queryKey: ["transactions", orgId],
            }),
          8000,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setConfirming(false);
    }
  }

  function setField<K extends keyof CsvMapping>(key: K, val: CsvMapping[K]) {
    setMapping((m) => ({ ...m, [key]: val }));
  }

  function handlePdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (
      !picked.name.toLowerCase().endsWith(".pdf") &&
      picked.type !== "application/pdf"
    ) {
      toast.error("Please select a PDF file.");
      return;
    }
    setPdfFile(picked);
  }

  async function handlePdfConfirm() {
    if (!orgId || !pdfFile) return;
    setPdfConfirming(true);
    try {
      const filePath = await uploadFileForImport(orgId, pdfFile);
      const { data, error } = await supabase.functions.invoke<{
        runId: string;
        publicToken?: string;
      }>("trigger-pdf-import", { body: { filePath, defaultCurrency } });
      if (error) throw error;

      handleClose(false);

      if (data?.runId && data.publicToken) {
        showImportProgressToast({
          runId: data.runId,
          publicToken: data.publicToken,
          orgId,
          rowCount: 0,
        });
      } else {
        toast.success("Importing transactions in the background.", {
          duration: 6000,
        });
        setTimeout(
          () =>
            queryClient.invalidateQueries({
              queryKey: ["transactions", orgId],
            }),
          30_000,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setPdfConfirming(false);
    }
  }

  const canConfirm = !suggesting && !!mapping.date;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl" showCloseButton>
        <DialogHeader>
          <DialogTitle className='text-sm font-medium'>
            {tab === "pdf" ?
              "Import transactions"
            : hasFile ?
              "Map columns"
            : "Import transactions"}
          </DialogTitle>
        </DialogHeader>

        {/* ── Tab switcher ── */}
        {!hasFile && (
          <div className='flex gap-1 rounded-lg bg-muted p-1'>
            <button
              type='button'
              onClick={() => {
                setTab("csv");
                reset();
              }}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === "csv" ?
                  "bg-background text-foreground shadow-sm"
                : "text-muted-foreground fine-hover:text-foreground",
              )}
            >
              CSV file
            </button>
            <button
              type='button'
              onClick={() => {
                setTab("pdf");
                reset();
              }}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === "pdf" ?
                  "bg-background text-foreground shadow-sm"
                : "text-muted-foreground fine-hover:text-foreground",
              )}
            >
              PDF File
            </button>
          </div>
        )}

        {/* ── PDF import panel ── */}
        {tab === "pdf" && (
          <div className='flex flex-col gap-4'>
            {!pdfFile ?
              <div className='flex flex-col items-center gap-4 py-8'>
                <div className='flex size-14 items-center justify-center rounded-full bg-muted'>
                  <Upload01Icon size={22} className='text-muted-foreground' />
                </div>
                <div className='text-center'>
                  <p className='text-xs font-medium'>Select your PDF</p>
                  <p className='mt-1 text-[11px] text-muted-foreground max-w-[260px] mx-auto leading-relaxed'>
                    Travada Books will automatically extract all transactions
                    using AI — no column mapping needed
                  </p>
                </div>
                <input
                  ref={pdfInputRef}
                  type='file'
                  accept='.pdf,application/pdf'
                  className='hidden'
                  onChange={handlePdfChange}
                />
                <Button
                  className='h-9'
                  onClick={() => pdfInputRef.current?.click()}
                >
                  Choose PDF
                </Button>
              </div>
            : <div className='flex flex-col gap-4'>
                <div className='flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5'>
                  <div className='flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground'>
                    PDF
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-xs font-medium'>
                      {pdfFile.name}
                    </p>
                    <p className='text-[11px] text-muted-foreground'>
                      {(pdfFile.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>

                <div className='rounded-md border border-dashed px-3 py-2.5'>
                  <p className='text-[11px] text-muted-foreground leading-relaxed'>
                    Large statements may take up to 60 seconds. Transactions
                    will appear in real time as they're imported.
                  </p>
                </div>

                <div className='flex flex-col gap-2'>
                  <Button
                    className='h-10 w-full'
                    disabled={pdfConfirming}
                    onClick={handlePdfConfirm}
                  >
                    {pdfConfirming ? "Uploading…" : "Import statement"}
                  </Button>
                  <button
                    type='button'
                    className='text-xs text-muted-foreground fine-hover:text-foreground transition-colors py-1'
                    onClick={() => {
                      setPdfFile(null);
                      if (pdfInputRef.current) pdfInputRef.current.value = "";
                    }}
                  >
                    Choose another file
                  </button>
                  <input
                    ref={pdfInputRef}
                    type='file'
                    accept='.pdf,application/pdf'
                    className='hidden'
                    onChange={handlePdfChange}
                  />
                </div>
              </div>
            }
          </div>
        )}

        {/* ── CSV: No file yet ── */}
        {tab === "csv" && !hasFile && (
          <div className='flex flex-col items-center gap-4 py-8'>
            <div className='flex size-14 items-center justify-center rounded-full bg-muted'>
              <Upload01Icon size={22} className='text-muted-foreground' />
            </div>
            <div className='text-center'>
              <p className='text-xs font-medium'>Select a CSV file to import</p>
              <p className='mt-1 text-[11px] text-muted-foreground'>
                Export your bank transactions as CSV and import here
              </p>
            </div>
            <input
              ref={fileInputRef}
              type='file'
              accept='.csv,text/csv'
              className='hidden'
              onChange={handleFileChange}
            />
            <Button
              className='h-9'
              onClick={() => fileInputRef.current?.click()}
            >
              Choose file
            </Button>
          </div>
        )}

        {/* ── Column mapping ── */}
        {hasFile && (
          <div className='flex flex-col gap-5'>
            <p className='text-[11px] text-muted-foreground'>
              We've mapped each column automatically — review and confirm before
              importing.
            </p>

            <div className='grid grid-cols-[1fr_auto_1fr] gap-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wide'>
              <span>CSV Data column</span>
              <span />
              <span>Travada Books column</span>
            </div>

            <div className='flex flex-col gap-3'>
              <MappingRow
                systemLabel='Date'
                csvValue={mapping.date}
                headers={headers}
                suggesting={suggesting}
                onChange={(v) => setField("date", v)}
                firstRow={firstRow}
                fieldType='date'
              />
              <MappingRow
                systemLabel='Description'
                csvValue={mapping.description}
                headers={headers}
                suggesting={suggesting}
                onChange={(v) => setField("description", v)}
                firstRow={firstRow}
                fieldType='text'
              />
              <MappingRow
                systemLabel='Reference'
                csvValue={mapping.reference}
                headers={headers}
                suggesting={suggesting}
                onChange={(v) => setField("reference", v)}
                firstRow={firstRow}
                fieldType='text'
              />
              <MappingRow
                systemLabel='Currency'
                csvValue={mapping.currency}
                headers={headers}
                suggesting={suggesting}
                onChange={(v) => setField("currency", v)}
                firstRow={firstRow}
                fieldType='text'
              />
            </div>

            <p className='text-[11px] text-muted-foreground'>
              {fileName} · {rawRows.length} rows · first row preview shown above
            </p>

            <div className='flex flex-col gap-2'>
              <Button
                className='h-10 w-full'
                disabled={!canConfirm || confirming}
                onClick={handleConfirm}
              >
                {confirming ?
                  "Importing…"
                : suggesting ?
                  "Mapping...."
                : "Confirm import"}
              </Button>
              <button
                type='button'
                className='text-xs text-muted-foreground fine-hover:text-foreground transition-colors py-1'
                onClick={() => fileInputRef.current?.click()}
              >
                Choose another file
              </button>
              <input
                ref={fileInputRef}
                type='file'
                accept='.csv,text/csv'
                className='hidden'
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
