import { useState } from "react";
import { Button } from "@travada-books/ui/components/button";
import { Input } from "@travada-books/ui/components/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@travada-books/ui/components/dialog";
import {
  Download01Icon,
  Mail01Icon,
  FileSpreadsheetIcon,
  Csv01Icon,
} from "@travada-books/ui/icons";
import { cn } from "@travada-books/ui/lib/utils";
import { Switch } from "@travada-books/ui/components/switch";

type Format = "csv" | "xlsx";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  defaultEmail?: string;
  onExport: (format: Format, emailTo?: string) => void;
  isLoading?: boolean;
}

export function ExportTransactionsDialog({
  open,
  onOpenChange,
  selectedCount,
  defaultEmail,
  onExport,
  isLoading,
}: Props) {
  const [format, setFormat] = useState<Format>("csv");
  const [sendEmail, setSendEmail] = useState(false);
  const [emailTo, setEmailTo] = useState(defaultEmail ?? "");
  const [emailError, setEmailError] = useState("");

  function handleExport() {
    if (sendEmail) {
      if (!emailTo.trim()) {
        setEmailError("Email address is required");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTo.trim())) {
        setEmailError("Enter a valid email address");
        return;
      }
    }
    setEmailError("");
    onExport(format, sendEmail ? emailTo.trim() : undefined);
  }

  const label =
    selectedCount === 1 ? "1 transaction" : `${selectedCount} transactions`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-sm'>
        <DialogHeader>
          <DialogTitle>Export transactions</DialogTitle>
          <DialogDescription>{label} selected</DialogDescription>
        </DialogHeader>

        <div className='space-y-5 py-1'>
          {/* Format picker */}
          <div className='space-y-2'>
            <p className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
              Format
            </p>
            <div className='grid grid-cols-2 gap-2'>
              {(["csv", "xlsx"] as const).map((f) => (
                <button
                  key={f}
                  type='button'
                  onClick={() => setFormat(f)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors [transition-timing-function:var(--ease-out)] duration-100",
                    format === f ?
                      "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground fine-hover:bg-muted",
                  )}
                >
                  {f === "csv" ?
                    <Csv01Icon size={15} />
                  : <FileSpreadsheetIcon size={15} />}
                  <span className='font-medium'>
                    {f === "csv" ? "CSV" : "Excel (XLSX)"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Email toggle */}
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Mail01Icon size={14} className='text-muted-foreground' />
                <span className='text-sm'>Send by email</span>
              </div>
              <Switch
                checked={sendEmail}
                onCheckedChange={(checked) => {
                  setSendEmail(checked);
                  setEmailError("");
                }}
              />
            </div>

            {sendEmail && (
              <div className='space-y-1 animate-in fade-in-0 slide-in-from-top-1 duration-150 [animation-timing-function:var(--ease-out)]'>
                <Input
                  type='email'
                  placeholder='accountant@company.com'
                  value={emailTo}
                  onChange={(e) => {
                    setEmailTo(e.target.value);
                    setEmailError("");
                  }}
                  className={cn(
                    emailError &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                  autoFocus
                />
                {emailError && (
                  <p className='text-xs text-destructive'>{emailError}</p>
                )}
                <p className='text-xs text-muted-foreground'>
                  Download link expires in 7 days.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isLoading}
            className='gap-1.5'
          >
            <Download01Icon size={13} />
            {isLoading ? "Starting…" : `Export ${label}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
